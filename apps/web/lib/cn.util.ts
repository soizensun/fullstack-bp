import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * FE_04 R5 — a component that accepts `className` combines it with a *conflict-aware*
 * merge, so a caller passing `p-6` replaces the component's `p-4` instead of both landing
 * and the winner being decided by stylesheet order. Naive concatenation makes overrides
 * work by luck.
 *
 * The incoming value comes last, so the caller wins — the same ordering rule FE_05 R6
 * applies to the props spread.
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}
