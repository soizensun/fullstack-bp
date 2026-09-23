import type { components } from '@repo/api';
import { formatDay, formatMinute } from '@/lib/date.util';
import type {
  PageView,
  TodoActivityView,
  TodoItemView,
  TodoListDetailView,
  TodoListSummaryView,
} from '@/lib/api/todo.type';

/**
 * FE_10 R6 — the boundary. Wire shapes come in, view models go out, and this is the only
 * module that sees both. When the backend renames a field, the regenerated contract makes
 * the type-checker point at exactly one file: this one. No component changes, because no
 * component ever saw the wire shape.
 *
 * FE_01 R8 — `.transform.ts`, and every function in it is pure: no read, no clock, no
 * randomness. One grep over the suffix checks that.
 */

type Schemas = components['schemas'];
type TodoListSummaryDto =
  Schemas['ListTodoListsResponseDto_Output']['items'][number];
type TodoListDetailDto = Schemas['TodoListDetailResponseDto_Output'];
type TodoItemDto = TodoListDetailDto['items'][number];
type TodoActivityDto =
  Schemas['ListActivityResponseDto_Output']['items'][number];

export function toTodoItemView(dto: TodoItemDto): TodoItemView {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    // Derived once, here, rather than in the three components that would each get the
    // comparison slightly different.
    isCompleted: dto.status === 'completed',
    // GEN_11 — the instant arrives as ISO-8601 UTC and becomes a string a person reads
    // only at this boundary. A null due date stays null: "no due date" is not "unknown
    // date", and collapsing the two into an empty string loses the distinction the
    // column needs.
    dueLabel: dto.dueDate === null ? null : formatDay(dto.dueDate),
    isOverdue: dto.isOverdue,
  };
}

export function toTodoListSummaryView(
  dto: TodoListSummaryDto,
): TodoListSummaryView {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    isArchived: dto.status === 'archived',
    itemCount: dto.itemCount,
    openItemCount: dto.openItemCount,
    createdLabel: formatDay(dto.createdAt),
  };
}

export function toTodoListDetailView(
  dto: TodoListDetailDto,
): TodoListDetailView {
  return {
    ...toTodoListSummaryView(dto),
    items: dto.items.map(toTodoItemView),
  };
}

export function toTodoActivityView(dto: TodoActivityDto): TodoActivityView {
  return {
    id: dto.id,
    action: dto.action,
    detail: dto.detail,
    occurredLabel: formatMinute(dto.occurredAt),
  };
}

/** BE_07 R5's one page shape, mapped once so no caller re-spreads it. */
export function toPageView<TDto, TView>(
  page: { items: TDto[]; total: number; page: number; pageSize: number },
  toView: (dto: TDto) => TView,
): PageView<TView> {
  return {
    items: page.items.map(toView),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  };
}
