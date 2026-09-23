# `@repo/vitest-config`

The shared Vitest base for component suites, beside `@repo/jest-config`'s Node bases.

## What it owns

One export, `./react`, returning the config a React workspace's `vitest.config.ts`
spreads: the jsdom environment `FE_14#R2`'s role queries need, the React plugin, TS path
resolution, and the determinism settings `FE_14#R9` asks for — shuffled order, mocks
cleared between tests.

It owns no setup file. Where the matchers and the network handlers are registered is the
consuming app's decision, because the handlers are the app's; the base only takes a
`setupFiles` list and passes it through.

## Why it exists as a package

`INFRA_01#R8` — configuration two workspaces would otherwise copy becomes a package. There
is one consumer today (`apps/web`); it is a package rather than an inlined config because
the second one is what `packages/ui`'s first component test will need, and
`INFRA_03#R7`'s "exports configuration, runs nothing at import time" is easier to keep true
in a package than in a file that grows.

## Why Vitest and not Jest

Recorded in [ADR 0007](../../docs/adr/0007-vitest-is-the-web-test-runner.md), which closed
the open decision `PROJECT.md` §5 used to carry. In short: the web app is ESM, React 19 and
Next 16, and the repository already has one ESM-only dependency it cannot require from
Jest's CommonJS runtime.

## Tasks

```bash
bun run check-types
```
