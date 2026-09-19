import type { ItemStatusName } from '../../domain/value-object/item-status.vo';
import type { ListStatusName } from '../../domain/value-object/list-status.vo';

/**
 * BE_05 R7 — the plain data a use case returns. Never a domain entity, never a stored
 * record, and never a transport type: the controller maps these to a response DTO.
 *
 * BE_06 R7 — read projections. A query service returns these; a repository never does.
 */

export interface TodoItemView {
  readonly id: string;
  readonly title: string;
  readonly status: ItemStatusName;
  readonly dueDate: string | null;
  readonly isOverdue: boolean;
}

export interface TodoListSummaryView {
  readonly id: string;
  readonly title: string;
  readonly status: ListStatusName;
  readonly itemCount: number;
  readonly openItemCount: number;
  readonly createdAt: string;
}

export interface TodoListDetailView extends TodoListSummaryView {
  readonly items: TodoItemView[];
}

/** BE_07 R5 — one page shape, used by every collection route. */
export interface Page<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
