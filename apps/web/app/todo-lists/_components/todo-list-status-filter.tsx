'use client';

import { useId } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { TodoListStatus } from '@/lib/api/todo.type';

/**
 * FE_02 R3 — a molecule. It arranges a label and a select into one job, holds no domain
 * knowledge beyond the values it is handed, reads nothing and decides nothing.
 *
 * FE_08 R9 / FE_09 R8 — it does not fetch. It writes the choice to the URL; the route
 * re-renders on the server and the table reads the new value. That is the whole
 * interaction, and it is why nothing here needs a query library (FE_09 R9).
 *
 * FE_11 R8 — navigation goes through the router. Assigning to the browser's location
 * would throw away the client router and reload the application.
 */
export type TodoListStatusFilterProps = {
  value?: TodoListStatus;
};

const OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'All lists' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export function TodoListStatusFilter({ value }: TodoListStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectId = useId();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams);

    if (next === '') {
      params.delete('status');
    } else {
      params.set('status', next);
    }
    // Changing the filter returns to the first page. Keeping `page=4` while the result
    // set shrinks is how a filter lands someone on an empty page they cannot explain.
    params.delete('page');

    const query = params.toString();
    router.push(query === '' ? pathname : `${pathname}?${query}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-body">
        Show
      </label>
      {/*
        FE_06 R2 — a native select. It is keyboard-operable, announces its options and its
        current value, and works on a touch device, none of which a div-based menu gets
        without being rebuilt by hand.
      */}
      <select
        id={selectId}
        name="status"
        value={value ?? ''}
        onChange={(event) => handleChange(event.target.value)}
        className="h-10 rounded-md border border-subtle bg-surface px-3 text-base text-body"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
