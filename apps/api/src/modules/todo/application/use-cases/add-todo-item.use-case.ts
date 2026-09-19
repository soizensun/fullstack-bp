import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { IdGenerator } from '@app/shared/application/id-generator.port';
import { DueDate } from '../../domain/value-object/due-date.vo';
import { TodoItemId } from '../../domain/value-object/todo-item-id.vo';
import { TodoTitle } from '../../domain/value-object/todo-title.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';

export interface AddTodoItemInput {
  readonly listId: string;
  readonly title: string;
  /** ISO-8601 instant, or absent for an item with no deadline. */
  readonly dueDate?: string | undefined;
}

export interface AddTodoItemResult {
  readonly id: string;
}

@Injectable()
export class AddTodoItemUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly idGenerator: IdGenerator,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: AddTodoItemInput): Promise<AddTodoItemResult> {
    const title = TodoTitle.of(input.title);
    const dueDate = input.dueDate === undefined ? null : DueDate.of(input.dueDate);
    const itemId = TodoItemId.of(this.idGenerator.next());

    // BE_05 R2 — the duplicate-title rule inside a list is the aggregate's, not this
    // method's. Asking the domain is what keeps the rule in one place.
    await this.lists.apply(input.listId, (list) => list.addItem(itemId, title, dueDate));

    await this.activity.record({
      subjectId: input.listId,
      action: 'todo-item.added',
      detail: title.toString(),
    });

    return { id: itemId.toString() };
  }
}
