import { EmptyState } from '@/components/molecules/empty-state';
import type { TodoListStatus } from '@/lib/api/todo.type';

/**
 * FE_07 R5 — the empty state, built with the component rather than discovered in
 * production. The frame never draws it and the fix at that point is a different
 * component.
 *
 * The two cases read differently on purpose: "you have no lists" and "your filter matched
 * nothing" call for different next actions, and collapsing them into one sentence leaves
 * someone staring at an empty page wondering whether their data is gone.
 */
export type TodoListTableEmptyProps = {
  status?: TodoListStatus;
};

export function TodoListTableEmpty({ status }: TodoListTableEmptyProps) {
  if (status === undefined) {
    return (
      <EmptyState
        title="No lists yet"
        description="Create one above to start keeping track of something."
      />
    );
  }

  return (
    <EmptyState
      title={`No ${status} lists`}
      description="Change the filter above to see the rest."
    />
  );
}
