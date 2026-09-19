import type { ItemStatusName } from '../../domain/value-object/item-status.vo';
import type { ListStatusName } from '../../domain/value-object/list-status.vo';

/**
 * The stored shape of a todo list.
 *
 * BE_06 R10 — derived from the domain, not the other way round: the fields here exist
 * because the model has them. The two audit timestamps are the exception, and they are
 * exactly why this type is separate — BE_04 R9 keeps them out of the entity.
 *
 * BE_08 R5 — this never reaches the wire. The controller answers with a response DTO.
 */
export interface TodoItemRecord {
  readonly id: string;
  readonly title: string;
  readonly status: ItemStatusName;
  readonly dueDate: string | null;
  readonly createdAt: string;
}

export interface TodoListRecord {
  readonly id: string;
  readonly title: string;
  readonly status: ListStatusName;
  readonly items: readonly TodoItemRecord[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The whole file: list id → record. */
export type TodoListRecords = Record<string, TodoListRecord>;
