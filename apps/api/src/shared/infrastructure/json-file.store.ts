import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * A small file-backed store used by the example modules in place of a database.
 *
 * BE_06 R5 — the store is named here and in the adapters that wrap it, nowhere else.
 * BE_05 R8 — a file has no transactions, so a write is made atomic by writing a
 * temporary file and renaming it over the target; a reader sees the old bytes or the
 * new bytes, never a half-written file. Writes to the same path are serialized below
 * so two concurrent callers cannot interleave a read-modify-write.
 */

/** One promise chain per path, so read-modify-write cycles queue instead of racing. */
const writeQueues = new Map<string, Promise<unknown>>();

/**
 * Counts trips to disk.
 *
 * BE_12 R8 — an integration test asserts this where cardinality matters, so an N+1
 * fails the build instead of showing up on a dashboard later. Without a database there
 * is no query log to read, so the store keeps the count itself.
 */
export const storeMetrics = {
  reads: 0,
  writes: 0,
  reset(): void {
    storeMetrics.reads = 0;
    storeMetrics.writes = 0;
  },
};

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  storeMetrics.reads += 1;
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

/** Replaces the file's contents atomically. */
export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  storeMetrics.writes += 1;
  await mkdir(dirname(filePath), { recursive: true });

  const temporaryPath = join(dirname(filePath), `.${randomBytes(8).toString('hex')}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

/**
 * Runs a read-modify-write against one path with no other mutation interleaved.
 * This is the file-store stand-in for the single transaction BE_05 R8 asks for.
 */
export async function mutateJsonFile<T>(
  filePath: string,
  mutate: (current: T | null) => T | Promise<T>,
): Promise<void> {
  const previous = writeQueues.get(filePath) ?? Promise.resolve();

  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const current = await readJsonFile<T>(filePath);
      await writeJsonFile(filePath, await mutate(current));
    });

  writeQueues.set(filePath, next);
  try {
    await next;
  } finally {
    if (writeQueues.get(filePath) === next) {
      writeQueues.delete(filePath);
    }
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}
