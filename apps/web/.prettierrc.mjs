import config from '@repo/eslint-config/prettier-base';

/**
 * FE_04 R6 — class order carries no meaning, so it is the formatter's job. The plugin is
 * registered here rather than at the repository root because it is the only workspace
 * that writes utility classes.
 */
export default {
  ...config,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './app/globals.css',
};
