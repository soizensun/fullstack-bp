import type { ActivityAction } from '../../domain/types/activity.types';

/**
 * The stored shape of one activity entry.
 *
 * BE_03 R3 — never exported from the barrel. It is separate from `ActivityEntryView`
 * on purpose: the wire/consumer shape and the stored shape are allowed to drift apart.
 */
export interface ActivityEntryRecord {
  readonly id: string;
  readonly subjectId: string;
  readonly action: ActivityAction;
  readonly detail: string | null;
  readonly occurredAt: string;
}
