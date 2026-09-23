import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn.util';

/**
 * FE_02 R2 — an atom: it imports no other component from the set. That is the one
 * mechanical test in the whole classification, and it is what keeps this file cheap to
 * reclassify if it ever starts arranging.
 *
 * FE_02 R4 — it says `tone`, never `todo`, `list` or `item`. A domain word here would
 * make it an organism and would stop a second product ever using it.
 *
 * FE_04 R4 — the visual options are a declared variant map with defaults, not a chain of
 * conditionals over class strings. Every option is readable in one place.
 */
const badge = cva(
  'inline-flex items-center rounded-full px-2 py-1 text-sm font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-sunken text-muted',
        success: 'bg-surface-success text-success',
        warning: 'bg-surface-warning text-warning',
        danger: 'bg-surface-danger text-danger',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

/**
 * FE_05 R1 — an exported `type` alias named for the component.
 * FE_05 R6 — it extends the element's own props, so `ref`, `id`, `title`, `data-*` and
 * every `aria-*` a caller needs reach the element instead of being swallowed (FE_05 R7).
 */
export type BadgeProps = React.ComponentPropsWithRef<'span'> &
  VariantProps<typeof badge>;

export function Badge({ tone, className, ...rest }: BadgeProps) {
  // FE_04 R5 — conflict-aware merge, and the spread is last (FE_05 R6), so a caller
  // passing `px-4` deterministically replaces the `px-2` above rather than racing it.
  return <span className={cn(badge({ tone }), className)} {...rest} />;
}
