---
title: "BE_07 · API design standard"
id: "BE_07"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_05, GEN_08]
see_also: [BE_08]
---

[Conventions](../index.html) / Backend / BE_07

# [BE] API design standard

`P1` · `BE_07` · `draft` · `updated 2026-09-19`

**Open when:** you are adding or changing an HTTP endpoint.

Resource and route naming, HTTP verbs and status codes, versioning, pagination/filtering/sorting, idempotency keys, and the response envelope.

## The rules

If you read nothing else:

1. <a id="R1"></a>Name a route after a resource, as a plural noun. A verb appears only as a sub-resource action on a state transition.
2. <a id="R2"></a>Use the verb that matches the effect, and the status code from the table below. No 200 with an error inside.
3. <a id="R3"></a>A controller validates, calls exactly one use case, and returns its result. Nothing else.
4. <a id="R4"></a>Carry a version in the path from the first published route, and never change what a published route means.
5. <a id="R5"></a>Paginate every collection route, with the same parameters and the same result shape everywhere.
6. <a id="R6"></a>Accept filtering and sorting only as declared parameters from a closed set.
7. <a id="R7"></a>Return the resource itself on success. Do not wrap it in a data envelope.
8. <a id="R8"></a>Make a creating `POST` idempotent through a client-supplied key when a retry would duplicate state.
9. <a id="R9"></a>Path parameters identify, query parameters shape a read, the body carries state. Never mix the three.
10. <a id="R10"></a>Declare every route's request type, response type and status codes so they reach the generated specification.

## Why

An API's shape is read by people who cannot read its source: the web app, another team, a script written in a hurry two years from now. Consistency is most of its usability — when every collection pages the same way and every failure looks the same, a client integrates the second endpoint without asking anyone. When each route was designed on its own, every integration is a conversation, and every conversation produces one more special case in the client.

