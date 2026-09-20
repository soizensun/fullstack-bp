import { Injectable } from '@nestjs/common';
import { RecordActivityPort } from '@app/modules/activity-log';
import { TodoListRepository } from '../../domain/repository/todo-list.repository.port';
import { TodoTitle } from '../../domain/value-object/todo-title.vo';
import { TodoListMutationService } from '../service/todo-list-mutation.service';
import { DuplicateTodoListTitleError } from '../todo.errors';

export interface RenameTodoListInput {
  readonly listId: string;
  readonly title: string;
}

/** BE_05 R3 — changes state only. */
@Injectable()
export class RenameTodoListUseCase {
  constructor(
    private readonly lists: TodoListMutationService,
    private readonly repository: TodoListRepository,
    private readonly activity: RecordActivityPort,
  ) {}

  async execute(input: RenameTodoListInput): Promise<void> {
    const title = TodoTitle.of(input.title);

    const clash = await this.repository.findByTitle(title);
    if (clash !== null && clash.identity().toString() !== input.listId) {
      throw new DuplicateTodoListTitleError();
    }

    // BE_05 R10 — the load-change-save workflow is shared, so it lives in an
    // application service rather than in a use case this one would have to call.
    await this.lists.apply(input.listId, (list) => list.rename(title));

    await this.activity.record({
      subjectId: input.listId,
      action: 'todo-list.renamed',
      detail: title.toString(),
    });
  }
}
