'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/atoms/button';

/**
 * FE_08 R3 — this is the extraction the rule is about. The forms around it are server
 * components; only the pending state needs a hook, so only the pending state crosses the
 * boundary. Marking the form instead would ship the form, its heading, its layout and
 * every module they import to the browser in order to disable one button.
 *
 * FE_08 R2 — the directive sits on the entry of the interactive subtree. There is nothing
 * below it to repeat it on.
 *
 * FE_05 R3 — `pendingLabel` is named for what it is, not for its absence.
 */
export type SubmitButtonProps = Omit<ButtonProps, 'type'> & {
  pendingLabel: string;
};

export function SubmitButton({
  pendingLabel,
  disabled,
  children,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  /*
   * `disabled` is combined rather than passed through. A caller disables the control for
   * its own reason — an archived list has nothing to submit — and that reason is not the
   * same as "a submission is in flight". Letting the spread overwrite one with the other
   * would make a button clickable mid-submit whenever a caller passed `disabled={false}`.
   */
  return (
    <Button type="submit" disabled={pending || disabled === true} {...rest}>
      {/*
        FE_06 R8 — the label changes with the state rather than a separate `aria-busy`
        that could drift from it. One value drives both what is shown and what is
        announced, so they cannot disagree.
      */}
      {pending ? pendingLabel : children}
    </Button>
  );
}
