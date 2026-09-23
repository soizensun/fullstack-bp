import Link from 'next/link';
import { Badge } from '@/components/atoms/badge';
import type { TodoListSummaryView } from '@/lib/api/todo.type';

/**
 * FE_02 R1 — an organism: its props name a domain concept. It no longer *reads* anything,
 * which is what makes it testable, but losing the fetch is not losing the domain
 * (FE_02 R9), so it stays an organism rather than being demoted.
 *
 * FE_10 R6 — it takes a view model. It has never seen a wire type, which is why a rename
 * on the backend reaches the mapper and stops there.
 */
export type TodoListTableRowProps = {
  list: TodoListSummaryView;
};

export function TodoListTableRow({ list }: TodoListTableRowProps) {
  return (
    <tr className="border-b border-subtle last:border-b-0">
      <td className="py-3 pr-4">
        {/*
          FE_11 R8 — the framework's link, so it prefetches, keeps scroll behaviour, and
          stays a real anchor someone can open in a new tab or copy the address of.
        */}
        <Link
          href={`/todo-lists/${list.id}`}
          className="font-medium text-action hover:underline"
        >
          {list.title}
        </Link>
      </td>
      <td className="py-3 pr-4">
        <Badge tone={list.isArchived ? 'neutral' : 'success'}>
          {list.isArchived ? 'Archived' : 'Active'}
        </Badge>
      </td>
      <td className="py-3 pr-4 text-sm text-muted">
        {/*
          Singular and plural are written out rather than assembled from a count and an
          "s", so the string a translator sees later is a whole sentence (FE_23).
        */}
        {list.openItemCount === 1
          ? '1 thing left to do'
          : `${list.openItemCount} things left to do`}
      </td>
      <td className="py-3 text-sm text-muted">{list.createdLabel}</td>
    </tr>
  );
}
