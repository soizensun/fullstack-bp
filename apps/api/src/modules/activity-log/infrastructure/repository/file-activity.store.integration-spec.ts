import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FixedClock, SequenceIdGenerator } from '@test/support/fakes';
import { anId } from '@test/support/todo.builders';
import { StorageConfig } from '@app/config/configuration';
import { ReadActivityUseCase } from '../../application/use-cases/read-activity.use-case';
import { RecordActivityUseCase } from '../../application/use-cases/record-activity.use-case';
import { FileActivityStore } from './file-activity.store';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * BE_12 R7 — a contract test for this module's published ports, written from what a
 * consumer expects: todo records activity and later reads it back. It goes through
 * `RecordActivityPort` / `ReadActivityPort` rather than the store, so the test still
 * passes if the storage behind them is replaced.
 */
describe('activity-log published ports', () => {
  const clock = new FixedClock(new Date('2026-09-19T10:00:00.000Z'));
  let dataDir: string;
  let record: RecordActivityUseCase;
  let read: ReadActivityUseCase;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'activity-'));
    const store = new FileActivityStore(new StorageConfig(dataDir));
    record = new RecordActivityUseCase(
      store,
      clock,
      new SequenceIdGenerator([anId(1), anId(2), anId(3)]),
    );
    read = new ReadActivityUseCase(store);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('returns an empty list for a subject with no activity', async () => {
    // BE_06 R8 — `[]`, never a throw.
    expect(await read.recentFor(anId(99), 10)).toEqual([]);
  });

  it('reads back what was recorded, as plain data', async () => {
    const subjectId = anId(50);

    await record.record({ subjectId, action: 'todo-list.created', detail: 'Groceries' });
    const entries = await read.recentFor(subjectId, 10);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      id: anId(1),
      subjectId,
      action: 'todo-list.created',
      detail: 'Groceries',
      occurredAt: '2026-09-19T10:00:00.000Z',
    });
  });

  it('defaults a missing detail to null rather than dropping the field', async () => {
    const subjectId = anId(51);

    await record.record({ subjectId, action: 'todo-list.archived' });

    expect((await read.recentFor(subjectId, 10))[0]?.detail).toBeNull();
  });

  it('keeps the activity of one subject out of another', async () => {
    await record.record({ subjectId: anId(60), action: 'todo-list.created' });
    await record.record({ subjectId: anId(61), action: 'todo-list.created' });

    expect(await read.recentFor(anId(60), 10)).toHaveLength(1);
  });

  it('honours the requested limit', async () => {
    const subjectId = anId(70);
    await record.record({ subjectId, action: 'todo-item.added' });
    await record.record({ subjectId, action: 'todo-item.completed' });

    expect(await read.recentFor(subjectId, 1)).toHaveLength(1);
  });
});
