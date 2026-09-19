import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FixedClock } from '@test/support/shared.fakes';
import { aTitle, anItemId, anId } from '@test/support/todo.builders';
import { StorageConfig } from '@app/config/configuration';
import { storeMetrics } from '@app/shared/infrastructure/json-file.store';
import { TodoList } from '../../domain/entity/todo-list.entity';
import { DueDate } from '../../domain/value-object/due-date.vo';
import { TodoListId } from '../../domain/value-object/todo-list-id.vo';
import { FileTodoQuery } from '../query/file-todo.query';
import { FileTodoListRepository } from './file-todo-list.repository';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * BE_12 R1 — this is where the code meets something real.
 * BE_12 R2 — the store is a real directory on disk, not an in-memory imitation of one.
 *   This project has no container to run because the filesystem *is* the backing
 *   service; substituting a fake Map here would test nothing the unit tests do not.
 * BE_12 R5 — the adapter is exercised through its port, never through `fs` underneath it.
 */
describe('FileTodoListRepository', () => {
  const clock = new FixedClock(new Date('2026-09-19T10:00:00.000Z'));
  let dataDir: string;
  let repository: FileTodoListRepository;
  let query: FileTodoQuery;

  beforeEach(async () => {
    // BE_12 R3/R4 — each test gets its own directory, so the suite passes alone,
    // repeated, and beside its neighbours with no shared state or ordering.
    dataDir = await mkdtemp(join(tmpdir(), 'todo-repo-'));
    const storage = new StorageConfig(dataDir);
    repository = new FileTodoListRepository(storage, clock);
    query = new FileTodoQuery(storage);
    storeMetrics.reset();
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('returns null for a list that was never saved', async () => {
    expect(await repository.findById(TodoListId.of(anId(404)))).toBeNull();
  });

  it('round-trips an aggregate through the mapper unchanged', async () => {
    // BE_12 R6 — the mapper is tested in both directions: what is saved comes back equal.
    const list = TodoList.create(TodoListId.of(anId(1)), aTitle('Trip'));
    const itemId = anItemId();
    list.addItem(itemId, aTitle('Book flights'), null);
    list.completeItem(itemId);

    await repository.save(list);
    const loaded = await repository.findById(list.identity());

    expect(loaded).not.toBeNull();
    expect(loaded?.snapshot()).toEqual(list.snapshot());
  });

  it('preserves a due date across a save and load', async () => {
    const list = TodoList.create(TodoListId.of(anId(2)), aTitle('Deadlines'));
    list.addItem(anItemId(), aTitle('File taxes'), DueDate.of('2026-12-31T23:59:00.000Z'));

    await repository.save(list);

    const loaded = await repository.findById(list.identity());
    expect(loaded?.snapshot().items[0]?.dueDate).toBe('2026-12-31T23:59:00.000Z');
  });

  it('keeps the original creation timestamp when a list is saved again', async () => {
    const list = TodoList.create(TodoListId.of(anId(3)), aTitle('Trip'));
    await repository.save(list);

    list.addItem(anItemId(), aTitle('Pack'), null);
    await repository.save(list);

    const detail = await query.findListDetail(list.identity().toString(), clock.now());
    expect(detail?.createdAt).toBe('2026-09-19T10:00:00.000Z');
  });

  it('removes a deleted list without disturbing its neighbours', async () => {
    const kept = TodoList.create(TodoListId.of(anId(4)), aTitle('Keep'));
    const removed = TodoList.create(TodoListId.of(anId(5)), aTitle('Remove'));
    await repository.save(kept);
    await repository.save(removed);

    await repository.delete(removed.identity());

    expect(await repository.findById(removed.identity())).toBeNull();
    expect(await repository.findById(kept.identity())).not.toBeNull();
  });

  it('completes many items without a trip to the store per item', async () => {
    const list = TodoList.create(TodoListId.of(anId(6)), aTitle('Big list'));
    const itemIds = Array.from({ length: 25 }, (_, index) => {
      const id = anItemId();
      list.addItem(id, aTitle(`Task ${index}`), null);
      return id;
    });
    await repository.save(list);

    storeMetrics.reset();
    const loaded = await repository.findById(list.identity());
    if (loaded === null) {
      throw new Error('the list saved above should load back');
    }
    loaded.completeItems(itemIds);
    await repository.save(loaded);

    // BE_12 R8 — the cardinality is asserted, so an N+1 fails the build rather than
    // showing up later as a slow endpoint. Twenty-five items, one load and one save.
    expect(storeMetrics.writes).toBe(1);
    expect(storeMetrics.reads).toBeLessThanOrEqual(2);
  });

  it('serializes concurrent saves so no write is lost', async () => {
    const first = TodoList.create(TodoListId.of(anId(7)), aTitle('First'));
    const second = TodoList.create(TodoListId.of(anId(8)), aTitle('Second'));

    // BE_05 R8 — the file store's stand-in for a transaction. Without the queue in
    // json-file.store.ts one of these read-modify-write cycles would clobber the other.
    await Promise.all([repository.save(first), repository.save(second)]);

    expect(await repository.findById(first.identity())).not.toBeNull();
    expect(await repository.findById(second.identity())).not.toBeNull();
  });
});
