import { DomainError } from '@app/shared/errors/coded-error';

/**
 * BE_09 R6 — domain errors live in `domain/*.errors.ts`.
 * BE_09 R7 — each names the exact condition that failed. There is no catch-all.
 */

export class TodoTitleEmptyError extends DomainError {
  readonly code = 'TODO_TITLE_EMPTY';
  readonly category = 'validation' as const;

  constructor() {
    super('A todo title must contain at least one non-whitespace character.');
  }
}

export class TodoTitleTooLongError extends DomainError {
  readonly code = 'TODO_TITLE_TOO_LONG';
  readonly category = 'validation' as const;

  constructor(readonly maxLength: number) {
    super(`A todo title must be at most ${maxLength} characters.`);
  }
}

export class InvalidTodoIdentifierError extends DomainError {
  readonly code = 'TODO_IDENTIFIER_INVALID';
  readonly category = 'validation' as const;

  constructor() {
    super('A todo identifier must be a UUID.');
  }
}

export class InvalidDueDateError extends DomainError {
  readonly code = 'TODO_DUE_DATE_INVALID';
  readonly category = 'validation' as const;

  constructor() {
    super('A due date must be a valid instant.');
  }
}

export class TodoItemAlreadyCompletedError extends DomainError {
  readonly code = 'TODO_ITEM_ALREADY_COMPLETED';
  readonly category = 'conflict' as const;

  constructor() {
    super('This item is already completed.');
  }
}

export class TodoItemNotCompletedError extends DomainError {
  readonly code = 'TODO_ITEM_NOT_COMPLETED';
  readonly category = 'conflict' as const;

  constructor() {
    super('This item is not completed, so it cannot be reopened.');
  }
}

export class TodoListAlreadyArchivedError extends DomainError {
  readonly code = 'TODO_LIST_ALREADY_ARCHIVED';
  readonly category = 'conflict' as const;

  constructor() {
    super('This list is already archived.');
  }
}

export class ArchivedTodoListNotModifiableError extends DomainError {
  readonly code = 'TODO_LIST_ARCHIVED_NOT_MODIFIABLE';
  readonly category = 'conflict' as const;

  constructor() {
    super('An archived list cannot be changed. Reopen it first.');
  }
}

export class TodoItemNotInListError extends DomainError {
  readonly code = 'TODO_ITEM_NOT_IN_LIST';
  readonly category = 'not_found' as const;

  constructor() {
    super('That item does not belong to this list.');
  }
}

export class DuplicateTodoItemTitleError extends DomainError {
  readonly code = 'TODO_ITEM_TITLE_DUPLICATE';
  readonly category = 'conflict' as const;

  constructor() {
    super('This list already has an item with that title.');
  }
}
