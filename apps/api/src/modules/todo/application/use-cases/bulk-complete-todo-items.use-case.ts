import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { TodoItemId } from '../../domain/value-object/todo-item-id.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';

export interface BulkCompleteTodoItemsInput {
  readonly listId: string;
  readonly itemIds: readonly string[];
}

export interface BulkCompleteTodoItemsResult {
  readonly completedIds: string[];
}

/**
 * BE_06 R9 — the aggregate is loaded once and saved once no matter how many items are
 * named, so the work does not grow a round trip per id. Completing items in a loop of
 * single-item use cases would be the N+1 this rule exists to prevent — and BE_05 R10
 * forbids that shape anyway.
 */
@Injectable()
export class BulkCompleteTodoItemsUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: BulkCompleteTodoItemsInput): Promise<BulkCompleteTodoItemsResult> {
    const itemIds = input.itemIds.map((raw) => TodoItemId.of(raw));

    const completed = await this.lists.apply(input.listId, (list) => list.completeItems(itemIds));

    const completedIds = completed.map((id) => id.toString());
    for (const id of completedIds) {
      await this.activity.record({
        subjectId: input.listId,
        action: 'todo-item.completed',
        detail: id,
      });
    }

    return { completedIds };
  }
}
