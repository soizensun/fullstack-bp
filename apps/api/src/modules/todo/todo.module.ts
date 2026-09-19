import { Module } from '@nestjs/common';
// BE_03 R10 — the provider module is named here and in no other file of this module.
import { ActivityLogModule } from '@app/modules/activity-log';
import { TodoListRepository } from './domain/repository/todo-list.repository.port';
import { IdempotencyStore } from './application/port/idempotency-store.port';
import { TodoQuery } from './application/query-port/todo-query.port';
import { TodoListMutationService } from './application/service/todo-list-mutation.service';
import { AddTodoItemUseCase } from './application/use-cases/add-todo-item.use-case';
import { ArchiveTodoListUseCase } from './application/use-cases/archive-todo-list.use-case';
import { BulkCompleteTodoItemsUseCase } from './application/use-cases/bulk-complete-todo-items.use-case';
import { CompleteTodoItemUseCase } from './application/use-cases/complete-todo-item.use-case';
import { CreateTodoListUseCase } from './application/use-cases/create-todo-list.use-case';
import { DeleteTodoListUseCase } from './application/use-cases/delete-todo-list.use-case';
import { GetTodoListUseCase } from './application/use-cases/get-todo-list.use-case';
import { ListTodoItemsUseCase } from './application/use-cases/list-todo-items.use-case';
import { ListTodoListsUseCase } from './application/use-cases/list-todo-lists.use-case';
import { RemoveTodoItemUseCase } from './application/use-cases/remove-todo-item.use-case';
import { RenameTodoItemUseCase } from './application/use-cases/rename-todo-item.use-case';
import { RenameTodoListUseCase } from './application/use-cases/rename-todo-list.use-case';
import { ReopenTodoItemUseCase } from './application/use-cases/reopen-todo-item.use-case';
import { FileTodoQuery } from './infrastructure/query/file-todo.query';
import { FileIdempotencyStore } from './infrastructure/repository/file-idempotency.store';
import { FileTodoListRepository } from './infrastructure/repository/file-todo-list.repository';
import { TodoListController } from './presentation/todo-list.controller';

/**
 * BE_02 R8 — the one place a contract is bound to an implementation. Every file above
 * depends on the abstract class; only this file knows which concrete class satisfies it,
 * which is what makes the store swappable without the layers moving.
 */
@Module({
  imports: [ActivityLogModule],
  controllers: [TodoListController],
  providers: [
    { provide: TodoListRepository, useClass: FileTodoListRepository },
    { provide: TodoQuery, useClass: FileTodoQuery },
    { provide: IdempotencyStore, useClass: FileIdempotencyStore },
    TodoListMutationService,
    CreateTodoListUseCase,
    RenameTodoListUseCase,
    ArchiveTodoListUseCase,
    DeleteTodoListUseCase,
    GetTodoListUseCase,
    ListTodoListsUseCase,
    AddTodoItemUseCase,
    RenameTodoItemUseCase,
    CompleteTodoItemUseCase,
    ReopenTodoItemUseCase,
    RemoveTodoItemUseCase,
    BulkCompleteTodoItemsUseCase,
    ListTodoItemsUseCase,
  ],
})
export class TodoModule {}
