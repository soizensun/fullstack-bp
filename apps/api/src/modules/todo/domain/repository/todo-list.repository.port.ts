import type { TodoList } from '../entity/todo-list.entity';
import type { TodoTitle } from '../value-object/todo-title.vo';
import type { TodoListId } from '../value-object/todo-list-id.vo';

/**
 * BE_06 R1 — the port is declared in `domain/repository/` and implemented out in
 * `infrastructure/repository/`, so the domain states what it needs without learning
 * how it is stored.
 *
 * BE_06 R2 — it speaks domain only: entities in, entities or `null` out. It throws no
 * workflow error; "this list does not exist" is a decision for the use case (BE_05 R6).
 *
 * BE_06 R6 — one repository per aggregate root, loading and saving the whole aggregate.
 */
export abstract class TodoListRepository {
  abstract findById(id: TodoListId): Promise<TodoList | null>;

  /** Used to enforce list-title uniqueness across aggregates (BE_05 R6). */
  abstract findByTitle(title: TodoTitle): Promise<TodoList | null>;

  /** BE_06 R3 — returns `void`; a repository never hands back what it just wrote. */
  abstract save(list: TodoList): Promise<void>;

  abstract delete(id: TodoListId): Promise<void>;
}
