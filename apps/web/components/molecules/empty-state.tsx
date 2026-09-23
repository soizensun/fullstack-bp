import { cn } from '@/lib/cn.util';

/**
 * FE_02 R3 — a molecule: it arranges, and stops there. One job a user would name — "tell
 * me there is nothing here and what to do about it" — and no knowledge beyond the
 * arrangement.
 *
 * FE_02 R4 — `title`, `description`, `children`. Naming what is empty would make it an
 * organism and would stop the second route reusing it, which is the whole reason it left
 * a private folder (FE_01 R4).
 */
export type EmptyStateProps = React.ComponentPropsWithRef<'div'> & {
  title: string;
  description?: string;
};

export function EmptyState({
  title,
  description,
  className,
  children,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed border-subtle bg-surface-raised p-8 text-center',
        className,
      )}
      {...rest}
    >
      <p className="text-lg font-medium text-body">{title}</p>
      {description === undefined ? null : (
        <p className="text-sm text-muted">{description}</p>
      )}
      {children}
    </div>
  );
}
