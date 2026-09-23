---
title: 'GEN_08 · The BE↔FE contract'
id: 'GEN_08'
area: 'GEN'
tier: 'P0'
status: 'stable'
updated: '2026-09-22'
requires: [GEN_01]
see_also: [BE_07, BE_08, BE_09, FE_10, INFRA_14]
---

[Conventions](../index.html) / General / GEN_08

# [General] The BE↔FE contract — API types, error codes & correlation ids

`P0` · `GEN_08` · `stable` · `updated 2026-09-22`

**Open when:** a change crosses the API boundary in either direction.

The backend owns the contract: OpenAPI is generated from it, the typed client and types are generated from OpenAPI, and the frontend never hand-writes a wire type. Also owns the error-code catalogue, the correlation-id header the frontend must send, and how a breaking change is versioned and rolled out.

## The rules

If you read nothing else:

1. <a id="R1"></a>The API app owns the contract. The web app consumes it and never negotiates it in code.
2. <a id="R2"></a>Generate the OpenAPI document from the API app. Never hand-write or hand-edit it.
3. <a id="R3"></a>Generate the client and its types from OpenAPI. The web app never hand-writes a wire type.
4. <a id="R4"></a>Generated files are build output: commit them, never edit them.
5. <a id="R5"></a>Errors cross the wire as stable codes from one catalogue, never as prose to be matched on.
6. <a id="R6"></a>Every request carries a correlation id; the API app accepts it, propagates it, and returns it.
7. <a id="R7"></a>Adding is safe. Removing, renaming, or narrowing is breaking — treat it as such.
8. <a id="R8"></a>Ship the contract change before the change that consumes it, never together.
9. <a id="R9"></a>Keep presentation out of the contract and wire shapes out of the domain.
10. <a id="R10"></a>When the client and the contract disagree, regenerate. Never patch the client.

## Why

The API boundary is the only place in this repository where two independently built things have to agree, and it is the only place where being wrong is invisible until runtime. Everything below exists to move that disagreement into the type system and to give it exactly one owner, because a contract with two owners has none.

The direction of ownership matters more than which direction is chosen. It is chosen here: the API app decides, because it is the side that can still be correct when a client is wrong, and because it already holds the validation the contract describes.

## Rule detail

### [R1](#R1) One owner, one direction

Types flow one way: API app → OpenAPI → generated client → web app. The web app may ask for a contract change and should; it may not create one by writing an interface that describes what it hopes the server returns. A hand-written wire type on the consumer side is a second copy of the contract that no build step compares against the first, and it stays right up until the moment it matters.

```
apps/api        the contract is defined here
   ↓ generate
openapi.json    the contract, serialized
   ↓ generate
packages/api    the typed client + types  (generated, committed)
   ↓ import
apps/web        consumes; never redefines
```

