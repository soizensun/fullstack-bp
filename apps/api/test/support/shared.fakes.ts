import { Clock } from '@app/shared/application/clock.port';
import { IdGenerator } from '@app/shared/application/id-generator.port';

/**
 * BE_11 R5 — unit tests substitute *ports* and use the real domain objects. These fakes
 * implement the contract honestly rather than recording calls, so a test asserts an
 * outcome (BE_11 R6) instead of asserting that a method was called.
 *
 * These are the shared-kernel fakes: they stand in for ports declared in
 * `src/shared/application/`, so any module's tests may use them without reaching into
 * another module's types. Module-specific fakes live beside the module that owns them.
 */

let sequence = 0;

/**
 * A valid, deterministic UUIDv7-shaped id. Unique per call within a test run.
 *
 * BE_11 R8 — the ids are fixed, which is what lets a failing assertion print a value a
 * reader can find in the test above it.
 */
export function anId(seed?: number): string {
  const n = (seed ?? (sequence += 1)).toString(16).padStart(12, '0');
  return `0199a000-0000-7000-8000-${n}`;
}

export class FixedClock extends Clock {
  constructor(private readonly instant: Date) {
    super();
  }

  now(): Date {
    return new Date(this.instant.getTime());
  }
}

export class SequenceIdGenerator extends IdGenerator {
  private index = 0;

  constructor(private readonly ids: readonly string[]) {
    super();
  }

  next(): string {
    const id = this.ids[this.index];
    if (id === undefined) {
      throw new Error(`SequenceIdGenerator ran out after ${this.ids.length} ids.`);
    }
    this.index += 1;
    return id;
  }
}
