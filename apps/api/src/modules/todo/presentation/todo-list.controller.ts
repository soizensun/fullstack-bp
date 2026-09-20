import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ReadActivityPort } from '@app/modules/activity-log';
import { AddTodoItemUseCase } from '../application/use-cases/add-todo-item.use-case';
import { ArchiveTodoListUseCase } from '../application/use-cases/archive-todo-list.use-case';
import { BulkCompleteTodoItemsUseCase } from '../application/use-cases/bulk-complete-todo-items.use-case';
import { CompleteTodoItemUseCase } from '../application/use-cases/complete-todo-item.use-case';
import { CreateTodoListUseCase } from '../application/use-cases/create-todo-list.use-case';
import { DeleteTodoListUseCase } from '../application/use-cases/delete-todo-list.use-case';
import { GetTodoListUseCase } from '../application/use-cases/get-todo-list.use-case';
import { ListTodoItemsUseCase } from '../application/use-cases/list-todo-items.use-case';
import { ListTodoListsUseCase } from '../application/use-cases/list-todo-lists.use-case';
import { RemoveTodoItemUseCase } from '../application/use-cases/remove-todo-item.use-case';
import { RenameTodoItemUseCase } from '../application/use-cases/rename-todo-item.use-case';
import { RenameTodoListUseCase } from '../application/use-cases/rename-todo-list.use-case';
import { ReopenTodoItemUseCase } from '../application/use-cases/reopen-todo-item.use-case';
import {
  AddTodoItemRequestDto,
  AddTodoItemResponseDto,
  BulkCompleteItemsRequestDto,
  BulkCompleteItemsResponseDto,
  ListActivityResponseDto,
  ListTodoItemsQueryDto,
  ListTodoItemsResponseDto,
  RenameTodoItemRequestDto,
  TodoItemParamsDto,
} from './dto/todo-item.dto';
import {
  CreateTodoListRequestDto,
  CreateTodoListResponseDto,
  ListTodoListsQueryDto,
  ListTodoListsResponseDto,
  RenameTodoListRequestDto,
  TodoListDetailResponseDto,
  TodoListParamsDto,
} from './dto/todo-list.dto';

const ACTIVITY_PAGE_SIZE = 20;

/**
 * BE_07 R1 — the path names a resource, as a plural noun. The four `POST` routes that
 * read as verbs are state transitions with business meaning, which is the narrow
 * exception R1 allows; each maps to exactly one use case with the same name.
 *
 * BE_07 R4 — the version is in the path from the first published route.
 *
 * BE_07 R3 — every handler below validates, calls one use case, and returns its result.
 * There is no business decision, no error translation (BE_09 R8) and no mapping beyond
 * naming the response fields.
 */
@ApiTags('todo-lists')
@Controller({ path: 'v1/todo-lists' })
export class TodoListController {
  constructor(
    private readonly createTodoList: CreateTodoListUseCase,
    private readonly renameTodoList: RenameTodoListUseCase,
    private readonly archiveTodoList: ArchiveTodoListUseCase,
    private readonly deleteTodoList: DeleteTodoListUseCase,
    private readonly getTodoList: GetTodoListUseCase,
    private readonly listTodoLists: ListTodoListsUseCase,
    private readonly listTodoItems: ListTodoItemsUseCase,
    private readonly addTodoItem: AddTodoItemUseCase,
    private readonly renameTodoItem: RenameTodoItemUseCase,
    private readonly completeTodoItem: CompleteTodoItemUseCase,
    private readonly reopenTodoItem: ReopenTodoItemUseCase,
    private readonly removeTodoItem: RemoveTodoItemUseCase,
    private readonly bulkCompleteTodoItems: BulkCompleteTodoItemsUseCase,
    // BE_03 R10 — the port, never `ActivityLogModule`, which is named only in todo.module.ts.
    private readonly readActivity: ReadActivityPort,
  ) {}

  /* ── lists ──────────────────────────────────────────────────────────────── */

  @Get()
  @ApiOperation({ summary: 'Read a page of todo lists' })
  // BE_07 R10 — the response type is declared so it reaches the generated specification.
  @ZodResponse({ status: HttpStatus.OK, type: ListTodoListsResponseDto })
  async list(@Query() query: ListTodoListsQueryDto) {
    // BE_07 R9 — query parameters shape a read and nothing else.
    return this.listTodoLists.execute(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a todo list' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'BE_07 R8 — replaying a create with the same key returns the first result.',
  })
  @ZodResponse({ status: HttpStatus.CREATED, type: CreateTodoListResponseDto })
  async create(
    @Body() body: CreateTodoListRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.createTodoList.execute({ title: body.title, idempotencyKey });
  }

