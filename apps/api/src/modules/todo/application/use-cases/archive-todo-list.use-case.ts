import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { TodoListMutationService } from '../service/todo-list-mutation.service';

export interface ArchiveTodoListInput {
  readonly listId: string;
}

/**
 * BE_05 R2 — this orchestrates and decides nothing. Whether an already-archived list
 * may be archived again is the status value object's rule (BE_04 R6).
 */
@Injectable()
export class ArchiveTodoListUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: ArchiveTodoListInput): Promise<void> {
    await this.lists.apply(input.listId, (list) => list.archive());

    await this.activity.record({ subjectId: input.listId, action: 'todo-list.archived' });
  }
}
