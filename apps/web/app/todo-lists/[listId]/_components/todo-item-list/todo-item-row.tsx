'use client';

import { useActionState } from 'react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import type { TodoItemView } from '@/lib/api/todo.type';
import { noActionError } from '@/lib/action-state.type';
import {
  completeTodoItemAction,
  removeTodoItemAction,
  reopenTodoItemAction,
} from '@/app/todo-lists/[listId]/_lib/todo-item.action';

/**
 * FE_02 R1 — an organism: its props name the domain. It reads nothing (FE_02 R9 — losing
 * the fetch is not losing the domain), which is what makes it renderable in a test.
 *
 * FE_08 R1 — the directive is here because the row renders the *result* of its actions:
 * the refusal message when the API says no. The submissions themselves would work without
 * it; showing why one failed would not.
 */
export type TodoItemRowProps = {
  listId: string;
  item: TodoItemView;
  isListArchived: boolean;
};

export function TodoItemRow({
  listId,
  item,
  isListArchived,
}: TodoItemRowProps) {
  const [toggleState, toggleAction] = useActionState(
    item.isCompleted ? reopenTodoItemAction : completeTodoItemAction,
    noActionError,
  );
  const [removeState, removeAction] = useActionState(
    removeTodoItemAction,
    noActionError,
  );

  const error = toggleState.error ?? removeState.error;

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-subtle py-3 last:border-b-0">
      <form action={toggleAction} className="contents">
        <input type="hidden" name="listId" value={listId} />
        <input type="hidden" name="itemId" value={item.id} />
        {/*
          FE_06 R7 — every control on the row is named distinctly, and each name includes
          the item's title. A screen-reader user hearing five "Tick off" buttons in a row
          has no way to choose between them.

          FE_06 R2 — a submit button rather than a checkbox: this posts a form and the
          server decides the outcome, which is what a button means and what a checkbox
          does not.
        */}
        <Button
          type="submit"
          tone="quiet"
          size="sm"
          disabled={isListArchived}
          aria-label={
            item.isCompleted
              ? `Put "${item.title}" back on the list`
              : `Tick off "${item.title}"`
          }
        >
          {item.isCompleted ? 'Undo' : 'Tick off'}
        </Button>
      </form>

      <span
        className={
          item.isCompleted
            ? 'flex-1 text-muted line-through'
            : 'flex-1 text-body'
        }
      >
        {item.title}
      </span>

      {/* FE_06 R8 — derived from the same value that drives the strike-through, so the
          two cannot disagree. */}
      <Badge tone={item.isCompleted ? 'success' : 'neutral'}>
        {item.isCompleted ? 'Done' : 'To do'}
      </Badge>

      {item.dueLabel === null ? null : (
        <Badge tone={item.isOverdue ? 'danger' : 'neutral'}>
          {item.isOverdue ? `Overdue ${item.dueLabel}` : `Due ${item.dueLabel}`}
        </Badge>
      )}

      <form action={removeAction} className="contents">
        <input type="hidden" name="listId" value={listId} />
        <input type="hidden" name="itemId" value={item.id} />
        <Button
          type="submit"
          tone="danger"
          size="sm"
          disabled={isListArchived}
          aria-label={`Remove "${item.title}"`}
        >
          Remove
        </Button>
      </form>

      {/*
        The live region is always present, so a message appearing in it is observed and
        announced. A region created at the same moment as its content frequently is not.
      */}
      <p role="status" className="basis-full text-sm text-danger empty:hidden">
        {error}
      </p>
    </li>
  );
}
