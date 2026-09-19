import type {
  ActivityEntryView,
  RecordActivityCommand,
} from '@app/modules/activity-log';
import { ReadActivityPort, RecordActivityPort } from '@app/modules/activity-log';
import type {
  IdempotentResult,
} from '@app/modules/todo/application/port/idempotency-store.port';
import { IdempotencyStore } from '@app/modules/todo/application/port/idempotency-store.port';
import { TodoListRepository } from '@app/modules/todo/domain/repository/todo-list.repository.port';
import type { TodoList } from '@app/modules/todo/domain/entity/todo-list.entity';
import type { TodoListId } from '@app/modules/todo/domain/value-object/todo-list-id.vo';
import { TodoTitle } from '@app/modules/todo/domain/value-object/todo-title.vo';
import { Clock } from '@app/shared/application/clock.port';
import { IdGenerator } from '@app/shared/application/id-generator.port';

/**
 * BE_11 R5 — unit tests substitute *ports* and use the real domain objects. These fakes
 * implement the contract honestly rather than recording calls, so a test asserts an
 * outcome (BE_11 R6) instead of asserting that a method was called.
 */

export class FixedClock extends Clock {
  constructor(private readonly instant: Date) {
    super();
  }

  now(): Date {
    return new Date(this.instant.getTime());
  }
}

export class SequenceIdGenerator extends IdGenerator {
  private index = 0;

  constructor(private readonly ids: readonly string[]) {
    super();
  }

  next(): string {
    const id = this.ids[this.index];
    if (id === undefined) {
      throw new Error(`SequenceIdGenerator ran out after ${this.ids.length} ids.`);
    }
    this.index += 1;
    return id;
  }
}

export class InMemoryTodoListRepository extends TodoListRepository {
  private readonly lists = new Map<string, TodoList>();

  async findById(id: TodoListId): Promise<TodoList | null> {
    return this.lists.get(id.toString()) ?? null;
  }

  async findByTitle(title: TodoTitle): Promise<TodoList | null> {
    for (const list of this.lists.values()) {
      if (TodoTitle.of(list.snapshot().title).matches(title)) {
        return list;
      }
    }
    return null;
  }

  async save(list: TodoList): Promise<void> {
    this.lists.set(list.identity().toString(), list);
  }

  async delete(id: TodoListId): Promise<void> {
    this.lists.delete(id.toString());
  }

  /** Test-only read, so an assertion never reaches into private state (BE_11 R4). */
  contents(): TodoList[] {
    return [...this.lists.values()];
  }
}

export class RecordingActivityPort extends RecordActivityPort {
  readonly recorded: RecordActivityCommand[] = [];

  async record(command: RecordActivityCommand): Promise<void> {
    this.recorded.push(command);
  }
}

export class EmptyReadActivityPort extends ReadActivityPort {
  async recentFor(): Promise<ActivityEntryView[]> {
    return [];
  }
}

export class InMemoryIdempotencyStore extends IdempotencyStore {
  private readonly entries = new Map<string, IdempotentResult>();

  async find(key: string): Promise<IdempotentResult | null> {
    return this.entries.get(key) ?? null;
  }

  async remember(key: string, result: IdempotentResult): Promise<void> {
    this.entries.set(key, result);
  }
}
