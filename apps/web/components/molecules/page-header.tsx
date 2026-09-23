import { cn } from '@/lib/cn.util';

/**
 * FE_05 R4 — composition over configuration. The first draft of this took `title`,
 * `subtitle` and `actions` as three node props; three node props means the markup being
 * handed over has structure, and structure passed as props arrives as an unordered bag.
 * As sub-components each section owns its own placement, an omitted one costs nothing —
 * no conditional spacing for the slot that might be missing — and the JSX at the call
 * site has the shape of the output.
 *
 * FE_02 R3 — a molecule. It arranges, names no domain concept, reads nothing.
 */
export type PageHeaderProps = React.ComponentPropsWithRef<'header'>;

export function PageHeader({ className, children, ...rest }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 pb-6',
        className,
      )}
      {...rest}
    >
      {children}
    </header>
  );
}

export type PageHeaderTitleProps = React.ComponentPropsWithRef<'h1'>;

function PageHeaderTitle({ className, ...rest }: PageHeaderTitleProps) {
  return (
    <h1
      className={cn('text-xl font-semibold text-body', className)}
      {...rest}
    />
  );
}

export type PageHeaderSubtitleProps = React.ComponentPropsWithRef<'p'>;

function PageHeaderSubtitle({ className, ...rest }: PageHeaderSubtitleProps) {
  return <p className={cn('text-sm text-muted', className)} {...rest} />;
}

export type PageHeaderActionsProps = React.ComponentPropsWithRef<'div'>;

function PageHeaderActions({ className, ...rest }: PageHeaderActionsProps) {
  return <div className={cn('flex items-center gap-2', className)} {...rest} />;
}

PageHeader.Title = PageHeaderTitle;
PageHeader.Subtitle = PageHeaderSubtitle;
PageHeader.Actions = PageHeaderActions;
