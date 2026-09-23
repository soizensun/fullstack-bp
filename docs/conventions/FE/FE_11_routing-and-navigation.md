---
title: 'FE_11 · Routing & navigation'
id: 'FE_11'
area: 'FE'
tier: 'P1'
status: 'draft'
updated: '2026-09-22'
requires: [FE_08]
see_also: [FE_12, FE_18]
---

[Conventions](../index.html) / Frontend / FE_11

# [FE] Routing & navigation

`P1` · `FE_11` · `draft` · `updated 2026-09-22`

**Open when:** you are adding or restructuring a route.

Route groups and layouts, dynamic segments, the loading/error/not-found files, parallel and intercepting routes, search-param contracts, and redirects.

## The rules

If you read nothing else:

1. <a id="R1"></a>The URL is a contract. Choose it for the person reading it, and treat changing one as breaking.
2. <a id="R2"></a>Group routes by what they share — a layout, an access level — and keep the group out of the URL.
3. <a id="R3"></a>A layout holds what persists across its routes. Anything that changes per page belongs to the page.
4. <a id="R4"></a>Name a dynamic segment for what it holds, and validate its value before using it.
5. <a id="R5"></a>Give every route that can wait a loading file, and every route that can fail an error file.
6. <a id="R6"></a>Answer a missing resource with the framework's not-found path, never with an empty page.
7. <a id="R7"></a>Put state that should survive a reload or a shared link in the URL, and declare its schema.
8. <a id="R8"></a>Navigate with the framework's link and navigation APIs. Never assign to the browser's location.
9. <a id="R9"></a>Decide a redirect on the server, as early in the request as it can be decided.
10. <a id="R10"></a>Reach for parallel and intercepting routes only when two things must render at one URL. Say why.

## Why

