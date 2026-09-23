import 'server-only';
import { unwrap } from '@repo/api';
import { apiClient } from '@/lib/api/api.client';
import type {
  PageView,
  TodoActivityView,
  TodoListDetailView,
  TodoListSummaryView,
} from '@/lib/api/todo.type';
import {
  toPageView,
  toTodoActivityView,
  toTodoListDetailView,
  toTodoListSummaryView,
} from '@/lib/api/todo.transform';

/**
 * The reads, one function per thing a view needs.
 *
 * FE_01 R8 — `.service.ts`: the module that talks to the API.
 * FE_09 R2 — every read states a caching intent. None takes the framework's default by
 * omission, because that default has changed across framework versions and an omitted
 * intent hands a page's behaviour to a version bump nobody connected to it.
 * FE_09 R3 — tags name the *resource*, never the screen, so two pages showing one list
 * both refresh when it changes and neither refreshes when the other's layout does.
 */

/** FE_09 R3 — the tag vocabulary, declared once so a write can name what it invalidated. */
export const todoTags = {
  lists: () => 'todo-lists',
  list: (listId: string) => `todo-list:${listId}`,
  activity: (listId: string) => `todo-list-activity:${listId}`,
} as const;

export interface ListTodoListsCriteria {
  readonly page?: number;
  readonly status?: 'active' | 'archived';
}

export async function listTodoLists(
  criteria: ListTodoListsCriteria = {},
): Promise<PageView<TodoListSummaryView>> {
  const result = await apiClient.GET('/v1/todo-lists', {
    params: { query: { page: criteria.page, status: criteria.status } },
    // FE_09 R10 — the same for everyone who can reach it, so it may be cached across
    // requests. Sixty seconds is short enough that a list someone else created appears
    // without a reload being needed to explain it.
    next: { revalidate: 60, tags: [todoTags.lists()] },
  });

  return toPageView(unwrap(result), toTodoListSummaryView);
}

export async function getTodoList(listId: string): Promise<TodoListDetailView> {
  const result = await apiClient.GET('/v1/todo-lists/{listId}', {
    params: { path: { listId } },
    // No window: this is the page a person edits, and a stale item they just ticked off
    // reads as a lost change. It is invalidated by tag instead, which is exact.
    next: { tags: [todoTags.lists(), todoTags.list(listId)] },
  });

  return toTodoListDetailView(unwrap(result));
}

export async function listTodoListActivity(
  listId: string,
): Promise<readonly TodoActivityView[]> {
  const result = await apiClient.GET('/v1/todo-lists/{listId}/activity', {
    params: { path: { listId } },
    next: { tags: [todoTags.activity(listId)] },
  });

  return unwrap(result).items.map(toTodoActivityView);
}
