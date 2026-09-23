import { describe, expect, it } from 'vitest';
import {
  toTodoItemView,
  toTodoListDetailView,
  toTodoListSummaryView,
} from '@/lib/api/todo.transform';

/**
 * FE_10 R6's mapper is where a contract change lands, so it is worth testing on its own:
 * these are the assertions that fail loudly when the backend renames a field, rather than
 * a component rendering `undefined` as a blank cell.
 *
 * FE_14 R9 — fixed data, no clock. Every instant below is a literal, so the suite cannot
 * start failing at midnight UTC.
 */
describe('toTodoItemView', () => {
  const openItem = {
    id: '0199c2a0-0000-7000-8000-00000000000a',
    title: 'Book flights',
    status: 'open' as const,
    dueDate: null,
    isOverdue: false,
  };

  it('derives isCompleted from the status, so no component repeats the comparison', () => {
    expect(toTodoItemView(openItem).isCompleted).toBe(false);
    expect(
      toTodoItemView({ ...openItem, status: 'completed' }).isCompleted,
    ).toBe(true);
  });

  it('keeps "no due date" distinct from a due date, rather than collapsing it to a blank', () => {
    expect(toTodoItemView(openItem).dueLabel).toBeNull();
  });

  it('formats a due date for reading, in UTC', () => {
    const view = toTodoItemView({
      ...openItem,
      dueDate: '2026-09-22T23:30:00.000Z',
    });

    // The timezone is applied by the client and never stored (GEN_11). Pinning UTC is
    // what stops this assertion depending on where the suite runs.
    expect(view.dueLabel).toBe('22 Sept 2026');
  });

  it('passes the overdue decision through rather than recomputing it', () => {
    // The API owns "overdue", because it owns the clock. A client that recomputed it
    // would disagree with the badge the API's own counts imply.
    expect(
      toTodoItemView({
        ...openItem,
        dueDate: '2020-01-01T00:00:00.000Z',
        isOverdue: true,
      }).isOverdue,
    ).toBe(true);
  });
});

describe('toTodoListSummaryView', () => {
  const activeList = {
    id: '0199c2a0-0000-7000-8000-000000000001',
    title: 'Trip to Kyoto',
    status: 'active' as const,
    itemCount: 3,
    openItemCount: 1,
    createdAt: '2026-09-01T08:00:00.000Z',
  };

  it('derives isArchived from the status', () => {
    expect(toTodoListSummaryView(activeList).isArchived).toBe(false);
    expect(
      toTodoListSummaryView({ ...activeList, status: 'archived' }).isArchived,
    ).toBe(true);
  });

  it('formats the creation instant for reading', () => {
    expect(toTodoListSummaryView(activeList).createdLabel).toBe('1 Sept 2026');
  });

  it('maps a detail response and its items in one pass', () => {
    const view = toTodoListDetailView({
      ...activeList,
      items: [
        {
          id: '0199c2a0-0000-7000-8000-00000000000a',
          title: 'Book flights',
          status: 'completed',
          dueDate: null,
          isOverdue: false,
        },
      ],
    });

    expect(view.title).toBe('Trip to Kyoto');
    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.isCompleted).toBe(true);
  });
});
