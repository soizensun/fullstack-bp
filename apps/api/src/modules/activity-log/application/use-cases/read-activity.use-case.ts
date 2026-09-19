import { Injectable } from '@nestjs/common';
import { ActivityStore } from '../port/activity-store.port';
import type { ActivityEntryView } from '../../domain/types/activity.types';
import { ReadActivityPort } from '../../domain/port/read-activity.port';

/**
 * BE_05 R3 — a query: it answers a question and changes nothing.
 * BE_06 R8 — returns a projection or `[]`, never a stored record and never a throw.
 */
@Injectable()
export class ReadActivityUseCase extends ReadActivityPort {
  constructor(private readonly store: ActivityStore) {
    super();
  }

  async recentFor(subjectId: string, limit: number): Promise<ActivityEntryView[]> {
    const records = await this.store.readBySubject(subjectId, limit);

    // BE_03 R6 — the stored record is mapped to the published view before it leaves.
    return records.map((record) => ({
      id: record.id,
      subjectId: record.subjectId,
      action: record.action,
      detail: record.detail,
      occurredAt: record.occurredAt,
    }));
  }
}
