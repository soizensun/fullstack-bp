import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  // The framework's own generated output. `next lint` excluded it implicitly; this app
  // now calls eslint directly, because Next 16 removed that command, so the exclusion has
  // to be stated. Linting it reports thousands of warnings about code nobody wrote.
  { ignores: [".next/**", "next-env.d.ts"] },
  ...nextJsConfig,
];
