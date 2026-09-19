import { Injectable } from '@nestjs/common';
import { PaginationConfig } from '@app/config/configuration';
import { Clock } from '@app/shared/application/clock.port';
import type { ItemStatusName } from '../../domain/value-object/item-status.vo';
import type { SortDirection, TodoItemSort } from '../query-port/todo-query.port';
import { TodoQuery } from '../query-port/todo-query.port';
import { TodoListNotFoundError } from '../todo.errors';
import type { Page, TodoItemView } from '../types/todo.views';

export interface ListTodoItemsInput {
  readonly listId: string;
  readonly page?: number | undefined;
  readonly pageSize?: number | undefined;
  readonly status?: ItemStatusName | undefined;
  readonly sort?: TodoItemSort | undefined;
  readonly direction?: SortDirection | undefined;
}

@Injectable()
export class ListTodoItemsUseCase {
  constructor(
    private readonly query: TodoQuery,
    private readonly pagination: PaginationConfig,
    private readonly clock: Clock,
  ) {}

  async execute(input: ListTodoItemsInput): Promise<Page<TodoItemView>> {
    const page = await this.query.listItems(
      {
        listId: input.listId,
        page: input.page ?? 1,
        pageSize: Math.min(input.pageSize ?? this.pagination.defaultPageSize, this.pagination.maxPageSize),
        ...(input.status === undefined ? {} : { status: input.status }),
        sort: input.sort ?? 'createdAt',
        direction: input.direction ?? 'asc',
      },
      this.clock.now(),
    );

    // `null` means the list itself is absent — distinct from a list with no items,
    // which is an empty page. Conflating the two would answer 200 for a bad id.
    if (page === null) {
      throw new TodoListNotFoundError();
    }
    return page;
  }
}
