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

| | |
|---|---|
| **Name** | `my-fullstack-bp` |
| **Kind** | `boilerplate` — exists to be copied, not to be shipped |
| **Stage** | skeleton; no users, no deployment, no CI |
| **Upstream** | none; this is the root |

## 2. What this means for your work

The trade-offs below follow from §1. They change when §1 changes — do not copy them
forward without re-deriving them.

- **Generality over cleverness.** Every pattern here gets copied into projects written by
  people who never read this folder. Prefer the obvious version over the smart one.
  *(In a product repo this inverts: solve today's problem, do not build for the general
  case you have not met yet.)*
- **The conventions are the deliverable.** A change that works but breaks a convention is
  a regression, because the convention is what gets inherited.
- **No feature work.** Nothing here is a real domain. If you are asked to build a feature,
  you are being asked to build an example of one — say so.

## 3. Code that ships as example, not as product

Delete this code when starting a real project. Do not extend it, and do not treat its
shape as a convention unless a document in `docs/conventions/` says so.

| Path | What it is |
|---|---|
| `apps/api/src/modules/todo/**` | **The BE reference implementation.** Demonstrates `BE_01`–`BE_13`; the convention documents point back at it (ADR 0004) |
| `apps/api/src/modules/activity-log/**` | Second module, so `BE_03`'s cross-module ports have something to show |
| `apps/api/src/shared/**`, `apps/api/src/config/**` | Supporting layers of the same example — clock and id ports, file store, error filter, config |
| `apps/api/test/**`, `features/todo-list.feature` | Its unit, integration, e2e and Gherkin suites |
| `apps/api/src/links/**` | Older example Nest module — predates the conventions and sits outside `modules/`, so it violates `BE_01` R1/R2. Prefer `todo` as the pattern to copy |
| `packages/api/src/links/**` | Its DTOs and entity |
| `packages/ui/src/{button,card,code}.tsx` | Example shared components |
| `apps/web/app/page.tsx` | Default Next.js landing page |

Deleting the todo and activity-log modules means deleting the **Reference implementation**
lines in `BE_01`–`BE_13` that point at them (`GEN_03` R5, ADR 0004).

## 4. Stack

Writing code against a library that is not installed is the most common failure in this
repository. Check here first. If a task needs something from the *planned* column, say so
and propose the addition — do not quietly install it.

| Concern | Status | Notes |
|---|---|---|
| Turborepo, Bun workspaces | **present** | turbo 2.10, bun 1.3.11 |
| NestJS 11 API | **present** | `apps/api`, listens on `:3000` |
| Next.js 16 App Router, React 19 | **present** | `apps/web` on `:3001`, CSS Modules + `globals.css` |
| Jest 30 (+ ts-jest, supertest) | **present** | shared bases in `@repo/jest-config`; API only. Unit, integration (`*.integration-spec.ts`) and e2e run as separate tasks |
| ESLint 9 flat config + Prettier | **present** | see open decision 2 |
| Zod 4 + `nestjs-zod` 5 | **present** | API only. One schema per operation, type derived (`BE_08` R3) |
| `@nestjs/swagger` 11 + Scalar | **present** | API only. OpenAPI generated from the app at `/openapi.json`; Scalar UI at `/reference`. Pinned to the 11.x line — v12 needs NestJS 12 |
| `uuid` 11 | **present** | UUIDv7 (`GEN_11`). v14 is ESM-only and cannot be required from the Jest CommonJS runtime |
| Gherkin e2e (Cucumber 13) | **present** | `features/` at the repo root; `@api` step definitions in `apps/api/test/steps`. Run with `turbo run test:bdd` |
| File-backed example store | **present** | `TODO_DATA_DIR`, JSON files. Stands in for a database so the example needs no service |
| Biome | *planned* | the intended linter and formatter |
| Tailwind CSS | *planned* | not installed anywhere |
| Design tokens / Figma pipeline | *planned* | no tokens package exists |
| Redis, database, outbox, background jobs | *planned* | no backing services, no Docker, no compose |
| CI/CD | *planned* | no `.github/workflows` |

## 5. Open decisions

Load-bearing and unresolved. If your task depends on one, stop and raise it — do not
settle it on your own. Record the answer as an ADR (`GEN_13`) and delete the row.

1. **The BE↔FE contract.** `GEN_08` states the API app owns the contract and the web app
   consumes types generated from OpenAPI. The repository currently does the opposite:
   `packages/api` is a hand-written shared DTO package imported by both apps. One of the
   two has to change. *Half-settled:* the API app now generates the OpenAPI document
   (`GEN_08` R2, `BE_07` R10), but nothing generates a client from it, and the todo module
   keeps its DTOs local rather than adding a second contract path. The remaining question
   is whether `packages/api` becomes generated output or is replaced.
2. **ESLint → Biome.** The intended stack is Biome; the repository is wired for ESLint 9
   with per-workspace flat configs plus Prettier. `INFRA_05` and `INFRA_06` assume Biome.
3. **Frontend test runner.** Jest is configured for the API app. Nothing is configured for
   the web app.
*(Decision 4, on where the authoring contract lives, was closed by
[ADR 0001](docs/adr/0001-authoring-contract-lives-in-gen-12.md).)*

---

## 6. Keeping this file true

- Update the moment a fact changes — the same pull request that installs Tailwind moves
  its row to *present*.
- A fact stated here must appear nowhere else. If you find one duplicated in `AGENTS.md`
  or a convention document, delete it there and link here.
- Convention document statuses are **not** tracked here. Each entry in
  `docs/conventions/index.html` carries its own `data-status`; that is the only record.
- Sections 1–5 are project-local. They are never merged upstream and never inherited
  downstream.
