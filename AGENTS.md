# AGENTS.md

Instructions for any AI agent working in this repository. Read this file completely
before your first edit. It is short on purpose — it tells you **where the rules are**,
not what they all are.

---

## 1. What this repository is

**Read [`PROJECT.md`](PROJECT.md) first.** It is the only file that states what this
repository is, what stage it is at, which parts of the stack exist, which are only
planned, which code is example code, and which decisions are still open. Nothing in this
file or in `docs/conventions/` repeats those facts, so you cannot infer them from here.

What is true regardless of the project:

- **The conventions are inherited.** `docs/conventions/` is copied between projects and is
  read by people and agents who were not in the room when it was written. A wrong
  convention costs more than a wrong line of code, and it costs it repeatedly.
- **A change that works but breaks a convention is a regression.** Fix the change, or
  change the convention in the open (`GEN_01#R10`).
- **Project facts belong in `PROJECT.md`, never in a convention document.** If you find one
  leaking, move it and link.

---

## 2. Read the conventions before you code

`docs/conventions/index.html` is the index of every convention document. It is the
routing table for this repository. **Open it first.**

Your read set:

1. Every **P0** entry — they bind every change in any area.
2. `<AREA>_01` through the last **P1** entry of each area you are touching. Read these
   once per area, not per change.
3. Any entry whose **Open when** trigger matches the task in front of you.
4. Any entry whose `data-paths` globs match a file you are about to edit — regardless of
   tier.

Each entry carries its own `data-status` — `todo`, `draft`, `stable`, or `deprecated`.
Check it; do not assume. **While an entry is `todo` its document does not exist, and:**

> The index entry **is** the binding text. Follow its summary and its trigger. Do not
> infer past it. In your plan, name which `todo` entries you had to interpret. If two
> entries conflict, stop and ask.

Cite the convention ids you relied on (e.g. `BE_07`, `FE_03`) in your plan and in the PR
description.

---

## 3. Repository map

Roles, not contents. Versions, ports and what is installed live in
[`PROJECT.md`](PROJECT.md); which code is example code lives there too.

```
apps/
  api/          the API app. Entry src/main.ts, modules under src/
  web/          the web app. Routes in app/**, no src/ directory
packages/
  api/          @repo/api — the generated contract client for the API↔web seam
  tokens/       @repo/tokens — the design token layer
  ui/           @repo/ui — shared React components
  eslint-config/      shared flat lint configs
  typescript-config/  shared tsconfig bases
  jest-config/        shared test-runner bases (API)
  vitest-config/      shared test-runner bases (web)
docs/
  conventions/  index.html + the documents + assets/doc.css
  adr/          architecture decision records
```

If this map and the repository disagree, the repository is right — fix the map in the
same pull request.

Rules that follow from the map:

- Nothing in `packages/**` may import from `apps/**`.
- `apps/web` and `apps/api` never import from each other; they meet only through
  `packages/api`.
- A package's public surface is its `exports` field. Do not deep-import past it.

---

## 4. Commands

Bun is the package manager and runtime; Turborepo runs every task. The pinned versions are
in `package.json` and in [`PROJECT.md`](PROJECT.md).

```bash
bun install            # install workspace dependencies
bun run dev            # all apps in watch mode
bun run build          # build everything, respecting the task graph
bun run test           # unit tests
bun run test:e2e       # end-to-end tests
bun run lint           # lint everything
bun run format         # Prettier write across the repo
```

Two tasks are not in that list because they are not run on every change:

```bash
turbo run contract:generate --filter=api   # regenerate the API contract and its client
turbo run test:integration test:bdd        # the API's slower suites
```

Scope a task to one workspace with `turbo run <task> --filter=<name>` — for example
`turbo run test --filter=api`.

Do not add a script to a workspace without adding the matching task to `turbo.json`.

---

## 5. What exists, and what is only decided

Two questions you must answer from [`PROJECT.md`](PROJECT.md), never from memory or from
this file:

- **Is this library actually installed?** Writing code against something from the
  _planned_ column is the most common failure in this repository. If a task needs it, say
  so and propose the addition — do not quietly install it and write conventions around it.
- **Is this decision settled?** `PROJECT.md` §5 lists the load-bearing ones that are not.
  If your task depends on one, stop and raise it. Do not settle it on your own.

---

## 6. Hard rules

These need no document and have no exceptions.

- No secret, token, or credential in source, in a commit, or in a URL.
- No personal data in logs, traces, analytics payloads, or error messages.
- No `.env` committed. `.env.example` is the only one in git.
- No design value hardcoded in the frontend — design tokens only.
- No cross-module database join or transaction in the API.
- Never weaken a guardrail — lint rule, type, architecture test, CI gate — to make your
  change pass. Fix the change, or raise the rule for discussion.
- Never disable a test to make a build green.

---

## 7. Working style

- **Follow the workflow documents.** `GEN_04` for features, `GEN_05` for bugs. No code
  before the workflow's first step is done.
- **Plan first, in writing.** State which conventions apply, which files you will touch,
  and what you will not do.
- **Vertical slices.** One thin path through every layer beats one complete layer.
- **Tests are part of the change**, not a follow-up.
- **Report honestly.** If tests fail, show the output. If you skipped part of the task,
  say which part and why.
- **Stay in scope.** Do not refactor code you were not asked to touch. Note it instead.
- **One agent, one task.** Do not edit files another agent is working on.

---

## 8. Writing convention documents

If your task is to author a document in `docs/conventions/`, that has its own contract:
read `GEN_12` in full and follow it exactly. It fixes the structure, the template, the
voice, the length budget, and how to update the index, so that documents written by
different agents stay consistent.

Documentation format rule for this repository: **convention documents are HTML**, styled by
`docs/conventions/assets/doc.css`. Markdown is used for the three root files — this one,
`CLAUDE.md` and `PROJECT.md` — because agent tooling expects them there and they are read on
every task, and for ADRs under `docs/adr/`, which are short append-only records.

---

## 9. Do not

- Do not create a new top-level directory without being asked.
- Do not add a dependency without saying why in your plan.
- Do not restructure `apps/` or `packages/` on your own initiative.
- Do not edit `docs/conventions/index.html` except the single entry belonging to a
  document you just wrote.
- Do not treat anything in this file as more authoritative than a convention document
  with `status: stable`.
- Do not state a project fact — what this repository is, its stage, what is installed,
  what is still undecided — anywhere but `PROJECT.md`. Link to it instead.
