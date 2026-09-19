import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { TodoItemId } from '../../domain/value-object/todo-item-id.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';

export interface RemoveTodoItemInput {
  readonly listId: string;
  readonly itemId: string;
}

@Injectable()
export class RemoveTodoItemUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: RemoveTodoItemInput): Promise<void> {
    const itemId = TodoItemId.of(input.itemId);

    await this.lists.apply(input.listId, (list) => list.removeItem(itemId));

    await this.activity.record({
      subjectId: input.listId,
      action: 'todo-item.removed',
      detail: input.itemId,
    });
  }
}
