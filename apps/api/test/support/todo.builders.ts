import { TodoList } from '@app/modules/todo/domain/entity/todo-list.entity';
import { TodoItemId } from '@app/modules/todo/domain/value-object/todo-item-id.vo';
import { TodoListId } from '@app/modules/todo/domain/value-object/todo-list-id.vo';
import { TodoTitle } from '@app/modules/todo/domain/value-object/todo-title.vo';

/**
 * BE_11 R7 / BE_12 R9 — shared builders with deterministic values, so no test copies a
 * literal from its neighbour and no test depends on a random id.
 *
 * BE_11 R8 — the ids are fixed, which is what lets a failing assertion print a value a
 * reader can find in the test above it.
 */

let sequence = 0;

/** A valid, deterministic UUIDv7-shaped id. Unique per call within a test run. */
export function anId(seed?: number): string {
  const n = (seed ?? (sequence += 1)).toString(16).padStart(12, '0');
  return `0199a000-0000-7000-8000-${n}`;
}

export function aListId(seed?: number): TodoListId {
  return TodoListId.of(anId(seed));
}

export function anItemId(seed?: number): TodoItemId {
  return TodoItemId.of(anId(seed));
}

export function aTitle(text = 'Weekend plan'): TodoTitle {
  return TodoTitle.of(text);
}

export interface TodoListBuilderOptions {
  readonly id?: TodoListId;
  readonly title?: string;
  readonly items?: readonly string[];
  readonly archived?: boolean;
}

/** Builds a real aggregate through its own API — never by reaching into private state. */
export function aTodoList(options: TodoListBuilderOptions = {}): TodoList {
  const list = TodoList.create(options.id ?? aListId(), aTitle(options.title));

  for (const itemTitle of options.items ?? []) {
    list.addItem(anItemId(), aTitle(itemTitle), null);
  }
  if (options.archived === true) {
    list.archive();
  }
  return list;
}
