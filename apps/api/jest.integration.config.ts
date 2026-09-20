import type { Config } from 'jest';
import { nestConfig } from '@repo/jest-config';

/** BE_12 R10 — separately named and separately runnable from the fast suite. */
export default {
  ...nestConfig,
  testRegex: '.*\\.integration-spec\\.ts$',
  collectCoverage: false,
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/$1',
    '^@test/(.*)$': '<rootDir>/../test/$1',
  },
} satisfies Config;
