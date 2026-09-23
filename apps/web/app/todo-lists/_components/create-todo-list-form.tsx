'use client';

import { useActionState, useId } from 'react';
import { TextField } from '@/components/atoms/text-field';
import { noActionError } from '@/lib/action-state.type';
import { createTodoListAction } from '@/app/todo-lists/_lib/todo-list.action';
import { SubmitButton } from '@/app/todo-lists/_components/submit-button';

/**
 * FE_02 R1 — an organism: it names the domain and it triggers a write.
 *
 * FE_08 R1 — this one earns its directive. `useActionState` is state that survives a
 * render, which is the qualifying condition; the form's *submission* would work without
 * it, but rendering the error the action returned would not.
 *
 * FE_09 R4 — the write is a server action. The `<form action>` attribute means it also
 * submits before this component's JavaScript has loaded.
 */
export function CreateTodoListForm() {
  const [state, formAction] = useActionState(
    createTodoListAction,
    noActionError,
  );
  // FE_06 R7 — a generated id ties the label and the error message to the input, and
  // stays stable across the server render and hydration.
  const titleId = useId();
  const errorId = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        {/* FE_06 R7 — a real label, not a placeholder. A placeholder disappears the
            moment someone types, which is exactly when they need it. */}
        <label htmlFor={titleId} className="text-sm font-medium text-body">
          New list
        </label>
        <TextField
          id={titleId}
          name="title"
          required
          maxLength={120}
          placeholder="Trip to Kyoto"
          // FE_06 R8 — both attributes derive from the same value that drives the
          // render, so neither can be left asserting something that stopped being true.
          aria-invalid={state.error !== null}
          aria-describedby={state.error === null ? undefined : errorId}
        />
        {/*
          The message is rendered inside a live region that exists whether or not there is
          an error. A region added at the same moment as its content is frequently not
          announced at all, because there was nothing there to observe.
        */}
        <p id={errorId} role="status" className="min-h-5 text-sm text-danger">
          {state.error}
        </p>
      </div>
      <SubmitButton pendingLabel="Creating…" className="mt-6">
        Create list
      </SubmitButton>
    </form>
  );
}
