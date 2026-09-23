import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

/**
 * FE_14 R3 — the shared render helper. It wraps the app's real providers rather than
 * mocking them, which is cheaper than the mocks and far more faithful; there are none to
 * wrap today, and this is where the first one goes so no test has to learn about it.
 *
 * It also returns a `user` from the same call, because FE_14 R5 wants every interaction
 * driven through real user events and a helper that makes the correct thing the shortest
 * thing is the only kind anyone uses.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  return {
    user: userEvent.setup(),
    ...rtlRender(ui, options),
  };
}

export { screen, within, waitFor } from '@testing-library/react';
