import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { StorageConfig } from '@app/config/configuration';
import { Clock } from '@app/shared/application/clock.port';
import { mutateJsonFile, readJsonFile } from '@app/shared/infrastructure/json-file.store';
import { TodoListRepository } from '../../domain/repository/todo-list.repository.port';
import type { TodoList } from '../../domain/entity/todo-list.entity';
import { TodoTitle } from '../../domain/value-object/todo-title.vo';
import type { TodoListId } from '../../domain/value-object/todo-list-id.vo';
import type { TodoListRecords } from '../entity/todo-list.record';
import { TodoListMapper } from '../mapper/todo-list.mapper';

/**
 * BE_06 R1 — the outward end of {@link TodoListRepository}.
 * BE_06 R5 — along with the query adapter, one of the few files that names the store.
 * BE_06 R6 — one repository for the whole aggregate: a list and its items load and
 *   save together, never item by item.
 */
@Injectable()
export class FileTodoListRepository extends TodoListRepository {
  constructor(
    private readonly storage: StorageConfig,
    private readonly clock: Clock,
  ) {
    super();
  }

  async findById(id: TodoListId): Promise<TodoList | null> {
    const records = await this.readAll();
    const record = records[id.toString()];

    // BE_06 R2 — absence is `null`. Turning it into a failure belongs to the use case.
    return record === undefined ? null : TodoListMapper.toDomain(record);
  }

  async findByTitle(title: TodoTitle): Promise<TodoList | null> {
    const records = await this.readAll();

    const match = Object.values(records).find((record) =>
      TodoTitle.of(record.title).matches(title),
    );
    return match === undefined ? null : TodoListMapper.toDomain(match);
  }

  /** BE_06 R3 — returns `void`; the caller already holds the aggregate it saved. */
  async save(list: TodoList): Promise<void> {
    const id = list.identity().toString();
    const now = this.clock.now();

    // BE_05 R8 — one serialized read-modify-write is this store's unit of work.
    await mutateJsonFile<TodoListRecords>(this.filePath(), (current) => {
      const records = current ?? {};
      return { ...records, [id]: TodoListMapper.toRecord(list, now, records[id] ?? null) };
    });
  }

  async delete(id: TodoListId): Promise<void> {
    await mutateJsonFile<TodoListRecords>(this.filePath(), (current) => {
      const records = { ...(current ?? {}) };
      delete records[id.toString()];
      return records;
    });
  }

  private async readAll(): Promise<TodoListRecords> {
    return (await readJsonFile<TodoListRecords>(this.filePath())) ?? {};
  }

  private filePath(): string {
    return join(this.storage.dataDir, 'todo-lists.json');
  }
}
