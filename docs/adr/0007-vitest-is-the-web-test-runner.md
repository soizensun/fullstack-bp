# 0007 — Vitest is the web app's test runner

Status:   accepted
Date:     2026-09-22
Deciders: kritpavin

## Context

`FE_14` describes a component suite the repository could not run. Jest is
configured for the API app through `@repo/jest-config`; nothing was configured
for `apps/web`, and `PROJECT.md` §5 carried the choice as an open decision.
`FE_14`'s own open questions called closing it _"the highest-value thing on the
frontend"_, because until it is closed the document binds nobody.

`GEN_04#R6` ships tests with the change and `GEN_04#R1` refuses a ticket that
depends on an open decision, so the FE reference implementation could not be
written without settling this first.

## Decision

Vitest, with Testing Library and MSW, configured through a new
`@repo/vitest-config` package beside the existing Jest bases.

- **Vitest** runs the suite. The web app is ESM, React 19 and Next 16; Vitest
  executes that stack with no transform configuration, and its config is the
  same Vite config the app's tooling already understands.
- **Testing Library** provides the queries `FE_14#R2` requires — by role and
  accessible name — and `user-event` the real interactions `FE_14#R5` requires.
- **MSW** provides the mocking boundary `FE_14#R4` names. It intercepts at the
  network, so the generated client, the correlation-id middleware, the error
  normalization and the mapping to view models all stay real. That boundary is
  not incidental: it is the whole reason the rule picks the network rather than
  a module.

Two runners now coexist, on purpose. Jest keeps the API app, whose suites are
green and whose Node/CommonJS setup Vitest would buy nothing in.

## Alternatives

- **Jest with `next/jest`.** Rejected on the balance of two costs. It would keep
  one runner, which is worth something; against that, the repository already
  records one dependency it cannot require from Jest's CommonJS runtime
  (`uuid` v14, in `PROJECT.md` §4), which is evidence about the direction the
  ecosystem is moving rather than about that one package. Choosing Jest means
  meeting that problem again per dependency.
- **Migrate the API app to Vitest too.** Rejected as out of scope and as a bad
  trade: `BE_11`–`BE_13`'s suites pass, and rewriting a working test setup to
  win consistency is the kind of change `GEN_15` asks to be justified by
  something other than tidiness. It stays available if the Jest setup ever costs
  more than it saves.
- **No component suite; rely on browser scenarios.** Rejected by `FE_15#R1`,
  which is explicit that a component's states belong one level down, and by
  `FE_14#R8`, which sets coverage per atomic level.
- **Inline the config in `apps/web` rather than a package.** Rejected by
  `INFRA_01#R8`: the second consumer is `packages/ui`'s first component test,
  and a config copied once is a config copied thereafter.

## Consequences

- `PROJECT.md` §5's frontend-runner decision is closed and its row deleted; the
  stack table gains Vitest, Testing Library and MSW, and records that the two
  runners are split by workspace.
- The repository has two test runners, so "how do I run the tests" has two
  answers depending on where you are. `turbo run test` still covers both, which
  is the answer that matters most of the time.
- Async server components cannot be rendered by Testing Library. The suite
  therefore covers atoms, molecules, the presentational organisms that take view
  models, and the client and mappers in `lib/` — which is what `FE_14#R8` asks
  for anyway, since it puts pages and templates out of scope. The consequence is
  a real one: a data-reading organism is exercised only by the browser layer
  `FE_15` describes, and that layer does not exist yet.
- A server action cannot be imported in a test process, because it reaches
  server-only modules. Tests that render a component driving one replace the
  action module. That is consistent with `FE_14#R4` — a server action is an HTTP
  endpoint, so it is the network — but it is a judgment the rule does not make
  explicitly, and it is logged in `FE_14`'s open questions.

Supersedes: —
Referenced by: FE_14, `packages/vitest-config/README.md`
