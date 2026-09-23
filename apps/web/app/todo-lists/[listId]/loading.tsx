/**
 * FE_11 R5 — the fallback reserves the space the real content takes, at the real row
 * height, so nothing jumps when it arrives.
 */
export default function TodoListLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8" aria-busy="true">
      <div className="pb-6">
        <div className="h-5 w-24 rounded-md bg-surface-sunken" />
        <div className="mt-2 h-7 w-64 rounded-md bg-surface-sunken" />
      </div>
      <div className="h-10 w-full rounded-md bg-surface-sunken" />
      <p role="status" className="sr-only">
        Loading this list
      </p>
      <div className="mt-8 flex flex-col gap-px">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-12 w-full rounded-md bg-surface-sunken" />
        ))}
      </div>
    </main>
  );
}
