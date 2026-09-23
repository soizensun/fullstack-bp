# 0006 — The contract is generated from the API app; `packages/api` is that output

Status:   accepted
Date:     2026-09-22
Deciders: kritpavin

## Context

`GEN_08#R1` fixes the direction of ownership: the API app defines the contract,
OpenAPI serializes it, the client and its types are generated from OpenAPI, and
the web app consumes them and never hand-writes a wire type. `FE_10#R1`–`R3`
restate the frontend's half.

The repository did the opposite. `packages/api` was a hand-written DTO package
(`links/`) imported by both apps — a second copy of the contract that no build
step compared against the first. `PROJECT.md` §5 carried this as an open
decision, phrased as: does `packages/api` become generated output, or is it
replaced?

Nothing forced the question until now, because nothing in `apps/web` called the
API. Building the FE reference implementation does, and `GEN_08`'s open
questions are explicit that the gap must not be papered over: _"do not build a
second contract path in the meantime."_ Writing the frontend against a
hand-written type would have been exactly that.

`GEN_04#R1` refuses a ticket that depends on an unsettled decision in
`PROJECT.md` §5, so this had to be closed before the frontend was written rather
than discovered in review.

## Decision

`packages/api` becomes the generated output `GEN_08#R1` describes, and the
hand-written DTOs are deleted.

- The API app owns one task, `contract:generate`, because `GEN_08#R1` gives it
  the contract. It emits `apps/api/openapi.json` from the running app's route
  metadata — no server listening — and generates
  `packages/api/src/generated/schema.ts` from that file.
- Both artifacts are committed, so a checkout type-checks without running the
  API app, and a contract change is reviewable as a diff (`GEN_08#R4`).
- Around the generated types, `packages/api` adds exactly two hand-written
  pieces: one typed client that sets the correlation id on every request
  (`GEN_08#R6`), and one error shape carrying the stable code (`GEN_08#R5`).
  Neither describes the wire; both are the cross-cutting concerns `FE_10` says a
  client exists to hold.
- The package is source-only, exporting `src/entry.ts`. After the deletion its
  sole consumer is `apps/web`, which bundles it, so a build step would produce
  an artifact nobody loads.

The task writes into another workspace, which is the one uncomfortable part.
It is accepted narrowly: the *import* direction is unchanged — `packages/api`
imports nothing from `apps/`, so `INFRA_01#R6` and `INFRA_03#R4` still hold —
and the alternative is a package that reaches up into an app to read a file,
which inverts the dependency in the direction those rules actually care about.

Deleting the hand-written DTOs deletes their consumers in the same change
(`GEN_16#R8`): `apps/api/src/links/**`, which `PROJECT.md` §3 already recorded as
violating `BE_01#R1`/`R2`, and the landing page in `apps/web` that imported the
`Link` type.

## Alternatives

- **Generate types into `apps/web` and leave `packages/api` alone.** Rejected:
  two contract paths coexisting is precisely what `GEN_08`'s open question
  forbids, and the hand-written one would keep being the easier import.
- **Hand-write a small typed client for the todo routes.** Rejected: it breaks
  `FE_10#R2` and `GEN_08#R3` outright, and it would do so in the code the
  convention documents point at as their own worked example.
- **Have `packages/api` generate from `../../apps/api/openapi.json`.** Rejected:
  a package reaching into an app for a build input is the dependency inversion
  `INFRA_01#R6` exists to prevent, read literally rather than the write we
  accepted above.
- **Do not commit the generated files.** Rejected by `GEN_08#R4`, and it would
  make a fresh checkout fail to type-check until someone ran the API app.
- **Keep `links` alongside the generated client.** Rejected: `GEN_16#R8` requires
  a replacement to delete the original in the same change, and leaving a
  hand-written contract in place preserves the exact failure the decision is
  meant to end.

## Consequences

- `PROJECT.md` §5's first open decision is closed and its row is deleted. The
  stack table gains the generator; `packages/api`'s row changes meaning from
  "hand-written shared DTOs" to "generated client".
- A contract change is now two steps in order (`GEN_08#R8`): regenerate and
  commit, then change the consumer. A backend rename surfaces as type errors in
  exactly one file, the mapper — which is the return `FE_10` promises.
- Nothing yet fails the build when the committed output is stale. The check is
  one command — regenerate, fail on a non-empty `git diff` — and belongs in
  `INFRA_09`'s pipeline, which does not exist. Until it does, a contract change
  landing without its regeneration is caught only by review.
- The `contract:generate` task is uncached, because its most important output is
  in another workspace and turbo cannot express that. It runs in a few seconds
  and is not part of `build`, so the cost is a person remembering to run it —
  which is the same exposure as the missing drift check, and closed by the same
  guardrail.
- `@repo/api` is no longer a Nest-flavoured package: it moved from the `nest-js`
  lint config to `library`, which surfaced that `library` had never run (see the
  note in `packages/eslint-config/library.js`).

Supersedes: —
Referenced by: GEN_08, FE_10, `packages/api/README.md`
