import type { Metadata } from 'next';
import { PageHeader } from '@/components/molecules/page-header';
import { parseTodoListsSearchParams } from '@/app/todo-lists/_lib/todo-lists.search-params.schema';
import { CreateTodoListForm } from '@/app/todo-lists/_components/create-todo-list-form';
import { TodoListStatusFilter } from '@/app/todo-lists/_components/todo-list-status-filter';
import { TodoListTable } from '@/app/todo-lists/_components/todo-list-table/todo-list-table';

export const metadata: Metadata = {
  title: 'Lists',
};

/**
 * FE_01 R2 — the route file resolves its params, declares its metadata, and renders a
 * composition. It defines none of the sections it renders and holds no logic that would
 * still make sense if the URL changed.
 *
 * FE_08 R1 — a server component with no directive anywhere above it. Two leaves below
 * carry one: the pending-state submit button and the URL-writing filter.
 */
export default async function TodoListsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // FE_11 R7 — parsed against the route's declared schema before anything uses it.
  const { status, page } = parseTodoListsSearchParams(await searchParams);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8">
      <PageHeader>
        <div>
          <PageHeader.Title>Todo lists</PageHeader.Title>
          <PageHeader.Subtitle>
            Things you mean to do, grouped.
          </PageHeader.Subtitle>
        </div>
        <PageHeader.Actions>
          <TodoListStatusFilter value={status} />
        </PageHeader.Actions>
      </PageHeader>

      <section className="pb-8" aria-label="Create a list">
        <CreateTodoListForm />
      </section>

      {/*
        FE_09 R1 — the table reads its own data. No Suspense boundary here: the list is
        the reason the page exists, so streaming it in behind a skeleton would only move
        the wait. The route's loading.tsx covers the navigation.
      */}
      <TodoListTable status={status} page={page} />
    </main>
  );
}
