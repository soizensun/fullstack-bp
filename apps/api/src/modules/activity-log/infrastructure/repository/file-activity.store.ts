import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { StorageConfig } from '@app/config/configuration';
import { mutateJsonFile, readJsonFile } from '@app/shared/infrastructure/json-file.store';
import { ActivityStore } from '../../application/port/activity-store.port';
import type { ActivityEntryRecord } from '../../application/types/activity.record';

/**
 * BE_02 R6 / BE_06 R5 — the outward end of {@link ActivityStore}. This file and the
 * module file are the only places that know activity lives in a JSON file.
 */
@Injectable()
export class FileActivityStore extends ActivityStore {
  constructor(private readonly storage: StorageConfig) {
    super();
  }

  async append(entry: ActivityEntryRecord): Promise<void> {
    // BE_05 R8 — serialized read-modify-write; two concurrent appends cannot clobber.
    await mutateJsonFile<ActivityEntryRecord[]>(this.filePath(), (current) => [...(current ?? []), entry]);
  }

  async readBySubject(subjectId: string, limit: number): Promise<ActivityEntryRecord[]> {
    const all = (await readJsonFile<ActivityEntryRecord[]>(this.filePath())) ?? [];

    return all
      .filter((entry) => entry.subjectId === subjectId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, limit);
  }

  private filePath(): string {
    return join(this.storage.dataDir, 'activity-log.json');
  }
}
