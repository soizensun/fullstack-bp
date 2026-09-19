import { DueDate } from '../value-object/due-date.vo';
import { ItemStatus, type ItemStatusName } from '../value-object/item-status.vo';
import { TodoItemId } from '../value-object/todo-item-id.vo';
import { TodoTitle } from '../value-object/todo-title.vo';

/** BE_04 R3 — the explicit snapshot. The only way data leaves the entity. */
export interface TodoItemSnapshot {
  readonly id: string;
  readonly title: string;
  readonly status: ItemStatusName;
  readonly dueDate: string | null;
}

/**
 * An item inside a list.
 *
 * BE_04 R8 — this is *inside* the {@link TodoList} consistency boundary. Its mutators
 * are called by the aggregate root and by nothing else; a use case that reached in
 * here directly could break an invariant the list is responsible for.
 */
export class TodoItem {
  // BE_04 R3 — every field private.
  private constructor(
    private readonly id: TodoItemId,
    private title: TodoTitle,
    private status: ItemStatus,
    private dueDate: DueDate | null,
  ) {}

  /** BE_04 R2 — named factory, validated before it returns. */
  static add(id: TodoItemId, title: TodoTitle, dueDate: DueDate | null): TodoItem {
    return new TodoItem(id, title, ItemStatus.open(), dueDate);
  }

  /** Rebuilds a stored item. The mapper is the only caller (BE_06 R4). */
  static restore(snapshot: TodoItemSnapshot): TodoItem {
    return new TodoItem(
      TodoItemId.of(snapshot.id),
      TodoTitle.of(snapshot.title),
      ItemStatus.fromName(snapshot.status),
      snapshot.dueDate === null ? null : DueDate.of(snapshot.dueDate),
    );
  }

  identity(): TodoItemId {
    return this.id;
  }

  hasTitle(title: TodoTitle): boolean {
    return this.title.matches(title);
  }

  get isCompleted(): boolean {
    return this.status.isCompleted;
  }

  // BE_04 R4 — named for the business action, in the glossary's words.
  complete(): void {
    this.status = this.status.complete();
  }

  reopen(): void {
    this.status = this.status.reopen();
  }

  rename(title: TodoTitle): void {
    this.title = title;
  }

  reschedule(dueDate: DueDate | null): void {
    this.dueDate = dueDate;
  }

  isOverdueAt(now: Date): boolean {
    return !this.isCompleted && this.dueDate !== null && this.dueDate.isOverdueAt(now);
  }

  snapshot(): TodoItemSnapshot {
    return {
      id: this.id.toString(),
      title: this.title.toString(),
      status: this.status.toString(),
      dueDate: this.dueDate?.toISOString() ?? null,
    };
  }
}
