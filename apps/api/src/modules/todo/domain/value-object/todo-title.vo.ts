import { TodoTitleEmptyError, TodoTitleTooLongError } from '../todo.errors';

/**
 * BE_04 R5 — a value with rules: validated on creation, compared by value, and
 * replaced rather than mutated. Both lists and items title the same way, so one
 * value object serves both (GEN_16 R1 — search before writing a second).
 */
export class TodoTitle {
  static readonly MAX_LENGTH = 120;

  // BE_04 R2 — private constructor; construction goes through the factory below.
  private constructor(private readonly value: string) {}

  /** BE_04 R2 — validates before it returns, so an invalid title cannot exist. */
  static of(raw: string): TodoTitle {
    // BE_08 R8 — normalizing here means nothing downstream re-trims.
    const normalized = raw.trim().replace(/\s+/gu, ' ');

    if (normalized.length === 0) {
      throw new TodoTitleEmptyError();
    }
    if (normalized.length > TodoTitle.MAX_LENGTH) {
      throw new TodoTitleTooLongError(TodoTitle.MAX_LENGTH);
    }

    return new TodoTitle(normalized);
  }

  equals(other: TodoTitle): boolean {
    return this.value === other.value;
  }

  /** Case-insensitive comparison, which is what "duplicate title" means to a user. */
  matches(other: TodoTitle): boolean {
    return this.value.localeCompare(other.value, undefined, { sensitivity: 'accent' }) === 0;
  }

  toString(): string {
    return this.value;
  }
}
