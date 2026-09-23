'use client';

import { ApiError } from '@repo/api';
import { Button } from '@/components/atoms/button';

/**
 * FE_11 R5 — a route that can fail gets an error file, and it offers a retry rather than
 * only an apology. It is a client boundary by nature: the framework needs a component it
 * can re-render in place.
 *
 * FE_10 R5 — the correlation id is surfaced. It is what turns "it broke" into one log
 * search, so it is shown small and copyable, next to the apology rather than instead of
 * a stack trace.
 */
export default function TodoListsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // FE_10 R7 — branch on the code, never on the message.
  const isUnreachable =
    error instanceof ApiError && error.code === 'API_UNREACHABLE';
  const correlationId =
    error instanceof ApiError ? error.correlationId : error.digest;

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8">
      {/*
        `alert` rather than `status`: this replaced the page the person was trying to
        read, so it is worth interrupting for.
      */}
      <div
        role="alert"
        className="rounded-lg border border-subtle bg-surface-danger p-6"
      >
        <h1 className="text-lg font-semibold text-danger">
          {isUnreachable ? 'Cannot reach the server' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-sm text-body">
          {isUnreachable
            ? 'Your lists are fine — this browser just could not reach the API.'
            : 'Your lists could not be loaded.'}
        </p>
        {correlationId === undefined ? null : (
          <p className="mt-4 text-sm text-muted">
            Quote this if you report it:{' '}
            <code className="font-mono">{correlationId}</code>
          </p>
        )}
        <Button onClick={reset} className="mt-6">
          Try again
        </Button>
      </div>
    </main>
  );
}