**Enforcement:** unenforced — the drift check that would catch this is now buildable, because the generation step exists: regenerate, then fail on a non-empty diff. Nothing runs it, and it is the cheapest outstanding guardrail this document wants ([INFRA_09](../index.html#INFRA_09)).

### [R4](#R4) Generated files: committed, never edited

Commit them so a checkout builds and type-checks without running the API app, and so the diff of a contract change is reviewable — the generated diff is usually the clearest statement of what the change actually did to consumers. Never edit them: the next generation silently reverts your edit, which is the worst possible failure mode because it works until it does not. Mark them so the intent is unmissable, and exclude them from formatting and lint.

**Do**

```
// AUTO-GENERATED from openapi.json — do not edit.
// Regenerate: bun run contract:generate
```

**Don't**

```
// generated, but I fixed the nullability here
// because the server is wrong
export type Order = { archivedAt: string };
```

**Enforcement:** unenforced — the same drift check would catch an edited generated file.

### [R5](#R5) Error codes are the shared vocabulary

One catalogue of stable, machine-readable codes, defined by the API app ([BE_09](../index.html#BE_09) owns their taxonomy) and consumed by the web app ([FE_18](../index.html#FE_18) owns turning them into something a person reads). The code never changes once shipped, because a consumer branches on it. Human-readable messages are for humans and may change freely — which is exactly why nothing may match on them.

**Do**

```
{ "code": "ORDER_ALREADY_ARCHIVED",
  "message": "This order is already archived." }

if (err.code === "ORDER_ALREADY_ARCHIVED") …
```

**Don't**

```
if (err.message.includes("already archived")) …
// breaks on rewording, translation, or a
// trailing period
```

**Enforcement:** review — a lint rule against matching on `message` is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) The correlation id crosses the seam

One request id, generated as early as possible, sent by the web app on every call, accepted and propagated by the API app through logs, jobs and outbound calls, and returned on the response so a user can quote it. Without the first hop the trace starts at the API app and nothing connects a user's report to what the system did. [INFRA_14](../index.html#INFRA_14) owns the header name and the propagation mechanics; the rule here is that the web app must send one and never invent a second.

**Enforcement:** unenforced — a generated client would set the header so no caller could forget, which is the argument for generating it.

### [R7](#R7) What counts as breaking

The test is whether an existing consumer built against the old contract still works. Anything that fails that test is breaking, regardless of how small the diff looks.

| Safe                             | Breaking                                                            |
| -------------------------------- | ------------------------------------------------------------------- |
| Adding an endpoint               | Removing or renaming one                                            |
| Adding an optional request field | Adding a required one                                               |
| Adding a response field          | Removing one, or making it optional                                 |
| Widening an accepted value set   | Narrowing one, including a new enum member the consumer must handle |
| Adding a new error code          | Changing or retiring an existing code                               |
| Loosening validation             | Tightening it                                                       |

**Enforcement:** unenforced — an OpenAPI diff tool would classify most of this row-by-row in CI ([INFRA_09](../index.html#INFRA_09)).

### [R8](#R8) Contract first, consumer second

Two deploys, in order: the API app supports the new shape while still supporting the old one, then the web app moves, then the old shape is removed. This is expand/contract applied to the wire rather than the schema ([BE_15](../index.html#BE_15) applies the same idea to the database). The temptation is one pull request that changes both sides at once — it passes CI, and it breaks every client that was already loaded in a browser during the deploy.

**Enforcement:** review — visible in the deploy order ([INFRA_11](../index.html#INFRA_11)).

### [R9](#R9) The contract is not a view model, and not a domain model

It sits between two things that must not leak into it. From the web app: no `displayName`, no pre-formatted currency, no colour, no sort order chosen for one screen — the moment a second screen exists, that field is wrong for it. From the API app: no entity dumped onto the wire, no persistence-shaped field names, no internal ids ([BE_08](../index.html#BE_08)). Formatting belongs to the web app, and the domain belongs behind the API app's own mapping layer.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

## Worked example

Adding an `archivedAt` field and an archive endpoint, in the order the rules require:

1. **R1**, **R2** — the API app defines the request and response; the OpenAPI document is regenerated from it, not written.
2. **R3**, **R4** — the client is regenerated and committed. The diff shows exactly what consumers gain.
3. **R7** — adding a response field and a new endpoint is safe, so no version bump. Adding `ORDER_ALREADY_ARCHIVED` is also safe; retiring one would not be.
4. **R8** — the API app ships first. The web app's change lands afterwards, against a contract that is already live.
5. **R9** — the response carries `archivedAt` as an instant, not `"Archived 2 days ago"`. That string is a rendering decision and belongs to the web app.

**Do — the contract**

```
{ "id": "…", "archivedAt": "2026-08-15T09:12:04Z" }
```

**Don't**

```
{ "id": "…",
  "archivedLabel": "Archived 2 days ago",
  "archivedBadgeColor": "gray" }
```

The second version is faster to build once and wrong for every consumer after the first, including the same consumer in a different locale or timezone ([GEN_11](../index.html#GEN_11)).

## Checklist

- The contract change originated in the API app ([R1](#R1)).
- OpenAPI was regenerated, not edited ([R2](#R2)).
- The client was regenerated and committed; no generated file was hand-edited ([R3](#R3), [R4](#R4)).
- No hand-written wire type was added on the consumer side ([R3](#R3)).
- New failures have codes in the catalogue; nothing matches on a message ([R5](#R5)).
- The correlation id is sent, propagated and returned ([R6](#R6)).
- Breaking changes identified against the table and rolled out accordingly ([R7](#R7)).
- The contract shipped before its consumer ([R8](#R8)).
- No presentation in the contract, no entity on the wire ([R9](#R9)).
- Any client/contract mismatch was fixed by regenerating ([R10](#R10)).

## Open questions

- ~~This document states the direction of ownership; whether the repository is wired that way today is tracked as an open decision in `PROJECT.md` §5.~~ Closed by [ADR 0006](../../adr/0006-the-contract-is-generated-from-the-api-app.md): the repository is now wired the way this document describes, and there is one contract path.
- The generator, the OpenAPI version, and where the document lives are unnamed here on purpose — they are tooling choices, and they are now recorded in [ADR 0006](../../adr/0006-the-contract-is-generated-from-the-api-app.md) rather than in this paragraph.
- [R7](#R7) calls a new enum member breaking. That is the strict reading and it is the safe one, but it makes some routine additions expensive. Whether consumers must handle unknown enum values gracefully instead is worth deciding once, explicitly.
- Nothing here covers non-HTTP consumers — webhooks out, or a second client that is not the web app. [BE_23](../index.html#BE_23) owns the outbound direction; a second inbound consumer would need this document to grow a versioning policy it does not have.

## Related

Requires [GEN_01](../index.html#GEN_01). See also [BE_07](../index.html#BE_07), [BE_08](../index.html#BE_08), [BE_09](../index.html#BE_09), [FE_10](../index.html#FE_10), [INFRA_14](../index.html#INFRA_14).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/openapi.json`, `packages/api/`, `apps/web/lib/api/`

---

[← All conventions](../index.html)
