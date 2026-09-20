/**
 * BE_13 R1 — the `@api` scenarios run here, over HTTP against the application.
 * GEN_10 R9 — the feature files belong to everyone and live at the repository root;
 * these step definitions belong to this stack and live with it.
 */
module.exports = {
  default: {
    requireModule: ['ts-node/register', 'tsconfig-paths/register'],
    require: ['test/steps/**/*.ts'],
    paths: ['../../features/**/*.feature'],
    tags: '@api',
    format: ['summary'],
  },
};
