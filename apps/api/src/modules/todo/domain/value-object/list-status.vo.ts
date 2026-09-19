import { TodoListAlreadyArchivedError } from '../todo.errors';

export type ListStatusName = 'active' | 'archived';

/** BE_04 R6 — see {@link ItemStatus}. A list archives once and reopens from archive. */
export class ListStatus {
  private constructor(private readonly value: ListStatusName) {}

  static active(): ListStatus {
    return new ListStatus('active');
  }

  static archived(): ListStatus {
    return new ListStatus('archived');
  }

  /** Rebuilds a status from storage. The mapper is the only caller (BE_06 R4). */
  static fromName(name: ListStatusName): ListStatus {
    return new ListStatus(name);
  }

  get isArchived(): boolean {
    return this.value === 'archived';
  }

  archive(): ListStatus {
    if (this.isArchived) {
      throw new TodoListAlreadyArchivedError();
    }
    return new ListStatus('archived');
  }

  equals(other: ListStatus): boolean {
    return this.value === other.value;
  }

  toString(): ListStatusName {
    return this.value;
  }
}
