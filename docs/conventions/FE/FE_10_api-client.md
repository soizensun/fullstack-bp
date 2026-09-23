---
title: 'FE_10 · Typed API client & contract consumption'
id: 'FE_10'
area: 'FE'
tier: 'P1'
status: 'draft'
updated: '2026-09-22'
requires: [GEN_08, FE_09]
---

[Conventions](../index.html) / Frontend / FE_10

# [FE] Typed API client & contract consumption

`P1` · `FE_10` · `draft` · `updated 2026-09-22`

**Open when:** you are calling the backend, or the contract changed under you.

The generated client from the OpenAPI contract, the ban on raw `fetch` and hand-written wire types in components, sending the correlation id, mapping responses to view models, and surviving a contract version bump.

## The rules

If you read nothing else:

1. <a id="R1"></a>The generated client is the only way this app talks to the backend.
2. <a id="R2"></a>Never write a wire type by hand, and never call the API with a raw request.
3. <a id="R3"></a>Generated files are build output: committed, regenerated, never edited.
4. <a id="R4"></a>Construct the client once per runtime, from configuration. Components never build one.
5. <a id="R5"></a>Send a correlation id on every request, and surface it when something fails.
6. <a id="R6"></a>Map wire shapes to view models at the boundary. No component renders a wire type.
7. <a id="R7"></a>Branch on the error code from the catalogue. Never on a message or a raw status.
8. <a id="R8"></a>Keep credentials on the server. A browser request carries only what the browser is allowed to hold.
9. <a id="R9"></a>When the contract and the client disagree, regenerate. Never patch the client.
10. <a id="R10"></a>Land a contract bump before the code that uses it, in its own change.

## Why

