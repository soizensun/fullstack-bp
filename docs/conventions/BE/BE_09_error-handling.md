---
title: "BE_09 · Error handling & error taxonomy"
id: "BE_09"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-08-31"
requires: [BE_08]
see_also: [FE_18]
---

[Conventions](../index.html) / Backend / BE_09

# [BE] Error handling & error taxonomy

`P1` · `BE_09` · `draft` · `updated 2026-08-31`

**Open when:** something can fail — so, always.

Domain errors vs application errors vs infrastructure failures, the stable error-code catalogue (owned with `GEN_08`), the exception filter, the wire format, and what is safe to expose.

## The rules

If you read nothing else:

1. <a id="R1"></a>Every deliberate failure is one of three kinds: a domain error, an application error, or an infrastructure failure.
2. <a id="R2"></a>Every domain and application error is a class carrying a stable code and a category.
3. <a id="R3"></a>Codes come from one catalogue, are never renamed once shipped, and are never matched on by message text.
4. <a id="R4"></a>Map category to HTTP status in exactly one place.
5. <a id="R5"></a>Never construct or throw an HTTP exception below the controller.
6. <a id="R6"></a>Keep domain errors in `domain/*.errors.ts` and application errors in `application/*.errors.ts`.
7. <a id="R7"></a>Name an error for the exact condition that failed. No catch-all error classes.
8. <a id="R8"></a>Translate errors to responses in an exception filter, and nowhere else.
9. <a id="R9"></a>Return nothing internal. An unexpected failure is logged in full and answered with a generic error and the correlation id.
10. <a id="R10"></a>Never swallow an error. Catch only to add meaning or to translate, then rethrow.

## Why

Errors are an API's second contract, and the one nobody designs. When each failure is thrown wherever it was noticed, in whatever type was nearest, the caller ends up matching on message strings — and every copy-edit becomes a production break. When the same failure is a `409` in one route and a `400` in another, clients handle it twice.

A taxonomy fixes both. Three kinds, because the caller needs to know three things: you asked for something the business forbids, you asked for something that cannot proceed right now, or we failed. A stable code per condition, because a code is what a client can branch on and a human can search for. One mapping to status, because the alternative is a decision repeated in every handler and made differently each time.

