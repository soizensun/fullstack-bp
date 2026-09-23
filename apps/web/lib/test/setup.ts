import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/lib/test/msw/server';

/**
 * FE_14 R9 — determinism. No real network, nothing left over between tests, and nothing
 * that depends on the order they ran in.
 *
 * `onUnhandledRequest: 'error'` is the load-bearing option: a request nobody wrote a
 * handler for fails the test instead of silently reaching the real API, which is how a
 * suite ends up green on a developer's machine and red in CI.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
