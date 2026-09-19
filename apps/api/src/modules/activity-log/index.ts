/**
 * BE_01 R4 / BE_03 R2 — the module's entire public surface: its Nest module, its
 * published ports, and the types those ports use.
 *
 * BE_03 R3 — no entity, store port, use case or record shape appears here. Adding
 * one would let another module depend on how this one works rather than on what it offers.
 */
export { ActivityLogModule } from './activity-log.module';
export { RecordActivityPort } from './domain/port/record-activity.port';
export { ReadActivityPort } from './domain/port/read-activity.port';
export type {
  ActivityAction,
  ActivityEntryView,
  RecordActivityCommand,
} from './domain/types/activity.types';
