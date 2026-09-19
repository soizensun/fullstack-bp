import type { RecordActivityCommand } from '../types/activity.types';

/**
 * BE_03 R5 — declared in the *provider*, named for the action the consumer wants
 * ("record activity"), not for the thing that happens to implement it.
 *
 * BE_03 R10 — a consumer injects this. It never names `ActivityLogModule` outside
 * its own module file.
 */
export abstract class RecordActivityPort {
  abstract record(command: RecordActivityCommand): Promise<void>;
}
