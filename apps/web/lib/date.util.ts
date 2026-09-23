/**
 * GEN_11 — an instant crosses the wire as ISO-8601 UTC. The timezone and the wording a
 * person sees are applied here, by the client, and are never stored.
 *
 * FE_01 R8 — `.util.ts`, because everything in here is a pure function. One grep over the
 * suffix checks that claim.
 */

/**
 * Fixed rather than taken from the visitor's locale, on purpose: a server render and the
 * hydration that follows must produce the same string, and `undefined` resolves to two
 * different locales across that boundary. Making this configurable is a real requirement
 * the day a second locale arrives (FE_23), and a hydration bug until then.
 */
const DISPLAY_LOCALE = 'en-GB';

const dayFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const minuteFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** `2026-09-22T09:12:04Z` → `22 Sep 2026`. */
export function formatDay(instant: string): string {
  return dayFormat.format(new Date(instant));
}

/** `2026-09-22T09:12:04Z` → `22 Sep, 09:12`. */
export function formatMinute(instant: string): string {
  return minuteFormat.format(new Date(instant));
}
