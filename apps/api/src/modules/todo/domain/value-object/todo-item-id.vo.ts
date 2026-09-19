import { InvalidTodoIdentifierError } from '../todo.errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** BE_04 R5 — see {@link TodoListId}; kept a separate type so the two cannot be swapped. */
export class TodoItemId {
  private constructor(private readonly value: string) {}

  static of(raw: string): TodoItemId {
    if (!UUID_PATTERN.test(raw)) {
      throw new InvalidTodoIdentifierError();
    }
    return new TodoItemId(raw.toLowerCase());
  }

  equals(other: TodoItemId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
