/**
 * FE_10 R6 — the view models. A wire type is shaped by the contract: nullable fields,
 * string instants, enumerated codes. These are shaped by what a screen renders.
 *
 * Keeping them apart is what makes a backend rename a one-file change: the mapper in
 * `todo.transform.ts` is the only thing that sees both shapes, so it is the only thing the
 * type-checker points at when the contract moves.
 *
 * FE_02 R4 — these name the domain, so only an organism may take one as a prop.
 */

export type TodoListStatus = 'active' | 'archived';
export type TodoItemStatus = 'open' | 'completed';

export interface TodoItemView {
  readonly id: string;
  readonly title: string;
  readonly status: TodoItemStatus;
  readonly isCompleted: boolean;
  /** Already formatted for display, or `null` when there is no due date at all. */
  readonly dueLabel: string | null;
  readonly isOverdue: boolean;
}

export interface TodoListSummaryView {
  readonly id: string;
  readonly title: string;
  readonly status: TodoListStatus;
  readonly isArchived: boolean;
  readonly itemCount: number;
  readonly openItemCount: number;
  readonly createdLabel: string;
}

export interface TodoListDetailView extends TodoListSummaryView {
  readonly items: readonly TodoItemView[];
}

export interface TodoActivityView {
  readonly id: string;
  readonly action: string;
  readonly detail: string | null;
  readonly occurredLabel: string;
}

/** The page shape every collection route answers with (BE_07 R5), in view-model terms. */
export interface PageView<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
