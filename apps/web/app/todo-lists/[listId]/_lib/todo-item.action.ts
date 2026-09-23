'use server';

import { updateTag } from 'next/cache';
import { ApiError } from '@repo/api';
import { z } from 'zod';
import { apiClient } from '@/lib/api/api.client';
import { todoTags } from '@/lib/api/todo.service';
import { type ActionState, noActionError } from '@/lib/action-state.type';

/**
 * FE_09 R4 — the item writes, one action each.
 * FE_09 R5 — each validates its own input. `listId` and `itemId` arrive in the form data
 * and are as untrusted as anything else a caller can send; that the form that produced
 * them was rendered by this repository constrains nobody.
 */

const itemTargetSchema = z.object({ listId: z.uuid(), itemId: z.uuid() });

const addTodoItemSchema = z.object({
  listId: z.uuid(),
  title: z
    .string()
    .trim()
    .min(1, 'Give it a name.')
    .max(120, 'That name is too long.'),
});

export async function addTodoItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = addTodoItemSchema.safeParse({
    listId: formData.get('listId'),
    title: formData.get('title'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'That is not a valid name.',
    };
  }

  try {
    await apiClient.POST('/v1/todo-lists/{listId}/items', {
      params: { path: { listId: parsed.data.listId } },
      body: { title: parsed.data.title },
    });
  } catch (error) {
    return { error: messageFor(error) };
  }

  return invalidateList(parsed.data.listId);
}

export async function completeTodoItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return transition(
    formData,
    '/v1/todo-lists/{listId}/items/{itemId}/complete',
  );
}

export async function reopenTodoItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return transition(formData, '/v1/todo-lists/{listId}/items/{itemId}/reopen');
}

export async function removeTodoItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = itemTargetSchema.safeParse({
    listId: formData.get('listId'),
    itemId: formData.get('itemId'),
  });

  if (!parsed.success) return { error: 'That item no longer exists.' };

  try {
    await apiClient.DELETE('/v1/todo-lists/{listId}/items/{itemId}', {
      params: { path: parsed.data },
    });
  } catch (error) {
    return { error: messageFor(error) };
  }

  return invalidateList(parsed.data.listId);
}

/**
 * GEN_16 R5 — complete and reopen differ only in the path they post to, so the body is
 * written once. They stay two exported actions because a form posts to one endpoint, not
 * to a function with a mode flag (GEN_16 R7).
 */
async function transition(
  formData: FormData,
  path:
    | '/v1/todo-lists/{listId}/items/{itemId}/complete'
    | '/v1/todo-lists/{listId}/items/{itemId}/reopen',
): Promise<ActionState> {
  const parsed = itemTargetSchema.safeParse({
    listId: formData.get('listId'),
    itemId: formData.get('itemId'),
  });

  if (!parsed.success) return { error: 'That item no longer exists.' };

  try {
    await apiClient.POST(path, { params: { path: parsed.data } });
  } catch (error) {
    return { error: messageFor(error) };
  }

  return invalidateList(parsed.data.listId);
}

/**
 * FE_09 R3 — invalidate the narrowest tags covering what changed. An item change makes
 * this list stale, its activity stale, and the collection's open counts stale. It does
 * not make any other list stale, so no other list is cleared — clearing the collection
 * because it is easier turns one ticked-off item into a re-fetch for everyone.
 *
 * `updateTag` rather than `revalidateTag`: in this framework version the latter schedules
 * a refresh for a later request, so the page rendered immediately after this action would
 * still show the item as untouched. A person who just ticked something off and watched it
 * stay open reads that as a lost change.
 */
function invalidateList(listId: string): ActionState {
  updateTag(todoTags.list(listId));
  updateTag(todoTags.activity(listId));
  updateTag(todoTags.lists());
  return noActionError;
}

/** FE_10 R7 / GEN_08 R5 — the code is the contract; the message is prose and may not be matched on. */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) throw error;

  switch (error.code) {
    case 'TODO_ITEM_TITLE_DUPLICATE':
      return 'This list already has something with that name.';
    case 'TODO_LIST_ARCHIVED_NOT_MODIFIABLE':
      return 'This list is archived, so it cannot be changed.';
    case 'TODO_ITEM_ALREADY_COMPLETED':
      return 'That was already ticked off.';
    case 'TODO_ITEM_NOT_COMPLETED':
      return 'That is not ticked off yet.';
    case 'TODO_ITEM_NOT_IN_LIST':
      return 'That item is no longer on this list.';
    default:
      return `Something went wrong. Quote ${error.correlationId} if you report it.`;
  }
}
