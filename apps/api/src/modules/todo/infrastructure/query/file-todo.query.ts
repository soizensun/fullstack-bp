import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { StorageConfig } from '@app/config/configuration';
import { readJsonFile } from '@app/shared/infrastructure/json-file.store';
import type {
  ListTodoItemsCriteria,
  ListTodoListsCriteria,
} from '../../application/query-port/todo-query.port';
import { TodoQuery } from '../../application/query-port/todo-query.port';
import type {
  Page,
  TodoItemView,
  TodoListDetailView,
  TodoListSummaryView,
} from '../../application/types/todo.views';
import type { TodoItemRecord, TodoListRecord, TodoListRecords } from '../entity/todo-list.record';

/**
 * The read side.
 *
 * BE_06 R7 places a query service in `application/`, and BE_06 R5 lets one name the
 * store. Doing that would make the application layer import infrastructure, which
 * BE_02 R1 forbids. GEN_01 R7 breaks the tie for the lower-numbered document, so the
 * contract stays in `application/query-port/` and this implementation lives out here.
 * Reported as a BE_06 finding rather than resolved silently.
 */
@Injectable()
export class FileTodoQuery extends TodoQuery {
  constructor(private readonly storage: StorageConfig) {
    super();
  }

  async findListDetail(listId: string, now: Date): Promise<TodoListDetailView | null> {
    const record = (await this.readAll())[listId];
    if (record === undefined) {
      return null;
    }

    return {
      ...summaryOf(record),
      items: record.items.map((item) => itemViewOf(item, now)),
    };
  }

  async listSummaries(criteria: ListTodoListsCriteria): Promise<Page<TodoListSummaryView>> {
    const all = Object.values(await this.readAll()).filter(
      (record) => criteria.status === undefined || record.status === criteria.status,
    );

    const sorted = [...all].sort((left, right) =>
      compare(
        criteria.sort === 'title' ? left.title : left.createdAt,
        criteria.sort === 'title' ? right.title : right.createdAt,
        criteria.direction,
      ),
    );

    return paginate(sorted.map(summaryOf), criteria.page, criteria.pageSize);
  }

  async listItems(criteria: ListTodoItemsCriteria, now: Date): Promise<Page<TodoItemView> | null> {
    const record = (await this.readAll())[criteria.listId];
    if (record === undefined) {
      return null;
    }

    const filtered = record.items.filter(
      (item) => criteria.status === undefined || item.status === criteria.status,
    );

    const sorted = [...filtered].sort((left, right) =>
      compare(sortKey(left, criteria.sort), sortKey(right, criteria.sort), criteria.direction),
    );

    return paginate(
      sorted.map((item) => itemViewOf(item, now)),
      criteria.page,
      criteria.pageSize,
    );
  }

  private async readAll(): Promise<TodoListRecords> {
    return (await readJsonFile<TodoListRecords>(this.filePath())) ?? {};
  }

  private filePath(): string {
    return join(this.storage.dataDir, 'todo-lists.json');
  }
}

function summaryOf(record: TodoListRecord): TodoListSummaryView {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    itemCount: record.items.length,
    openItemCount: record.items.filter((item) => item.status === 'open').length,
    createdAt: record.createdAt,
  };
}

function itemViewOf(record: TodoItemRecord, now: Date): TodoItemView {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    dueDate: record.dueDate,
    isOverdue:
      record.status === 'open' && record.dueDate !== null && Date.parse(record.dueDate) < now.getTime(),
  };
}

/** Items with no due date sort last, whichever direction is asked for. */
function sortKey(record: TodoItemRecord, sort: ListTodoItemsCriteria['sort']): string {
  if (sort === 'title') {
    return record.title;
  }
  if (sort === 'dueDate') {
    return record.dueDate ?? '9999-12-31T23:59:59.999Z';
  }
  return record.createdAt;
}

function compare(left: string, right: string, direction: 'asc' | 'desc'): number {
  const result = left.localeCompare(right);
  return direction === 'asc' ? result : -result;
}

function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}
