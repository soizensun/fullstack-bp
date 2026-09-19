import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { TodoItemId } from '../../domain/value-object/todo-item-id.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';

export interface CompleteTodoItemInput {
  readonly listId: string;
  readonly itemId: string;
}

@Injectable()
export class CompleteTodoItemUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: CompleteTodoItemInput): Promise<void> {
    const itemId = TodoItemId.of(input.itemId);

    // BE_04 R8 — the item is changed through the aggregate root, never fetched and
    // mutated on its own, so the list can still enforce rules that span its items.
    await this.lists.apply(input.listId, (list) => list.completeItem(itemId));

    await this.activity.record({
      subjectId: input.listId,
      action: 'todo-item.completed',
      detail: input.itemId,
    });
  }
}
