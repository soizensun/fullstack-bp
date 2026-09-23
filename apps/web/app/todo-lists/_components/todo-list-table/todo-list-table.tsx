import { listTodoLists } from '@/lib/api/todo.service';
import type { TodoListStatus } from '@/lib/api/todo.type';
import { TodoListTableRow } from '@/app/todo-lists/_components/todo-list-table/todo-list-table-row';
import { TodoListTableEmpty } from '@/app/todo-lists/_components/todo-list-table/todo-list-table-empty';

/**
 * FE_09 R1 — the component that displays the data reads it. Lifting this into the route
 * file to prop-drill it would couple the page to this section's data contract, and the
 * section could then not move without editing the route.
 *
 * FE_08 R1 — a server component, so the read costs no round trip from the browser, needs
 * no loading state inside the component, and adds nothing to the bundle.
 *
 * FE_02 R1 — an organism: it reads, and it knows what a todo list is.
 */
export type TodoListTableProps = {
  status?: TodoListStatus;
  page: number;
};

export async function TodoListTable({ status, page }: TodoListTableProps) {
  const lists = await listTodoLists({ status, page });

  if (lists.items.length === 0) {
    return <TodoListTableEmpty status={status} />;
  }

  return (
    <table className="w-full border-collapse text-left">
      {/* FE_06 R7 — the table is named for a screen reader landing on it out of context. */}
      <caption className="sr-only">
        {`Todo lists${status === undefined ? '' : `, ${status} only`}`}
      </caption>
      <thead>
        <tr className="border-b border-subtle text-sm text-muted">
          <th scope="col" className="py-2 pr-4 font-medium">
            List
          </th>
          <th scope="col" className="py-2 pr-4 font-medium">
            Status
          </th>
          <th scope="col" className="py-2 pr-4 font-medium">
            Left to do
          </th>
          <th scope="col" className="py-2 font-medium">
            Created
          </th>
        </tr>
      </thead>
      <tbody>
        {lists.items.map((list) => (
          <TodoListTableRow key={list.id} list={list} />
        ))}
      </tbody>
    </table>
  );
}
