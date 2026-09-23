---
title: 'FE_09 · Data fetching & Next.js request caching'
id: 'FE_09'
area: 'FE'
tier: 'P1'
status: 'stable'
updated: '2026-09-22'
requires: [FE_08]
see_also: [FE_10, FE_17]
---

[Conventions](../index.html) / Frontend / FE_09

# [FE] Data fetching & Next.js request caching

`P1` · `FE_09` · `stable` · `updated 2026-09-22`

**Open when:** a view needs data from the API.

Server fetch with revalidation and tags, server actions for mutations, when a client query library is allowed, request deduplication, and streaming with Suspense.

## The rules

If you read nothing else:

1. <a id="R1"></a>Read on the server, in the component that renders the data.
2. <a id="R2"></a>State a caching intent on every read. Never take the framework's default by omission.
3. <a id="R3"></a>Tag a cached read with the resource it holds, and revalidate the narrowest tag that covers what changed.
4. <a id="R4"></a>Perform every write in a server action.
5. <a id="R5"></a>Treat a server action as a public endpoint: authorize it and validate its input, every time.
6. <a id="R6"></a>Start independent reads together. Await one before another only when the second needs the first.
7. <a id="R7"></a>Give a slow read its own Suspense boundary, with a fallback that reserves its space.
8. <a id="R8"></a>Never fetch in an effect.
9. <a id="R9"></a>Reach for a client query library only when data must change without navigation — and name the reason in the pull request.
10. <a id="R10"></a>Never let one user's data into a cache another user can read.

## Why

Where a read happens decides almost everything else about a view: how many round trips it costs, whether it can be cached, what ships to the browser, and how many states the component must render. Reading on the server collapses most of that — the data is there when the component renders, so there is no loading state, no client waterfall, and no credential leaving the server. The rest follows from that default.

Caching is where the same view gets fast or gets wrong, and both failures come from vagueness. A read with no stated intent behaves however the framework version behaves — not a decision anyone made, and one that changes under you. A cache with no tags can only be invalidated bluntly, so writes clear too much or leave a stale page a user reads as a lost order.

## Rule detail

### [R1](#R1) Read where you render

