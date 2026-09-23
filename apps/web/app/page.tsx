import { redirect } from 'next/navigation';

/**
 * FE_11 R9 — the redirect is decided on the server, as early as it can be decided. A
 * redirect decided in a client effect ships the page, runs it, and only then moves the
 * user: the flash of the wrong page is the visible half and the wasted request is the
 * other.
 *
 * This is a temporary move rather than a permanent one: `/` is not a URL that has been
 * retired, it is a URL that does not yet have a home page. `redirect` answers 307, which
 * browsers do not cache — using the permanent status here is the mistake that would
 * outlive the decision.
 */
export default function HomePage() {
  redirect('/todo-lists');
}
