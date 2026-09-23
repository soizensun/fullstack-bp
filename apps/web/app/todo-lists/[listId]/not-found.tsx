import Link from 'next/link';

/**
 * FE_11 R6 — the framework's not-found path, so the response carries a 404. A "nothing
 * here" page returned with a success status is a page search engines index and monitoring
 * never counts as a failure.
 *
 * It sits in this segment rather than only at the root because the root one would render
 * its own chrome inside whatever the segment above already drew.
 */
export default function TodoListNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8">
      <h1 className="text-xl font-semibold text-body">No such list</h1>
      <p className="mt-2 text-sm text-muted">
        It may have been deleted, or the address may be wrong.
      </p>
      <Link
        href="/todo-lists"
        className="mt-6 inline-block text-action hover:underline"
      >
        ← All lists
      </Link>
    </main>
  );
}
