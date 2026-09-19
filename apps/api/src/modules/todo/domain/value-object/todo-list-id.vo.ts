import { InvalidTodoIdentifierError } from '../todo.errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * BE_04 R5 — an identifier is a value with a rule, so it is a value object rather
 * than a bare string. A distinct class for lists and items makes passing one where
 * the other belongs a compile error instead of a runtime mystery.
 *
 * BE_04 R9 — this is minted by the application before the aggregate is saved, so it
 * is not a *store-assigned* id and belongs in the domain.
 */
export class TodoListId {
  private constructor(private readonly value: string) {}

  static of(raw: string): TodoListId {
    if (!UUID_PATTERN.test(raw)) {
      throw new InvalidTodoIdentifierError();
    }
    return new TodoListId(raw.toLowerCase());
  }

  equals(other: TodoListId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