Routes are the part of a frontend that outlives everything else in it. Components get rewritten, the styling gets replaced, the data layer changes — the URLs stay, in bookmarks, in search results, in links people sent each other. That makes route structure the most expensive decision in the app to reverse, and worth more care than its size suggests ([FE_12](../index.html#FE_12) owns what search engines then do with it).

The second reason is that the router is also the app's state container, and the one users control. A filter in the URL survives a reload, can be sent to a colleague, and gives the back button something sensible to do; the same filter in a component's state does none of that and is invisible to the server. Most "why does the back button do nothing" complaints are that choice, made once, early.

## Rule detail

### [R1](#R1) and [R2](#R2) URLs and groups

A URL names a resource in the words a person would use: lowercase, hyphenated, plural for collections, and the same nouns the domain uses ([GEN_14](../index.html#GEN_14)). It carries no implementation detail — not a tab index, not an internal id where a slug exists, not a framework artifact.

Route groups organize the tree without touching the URL, and they exist for two reasons only: routes that share a layout, and routes that share an access level. Grouping by team or by feature area adds a directory nobody can see and one more thing to guess about.

**Do**

```
app/
  (marketing)/         layout: public chrome
    page.tsx                          →  /
    pricing/page.tsx                  →  /pricing
  (app)/               layout: signed-in chrome
    orders/page.tsx                   →  /orders
    orders/[orderId]/page.tsx         →  /orders/abc123
```

**Don't**

```
app/
  pages/orders/page.tsx               →  /pages/orders
  orders/OrderDetail/page.tsx         →  /orders/OrderDetail
  orders/[id]/tab/[tabIndex]/page.tsx →  a tab index in a URL
```

Changing a shipped URL is breaking. If it must change, the old one redirects permanently and the change is deliberate, not a rename ([R9](#R9)).

**Enforcement:** review — the naming half is checkable from the directory tree and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Layouts hold what persists

A layout renders around its routes and does not re-render as the user moves between them. That makes it the right home for chrome — navigation, shells, providers — and the wrong home for anything that varies per page: a title, a breadcrumb, page-specific data. Data read in a layout is read for every route beneath it, including the ones that do not need it.

A layout is also a server component by default, and it stays one. Needing a provider does not convert it; the provider goes in a thin client wrapper the layout renders ([FE_08](../index.html#FE_08)).

**Enforcement:** review — a client directive on a layout file is greppable ([FE_08](../index.html#FE_08)).

### [R4](#R4) Dynamic segments

Name the segment for what it holds — `[orderId]`, not `[id]`, and never `[slug]` where the value is an identifier. A route file that reads three params should be able to tell them apart without reading the folder above it.

The value is user input: it arrives from a typed URL as easily as from a link. Validate it against a schema before it reaches a query or a fetch, and treat a value that fails as not found rather than as an error ([R6](#R6)).

**Enforcement:** review.

### [R5](#R5) and [R6](#R6) The boundary files

A route that awaits data gets a loading file whose fallback reserves the space the content will take, so the page does not jump when it arrives ([FE_09](../index.html#FE_09) owns the finer-grained Suspense boundaries inside a page). A route that can fail gets an error file, which is a client boundary by nature and offers a retry rather than only an apology.

A missing resource is not an error. Use the framework's not-found path so the response carries the right status — a soft "nothing here" page returned with a success status is a page search engines index and monitoring never counts ([FE_12](../index.html#FE_12)). Place a not-found boundary in each group whose layout already draws the shell, or the root one renders its own chrome inside that group's and the page gets two of everything. What those pages say is [FE_18](../index.html#FE_18)'s.

**Enforcement:** review.

### [R7](#R7) Search params are a declared contract

If a value should survive a reload, be shareable in a link, or be readable by the server, it belongs in the URL: filters, sort order, page number, an open tab, a search query. If it should not — a hover state, a half-typed value, whether a menu is open — it does not.

Params are strings from an untrusted source, so declare their schema in one place per route and parse there: names, types, allowed values, defaults. Then a page reads typed values, an unknown param is ignored rather than propagated, and the default state has a canonical URL rather than three ([FE_12](../index.html#FE_12)).

**Do**

```
export const OrdersSearchParams = schema.object({
  status: schema.enum(['open', 'paid', 'void']).optional(),
  page:   schema.coerce.number().int().min(1).default(1),
});
```

**Enforcement:** review — an unparsed `searchParams` read is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R8](#R8) and [R9](#R9) Navigating and redirecting

Use the framework's link component for anything a user clicks, so it prefetches, preserves scroll behavior, and stays a real anchor a user can open in a new tab. Assigning to the browser's location throws away the client router and reloads the app. Programmatic navigation after an action uses the router API, not a location assignment.

Decide redirects as early as they can be decided: a permanent URL move in the routing configuration, an access decision at the edge or in a layout, never after a page has already rendered and fetched. A redirect decided in a client effect ships the page, runs it, and then moves the user — the flash of the wrong page is the visible half, and the wasted request is the other. Permanent moves and temporary ones are different status codes, and using the permanent one for an access redirect is a mistake browsers cache.

**Enforcement:** review — a location assignment is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R10](#R10) Parallel and intercepting routes are for one problem

They exist so two things can occupy one URL: a modal that has its own address and still renders over the page it came from, a dashboard whose panes load and fail independently. Used for that, they are the only clean answer.

Used for anything else, they are a routing tree that only their author can follow. Reach for them when the URL genuinely has to be shared between two views, and say in the pull request what would break without them.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

## Worked example

Orders: a filtered list, a detail page, and a detail modal opened from the list.

The list lives at `/orders` inside the signed-in group, so it inherits the app chrome from that group's layout without the group appearing in the URL ([R2](#R2)). The status filter and page number are search params with a declared schema, so a link to "open orders, page 2" works when pasted into a colleague's browser and the back button steps through filter changes ([R7](#R7)).

The detail is `/orders/[orderId]` ([R4](#R4)). The segment is validated before it reaches the data layer; a value that is not an order id resolves to not-found rather than a failed query, and a real id that no longer exists resolves the same way with a correct status ([R6](#R6)). The route has a loading file that renders the row skeleton at the real row height, and an error file offering a retry ([R5](#R5)).

The modal is the case for interception ([R10](#R10)): clicking a row from the list opens the detail over the list at `/orders/abc123`, while opening that URL directly renders the full page. Both render one component; only the frame differs. The pull request says so, because without that sentence the next reader sees two routes for one thing.

Two decisions worth noting. The layout holds the chrome and no order data, even though every route beneath it shows orders — the list's data belongs to the list ([R3](#R3)). And when the URL moved from `/order-list` to `/orders`, the old path became a permanent redirect kept in the routing configuration rather than a page that redirects on render ([R1](#R1), [R9](#R9)).

## Checklist

- The URL reads well, uses domain words, and no shipped URL changed without a permanent redirect ([R1](#R1)).
- Route groups exist for a shared layout or access level, and do not appear in the URL ([R2](#R2)).
- The layout holds only what persists across its routes ([R3](#R3)).
- Dynamic segments are named for their content and validated before use ([R4](#R4)).
- Loading and error files exist wherever the route can wait or fail ([R5](#R5)).
- A missing resource returns the framework's not-found, with the right status ([R6](#R6)).
- Shareable state is in the URL, with a declared and parsed schema ([R7](#R7)).
- Navigation uses the framework's link and router; no location assignment ([R8](#R8)).
- Redirects are decided server-side, with the right permanence ([R9](#R9)).
- Any parallel or intercepting route names what would break without it ([R10](#R10)).

## Open questions

- [R7](#R7) says a schema per route but does not say where it lives or whether the client and server share one parser. The first two routes will answer it differently unless someone decides; it interacts with [FE_10](../index.html#FE_10)'s client.
- Nothing here covers route-level authorization — where the decision is made, and how a redirect avoids leaking whether a resource exists. That is [FE_19](../index.html#FE_19)'s, and until it exists [R9](#R9) is the only guidance.
- Whether URL moves are kept in the routing configuration forever or expire is undecided, and the list only grows.
- [R5](#R5) and [R6](#R6) cannot both hold on a route that streams, and [R5](#R5) is one of the two things that makes a route stream. A segment's error file is a client boundary and a slow section's Suspense boundary ([FE_09#R7](../index.html#FE_09)) is another; with either present the response has already been sent as `200` by the time `notFound()` runs, so the not-found UI renders under a success status. Measured on the reference implementation, not inferred: removing the error boundary alone restores the `404`. The framework injects `noindex`, which covers [R6](#R6)'s search-engine reasoning but not its monitoring reasoning. The available fix — checking existence at the edge, before the response streams — buys the status with an API call on every request to the route. This document should say which way that trade goes rather than leaving each route to decide.

## Related

Requires [FE_08](../index.html#FE_08). See also [FE_12](../index.html#FE_12), [FE_18](../index.html#FE_18).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/app/`

---

[← All conventions](../index.html)