The third thing this buys is that layers stop knowing about HTTP. A domain that throws `ConflictException` cannot be reused by a job, a consumer or a test without dragging the transport in ([BE_02](../index.html#BE_02)) — and the day the same rule must produce a different status somewhere else, the rule has to be rewritten.

## Rule detail

### [R1](#R1) Three kinds, and the question that separates them

A **domain error** is a business rule refusing: the transition is illegal, the invariant would break, the actor does not own the thing. It is thrown by an entity, a value object or a domain service, and it is a fact about the concept ([BE_04](../index.html#BE_04)).

An **application error** is the workflow refusing: not found, already exists, duplicate request, wrong state to start from, the caller's role does not permit this ([BE_05](../index.html#BE_05)).

An **infrastructure failure** is anything else failing: the store is unreachable, a provider timed out, a bug threw. Nobody declares these; they are caught, logged and answered generically ([R9](#R9)).

The test: would this failure still exist if the operation arrived from a queue instead of a request, and would it be phrased in the same words? A rule about the concept is domain; a rule about the request is application.

**Enforcement:** review — the folder split ([R6](#R6)) makes the classification visible in the diff.

### [R2](#R2) and [R3](#R3) Code and category

Two base classes, one per declared kind, each requiring a code and a category from a fixed set:

```
export type ErrorCategory =
  | 'not_found' | 'conflict' | 'validation'
  | 'forbidden' | 'unauthorized' | 'unavailable' | 'internal';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
}
```

The category is how the failure is answered; the code is what it *is*. Codes live in one catalogue shared with the client ([GEN_08](../index.html#GEN_08)), in one format — `article.not_found`, `article.invalid_transition` — and they are permanent. Renaming a shipped code breaks every client branching on it, silently, because the new code simply never matches.

The message is for humans reading logs. It is never a control surface: no client and no test asserts on message text.

**Enforcement:** partly automated — the type-checker requires both fields on every subclass; catalogue stability and message discipline are review.

### [R4](#R4) One mapping to status

One table maps category to HTTP status, and it is the only place in the backend where a status code appears next to a business meaning. Adding a category is one edit in one file, and an exhaustive record type makes the compiler point at anything unmapped.

**Do**

```
const CATEGORY_TO_STATUS: Record<ErrorCategory, number> = {
  not_found: 404, conflict: 409, validation: 400,
  forbidden: 403, unauthorized: 401, unavailable: 503, internal: 500,
};
```

**Enforcement:** partly automated — the compiler enforces exhaustiveness of the record; that no status is written elsewhere is review.

### [R5](#R5) No HTTP below the controller

A framework HTTP exception in a use case, a domain object, a repository or a job is a layering violation and a duplicated decision. The layer that knows the transport is the layer that owns the status, and it learns everything it needs from the category.

**Do**

```
// application/article.errors.ts
export class ArticleNotFoundError extends ApplicationError {
  readonly code = ErrorCodes.ARTICLE_NOT_FOUND;
  readonly category = 'not_found' as const;
  constructor(id: string) { super(`Article ${id} not found`); }
}
```

**Don't**

```
// in a use case
if (!article) throw new NotFoundException('Article not found');
// unusable from a job, unsearchable by code, and 404 is now decided here
```

**Enforcement:** automated — `apps/api/scripts/check-architecture.mjs` flags a framework HTTP exception constructed outside `presentation/` ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) Name the condition

`ArticleNotPublishableError` says what happened; `InvalidArticleError` says only that something did. The precise name is what makes a log searchable, a catch block meaningful, and a client's branch possible — and, in practice, it is what stops one error class from accumulating six unrelated meanings.

The corollary is that the error is thrown where the condition is detected, not caught and re-thrown as something vaguer higher up.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R8](#R8) Filters translate, once

Exception filters live in `shared/filters/` and are the only code that turns an error into a response: one per declared base class, plus a catch-all. The body is the same everywhere, so a client parses it once:

```
{ "error": { "code": "article.not_found", "message": "Article … not found" } }
```

Handlers therefore contain no `try`/`catch` for the purpose of shaping a response, and no route builds an error body by hand ([BE_07](../index.html#BE_07)).

**Enforcement:** review.

### [R9](#R9) Nothing internal crosses the wire

The catch-all filter logs the failure with its stack and the request's correlation id ([GEN_08](../index.html#GEN_08)), and answers `500` with a generic code and message. No stack trace, no query text, no provider response, no identifier from another system, and nothing about the data involved — an error message is a place personal data leaks, and the security baseline forbids it ([GEN_09](../index.html#GEN_09)).

The correlation id is what makes this workable: the client can quote it, and the full detail is one log search away.

**Enforcement:** review.

### [R10](#R10) Do not swallow

An empty `catch`, a `catch` that logs and continues, or a `catch (e) { return null }` turns a failure into wrong data, which is discovered much later and much further away. Catch for one of two reasons only: to add meaning by translating a low-level failure into a declared error, or to make a genuinely optional operation optional on purpose — with a comment saying why, and a log line proving it happened ([GEN_07](../index.html#GEN_07)).

**Enforcement:** review — an empty catch block is trivially detectable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

## Worked example

Publishing an article, and its four failures.

The article does not exist. The use case throws `ArticleNotFoundError` — application, `not_found` — because absence is a workflow fact, not a rule of the concept ([R1](#R1)). The filter answers `404` with `article.not_found`.

The actor is not the author. The *aggregate* refuses, because ownership is a rule about articles: `ArticleNotOwnedByActorError` — domain, `forbidden` ([BE_04](../index.html#BE_04)). Note that the same rule reached from a scheduled job produces the same error object with no HTTP anywhere in the stack.

The article is already published. The status value object refuses the transition: `InvalidArticleTransitionError` — domain, `conflict`. The message names the current status and the attempted action, which is what a support engineer needs; the client branches on the code.

The store is unreachable. Nobody declared this. It reaches the catch-all filter, is logged with its stack and correlation id, and the client receives `500` with a generic body ([R9](#R9)).

Four failures, four codes, one response shape, and no status code written anywhere but the mapping table ([R4](#R4)). The frontend's half of this — how a client turns a code into something a person reads — is [FE_18](../index.html#FE_18)'s.

A last note on validation. A request that fails schema parsing never reaches a use case, so it is not a domain or application error at all ([BE_08](../index.html#BE_08)); its filter answers `400` in the same body shape, and its code is the validation code from the catalogue. That symmetry is deliberate: a client handles one error format regardless of how far the request got.

## Checklist

- Every new error is a declared domain or application error, or is deliberately unhandled ([R1](#R1)).
- Each error class carries a stable code and a category ([R2](#R2)), and the code is new or unchanged ([R3](#R3)).
- No status code appears outside the mapping table ([R4](#R4)); no HTTP exception below the controller ([R5](#R5)).
- Errors live in the layer that raises them ([R6](#R6)) and are named for the exact condition ([R7](#R7)).
- Responses are shaped only by filters ([R8](#R8)).
- No stack, query, provider detail or personal data crosses the wire ([R9](#R9)).
- Every `catch` translates or documents; none swallows ([R10](#R10)).

## Open questions

- The catalogue's location depends on the contract decision in `PROJECT.md` §5 — shared package or generated from the specification — and until it is settled, codes risk being declared twice.
- Nothing prevents a shipped code from being renamed ([R3](#R3)), which is the highest-consequence silent break in this document. A test asserting the catalogue against a committed snapshot would close it and does not exist.
- Retry and backoff for infrastructure failures are out of scope here and unowned: [BE_17](../index.html#BE_17) covers retries for messaging, but a failed provider call inside a request has no stated policy.

## Related

Requires [BE_08](../index.html#BE_08). See also [FE_18](../index.html#FE_18).

---

[← All conventions](../index.html)