The component that displays the data fetches it, even when two components in one route need the same thing: _identical_ requests in one render pass are deduplicated to a single call. Identical is the operative word — two reads that merely overlap are two requests, and a read that bypasses the framework's request cache dedupes only if you memoize it per request. So share the call, not the result: lifting reads into the route file to prop-drill them couples every section to the page's data contract, and a section then cannot move without editing the route. The exception is data the page owns, such as the value deciding whether the route renders. What the call looks like — the client, the types, the correlation id — is [FE_10](../index.html#FE_10)'s.

**Enforcement:** review — deduplication makes the good and bad versions behave identically, so only a reader can tell them apart.

### [R2](#R2) Say what you mean about caching

Every read declares one of three things: cache it for a stated window, cache it until a tag invalidates it, or do not cache it. Which one is a product decision — how stale may this be before a user is misled? — and writing it at the call site makes it reviewable. The default is no shortcut: it has changed across framework versions, so an omitted intent hands your page's behavior to a version bump nobody connected to it.

**Do**

```
// the client is FE_10's; the caching intent is this rule's
const orders = await api.orders.list({
  cache: { revalidate: 60, tags: ['orders'] },
});

const me = await api.users.me({ cache: 'no-store' });
```

**Don't**

```
// whatever this framework version does — nobody decided
const orders = await api.orders.list();
```

**Enforcement:** unenforced — requiring an explicit cache option on every call is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Tag the resource, revalidate the narrowest

A tag names what the cached response holds, so a write can say what it made stale. Name tags after resources, not pages: two pages showing the same order must both refresh when it changes, and neither when the other's layout does. After a write, revalidate the narrowest tag covering the change — clearing the collection because it is easier turns one edited row into a re-fetch for everyone. Tag invalidation reaches only reads the framework cached, so the client's cache options must map onto its data cache ([FE_10](../index.html#FE_10) owns that mapping); a client caching in its own store makes every `revalidateTag` a silent no-op.

**Do**

```
// read
cache: { tags: ['orders', `order:${orderId}`] }

// write — only this order changed
revalidateTag(`order:${orderId}`);
```

**Don't**

```
// tags named after the screen, invalidated with a hammer
cache: { tags: ['orders-page'] }
revalidatePath('/', 'layout');
```

**Enforcement:** review — a tag naming convention is checkable by lint, but matching a write to the right tag is judgment.

### [R4](#R4) Writes are actions

A mutation runs in a server action: the browser sends the intent, the server holds the credentials, makes the call, revalidates what it invalidated ([R3](#R3)), and returns a result the caller can render. Every write then takes one path — one place for authorization, one for invalidation, one to look when a change does not appear on screen. A form also works before its JavaScript loads, a real reliability property rather than a nicety.

**Enforcement:** review — nothing distinguishes a write from a read at the call site.

### [R5](#R5) An action is a public endpoint

A server action compiles to an HTTP endpoint anyone can call with any payload. That your only call site is a form you wrote is no constraint on the caller, and neither is a check in the component that rendered it — that ran in a different process, for a different request. Every action re-establishes who is calling and validates its own input, every time. [GEN_09#R6](../index.html#GEN_09) and [GEN_09#R7](../index.html#GEN_09) state the obligation; the point here is that an action is one of the boundaries they mean, which is easy to miss because it looks like a local function call.

**Do**

```
'use server';

export async function cancelOrder(formData: FormData) {
  const session = await requireSession();
  const { orderId } = cancelOrderSchema.parse({
    orderId: formData.get('orderId'),
  });
  await api.orders.cancel(orderId, session);
  revalidateTag(`order:${orderId}`);
}
```

**Don't**

```
'use server';

// the page checked permissions before rendering the button,
// so this endpoint trusts whatever arrives
export async function cancelOrder(orderId: string) {
  await api.orders.cancel(orderId);
}
```

**Enforcement:** review — the security review in [GEN_09](../index.html#GEN_09) is where this is caught.

### [R6](#R6) No waterfalls

Two awaits in sequence cost the sum of both latencies; started together they cost the larger one. The sequential version is almost never intended — it is what writing the reads on consecutive lines produces. Await in sequence only when the second needs a value from the first, then ask whether the API should return both in one call ([GEN_08](../index.html#GEN_08)). The same applies across components: a parent awaiting before it renders a child delays every read the child would have started.

**Enforcement:** unenforced — sequential awaits are a syntactic pattern a lint rule could flag; see **Open questions**.

### [R7](#R7) Stream the slow part

A page renders as fast as its slowest read unless that read sits inside a Suspense boundary. Wrap the slow section and the rest arrives immediately. The boundary goes around the section owning the slow read, not the whole page, and the fallback reserves the space the content will take — one that collapses makes the layout jump, which [FE_20](../index.html#FE_20) measures and [FE_18](../index.html#FE_18) owns the design of.

**Enforcement:** review — layout shift is measurable, but only after the page exists ([FE_20](../index.html#FE_20)).

### [R8](#R8) Never fetch in an effect

Fetching on mount guarantees the worst version of every property this document is after: the request cannot start until the bundle has loaded and rendered, the framework cannot cache the result, the component needs three states instead of one, and each one adds a round trip. It is also the pattern that most often smuggles an API base URL and a token into the browser. A value that depends on something only the browser knows is still not an effect fetching — it is a client read ([R9](#R9)).

**Enforcement:** review — a lint rule matching a request call inside an effect would catch the common form and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R9](#R9) When a client query library is allowed

Server reads cover any data that changes when the URL changes. A client query library earns its place when data has to change without a navigation: polling or live updates, an infinite list accumulating pages, or optimistic updates a user must see before the server confirms. Those are real and the library is the right tool for them — the requirement is that the pull request names which one, because "we needed it on the client" is how a codebase ends up fetching everything twice. When one is used it goes through the same client as everything else ([FE_10](../index.html#FE_10)) and does not become a second home for data the server has ([FE_17](../index.html#FE_17)).

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R10](#R10) Cache scope matches data scope

Anything cached across requests is shared by every user those requests belong to. A response that varies per user — a session, a permission set, a personal list — is read per request and never given a revalidation window: the failure is not a stale page but one person's data rendered for another. "Is this the same for everyone who could receive it?" decides [R2](#R2)'s answer.

**Enforcement:** unenforced — nothing relates a cache option to the sensitivity of what it holds. This is the highest-consequence rule in the document; see **Open questions**.

## Worked example

The orders page lists orders, shows a recommendation panel that is slow, and offers a cancel button on each row.

Each section reads its own data ([R1](#R1)). The list is the same for everyone with access, so it is cached and tagged; the panel is slow and independent, so it goes behind its own boundary rather than holding up the list ([R7](#R7)).

```
// app/orders/page.tsx
export default function OrdersPage() {
  return (
    <>
      <OrderTable />
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>
    </>
  );
}
```

Inside the table, the orders and the current filter counts are independent, so they start together rather than in sequence ([R6](#R6)):

```
const [orders, counts] = await Promise.all([
  api.orders.list({ status, cache: { tags: ['orders'] } }),
  api.orders.counts({ cache: { tags: ['orders'] } }),
]);
```

Cancelling is a write, so it is an action ([R4](#R4)) that authorizes and validates first ([R5](#R5)), then revalidates only the order it changed and the collection listing it ([R3](#R3)). The row's button submits to the action; no client read is involved, so no query library is introduced ([R9](#R9)).

One read deliberately breaks the pattern: the signed-in user's own drafts in the header. That response differs per user, so it is read per request with no revalidation window ([R10](#R10)).

## Checklist

- Every read happens on the server, in the component that renders it ([R1](#R1)).
- Every read states a caching intent explicitly ([R2](#R2)).
- Cached reads carry resource tags; each write revalidates the narrowest one ([R3](#R3)).
- Every write is a server action ([R4](#R4)).
- Every action authorizes and validates its own input ([R5](#R5)).
- No sequential await that does not need the previous result ([R6](#R6)).
- Slow reads sit behind a Suspense boundary with a space-reserving fallback ([R7](#R7)).
- No fetch inside an effect ([R8](#R8)).
- Any client query use names which case justified it ([R9](#R9)).
- No per-user response is cached across requests ([R10](#R10)).

## Open questions

- [R10](#R10) is the rule whose failure is a privacy incident rather than a bug, and nothing enforces it. A wrapper that refuses a revalidation window on any request carrying user credentials would close most of it — [FE_10](../index.html#FE_10) owns the wrapper and [INFRA_06](../index.html#INFRA_06) the guardrail.
- [R2](#R2), [R6](#R6) and [R8](#R8) are all mechanically detectable and none are detected today, in that order of value per unit of effort.
- No default revalidation windows are set per kind of resource, so every call site decides alone and the values will drift. A short table belongs here once real pages exist to derive one from.

## Related

Requires [FE_08](../index.html#FE_08). See also [FE_10](../index.html#FE_10), [FE_17](../index.html#FE_17).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/lib/api/todo.service.ts`, `apps/web/app/todo-lists/_lib/todo-list.action.ts`, `apps/web/app/todo-lists/[listId]/_lib/todo-item.action.ts`

---

[← All conventions](../index.html)
