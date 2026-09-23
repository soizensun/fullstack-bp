import { libraryConfig } from "@repo/eslint-config/library";

/** @type {import("eslint").Linter.Config} */
export default [
  // GEN_08 R4 — generated files are build output. Linting them reports on the
  // generator's style, and the only available fix is the edit R4 forbids.
  { ignores: ["src/generated/**"] },
  ...libraryConfig,
];
