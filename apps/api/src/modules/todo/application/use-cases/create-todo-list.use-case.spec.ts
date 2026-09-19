import {
  InMemoryIdempotencyStore,
  InMemoryTodoListRepository,
  RecordingActivityPort,
  SequenceIdGenerator,
} from '@test/support/fakes';
import { anId } from '@test/support/todo.builders';
import { TodoTitleEmptyError } from '../../domain/todo.errors';
import { DuplicateTodoListTitleError, IdempotencyKeyConflictError } from '../todo.errors';
import { CreateTodoListUseCase } from './create-todo-list.use-case';
import { describe, it, expect } from '@jest/globals';

describe('CreateTodoListUseCase', () => {
  const firstId = anId(1);
  const secondId = anId(2);

  function build() {
    const repository = new InMemoryTodoListRepository();
    const idempotency = new InMemoryIdempotencyStore();
    const activity = new RecordingActivityPort();
    const useCase = new CreateTodoListUseCase(
      repository,
      // BE_11 R8 — ids are injected, so the test is deterministic without stubbing uuid.
      new SequenceIdGenerator([firstId, secondId]),
      idempotency,
      activity,
    );
    return { useCase, repository, activity };
  }

  it('stores a new list and reports its id', async () => {
    const { useCase, repository } = build();

    const result = await useCase.execute({ title: 'Groceries' });

    // BE_11 R6 — assert the outcome, not that save() was called.
    expect(result.id).toBe(firstId);
    expect(repository.contents()).toHaveLength(1);
    expect(repository.contents()[0]?.snapshot().title).toBe('Groceries');
  });

  it('records the creation in the activity log', async () => {
    const { useCase, activity } = build();

    await useCase.execute({ title: 'Groceries' });

    expect(activity.recorded).toEqual([
      { subjectId: firstId, action: 'todo-list.created', detail: 'Groceries' },
    ]);
  });

  it('refuses a title another list already uses', async () => {
    const { useCase } = build();
    await useCase.execute({ title: 'Groceries' });

    // BE_05 R6 — uniqueness across aggregates surfaces as an application error.
    await expect(useCase.execute({ title: 'groceries' })).rejects.toThrow(
      DuplicateTodoListTitleError,
    );
  });

  it('refuses an empty title with the domain error', async () => {
    const { useCase } = build();

    await expect(useCase.execute({ title: '  ' })).rejects.toThrow(TodoTitleEmptyError);
  });

  describe('when the same idempotency key is replayed', () => {
    it('returns the first result without creating a second list', async () => {
      const { useCase, repository } = build();
      const first = await useCase.execute({ title: 'Groceries', idempotencyKey: 'key-1' });

      const replay = await useCase.execute({ title: 'Groceries', idempotencyKey: 'key-1' });

      expect(replay.id).toBe(first.id);
      expect(repository.contents()).toHaveLength(1);
    });

    it('refuses a replay whose body differs from the first request', async () => {
      const { useCase } = build();
      await useCase.execute({ title: 'Groceries', idempotencyKey: 'key-1' });

      await expect(
        useCase.execute({ title: 'Something else', idempotencyKey: 'key-1' }),
      ).rejects.toThrow(IdempotencyKeyConflictError);
    });
  });
});
