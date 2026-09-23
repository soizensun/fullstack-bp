import { EmptyState } from '@/components/molecules/empty-state';
import type { TodoListDetailView } from '@/lib/api/todo.type';
import { TodoItemRow } from '@/app/todo-lists/[listId]/_components/todo-item-list/todo-item-row';

/**
 * FE_02 R1 — an organism, and the one place on this route that knows how a list's items
 * are arranged.
 *
 * FE_08 R6 — it stays a server component even though every row it renders is a client
 * one. Composition happens above the boundary: the rows are rendered here and cross it as
 * plain data (FE_08 R4), rather than this being pulled into the browser to render them.
 */
export type TodoItemListProps = {
  list: TodoListDetailView;
};

export function TodoItemList({ list }: TodoItemListProps) {
  if (list.items.length === 0) {
    return (
      <EmptyState
        title="Nothing on this list"
        description={
          list.isArchived
            ? 'This list is archived, so nothing more can be added to it.'
            : 'Add the first thing above.'
        }
      />
    );
  }

  return (
    <ul aria-label={`Things on ${list.title}`}>
      {list.items.map((item) => (
        <TodoItemRow
          key={item.id}
          listId={list.id}
          item={item}
          isListArchived={list.isArchived}
        />
      ))}
    </ul>
  );
}
