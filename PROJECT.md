# PROJECT.md

**This is the only file that says what this repository is and what stage it is at.**

Nothing else — not `AGENTS.md`, not `CLAUDE.md`, not any document in
`docs/conventions/` — may assert those facts. They state rules and conditions; this file
supplies the facts those conditions are checked against. That separation is what lets the
convention set be copied into a real project, and lets improvements made there be brought
back, without either side dragging the other's circumstances along.

When this repository is cloned to start a real project, sections 1–5 are **replaced**, not
edited around. `GEN_03` is the checklist.

---

## 1. Identity

|              |                                                        |
| ------------ | ------------------------------------------------------ |
| **Name**     | `my-fullstack-bp`                                      |
| **Kind**     | `boilerplate` — exists to be copied, not to be shipped |
| **Stage**    | skeleton; no users, no deployment, no CI               |
| **Upstream** | none; this is the root                                 |

## 2. What this means for your work

The trade-offs below follow from §1. They change when §1 changes — do not copy them
forward without re-deriving them.

- **Generality over cleverness.** Every pattern here gets copied into projects written by
  people who never read this folder. Prefer the obvious version over the smart one.
  _(In a product repo this inverts: solve today's problem, do not build for the general
  case you have not met yet.)_
- **The conventions are the deliverable.** A change that works but breaks a convention is
  a regression, because the convention is what gets inherited.
- **No feature work.** Nothing here is a real domain. If you are asked to build a feature,
  you are being asked to build an example of one — say so.

## 3. Code that ships as example, not as product

Delete this code when starting a real project. Do not extend it, and do not treat its
shape as a convention unless a document in `docs/conventions/` says so.

