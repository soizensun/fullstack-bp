import { InvalidDueDateError } from '../todo.errors';

/**
 * BE_04 R5 — immutable, validated on creation, compared by value.
 * GEN_11 — held as a UTC instant. The timezone a user sees is applied at the edge,
 * never here, so the same due date means the same moment everywhere.
 */
export class DueDate {
  private constructor(private readonly value: Date) {}

  static of(raw: Date | string): DueDate {
    const parsed = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);

    if (Number.isNaN(parsed.getTime())) {
      throw new InvalidDueDateError();
    }

    return new DueDate(parsed);
  }

  /**
   * BE_02 R3 — the domain may not read a clock, so "now" is passed in by the caller
   * that has one. This is the rule that keeps the domain testable without faking time.
   */
  isOverdueAt(now: Date): boolean {
    return this.value.getTime() < now.getTime();
  }

  equals(other: DueDate): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