The other reason is that route decisions are the hardest to reverse. Internals can be rewritten; a published route is a promise to callers you do not control, and taking it back is a coordinated release ([GEN_08](../index.html#GEN_08) owns what makes a change breaking and how one is shipped). It is worth being slower here than anywhere else in the backend.

## Rule detail

### [R1](#R1) Resources, not actions

The path names a thing; the method says what is being done to it. `GET /articles`, `POST /articles`, `GET /articles/:id`. Nesting expresses containment — `GET /articles/:id/comments` — and stops at one level: deeper nesting encodes a navigation path that will change.

The exception is real and narrow. Some operations are state transitions with business meaning that no method expresses: publishing, withdrawing, cancelling, resending. Those become a sub-resource action — `POST /articles/:id/publish` — because the alternative, `PATCH` with a status field, hands the client a state machine that belongs to the domain ([BE_04](../index.html#BE_04)). An action route maps to exactly one use case and names the same verb it does.

**Do**

```
GET    /v1/articles
POST   /v1/articles
GET    /v1/articles/:articleId
PATCH  /v1/articles/:articleId
POST   /v1/articles/:articleId/publish
```

**Don't**

```
GET    /v1/getArticles
POST   /v1/articles/create
PATCH  /v1/articles/:id          { "status": "PUBLISHED" }
GET    /v1/authors/:id/articles/:id/comments/:id/replies
```

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R2](#R2) Verbs and status codes

| Operation | Verb | Success |
| --- | --- | --- |
| Read one, read a page | `GET` | `200` |
| Create | `POST` | `201` |
| Replace | `PUT` | `200` |
| Change some fields | `PATCH` | `200` |
| Delete | `DELETE` | `204` |
| Change state and return nothing | `PATCH` / `POST` | `204` |
| Action, finished when the response is sent | `POST` | `200` |
| Action accepted, work continues after the response | `POST` | `202` |

`GET` and `DELETE` carry no body. `GET` never changes state — not a counter, not a "last seen" timestamp; that is a `POST` to its own resource. Failures never arrive as `200` with an error field: the status is part of the answer, and the mapping from a failure to its status is [BE_09](../index.html#BE_09)'s.

A route that only changes state answers `204`, because answering `200` with the resource would force its use case to read as well as write, which [BE_05#R3](../index.html#BE_05) forbids — `docs/adr/0005-state-changing-routes-answer-204.md` has the reasoning. `200` is for an action that produces a result of its own, such as reporting which items a bulk change touched; `201` still returns the new resource's identity, which is a product of the write rather than a read of it.

**Enforcement:** partly automated — the generated specification lists every declared status, so a mismatch is visible in review; nothing rejects a wrong one today.

### [R3](#R3) Thin controllers

A controller resolves parameters, applies its guards and decorators, calls one use case, and returns. It holds no branching on business state and no assembling of two calls. It injects use cases only — never a repository, a query service or an adapter, each of which would put a second path to the same data behind the same route ([BE_02](../index.html#BE_02), [BE_06](../index.html#BE_06)).

A controller that calls two use cases has an operation nobody named. Name it: one use case, one route.

**Do**

```
@Post(':articleId/publish')
publish(
  @Param('articleId') articleId: string,
  @Actor() actor: ActorContext,
): Promise<PublishArticleResponse> {
  return this.publishArticle.execute({ articleId, actorId: actor.id });
}
```

**Don't**

```
@Post(':id/publish')
async publish(@Param('id') id: string, @Actor() actor: ActorContext) {
  const article = await this.articleQueries.findById(id);      // reads around the use case
  if (article.status !== 'DRAFT') throw new ConflictException(); // a rule, in a controller
  await this.publishArticle.execute({ articleId: id, actorId: actor.id });
  return this.articleQueries.findById(id);                      // a second operation
}
```

**Enforcement:** review — "one use-case call per handler" and "no query service or repository in `presentation/`" are both checkable ([INFRA_06](../index.html#INFRA_06)).

### [R4](#R4) Versioning

Every published route sits under a version prefix from the day it ships, so that adding a second version later is not itself a breaking change. Within a version, additions are safe and removals, renames and narrowings are not — that distinction and its release order are [GEN_08](../index.html#GEN_08)'s.

A new version is a last resort, not a release process. It duplicates every route it covers and doubles the surface until the old one is removed, so most changes should be additive within the version instead.

**Enforcement:** review.

### [R5](#R5) One pagination, everywhere

Every collection is paged, including ones that are small today — an unpaged list is a promise that the data stays small, and it is the promise most often broken. Use one parameter pair and one result shape across the whole API, so a client writes the paging code once:

```
GET /v1/articles?page=1&limit=20

{ "items": [ … ], "total": 128, "page": 1, "limit": 20 }
```

Bound `limit` with a maximum and a default in the schema ([BE_08](../index.html#BE_08)); an unbounded `limit` is a denial-of-service parameter. Where a dataset is genuinely too large for offsets, a cursor variant is defensible — but as one alternative shape used consistently, decided by ADR ([GEN_13](../index.html#GEN_13)), not per endpoint.

**Enforcement:** review.

### [R6](#R6) Closed sets for filtering and sorting

Filters are named parameters with declared types. Sorting is a `sort` parameter accepting only fields the endpoint published, with an explicit direction. Never accept a client-supplied field name straight into a query, an operator language, or a free-form filter object: it is an injection surface, it exposes internal column names, and it makes every future schema change a client-visible one ([BE_06](../index.html#BE_06)).

**Enforcement:** partly automated — the request schema rejects undeclared values at the boundary; that the set stays closed is review.

### [R7](#R7) No success envelope

A single resource returns the resource. A collection returns the paging shape in [R5](#R5). Nothing is wrapped in `{ data: … }`: the envelope adds a level to every client access path and carries no information the status code does not already carry. Errors are the one shaped body, and [BE_09](../index.html#BE_09) owns it.

**Enforcement:** review.

### [R8](#R8) Idempotency where a retry would duplicate

`GET`, `PUT` and `DELETE` are naturally repeatable. `POST` that creates is not, and clients retry — on a timeout, on a flaky network, on a double-click. Where a duplicate would be a real problem (a payment, an order, an enrolment), accept a client-generated idempotency key as a header, store the first outcome against it, and return that same outcome for a repeat within the retention window instead of creating again.

Where a duplicate is harmless or already prevented by a uniqueness rule in the domain, say so in review and skip the machinery.

**Enforcement:** unenforced — no shared implementation exists; a candidate guardrail once one does ([INFRA_06](../index.html#INFRA_06)).

### [R9](#R9) Where a value belongs

Identity goes in the path. Anything that shapes a read — page, limit, filters, sort — goes in the query string. State goes in the body. A body on a `GET` is invisible to caches and proxies; an identifier in a body makes two sources of truth for which record is meant; personal data in a query string ends up in logs and browser history, which the security baseline forbids ([GEN_09](../index.html#GEN_09)).

**Enforcement:** review.

## Worked example

The articles resource, complete.

```
GET    /v1/articles?page=1&limit=20&status=published&sort=publishedAt:desc
POST   /v1/articles                      201
GET    /v1/articles/:articleId           200
PATCH  /v1/articles/:articleId           200
DELETE /v1/articles/:articleId           204
POST   /v1/articles/:articleId/publish   200
```

The list route names its filters and its sortable fields explicitly ([R6](#R6)) and returns `{ items, total, page, limit }` ([R5](#R5), [R7](#R7)). `status=published` is a wire value from a closed set, not a database enum leaking outward ([GEN_11](../index.html#GEN_11)).

Publishing is an action route because it is a transition the domain owns ([R1](#R1)). It finishes within the request, so it answers `200` with the resulting identifier rather than `201` — nothing was created — or `204`, which would leave the client unable to confirm what it acted on. If publishing later becomes asynchronous — rendering, indexing, notifying — the route returns `202` and the resource reports its own state; that is an additive change and does not need a new version ([R4](#R4)).

Each handler declares its request and response types, and the specification is generated from them ([R10](#R10), [GEN_08](../index.html#GEN_08)). That is what makes the review question answerable: not "does this endpoint look right", but "does the generated specification say what we intended".

The deletion is worth one note. `DELETE` returns `204` whether or not the article existed a moment ago, because the client's goal is the end state. Distinguishing "was not there" from "is not there" is a different question and, if a caller needs it, a different route.

## Checklist

- The path is a plural resource; any verb is a genuine state transition ([R1](#R1)).
- Verb and status code match the table, and no failure returns `200` ([R2](#R2)).
- The handler calls exactly one use case and holds no rule ([R3](#R3)).
- The route is under a version prefix, and no published route changed meaning ([R4](#R4)).
- Collections are paged with the standard parameters, shape and bounded limit ([R5](#R5)).
- Filters and sort fields come from a declared closed set ([R6](#R6)).
- Success bodies are unwrapped ([R7](#R7)).
- A creating `POST` that must not duplicate accepts an idempotency key ([R8](#R8)).
- Identity in the path, read shaping in the query, state in the body ([R9](#R9)).
- Request type, response type and status codes are declared and appear in the generated specification ([R10](#R10)).

## Open questions

- [R8](#R8) describes a behavior with no shared implementation, so today it is a per-endpoint effort and will be skipped under time pressure. A reusable interceptor plus a stored-outcome table is the obvious answer and needs an owner.
- Cursor pagination is allowed by exception in [R5](#R5) but has no defined parameter names, so the first endpoint that needs it will set the precedent by accident. Deciding the shape ahead of time costs little.
- Nothing verifies that the generated specification matches the routes as implemented; [R10](#R10) is enforced only by the type-checker on each handler in isolation. A contract test belongs in [BE_12](../index.html#BE_12) or [INFRA_09](../index.html#INFRA_09).

## Related

Requires [BE_05](../index.html#BE_05), [GEN_08](../index.html#GEN_08). See also [BE_08](../index.html#BE_08).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/presentation/todo-list.controller.ts`

---

[← All conventions](../index.html)
