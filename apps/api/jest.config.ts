import type { Config } from 'jest';
import { nestConfig } from '@repo/jest-config';

/**
 * The fast suite: unit tests only.
 *
 * BE_12 R10 — the integration suite is named and run separately, so the fast feedback
 * loop never waits on anything that touches a real store.
 */
export default {
  ...nestConfig,
  testPathIgnorePatterns: ['\\.integration-spec\\.ts$'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/$1',
    '^@test/(.*)$': '<rootDir>/../test/$1',
  },
} satisfies Config;
