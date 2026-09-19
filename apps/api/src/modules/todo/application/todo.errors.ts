import { ApplicationError } from '@app/shared/errors/coded-error';

/**
 * BE_09 R6 — application errors live in `application/*.errors.ts`, separate from the
 * domain's. The split is not bookkeeping: these are the failures a use case can see
 * and the domain cannot, because deciding them needs a repository.
 */

/** BE_05 R6 — absence. The aggregate cannot know it was not found. */
export class TodoListNotFoundError extends ApplicationError {
  readonly code = 'TODO_LIST_NOT_FOUND';
  readonly category = 'not-found' as const;

  constructor() {
    super('No todo list with that id exists.');
  }
}

/**
 * BE_05 R6 — duplication *across* aggregates. Contrast with
 * `DuplicateTodoItemTitleError`, which one aggregate can decide on its own and so
 * lives in the domain.
 */
export class DuplicateTodoListTitleError extends ApplicationError {
  readonly code = 'TODO_LIST_TITLE_DUPLICATE';
  readonly category = 'conflict' as const;

  constructor() {
    super('A todo list with that title already exists.');
  }
}

/**
 * BE_07 R8 — the same idempotency key was replayed with a different body, so the
 * stored result cannot honestly be returned.
 */
export class IdempotencyKeyConflictError extends ApplicationError {
  readonly code = 'IDEMPOTENCY_KEY_CONFLICT';
  readonly category = 'conflict' as const;

  constructor() {
    super('This idempotency key was already used with a different request.');
  }
}
