import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '@repo/api';
import { z } from 'zod';
import { Badge } from '@/components/atoms/badge';
import { PageHeader } from '@/components/molecules/page-header';
import { getTodoList } from '@/lib/api/todo.service';
import type { TodoListDetailView } from '@/lib/api/todo.type';
import { AddTodoItemForm } from '@/app/todo-lists/[listId]/_components/add-todo-item-form';
import { TodoItemList } from '@/app/todo-lists/[listId]/_components/todo-item-list/todo-item-list';
import {
  TodoListActivity,
  TodoListActivitySkeleton,
} from '@/app/todo-lists/[listId]/_components/todo-list-activity';

/**
 * FE_11 R4 — the segment is named for what it holds, and its value is validated before it
 * reaches a query. It arrives from a typed URL as easily as from a link.
 */
const listIdSchema = z.uuid();

type TodoListPageProps = {
  params: Promise<{ listId: string }>;
};

/**
 * FE_11 R6 — a value that is not a list id resolves to not-found rather than to a failed
 * query, and so does a real id that no longer exists. Both are "nothing here".
 *
 * **This route answers a soft 404, and R6 wants a real one.** The framework returns 404
 * only for a *non-streamed* response, and two other rules make this response stream: the
 * segment's `error.tsx` (FE_11 R5) and the activity section's Suspense boundary
 * (FE_09 R7). Once streaming has begun the status is already sent, so `notFound()` renders
 * the right UI under a 200. Measured, not assumed: removing the error boundary alone
 * restores the 404.
 *
 * What is recovered: the framework injects `<meta name="robots" content="noindex">`, so
 * the search-engine half of R6's concern is covered. The monitoring half is not — a 404
 * here will not appear in error-rate metrics. The framework's own answer is to check
 * existence in `proxy`, before the response streams, which means an API call at the edge
 * on every request to this route. That is a real trade and not one to make silently, so it
 * is logged in FE_11's open questions rather than decided here.
 */
async function loadList(rawListId: string): Promise<TodoListDetailView> {
  const parsed = listIdSchema.safeParse(rawListId);
  if (!parsed.success) notFound();

  try {
    return await getTodoList(parsed.data);
  } catch (error) {
    // FE_10 R7 — the code, not the status and not the message.
    if (error instanceof ApiError && error.code === 'TODO_LIST_NOT_FOUND')
      notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: TodoListPageProps): Promise<Metadata> {
  const { listId } = await params;

  /*
   * This calls `loadList` rather than swallowing a miss, so metadata and the page agree
   * about whether the list exists — otherwise a missing list would be titled from a
   * `catch` while the body rendered not-found.
   *
   * It does *not* recover the 404 status. That was the hypothesis; measuring it showed the
   * response streams regardless, for the reason `loadList` above records.
   *
   * The second call costs nothing: it is identical, so the framework's request cache
   * collapses the two into one (FE_09 R1).
   */
  const list = await loadList(listId);
  return { title: list.title };
}

/**
 * FE_01 R2 — resolves its params, declares its metadata, renders a composition.
 *
 * The two reads inside `loadList` and `generateMetadata` are identical, so the framework's
 * request cache collapses them into one call (FE_09 R1). That is why the read is repeated
 * rather than lifted into the route and drilled down.
 */
export default async function TodoListPage({ params }: TodoListPageProps) {
  const { listId } = await params;
  const list = await loadList(listId);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8">
      <PageHeader>
        <div>
          <Link
            href="/todo-lists"
            className="text-sm text-action hover:underline"
          >
            ← All lists
          </Link>
          <PageHeader.Title className="mt-1">{list.title}</PageHeader.Title>
          <PageHeader.Subtitle>
            {list.openItemCount === 1
              ? '1 thing left to do'
              : `${list.openItemCount} things left to do`}
          </PageHeader.Subtitle>
        </div>
        <PageHeader.Actions>
          <Badge tone={list.isArchived ? 'neutral' : 'success'}>
            {list.isArchived ? 'Archived' : 'Active'}
          </Badge>
        </PageHeader.Actions>
      </PageHeader>

      <section className="pb-8" aria-label="Add something to this list">
        <AddTodoItemForm listId={list.id} isDisabled={list.isArchived} />
      </section>

      <TodoItemList list={list} />

      <section className="pt-8" aria-labelledby="activity-heading">
        <h2
          id="activity-heading"
          className="pb-2 text-lg font-medium text-body"
        >
          Recent activity
        </h2>
        {/*
          FE_09 R7 — the slow read gets its own boundary, around the section that owns it
          rather than around the page. Everything above this line has already rendered by
          the time this resolves.
        */}
        <Suspense fallback={<TodoListActivitySkeleton />}>
          <TodoListActivity listId={list.id} />
        </Suspense>
      </section>
    </main>
  );
}
