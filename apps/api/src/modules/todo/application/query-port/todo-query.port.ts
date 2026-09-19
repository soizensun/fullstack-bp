import type { ItemStatusName } from '../../domain/value-object/item-status.vo';
import type { Page, TodoItemView, TodoListDetailView, TodoListSummaryView } from '../types/todo.views';

/** BE_07 R6 — sorting is a closed set, declared once here rather than per caller. */
export type TodoListSort = 'createdAt' | 'title';
export type TodoItemSort = 'createdAt' | 'dueDate' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface ListTodoListsCriteria {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: 'active' | 'archived';
  readonly sort: TodoListSort;
  readonly direction: SortDirection;
}

export interface ListTodoItemsCriteria {
  readonly listId: string;
  readonly page: number;
  readonly pageSize: number;
  readonly status?: ItemStatusName;
  readonly sort: TodoItemSort;
  readonly direction: SortDirection;
}

/**
 * BE_05 R4 / BE_06 R7 — the read side. Queries come through this contract and never
 * load an aggregate, because rebuilding a whole list to count its items is work that
 * buys nothing.
 *
 * BE_06 R8 — every method returns a projection, `null` or `[]`. Never a record, never
 * an entity, and never a thrown workflow error.
 */
export abstract class TodoQuery {
  abstract findListDetail(listId: string, now: Date): Promise<TodoListDetailView | null>;

  abstract listSummaries(criteria: ListTodoListsCriteria): Promise<Page<TodoListSummaryView>>;

  abstract listItems(criteria: ListTodoItemsCriteria, now: Date): Promise<Page<TodoItemView> | null>;
}
