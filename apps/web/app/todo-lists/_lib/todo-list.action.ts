'use server';

import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, unwrap } from '@repo/api';
import { z } from 'zod';
import { apiClient } from '@/lib/api/api.client';
import { todoTags } from '@/lib/api/todo.service';
import { type ActionState, noActionError } from '@/lib/action-state.type';

/**
 * FE_09 R4 — every write is a server action. One path for authorization, one for
 * invalidation, one place to look when a change does not appear on screen. The form also
 * works before its JavaScript has loaded, which is a reliability property rather than a
 * nicety.
 *
 * FE_09 R5 — an action compiles to an HTTP endpoint anyone can call with any payload.
 * That the only call site is a form in this repository is no constraint on the caller, and
 * neither is a check in the component that rendered it — that ran in a different process,
 * for a different request. So each action validates its own input, every time.
 *
 * There is no authorization step yet because there are no users; FE_19 owns adding one,
 * and it goes here, above the parse, in every action in this file.
 */

const createTodoListSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the list a name.')
    .max(120, 'That name is too long.'),
});

export async function createTodoListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createTodoListSchema.safeParse({
    title: formData.get('title'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'That is not a valid name.',
    };
  }

  let listId: string;

  try {
    const result = await apiClient.POST('/v1/todo-lists', {
      body: { title: parsed.data.title },
    });
    listId = unwrap(result).id;
  } catch (error) {
    return { error: messageFor(error) };
  }

  // FE_09 R3 — invalidate the narrowest tag that covers what changed. A new list changes
  // the collection and nothing else, so nothing else is cleared.
  //
  // `updateTag` rather than `revalidateTag`: this framework version made the latter a
  // request for a *future* refresh, which would render the very next page without the
  // list the person just created. Read-your-own-writes is the whole point here.
  updateTag(todoTags.lists());

  // Outside the try: `redirect` works by throwing, so catching it here would turn a
  // successful navigation into an error message.
  redirect(`/todo-lists/${listId}`);
}

export async function archiveTodoListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({ listId: z.uuid() })
    .safeParse({ listId: formData.get('listId') });

  if (!parsed.success) {
    return { error: 'That list no longer exists.' };
  }

  try {
    await apiClient.POST('/v1/todo-lists/{listId}/archive', {
      params: { path: { listId: parsed.data.listId } },
    });
  } catch (error) {
    return { error: messageFor(error) };
  }

  updateTag(todoTags.lists());
  updateTag(todoTags.list(parsed.data.listId));
  return noActionError;
}

/**
 * FE_10 R7 / GEN_08 R5 — branch on the code from the catalogue, never on the message. The
 * message is prose for humans: it is reworded by a copy edit and translated per
 * deployment, so matching on it breaks silently and at a distance.
 *
 * An unrecognised code falls through to the generic case rather than crashing, which is
 * what makes a new backend error code a safe addition (GEN_08 R7).
 */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) throw error;

  switch (error.code) {
    case 'TODO_LIST_TITLE_DUPLICATE':
      return 'You already have a list with that name.';
    case 'TODO_LIST_ALREADY_ARCHIVED':
      return 'That list is already archived.';
    default:
      return `Something went wrong. Quote ${error.correlationId} if you report it.`;
  }
}
