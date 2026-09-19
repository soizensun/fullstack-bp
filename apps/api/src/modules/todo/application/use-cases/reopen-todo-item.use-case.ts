import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { TodoItemId } from '../../domain/value-object/todo-item-id.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';

export interface ReopenTodoItemInput {
  readonly listId: string;
  readonly itemId: string;
}

@Injectable()
export class ReopenTodoItemUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: ReopenTodoItemInput): Promise<void> {
    const itemId = TodoItemId.of(input.itemId);

    await this.lists.apply(input.listId, (list) => list.reopenItem(itemId));

    await this.activity.record({
      subjectId: input.listId,
      action: 'todo-item.reopened',
      detail: input.itemId,
    });
  }
}
