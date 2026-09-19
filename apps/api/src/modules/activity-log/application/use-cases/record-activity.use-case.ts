import { Injectable } from '@nestjs/common';
import { Clock } from '@app/shared/application/clock.port';
import { IdGenerator } from '@app/shared/application/id-generator.port';
import { ActivityStore } from '../port/activity-store.port';
import type { RecordActivityCommand } from '../../domain/types/activity.types';
import { RecordActivityPort } from '../../domain/port/record-activity.port';

/**
 * BE_05 R1 — one use case, one public method.
 * BE_04 R10 — an activity entry carries no rules, so there is no entity for it.
 *   The record is assembled here and stored; inventing a domain class would add a
 *   layer that enforces nothing.
 */
@Injectable()
export class RecordActivityUseCase extends RecordActivityPort {
  constructor(
    private readonly store: ActivityStore,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {
    super();
  }

  async record(command: RecordActivityCommand): Promise<void> {
    await this.store.append({
      id: this.idGenerator.next(),
      subjectId: command.subjectId,
      action: command.action,
      detail: command.detail ?? null,
      occurredAt: this.clock.now().toISOString(),
    });
  }
}
