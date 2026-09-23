import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

/**
 * The shared base for component suites (FE_14).
 *
 * INFRA_03 R7 — a configuration package exports configuration and runs nothing at import
 * time. This is a function returning a config object; importing it starts no watcher,
 * reads no environment, and touches no disk.
 *
 * INFRA_01 R8 — configuration two workspaces would otherwise copy lives in a package.
 * There is one consumer today; the second is the reason this is not inlined in it.
 */
export function reactTestConfig(
  options: { setupFiles?: string[] } = {},
): ViteUserConfig {
  return defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
      // FE_14 R2 — queries go through the accessibility tree, which needs a DOM.
      environment: 'jsdom',
      // GEN_07 R3 has no exception for tests: `describe` and `it` are imported, not global.
      globals: false,
      setupFiles: options.setupFiles ?? [],
      css: false,
      // FE_14 R9 — nothing may depend on test order.
      sequence: { shuffle: true },
      clearMocks: true,
      restoreMocks: true,
    },
  });
}
