import type { ActivityEntryRecord } from '../types/activity.record';

/**
 * BE_02 R6 — this module's own outward dependency. Internal: it is deliberately
 * not re-exported from the barrel, so no other module can reach the store shape.
 */
export abstract class ActivityStore {
  abstract append(entry: ActivityEntryRecord): Promise<void>;

  abstract readBySubject(subjectId: string, limit: number): Promise<ActivityEntryRecord[]>;
}
