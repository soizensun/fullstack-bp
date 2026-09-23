import { cn } from '@/lib/cn.util';

/**
 * FE_02 R2 — an atom: one element, no component imported.
 *
 * FE_05 R5 — deliberately uncontrolled, and only uncontrolled. Every caller here submits
 * through a form action, so no caller needs `value`; offering the controlled form as well
 * would be a second API with no consumer (FE_05 R10). The day one appears, the two forms
 * become a union whose members exclude each other's props, not a `value` bolted on.
 */
export type TextFieldProps = Omit<
  React.ComponentPropsWithRef<'input'>,
  'value' | 'type'
>;

export function TextField({ className, ...rest }: TextFieldProps) {
  return (
    <input
      type="text"
      className={cn(
        'h-10 w-full rounded-md border border-subtle bg-surface px-3 text-base text-body placeholder:text-muted',
        className,
      )}
      {...rest}
    />
  );
}
