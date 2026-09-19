/**
 * BE_03 R2/R6 — the plain data that crosses this module's published ports.
 * No entity and no persistence record ever leaves the barrel, so a consumer
 * cannot come to depend on how activity is modelled or stored in here.
 */

/** What happened. A consumer matches on this, so the values are stable (BE_09 R3 in spirit). */
export type ActivityAction =
  | 'todo-list.created'
  | 'todo-list.renamed'
  | 'todo-list.archived'
  | 'todo-list.deleted'
  | 'todo-item.added'
  | 'todo-item.completed'
  | 'todo-item.reopened'
  | 'todo-item.renamed'
  | 'todo-item.removed';

/** What a caller asks to be recorded. */
export interface RecordActivityCommand {
  /** The thing the activity is about — a todo list id here. */
  readonly subjectId: string;
  readonly action: ActivityAction;
  /** Free-form detail for humans reading the log. Never used for branching. */
  readonly detail?: string;
}

/** What a caller gets back when reading activity. */
export interface ActivityEntryView {
  readonly id: string;
  readonly subjectId: string;
  readonly action: ActivityAction;
  readonly detail: string | null;
  /** ISO-8601 UTC instant (GEN_11). */
  readonly occurredAt: string;
}
