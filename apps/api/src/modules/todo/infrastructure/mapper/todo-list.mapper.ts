import { TodoList } from '../../domain/entity/todo-list.entity';
import type { TodoItemRecord, TodoListRecord } from '../entity/todo-list.record';

/**
 * BE_06 R4 — the only thing in the application that knows both the stored record and
 * the domain entity. Every other file knows exactly one of the two, which is what lets
 * the storage format change without the model moving.
 */
export class TodoListMapper {
  /** Record → entity. */
  static toDomain(record: TodoListRecord): TodoList {
    return TodoList.restore({
      id: record.id,
      title: record.title,
      status: record.status,
      items: record.items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        dueDate: item.dueDate,
      })),
    });
  }

  /**
   * Entity → record.
   *
   * The audit timestamps are not in the snapshot (BE_04 R9), so they are carried over
   * from the record that was loaded, and minted from `now` for rows that are new.
   */
  static toRecord(list: TodoList, now: Date, previous: TodoListRecord | null): TodoListRecord {
    const snapshot = list.snapshot();
    const timestamp = now.toISOString();
    const previousItems = new Map((previous?.items ?? []).map((item) => [item.id, item]));

    const items: TodoItemRecord[] = snapshot.items.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      dueDate: item.dueDate,
      createdAt: previousItems.get(item.id)?.createdAt ?? timestamp,
    }));

    return {
      id: snapshot.id,
      title: snapshot.title,
      status: snapshot.status,
      items,
      createdAt: previous?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
  }
}
