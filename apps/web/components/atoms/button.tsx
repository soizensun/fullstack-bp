import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn.util';

/**
 * FE_06 R2 — a real `<button>`. Everything a control needs — focusable, activates on
 * Enter and Space, announces itself, can be disabled, participates in a form — comes free
 * with the element and takes four attributes and two handlers to rebuild badly on a div.
 *
 * FE_05 R8 — no `as` prop. This is only ever a button; a link that looks like one is a
 * different component, and typing this polymorphically to avoid writing that one would
 * cost every caller a worse error message.
 */
const button = cva(
  'inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      tone: {
        primary: 'bg-action text-on-action hover:bg-action-hover',
        quiet: 'bg-transparent text-body hover:bg-surface-sunken',
        danger: 'bg-transparent text-danger hover:bg-surface-danger',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
      },
    },
    defaultVariants: { tone: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ComponentPropsWithRef<'button'> &
  VariantProps<typeof button>;

export function Button({
  tone,
  size,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  /*
   * `type` defaults to `button` rather than the platform's `submit`, because the platform
   * default turns every unlabelled button inside a form into a submit button — the most
   * common way a "Cancel" control posts a form. A caller that wants to submit says so.
   */
  return (
    <button
      type={type}
      className={cn(button({ tone, size }), className)}
      {...rest}
    />
  );
}
