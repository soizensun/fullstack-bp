import { TodoItem, type TodoItemSnapshot } from './todo-item.entity';
import {
  ArchivedTodoListNotModifiableError,
  DuplicateTodoItemTitleError,
  TodoItemNotInListError,
} from '../todo.errors';
import type { DueDate } from '../value-object/due-date.vo';
import { ListStatus, type ListStatusName } from '../value-object/list-status.vo';
import type { TodoItemId } from '../value-object/todo-item-id.vo';
import { TodoListId } from '../value-object/todo-list-id.vo';
import { TodoTitle } from '../value-object/todo-title.vo';

/** BE_04 R3 — the explicit snapshot for the whole aggregate. */
export interface TodoListSnapshot {
  readonly id: string;
  readonly title: string;
  readonly status: ListStatusName;
  readonly items: readonly TodoItemSnapshot[];
}

/**
 * The aggregate root.
 *
 * BE_04 R8 — one consistency boundary: a list and its items. Every change to an item
 * goes through a method here, which is what lets this class hold rules that span them
 * both, such as "no two items in the same list share a title".
 *
 * BE_04 R9 / BE_02 R3 — no framework type, no decorator, no persistence concern and no
 * audit timestamp appears here. `createdAt` belongs to the stored record, not the model.
 */
export class TodoList {
  private constructor(
    private readonly id: TodoListId,
    private title: TodoTitle,
    private status: ListStatus,
    private readonly items: TodoItem[],
  ) {}

  /** BE_04 R2 — construction goes through a named factory that validates first. */
  static create(id: TodoListId, title: TodoTitle): TodoList {
    return new TodoList(id, title, ListStatus.active(), []);
  }

  /** Rebuilds a stored aggregate. The mapper is the only caller (BE_06 R4). */
  static restore(snapshot: TodoListSnapshot): TodoList {
    return new TodoList(
      TodoListId.of(snapshot.id),
      TodoTitle.of(snapshot.title),
      ListStatus.fromName(snapshot.status),
      snapshot.items.map((item) => TodoItem.restore(item)),
    );
  }

  identity(): TodoListId {
    return this.id;
  }

  get isArchived(): boolean {
    return this.status.isArchived;
  }

  rename(title: TodoTitle): void {
    this.refuseWhenArchived();
    this.title = title;
  }

  archive(): void {
    // BE_04 R6 — the status value object owns whether this transition is legal.
    this.status = this.status.archive();
  }

  /**
   * BE_04 R1 — the uniqueness rule lives here because the aggregate is the only thing
   * that can see every item at once. Contrast with the *list* title uniqueness rule,
   * which spans aggregates and so belongs to a use case (BE_05 R6).
   */
  addItem(id: TodoItemId, title: TodoTitle, dueDate: DueDate | null): TodoItem {
    this.refuseWhenArchived();

    if (this.items.some((item) => item.hasTitle(title))) {
      throw new DuplicateTodoItemTitleError();
    }

    const item = TodoItem.add(id, title, dueDate);
    this.items.push(item);
    return item;
  }

  completeItem(itemId: TodoItemId): void {
    this.refuseWhenArchived();
    this.itemOrThrow(itemId).complete();
  }

  reopenItem(itemId: TodoItemId): void {
    this.refuseWhenArchived();
    this.itemOrThrow(itemId).reopen();
  }

  renameItem(itemId: TodoItemId, title: TodoTitle): void {
    this.refuseWhenArchived();

    const target = this.itemOrThrow(itemId);
    const clashes = this.items.some(
      (item) => !item.identity().equals(itemId) && item.hasTitle(title),
    );
    if (clashes) {
      throw new DuplicateTodoItemTitleError();
    }

    target.rename(title);
  }

  removeItem(itemId: TodoItemId): void {
    this.refuseWhenArchived();

    const index = this.items.findIndex((item) => item.identity().equals(itemId));
    if (index === -1) {
      throw new TodoItemNotInListError();
    }
    this.items.splice(index, 1);
  }

  /**
   * Completes many items in one pass over the loaded aggregate.
   *
   * BE_06 R9 — the caller loads the list once and completes N items, so the work does
   * not grow a round trip per item. Already-completed items are skipped rather than
   * refused, which is what makes a retried bulk request safe.
   *
   * @returns the ids that changed from open to completed.
   */
  completeItems(itemIds: readonly TodoItemId[]): TodoItemId[] {
    this.refuseWhenArchived();

    const completed: TodoItemId[] = [];
    for (const itemId of itemIds) {
      const item = this.itemOrThrow(itemId);
      if (!item.isCompleted) {
        item.complete();
        completed.push(itemId);
      }
    }
    return completed;
  }

  snapshot(): TodoListSnapshot {
    return {
      id: this.id.toString(),
      title: this.title.toString(),
      status: this.status.toString(),
      items: this.items.map((item) => item.snapshot()),
    };
  }

  private itemOrThrow(itemId: TodoItemId): TodoItem {
    const item = this.items.find((candidate) => candidate.identity().equals(itemId));
    if (item === undefined) {
      throw new TodoItemNotInListError();
    }
    return item;
  }

  // BE_04 R7 — one place names the condition, so every mutator refuses it identically.
  private refuseWhenArchived(): void {
    if (this.status.isArchived) {
      throw new ArchivedTodoListNotModifiableError();
    }
  }
}
