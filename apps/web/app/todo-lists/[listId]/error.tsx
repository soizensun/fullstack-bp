'use client';

import { ApiError } from '@repo/api';
import { Button } from '@/components/atoms/button';

/**
 * FE_11 R5 — this route can fail, so it has an error file, and it offers a retry.
 *
 * FE_10 R5 — the correlation id is surfaced so a person can quote it. That single string
 * is what turns "it broke" into one log search.
 */
export default function TodoListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const correlationId =
    error instanceof ApiError ? error.correlationId : error.digest;

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8">
      <div
        role="alert"
        className="rounded-lg border border-subtle bg-surface-danger p-6"
      >
        <h1 className="text-lg font-semibold text-danger">
          This list could not be loaded
        </h1>
        <p className="mt-2 text-sm text-body">
          Nothing on it has been changed.
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
