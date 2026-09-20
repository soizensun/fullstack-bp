import { InMemoryTodoListRepository, RecordingActivityPort } from '@test/support/todo.fakes';
import { aTitle, aTodoList, anItemId, anId } from '@test/support/todo.builders';
import { TodoListId } from '../../domain/value-object/todo-list-id.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';
import { TodoListNotFoundError } from '../todo.errors';
import { CompleteTodoItemUseCase } from './complete-todo-item.use-case';
import { describe, it, expect } from '@jest/globals';

describe('CompleteTodoItemUseCase', () => {
  async function build() {
    const repository = new InMemoryTodoListRepository();
    const activity = new RecordingActivityPort();
    const list = aTodoList({ id: TodoListId.of(anId(1)), title: 'Trip' });
    const itemId = anItemId();
    list.addItem(itemId, aTitle('Pack bags'), null);
    await repository.save(list);

    return {
      useCase: new CompleteTodoItemUseCase(new TodoListMutationService(repository), activity),
      repository,
      activity,
      listId: list.identity().toString(),
      itemId: itemId.toString(),
    };
  }

  it('marks the item completed', async () => {
    const { useCase, repository, listId, itemId } = await build();

    await useCase.execute({ listId, itemId });

    const saved = repository.contents()[0]?.snapshot();
    expect(saved?.items.find((item) => item.id === itemId)?.status).toBe('completed');
  });

  it('records the completion after the write', async () => {
    const { useCase, activity, listId, itemId } = await build();

    await useCase.execute({ listId, itemId });

    // BE_05 R9 — a retryable effect, so it happens after the aggregate is saved.
    expect(activity.recorded).toEqual([
      { subjectId: listId, action: 'todo-item.completed', detail: itemId },
    ]);
  });

  it('refuses a list that does not exist', async () => {
    const { useCase, itemId } = await build();

    await expect(useCase.execute({ listId: anId(777), itemId })).rejects.toThrow(
      TodoListNotFoundError,
    );
  });

  it('records nothing when the change is refused', async () => {
    const { useCase, activity, listId, itemId } = await build();
    await useCase.execute({ listId, itemId });
    activity.recorded.length = 0;

    await expect(useCase.execute({ listId, itemId })).rejects.toThrow();

    expect(activity.recorded).toEqual([]);
  });
});
