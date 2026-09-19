import { Injectable } from '@nestjs/common';
import { PaginationConfig } from '@app/config/configuration';
import type { SortDirection, TodoListSort } from '../query-port/todo-query.port';
import { TodoQuery } from '../query-port/todo-query.port';
import type { Page, TodoListSummaryView } from '../types/todo.views';

export interface ListTodoListsInput {
  readonly page?: number | undefined;
  readonly pageSize?: number | undefined;
  readonly status?: 'active' | 'archived' | undefined;
  readonly sort?: TodoListSort | undefined;
  readonly direction?: SortDirection | undefined;
}

/** BE_07 R5 — every collection route paginates, with the same parameters everywhere. */
@Injectable()
export class ListTodoListsUseCase {
  constructor(
    private readonly query: TodoQuery,
    // BE_10 R8 — the page-size limits are configuration, injected, never hardcoded here.
    private readonly pagination: PaginationConfig,
  ) {}

  async execute(input: ListTodoListsInput): Promise<Page<TodoListSummaryView>> {
    return this.query.listSummaries({
      page: input.page ?? 1,
      pageSize: Math.min(input.pageSize ?? this.pagination.defaultPageSize, this.pagination.maxPageSize),
      ...(input.status === undefined ? {} : { status: input.status }),
      sort: input.sort ?? 'createdAt',
      direction: input.direction ?? 'desc',
    });
  }
}