The contract between the two apps is owned by the backend and generated from it ([GEN_08](../index.html#GEN_08)); this document is the frontend's half of that arrangement. Its whole purpose is to make a backend change fail at compile time rather than in a user's browser. A hand-written wire type cannot do that — it is a copy of the truth that stays convincing after the truth changes, and every field it gets wrong is a runtime error weeks later.

The second reason is that a client is a natural home for cross-cutting concerns nobody wants to repeat: the base URL, credentials, the correlation id, error normalization, timeouts. Every raw request written next to the client is a place where one of those is missing, and it is always the correlation id — so the one request that fails in production is the one nobody can trace ([INFRA_14](../index.html#INFRA_14)).

The direction of generation, and where the contract lives, are settled by `GEN_08` and by whatever `PROJECT.md` records about the current state. Where the repository has not caught up with that decision, the gap is a project fact to fix, not a licence to hand-write types.

## Rule detail

### [R1](#R1), [R2](#R2) and [R3](#R3) One client, generated

Every call to the backend goes through the generated client. No raw request to an API path, in a component, a hook, a server action or a route handler — and no interface describing a response body, however small, however "just this once".

Generated files are build output that happens to be committed: committed so the repository type-checks without running a generator, and never edited, because the next generation silently discards the edit. A generated file with a hand-made change is the most confusing artifact in a codebase — correct in the diff, wrong after the next build ([GEN_08#R4](../index.html#GEN_08)).

**Don't**

```
type Order = { id: string; total: number };            // a hand-written wire type
const res = await fetch(`${base}/v1/orders/${id}`);    // no correlation id, no error handling
```

**Enforcement:** review — a request to an API path outside the client module is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R4](#R4) and [R8](#R8) One construction, and where credentials live

The client is constructed once per runtime from configuration — base URL, timeouts, default headers ([INFRA_07](../index.html#INFRA_07)) — and imported. A component that builds a client has taken configuration into the render tree, and it will be built with a different base URL somewhere.

Because reads happen on the server by default ([FE_09](../index.html#FE_09)), the server-side client is the one that may hold a secret. The browser's client holds nothing that must stay secret: a value the browser cannot be trusted with means the call belongs on the server ([INFRA_07#R8](../index.html#INFRA_07)). Same client shape, different credentials, and the difference is configuration rather than a second implementation.

**Enforcement:** review — a secret-named value reaching a client-side module is greppable ([INFRA_06](../index.html#INFRA_06)).

### [R5](#R5) The correlation id

Every request carries a correlation id, generated where the work starts and propagated onward; the backend accepts it, threads it through, and returns it ([GEN_08#R6](../index.html#GEN_08), [BE_09](../index.html#BE_09)). Put it in the client so no call site can forget.

Then use it: when a request fails, the id is what a user can quote and what turns "it broke" into one log search. Surface it in the error state — small, copyable, not a stack trace ([FE_18](../index.html#FE_18) owns what the user sees).

**Enforcement:** review — a header set centrally is either there or not, and is checkable in the client's tests ([FE_14](../index.html#FE_14)).

### [R6](#R6) Map at the boundary

A wire type is shaped by the contract: nullable fields, string instants, flat ids, enumerated codes. A view model is shaped by what a screen renders. They are different, and the moment a component takes the wire type directly, every rename on the backend becomes a component change and every component grows the same defensive formatting.

So map once, at the boundary, in a pure function: parse instants, resolve nullables into meaningful defaults, join what the view needs joined. Components take view models ([FE_02](../index.html#FE_02)) and nothing else. The mapping is also the natural place to fail loudly when the contract has drifted, rather than rendering `undefined`.

**Do**

```
export function toOrderSummary(dto: GetOrderResponse): OrderSummary {
  return {
    id: dto.id,
    placedAt: new Date(dto.placedAt),
    total: formatMoney(dto.totalMinor, dto.currency),
    isCancellable: dto.status === 'PLACED',
  };
}
```

**Enforcement:** review — a generated wire type imported into a component is detectable from the import graph and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) Errors are codes

A failure arrives as a stable code from the shared catalogue ([BE_09](../index.html#BE_09), [GEN_08#R5](../index.html#GEN_08)). Branch on the code. Never on the message — it is prose for humans and it changes with a copy edit — and never on a bare status, which cannot distinguish two conflicts that need different handling.

Normalize in the client so every call site sees one error shape with a code, and unknown codes fall through to the generic case rather than crashing. What the user is shown for each code is [FE_18](../index.html#FE_18)'s.

**Enforcement:** review — matching on an error message is greppable ([INFRA_06](../index.html#INFRA_06)).

### [R9](#R9) and [R10](#R10) Surviving a contract change

When the client and the contract disagree, the fix is to regenerate. Patching the generated client makes the frontend disagree with the backend in a way nothing detects until runtime — and the patch disappears at the next generation anyway.

A contract bump lands in its own change, before the code that consumes it ([GEN_08#R8](../index.html#GEN_08)). That way the regeneration's compile errors are the complete list of what the change affects, reviewed as a unit rather than mixed into feature work. Additions compile silently; a removal, rename or narrowing surfaces as type errors, which is exactly the value being bought — and it is why nobody may work around one with an assertion or a cast ([GEN_07#R4](../index.html#GEN_07)).

**Enforcement:** partly automated — the type-checker fails on a breaking regeneration; that the client was regenerated rather than patched is review.

## Worked example

The orders page needs an order and its items.

The read happens on the server, in the component that renders it ([FE_09](../index.html#FE_09)), through the generated client's typed operation — no path string, no hand-written response type ([R1](#R1), [R2](#R2)). The server client carries the session credential; the browser never sees it ([R8](#R8)). The correlation id is added by the client, not by the call site ([R5](#R5)).

The response is mapped to a view model at the boundary ([R6](#R6)): the instant becomes a date, the minor-unit total becomes a formatted string with its currency ([GEN_11](../index.html#GEN_11)), and `isCancellable` is derived from the status once, here, rather than in three components that would each get it slightly wrong.

Cancelling is a server action ([FE_09#R4](../index.html#FE_09)) calling the same client. It fails with `order.already_shipped`, and the action branches on that code — not on the message, which is Thai in one deployment and English in another ([R7](#R7)).

Then the backend renames a field. The contract regenerates in its own change ([R10](#R10)), and the type-checker points at exactly one place: the mapper ([R6](#R6)). No component changes, because no component ever saw the wire shape. That single-file blast radius is the entire return on this document — and the reason the tempting shortcut, casting the response to keep the build green, is forbidden: it converts a caught error into an undefined value that renders as a blank cell.

## Checklist

- Every backend call goes through the generated client ([R1](#R1)); no hand-written wire type ([R2](#R2)).
- No generated file was edited ([R3](#R3)).
- The client is constructed from configuration, once ([R4](#R4)), and no credential reaches the browser ([R8](#R8)).
- Requests carry a correlation id, and failures surface it ([R5](#R5)).
- Components receive view models, never wire types ([R6](#R6)).
- Error handling branches on codes ([R7](#R7)).
- The client was regenerated rather than patched ([R9](#R9)), in its own change ([R10](#R10)).

## Open questions

- Where view-model mappers live — beside the client, beside the feature, or beside the route — is undecided, and the first two features will choose differently. It should be settled with [FE_01](../index.html#FE_01)'s ladder in mind. The reference implementation puts them beside the client, in `lib/api/`, because the mapper is what a contract change lands on and keeping it next to the client keeps that blast radius one directory wide — one data point, not a decision.
- Nothing here says how a client-side call, where one is justified ([FE_09#R9](../index.html#FE_09)), obtains the correlation id started on the server. The two halves are meant to share one id per user action, and the mechanism is unwritten.
- ~~Contract generation depends on an unresolved decision in `PROJECT.md` about which side owns the contract in this repository today.~~ Closed by [ADR 0006](../../adr/0006-the-contract-is-generated-from-the-api-app.md): the client is generated and committed. [R2](#R2) is no longer at risk of being broken quietly, but nothing yet fails a build when the committed output is stale — the drift check is [INFRA_09](../index.html#INFRA_09)'s and does not exist.

## Related

Requires [GEN_08](../index.html#GEN_08), [FE_09](../index.html#FE_09).

Reference implementation, where `PROJECT.md` §3 still lists it: `packages/api/`, `apps/web/lib/api/`

---

[← All conventions](../index.html)
