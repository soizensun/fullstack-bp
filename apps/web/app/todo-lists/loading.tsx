/**
 * FE_11 R5 — a route that awaits data gets a loading file, and its fallback reserves the
 * space the content will take. A fallback that collapses makes the layout jump when the
 * real content arrives, which FE_20 measures and a reader experiences as the page moving
 * under their cursor.
 *
 * The row heights below are the table's, not a guess: `py-3` plus one line of text.
 */
export default function TodoListsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8" aria-busy="true">
      <div className="pb-6">
        <div className="h-7 w-48 rounded-md bg-surface-sunken" />
        <div className="mt-2 h-5 w-64 rounded-md bg-surface-sunken" />
      </div>
      <div className="h-10 w-full rounded-md bg-surface-sunken" />
      <p role="status" className="sr-only">
        Loading your lists
      </p>
      <div className="mt-8 flex flex-col gap-px">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-12 w-full rounded-md bg-surface-sunken" />
        ))}
      </div>
    </main>
  );
}
