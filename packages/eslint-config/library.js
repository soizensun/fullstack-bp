import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for Node.js libraries.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const libraryConfig = [
  ...baseConfig,
  {
    languageOptions: {
      // Flat config has no `env` key; Node's globals are declared here instead. The
      // eslintrc spelling this replaced was not merely ignored — ESLint refuses to start
      // on it, so this config could never have run.
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
  },
  {
    ignores: [".*.js", "node_modules/", "dist/"],
  },
];

export default libraryConfig;
