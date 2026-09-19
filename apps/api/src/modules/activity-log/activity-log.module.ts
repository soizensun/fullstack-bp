import { Module } from '@nestjs/common';
import { ActivityStore } from './application/port/activity-store.port';
import { ReadActivityPort } from './domain/port/read-activity.port';
import { ReadActivityUseCase } from './application/use-cases/read-activity.use-case';
import { RecordActivityPort } from './domain/port/record-activity.port';
import { RecordActivityUseCase } from './application/use-cases/record-activity.use-case';
import { FileActivityStore } from './infrastructure/repository/file-activity.store';

/**
 * BE_02 R8 — every contract is bound to its implementation here and nowhere else.
 * BE_03 R2 — only the published ports are exported; `ActivityStore` stays internal.
 */
@Module({
  providers: [
    { provide: ActivityStore, useClass: FileActivityStore },
    { provide: RecordActivityPort, useClass: RecordActivityUseCase },
    { provide: ReadActivityPort, useClass: ReadActivityUseCase },
  ],
  exports: [RecordActivityPort, ReadActivityPort],
})
export class ActivityLogModule {}
