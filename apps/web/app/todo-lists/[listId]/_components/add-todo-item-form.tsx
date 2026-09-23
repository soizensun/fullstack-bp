'use client';

import { useActionState, useId } from 'react';
import { TextField } from '@/components/atoms/text-field';
import { noActionError } from '@/lib/action-state.type';
import { SubmitButton } from '@/app/todo-lists/_components/submit-button';
import { addTodoItemAction } from '@/app/todo-lists/[listId]/_lib/todo-item.action';

/**
 * FE_02 R1 — an organism: it names the domain and triggers a write.
 *
 * FE_01 R5 — it imports `SubmitButton` from the parent route's private folder, which is
 * the one direction private folders may be read in: a nested route is inside its parent's
 * segment, not sideways from it. Reaching into a *sibling* route's `_components` would be
 * the violation.
 */
export type AddTodoItemFormProps = {
  listId: string;
  isDisabled: boolean;
};

export function AddTodoItemForm({ listId, isDisabled }: AddTodoItemFormProps) {
  const [state, formAction] = useActionState(addTodoItemAction, noActionError);
  const titleId = useId();
  const errorId = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="listId" value={listId} />
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <label htmlFor={titleId} className="text-sm font-medium text-body">
          Add something
        </label>
        <TextField
          id={titleId}
          name="title"
          required
          maxLength={120}
          disabled={isDisabled}
          placeholder="Book flights"
          aria-invalid={state.error !== null}
          aria-describedby={state.error === null ? undefined : errorId}
        />
        <p id={errorId} role="status" className="min-h-5 text-sm text-danger">
          {state.error}
        </p>
      </div>
      <SubmitButton
        pendingLabel="Adding…"
        disabled={isDisabled}
        className="mt-6"
      >
        Add
      </SubmitButton>
    </form>
  );
}
