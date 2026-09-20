import { Injectable } from '@nestjs/common';
import { TodoListRepository } from '../../domain/repository/todo-list.repository.port';
import type { TodoList } from '../../domain/entity/todo-list.entity';
import { TodoListId } from '../../domain/value-object/todo-list-id.vo';
import { TodoListNotFoundError } from '../todo.errors';

/**
 * BE_05 R10 — eight command use cases share the same three steps: load the aggregate
 * or refuse, change it, save it. A use case may not call another use case, so the
 * shared workflow becomes this application service instead.
 *
 * BE_05 R8 — the load-change-save cycle is the single write per use case. The file
 * store serializes it (see `json-file.store.ts`), which is this project's stand-in for
 * a transaction.
 */
@Injectable()
export class TodoListMutationService {
  constructor(private readonly repository: TodoListRepository) {}

  /**
   * Loads the aggregate, applies `change`, and saves the result.
   *
   * BE_05 R6 — absence is decided here, as an application error. The repository
   * itself returns `null` and throws nothing (BE_06 R2).
   */
  async apply<T>(rawListId: string, change: (list: TodoList) => T): Promise<T> {
    const list = await this.loadOrThrow(rawListId);
    const result = change(list);
    await this.repository.save(list);
    return result;
  }

  async loadOrThrow(rawListId: string): Promise<TodoList> {
    const list = await this.repository.findById(TodoListId.of(rawListId));

    if (list === null) {
      throw new TodoListNotFoundError();
    }
    return list;
  }
}