| Path                                               | What it is                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/todo/**`                     | **The BE reference implementation.** Demonstrates `BE_01`–`BE_13`; the convention documents point back at it (ADR 0004)                                       |
| `apps/api/src/modules/activity-log/**`             | Second module, so `BE_03`'s cross-module ports have something to show                                                                                         |
| `apps/api/src/shared/**`, `apps/api/src/config/**` | Supporting layers of the same example — clock and id ports, file store, error filter, config                                                                  |
| `apps/api/test/**`, `features/todo-list.feature`   | Its unit, integration, e2e and Gherkin suites                                                                                                                 |
| `apps/web/app/**`                                  | **The FE reference implementation.** The todo UI the BE example serves. Demonstrates `FE_01`–`FE_11` and `FE_14`; those documents point back at it (ADR 0004) |
| `apps/web/components/**`, `apps/web/lib/**`        | Its shared components, typed client, view models and mappers                                                                                                  |
| `apps/web/lib/test/**`                             | Its Vitest harness — the render helper and the MSW handlers                                                                                                   |
| `packages/tokens/**`                               | The token layer it consumes. Hand-written; see ADR 0008                                                                                                       |
| `packages/ui/src/{button,card,code}.tsx`           | Example shared components. Predate the conventions; `apps/web/components/` is the pattern to copy                                                             |

Deleting the todo and activity-log modules means deleting the **Reference implementation**
lines in `BE_01`–`BE_13` that point at them (`GEN_03` R5, ADR 0004); deleting the web app
means doing the same for `FE_01`–`FE_11`, `FE_14` and `GEN_08`.

`packages/api/**` is **not** example code. It is generated output plus a typed client
(ADR 0006), so a real project keeps it and regenerates it against its own contract.

## 4. Stack

Writing code against a library that is not installed is the most common failure in this
repository. Check here first. If a task needs something from the _planned_ column, say so
and propose the addition — do not quietly install it.

| Concern                                  | Status      | Notes                                                                                                                                                                     |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Turborepo, Bun workspaces                | **present** | turbo 2.10, bun 1.3.11                                                                                                                                                    |
| NestJS 11 API                            | **present** | `apps/api`, listens on `:3000`                                                                                                                                            |
| Next.js 16 App Router, React 19          | **present** | `apps/web` on `:3001`, CSS Modules + `globals.css`                                                                                                                        |
| Jest 30 (+ ts-jest, supertest)           | **present** | shared bases in `@repo/jest-config`; **API only**. Unit, integration (`*.integration-spec.ts`) and e2e run as separate tasks                                              |
| Vitest 3 + Testing Library + MSW         | **present** | shared base in `@repo/vitest-config`; **web only**. The two runners are split by workspace on purpose (ADR 0007)                                                          |
| ESLint 9 flat config + Prettier          | **present** | see open decision 2                                                                                                                                                       |
| Zod 4 + `nestjs-zod` 5                   | **present** | API only. One schema per operation, type derived (`BE_08` R3)                                                                                                             |
| `@nestjs/swagger` 11 + Scalar            | **present** | API only. OpenAPI generated from the app at `/openapi.json`; Scalar UI at `/reference`. Pinned to the 11.x line — v12 needs NestJS 12                                     |
| `uuid` 11                                | **present** | UUIDv7 (`GEN_11`). v14 is ESM-only and cannot be required from the Jest CommonJS runtime                                                                                  |
| `openapi-typescript` + `openapi-fetch`   | **present** | the contract pipeline. `turbo run contract:generate --filter=api` writes `apps/api/openapi.json` and `packages/api/src/generated/schema.ts`, both committed (ADR 0006)    |
| Gherkin e2e (Cucumber 13)                | **present** | `features/` at the repo root; `@api` step definitions in `apps/api/test/steps`. Run with `turbo run test:bdd`                                                             |
| File-backed example store                | **present** | `TODO_DATA_DIR`, JSON files. Stands in for a database so the example needs no service                                                                                     |
| Biome                                    | _planned_   | the intended linter and formatter                                                                                                                                         |
| Tailwind CSS 4                           | **present** | `apps/web` only, with `class-variance-authority` and `tailwind-merge`. The theme is generated from the token layer, never typed alongside it (ADR 0008)                   |
| Design tokens                            | **present** | `packages/tokens` — primitive → semantic → component, as CSS custom properties                                                                                            |
| Figma pipeline                           | _planned_   | no design source is recorded, so under `FE_03` R6 the token files are the source of record and are hand-written. `FE_03` R8's generated icon set therefore does not exist |
| Playwright / browser Gherkin             | _planned_   | `features/` scenarios are `@api`-only; `FE_15` has no implementation                                                                                                      |
| Redis, database, outbox, background jobs | _planned_   | no backing services, no Docker, no compose                                                                                                                                |
| CI/CD                                    | _planned_   | no `.github/workflows`                                                                                                                                                    |

## 5. Open decisions

Load-bearing and unresolved. If your task depends on one, stop and raise it — do not
settle it on your own. Record the answer as an ADR (`GEN_13`) and delete the row.

1. **ESLint → Biome.** The intended stack is Biome; the repository is wired for ESLint 9
   with per-workspace flat configs plus Prettier. `INFRA_05` and `INFRA_06` assume Biome.
2. **The 404 a streamed route cannot answer.** `FE_11` R6 wants a missing resource to carry
   a 404. `FE_11` R5 (an error file per route) and `FE_09` R7 (a Suspense boundary around a
   slow read) each make the response stream, and a streamed response has already been sent
   as 200 by the time `notFound()` runs. The reference implementation answers a soft 404
   with `noindex`. The fix is an existence check at the edge, before the response streams,
   which costs an API call on every request to the route. Logged in `FE_11`'s open
   questions; nobody has decided whether that price is worth paying.

_(Decision 4, on where the authoring contract lives, was closed by
[ADR 0001](docs/adr/0001-authoring-contract-lives-in-gen-12.md); the BE↔FE contract by
[ADR 0006](docs/adr/0006-the-contract-is-generated-from-the-api-app.md); the frontend test
runner by [ADR 0007](docs/adr/0007-vitest-is-the-web-test-runner.md).)_

---

## 6. Keeping this file true

- Update the moment a fact changes — the same pull request that installs Tailwind moves
  its row to _present_.
- A fact stated here must appear nowhere else. If you find one duplicated in `AGENTS.md`
  or a convention document, delete it there and link here.
- Convention document statuses are **not** tracked here. Each entry in
  `docs/conventions/index.html` carries its own `data-status`; that is the only record.
- Sections 1–5 are project-local. They are never merged upstream and never inherited
  downstream.
