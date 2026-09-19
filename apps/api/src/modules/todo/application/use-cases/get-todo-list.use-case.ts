import { Injectable } from '@nestjs/common';
import { Clock } from '@app/shared/application/clock.port';
import { TodoQuery } from '../query-port/todo-query.port';
import { TodoListNotFoundError } from '../todo.errors';
import type { TodoListDetailView } from '../types/todo.views';

export interface GetTodoListInput {
  readonly listId: string;
}

/**
 * BE_05 R3/R4 — a query. It answers a question, changes nothing, and reads through
 * the query contract rather than loading the aggregate: rebuilding entities to render
 * a read would be work that buys nothing.
 */
@Injectable()
export class GetTodoListUseCase {
  constructor(
    private readonly query: TodoQuery,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetTodoListInput): Promise<TodoListDetailView> {
    // BE_02 R3 — "now" is read here and passed down, because the domain may not have a clock.
    const detail = await this.query.findListDetail(input.listId, this.clock.now());

    // BE_06 R8 — the query returns `null`; turning absence into a failure is this
    // layer's job (BE_05 R6), not the query's.
    if (detail === null) {
      throw new TodoListNotFoundError();
    }
    return detail;
  }
}