  @Get(':listId')
  @ApiOperation({ summary: 'Read one todo list with its items' })
  @ZodResponse({ status: HttpStatus.OK, type: TodoListDetailResponseDto })
  async findOne(@Param() params: TodoListParamsDto) {
    return this.getTodoList.execute({ listId: params.listId });
  }

  @Patch(':listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rename a todo list' })
  @ApiNoContentResponse()
  async rename(@Param() params: TodoListParamsDto, @Body() body: RenameTodoListRequestDto) {
    await this.renameTodoList.execute({ listId: params.listId, title: body.title });
  }

  @Delete(':listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a todo list' })
  @ApiNoContentResponse()
  async remove(@Param() params: TodoListParamsDto) {
    await this.deleteTodoList.execute({ listId: params.listId });
  }

  // BE_07 R1 — a state transition the method cannot express, so it is a sub-resource action.
  @Post(':listId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a todo list' })
  @ApiNoContentResponse()
  async archive(@Param() params: TodoListParamsDto) {
    await this.archiveTodoList.execute({ listId: params.listId });
  }

  /* ── items ──────────────────────────────────────────────────────────────── */

  @Get(':listId/items')
  @ApiOperation({ summary: 'Read a page of items in a list' })
  @ZodResponse({ status: HttpStatus.OK, type: ListTodoItemsResponseDto })
  async listItems(@Param() params: TodoListParamsDto, @Query() query: ListTodoItemsQueryDto) {
    return this.listTodoItems.execute({ listId: params.listId, ...query });
  }

  @Post(':listId/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an item to a list' })
  @ZodResponse({ status: HttpStatus.CREATED, type: AddTodoItemResponseDto })
  async addItem(@Param() params: TodoListParamsDto, @Body() body: AddTodoItemRequestDto) {
    return this.addTodoItem.execute({
      listId: params.listId,
      title: body.title,
      dueDate: body.dueDate,
    });
  }

  /** Declared before `:itemId/complete` so "complete" is never read as an item id. */
  @Post(':listId/items/complete')
  @ApiOperation({ summary: 'Complete many items in one request' })
  @ZodResponse({ status: HttpStatus.OK, type: BulkCompleteItemsResponseDto })
  async completeMany(
    @Param() params: TodoListParamsDto,
    @Body() body: BulkCompleteItemsRequestDto,
  ) {
    return this.bulkCompleteTodoItems.execute({
      listId: params.listId,
      itemIds: body.itemIds,
    });
  }

  @Patch(':listId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rename an item' })
  @ApiNoContentResponse()
  async renameItem(@Param() params: TodoItemParamsDto, @Body() body: RenameTodoItemRequestDto) {
    await this.renameTodoItem.execute({
      listId: params.listId,
      itemId: params.itemId,
      title: body.title,
    });
  }

  @Delete(':listId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item' })
  @ApiNoContentResponse()
  async removeItem(@Param() params: TodoItemParamsDto) {
    await this.removeTodoItem.execute({ listId: params.listId, itemId: params.itemId });
  }

  @Post(':listId/items/:itemId/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Complete an item' })
  @ApiNoContentResponse()
  async completeItem(@Param() params: TodoItemParamsDto) {
    await this.completeTodoItem.execute({ listId: params.listId, itemId: params.itemId });
  }

  @Post(':listId/items/:itemId/reopen')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reopen a completed item' })
  @ApiNoContentResponse()
  async reopenItem(@Param() params: TodoItemParamsDto) {
    await this.reopenTodoItem.execute({ listId: params.listId, itemId: params.itemId });
  }

  /* ── activity ───────────────────────────────────────────────────────────── */

  @Get(':listId/activity')
  @ApiOperation({ summary: 'Read recent activity for a list' })
  @ZodResponse({ status: HttpStatus.OK, type: ListActivityResponseDto })
  async activity(@Param() params: TodoListParamsDto) {
    // BE_03 R6 — plain data comes back across the port; no entity of another module.
    return { items: await this.readActivity.recentFor(params.listId, ACTIVITY_PAGE_SIZE) };
  }
}
