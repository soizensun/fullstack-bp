import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { TodoItemId } from '../../domain/value-object/todo-item-id.vo';
import { TodoTitle } from '../../domain/value-object/todo-title.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';

export interface RenameTodoItemInput {
  readonly listId: string;
  readonly itemId: string;
  readonly title: string;
}

@Injectable()
export class RenameTodoItemUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: RenameTodoItemInput): Promise<void> {
    const itemId = TodoItemId.of(input.itemId);
    const title = TodoTitle.of(input.title);

    await this.lists.apply(input.listId, (list) => list.renameItem(itemId, title));

    await this.activity.record({
      subjectId: input.listId,
      action: 'todo-item.renamed',
      detail: title.toString(),
    });
  }
}
