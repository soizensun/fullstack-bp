import { listTodoListActivity } from '@/lib/api/todo.service';

/**
 * FE_09 R1 / R7 — this section reads its own data, and it is the slow one: the API joins
 * it from a second module. It therefore lives behind its own Suspense boundary in the
 * page, so the list a person came to read arrives immediately and this fills in after.
 *
 * FE_02 R1 — an organism: it reads, and it knows what activity on a list means.
 */
export type TodoListActivityProps = {
  listId: string;
};

export async function TodoListActivity({ listId }: TodoListActivityProps) {
  const entries = await listTodoListActivity(listId);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing has happened on this list yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap items-baseline gap-2 text-sm"
        >
          <span className="text-body">{entry.action}</span>
          {entry.detail === null ? null : (
            <span className="text-muted">{entry.detail}</span>
          )}
          {/*
            GEN_11 — the instant came off the wire as ISO-8601 UTC and was turned into a
            readable string at the mapper, not here and not by the API. `<time>` keeps the
            machine-readable value alongside the human one.
          */}
          <time className="ml-auto text-muted">{entry.occurredLabel}</time>
        </li>
      ))}
    </ol>
  );
}

/**
 * FE_09 R7 — the fallback reserves the space the content will take. One that collapses
 * makes the page jump when the real content lands.
 */
export function TodoListActivitySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      <p role="status" className="sr-only">
        Loading recent activity
      </p>
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-5 w-full rounded-md bg-surface-sunken" />
      ))}
    </div>
  );
}
