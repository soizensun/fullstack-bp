import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { StorageConfig } from '@app/config/configuration';
import { mutateJsonFile, readJsonFile } from '@app/shared/infrastructure/json-file.store';
import {
  type IdempotentResult,
  IdempotencyStore,
} from '../../application/port/idempotency-store.port';

type IdempotencyRecords = Record<string, IdempotentResult>;

/** BE_02 R6 — the outward end of {@link IdempotencyStore}. */
@Injectable()
export class FileIdempotencyStore extends IdempotencyStore {
  constructor(private readonly storage: StorageConfig) {
    super();
  }

  async find(key: string): Promise<IdempotentResult | null> {
    const records = (await readJsonFile<IdempotencyRecords>(this.filePath())) ?? {};
    return records[key] ?? null;
  }

  async remember(key: string, result: IdempotentResult): Promise<void> {
    await mutateJsonFile<IdempotencyRecords>(this.filePath(), (current) => ({
      ...(current ?? {}),
      [key]: result,
    }));
  }

  private filePath(): string {
    return join(this.storage.dataDir, 'idempotency-keys.json');
  }
}
