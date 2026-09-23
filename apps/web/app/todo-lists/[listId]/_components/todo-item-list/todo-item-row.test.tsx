import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TodoItemView } from '@/lib/api/todo.type';
import { render, screen } from '@/lib/test/render';

/**
 * FE_14 R4 — mocked at the network, and a server action *is* the network for a client
 * component: it compiles to an HTTP endpoint the browser posts to (FE_09 R5). Replacing
 * it here is the same seam MSW provides elsewhere, not a mocked child — every component
 * in the tree below renders for real.
 *
 * Its module cannot be imported in a test process at all: it reaches the server-only
 * client and `revalidateTag`, neither of which exists outside a request.
 */
const completeTodoItemAction = vi.fn();
const reopenTodoItemAction = vi.fn();
const removeTodoItemAction = vi.fn();

vi.mock('@/app/todo-lists/[listId]/_lib/todo-item.action', () => ({
  completeTodoItemAction: (...args: unknown[]) =>
    completeTodoItemAction(...args),
  reopenTodoItemAction: (...args: unknown[]) => reopenTodoItemAction(...args),
  removeTodoItemAction: (...args: unknown[]) => removeTodoItemAction(...args),
  addTodoItemAction: vi.fn(),
}));

const { TodoItemRow } =
  await import('@/app/todo-lists/[listId]/_components/todo-item-list/todo-item-row');

const LIST_ID = '0199c2a0-0000-7000-8000-000000000001';

// FE_14 R9 — fixed data from one builder, so no test depends on another's leftovers.
function anItem(overrides: Partial<TodoItemView> = {}): TodoItemView {
  return {
    id: '0199c2a0-0000-7000-8000-00000000000a',
    title: 'Book flights',
    status: 'open',
    isCompleted: false,
    dueLabel: null,
    isOverdue: false,
    ...overrides,
  };
}

describe('TodoItemRow', () => {
  beforeEach(() => {
    completeTodoItemAction.mockResolvedValue({ error: null });
    reopenTodoItemAction.mockResolvedValue({ error: null });
    removeTodoItemAction.mockResolvedValue({ error: null });
  });

  it('names its controls after the item, so a list of them can be told apart', () => {
    // FE_06 R7 — five rows of "Tick off" give a screen-reader user nothing to choose
    // between. This is the assertion that fails if the name is ever reduced to the label.
    render(
      <TodoItemRow listId={LIST_ID} item={anItem()} isListArchived={false} />,
    );

    expect(
      screen.getByRole('button', { name: 'Tick off "Book flights"' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Remove "Book flights"' }),
    ).toBeVisible();
  });

  it('ticks an item off when the button is used', async () => {
    const { user } = render(
      <TodoItemRow listId={LIST_ID} item={anItem()} isListArchived={false} />,
    );

    // FE_14 R5 — a real click, found by accessible name. Calling the handler directly
    // would skip the disabled attribute and the form submission that carries the ids.
    await user.click(
      screen.getByRole('button', { name: 'Tick off "Book flights"' }),
    );

    expect(completeTodoItemAction).toHaveBeenCalledOnce();
  });

  it('offers the way back once an item is done, and announces that it is', () => {
    render(
      <TodoItemRow
        listId={LIST_ID}
        item={anItem({ status: 'completed', isCompleted: true })}
        isListArchived={false}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Put "Book flights" back on the list',
      }),
    ).toBeVisible();
    // FE_06 R8 — the state is announced, not only struck through. A strike-through is
    // invisible to anyone not looking at it.
    expect(screen.getByText('Done')).toBeVisible();
  });

  it('says why a change was refused, and keeps the item on screen', async () => {
    // FE_10 R7 — the action branched on the code from the catalogue; what a person is
    // shown is this sentence. The test asserts what they see, not the code, which is the
    // client's concern and not theirs.
    completeTodoItemAction.mockResolvedValue({
      error: 'This list already has something with that name.',
    });

    const { user } = render(
      <TodoItemRow listId={LIST_ID} item={anItem()} isListArchived={false} />,
    );
    await user.click(
      screen.getByRole('button', { name: 'Tick off "Book flights"' }),
    );

    expect(
      await screen.findByText(
        'This list already has something with that name.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Book flights')).toBeVisible();
  });

  it('offers no changes at all on an archived list', () => {
    render(<TodoItemRow listId={LIST_ID} item={anItem()} isListArchived />);

    expect(
      screen.getByRole('button', { name: 'Tick off "Book flights"' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Remove "Book flights"' }),
    ).toBeDisabled();
  });

  it('marks an overdue item as overdue rather than merely due', () => {
    render(
      <TodoItemRow
        listId={LIST_ID}
        item={anItem({ dueLabel: '1 Sept 2026', isOverdue: true })}
        isListArchived={false}
      />,
    );

    expect(screen.getByText('Overdue 1 Sept 2026')).toBeVisible();
  });
});
