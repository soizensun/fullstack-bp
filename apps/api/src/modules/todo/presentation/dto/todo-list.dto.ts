import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  pageSchemaOf,
  paginationQueryShape,
  sortDirectionSchema,
  uuidSchema,
} from './shared.schema';

/**
 * BE_08 R1 — the request shape, the domain model and the response shape are three
 * different things. These are the first and the third; neither is ever the second.
 *
 * BE_08 R3 — each schema is declared once and the DTO class is derived from it, so
 * the shape is never written twice and cannot drift from its type.
 *
 * BE_08 R10 — one request DTO and one response DTO per operation, named after it.
 */

// BE_08 R7 — length and format live here; whether a *title is already taken* is a
// business rule and lives in the domain or the use case, never in a schema.
const titleSchema = z.string().trim().min(1).max(120);

/* ── path parameters ───────────────────────────────────────────────────────── */
// BE_08 R2 — path parameters are values from outside, so they are validated too.
export class TodoListParamsDto extends createZodDto(z.object({ listId: uuidSchema })) {}

/* ── create ────────────────────────────────────────────────────────────────── */
export const createTodoListRequestSchema = z.object({ title: titleSchema });
export class CreateTodoListRequestDto extends createZodDto(createTodoListRequestSchema) {}

export const createTodoListResponseSchema = z.object({ id: uuidSchema });
export class CreateTodoListResponseDto extends createZodDto(createTodoListResponseSchema) {}

/* ── rename ────────────────────────────────────────────────────────────────── */
export const renameTodoListRequestSchema = z.object({ title: titleSchema });
export class RenameTodoListRequestDto extends createZodDto(renameTodoListRequestSchema) {}

/* ── read one ──────────────────────────────────────────────────────────────── */
// BE_08 R6 — every exposed field is chosen here by hand. Nothing is spread in from a
// record, so adding a column to storage cannot silently widen the API.
const todoItemViewSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  status: z.enum(['open', 'completed']),
  dueDate: z.iso.datetime().nullable(),
  isOverdue: z.boolean(),
});

const todoListSummarySchema = z.object({
  id: uuidSchema,
  title: z.string(),
  status: z.enum(['active', 'archived']),
  itemCount: z.number().int().nonnegative(),
  openItemCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export const todoListDetailResponseSchema = todoListSummarySchema.extend({
  items: z.array(todoItemViewSchema),
});
export class TodoListDetailResponseDto extends createZodDto(todoListDetailResponseSchema) {}

/* ── read a page ───────────────────────────────────────────────────────────── */
export const listTodoListsQuerySchema = z.object({
  ...paginationQueryShape,
  status: z.enum(['active', 'archived']).optional(),
  sort: z.enum(['createdAt', 'title']).default('createdAt'),
  direction: sortDirectionSchema,
});
export class ListTodoListsQueryDto extends createZodDto(listTodoListsQuerySchema) {}

export const listTodoListsResponseSchema = pageSchemaOf(todoListSummarySchema);
export class ListTodoListsResponseDto extends createZodDto(listTodoListsResponseSchema) {}

export { todoItemViewSchema, todoListSummarySchema };
