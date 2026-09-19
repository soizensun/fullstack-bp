---
title: "BE_12 · Integration testing & test data"
id: "BE_12"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_11, BE_06]
see_also: [INFRA_12]
---

[Conventions](../index.html) / Backend / BE_12

# [BE] Integration testing & test data

`P1` · `BE_12` · `draft` · `updated 2026-09-19`

**Open when:** the thing you wrote touches the database, Redis, or a module boundary.

Module-level tests against a real Redis and database in containers, isolation and cleanup, contract tests at module boundaries, and the object mothers, builders and deterministic fake data every test level draws from.

## The rules

If you read nothing else:

1. <a id="R1"></a>Write an integration test where your code meets something real: a store, a cache, a queue, or another module's contract.
2. <a id="R2"></a>Run against the real backing service — in a container where it needs one. Never substitute an in-memory imitation of it.
3. <a id="R3"></a>Every test creates the data it needs and removes what it created.
4. <a id="R4"></a>Assume no order and no shared state. A test must pass alone, repeated, and beside its neighbours.
5. <a id="R5"></a>Exercise an adapter through its port, never through the driver underneath it.
6. <a id="R6"></a>Test a mapper in both directions: what is saved comes back equal.
7. <a id="R7"></a>Contract-test every published port against its adapter, from what the consumer expects.
8. <a id="R8"></a>Assert query count where cardinality matters, so an N+1 fails the build instead of a dashboard.
9. <a id="R9"></a>Build every fixture from shared builders with deterministic values. No literal rows in a test.
10. <a id="R10"></a>Keep these suites separately named and separately runnable from the fast suite.

## Why

The unit suite deliberately knows nothing about the store ([BE_11](../index.html#BE_11)), which means an entire category of defect is invisible to it: a mapper that silently drops a field, a nullable column the model treats as required, a unique constraint that does not exist, a query returning rows in an order the code assumed, a lock that does not lock. Every one of those passes every unit test and fails in production.

This suite exists for exactly that category, which is why [R2](#R2) is absolute. A test against an in-memory imitation of the store tests the imitation: it has different types, different constraint behavior, different transaction semantics, and it will happily accept what the real store rejects. The value of the test is entirely in the realness.

The cost is speed, so the discipline is restraint. Business behavior stays in the fast suite. This one covers the seams — and the seams are few, because the architecture put them in named places.

## Rule detail

### [R1](#R1) What earns a slow test

Four things: an adapter against its store, the cache and queue clients against theirs, a module's wiring resolving for real, and a boundary contract between two modules. Everything else is either behavior (fast suite) or externally visible API behavior (acceptance suite, [BE_13](../index.html#BE_13)).

The clearest signal you are in the wrong suite is an integration test that arranges business preconditions to reach one branch of a rule. That branch belongs to a unit test; the integration test should be about persistence, not about the rule.

Which backing services exist to test against is a project fact — check `PROJECT.md` before writing a suite that needs one, and propose the addition rather than writing an imitation ([INFRA_12](../index.html#INFRA_12)).

**Enforcement:** review.

### [R2](#R2) The real thing, in a container

Containers give every developer and the pipeline the same version of the same service, started and thrown away per run ([INFRA_12](../index.html#INFRA_12), [INFRA_09](../index.html#INFRA_09)). A shared long-lived test database is the alternative to avoid: its state accumulates, its schema drifts from the migrations, and two runs interfere.

Note that this rule concerns *backing services*. Third-party providers reached over the network are still substituted here — at their port ([BE_03](../index.html#BE_03)) — because a test suite must not depend on someone else's uptime or send real messages.

**Enforcement:** review.

### [R3](#R3) and [R4](#R4) Isolation

Each test creates its own rows with its own identifiers and cleans up afterwards, or the whole test runs in a transaction that is rolled back. What matters is that no test depends on data another test left, and none is written to assume it runs first.

The habit to break is the shared fixture loaded once for the file. It saves a few seconds and produces the worst failure mode in a test suite: a test that passes alone and fails in the suite, or the reverse, with no relationship to the change that revealed it.

**Enforcement:** partly automated — running the suite in a randomized order surfaces most violations; nothing checks cleanup itself.

### [R5](#R5) Through the port

Instantiate the adapter, resolve it as its port type, and call the methods the port declares. That way the test asserts the contract the rest of the system depends on, and a refactor of the internals — a different query, a different driver call — does not touch the test.

A test that reaches for the driver to arrange or to assert is testing the query, not the contract, and it will fail on any rewrite ([BE_06](../index.html#BE_06)).

**Enforcement:** review.

### [R6](#R6) The mapper, both ways

The round trip is the highest-value assertion in this suite: save an aggregate built by a factory, load it through the port, and compare the snapshots. It catches the dropped field, the truncated precision, the enumeration that came back as a raw string, the child collection that lost its order — all of which unit tests cannot see and users find first.

**Do**

```
const article = publishedArticle({ sections: [section(), section()] });
await repository.save(article);

const loaded = await repository.findById(article.id());
expect(loaded?.snapshot()).toEqual(article.snapshot());
```

**Enforcement:** review.

### [R7](#R7) Contracts at the boundary

A published port is a promise to another module ([BE_03](../index.html#BE_03)). Test it as the consumer sees it: call the port, assert the view's fields and their meaning — including the cases consumers rely on, like absence returning `null` rather than throwing.

This is what makes the boundary safe to change. The provider can rewrite everything behind the port and know, from one suite, whether the promise still holds — without running the consumer's tests.

**Enforcement:** review.

### [R8](#R8) Query count is a testable property

The N+1 that [BE_06](../index.html#BE_06) forbids is invisible in review once the code is a few layers deep, and invisible in tests with three rows. Where a read composes over a collection, seed enough rows to distinguish, count the queries issued, and assert the number does not change with the count.

**Do**

```
await seedArticles(20);

const queries = await countQueries(() => listArticles.execute({ page: 1, limit: 20 }));
expect(queries).toBe(3);   // page + total + one batched author lookup
```

**Enforcement:** review — the counter is a test helper someone has to write; it is worth writing once for the whole suite.

### [R9](#R9) One place owns test data

Builders and object mothers live in one shared location and are used by every level — the fast suite, this one, and the acceptance suite. Two consequences follow. A new required field is one edit rather than a hundred, and a test's arrangement reads as intent (`suspendedAuthor()`, `articlePendingReview()`) instead of as a row.

Values are deterministic. Randomly generated data produces failures that cannot be reproduced and, worse, tests that pass most of the time. Where variety is genuinely wanted, seed the generator from a fixed value and print it.

**Enforcement:** review — a lint rule against inserting rows directly in a spec is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R10](#R10) A separate suite

These tests are named and configured apart from unit tests, so that the fast suite runs on a machine with no services, on every save, in seconds — and the slow one runs as its own pipeline job with its containers ([INFRA_09](../index.html#INFRA_09)). Mixing them means the fast suite is only as fast, and only as available, as the slowest thing it touches.

**Enforcement:** review — the file-name pattern is a runner configuration, which makes this automatic the moment the runner is configured for it ([INFRA_09](../index.html#INFRA_09)).

## Worked example

The article repository and its boundary, in one suite.

Setup starts a store container once for the file, runs the migrations, and constructs the adapter behind its port ([R2](#R2), [R5](#R5)). Each test uses its own identifiers from the builders and cleans up after itself ([R3](#R3), [R9](#R9)).

*Round trip.* A published article with two sections is saved and loaded; the snapshots are equal ([R6](#R6)). This one test covers the mapper, the child ordering, the enumeration conversion and the instant precision at once.

*Absence.* `findById` for an unknown identifier returns `null`, not a throw — the contract every use case's not-found branch depends on ([BE_05](../index.html#BE_05)).

*Constraint.* Saving a second article with a slug that already exists fails, and the failure is the store's constraint rather than an application check. The test asserts the constraint exists — which is the only place that fact is verifiable, and the reason a uniqueness rule is not "enforced" by a prior read.

*Concurrency.* Two publishes of the same article run against the locking load. One succeeds, one fails on the transition ([BE_04](../index.html#BE_04)). This test cannot exist in the fast suite at all, and it is the one that proves the guard is real ([BE_14](../index.html#BE_14)).

*Boundary.* `FindPublishedArticlePort` returns a view whose fields are what moderation renders, and returns `null` for an unpublished article rather than an empty view ([R7](#R7), [BE_03](../index.html#BE_03)).

*Shape.* Twenty articles are seeded and the list read runs a fixed three queries ([R8](#R8)).

What is not here: whether an article may be published, who may publish it, what the response body looks like. The first two are the fast suite's ([BE_11](../index.html#BE_11)); the third belongs to the acceptance suite ([BE_13](../index.html#BE_13)).

## Checklist

- The test covers a real seam, not a business rule ([R1](#R1)).
- It runs against the real service in a container; no in-memory substitute ([R2](#R2)).
- It creates its own data and cleans up ([R3](#R3)), and passes in any order ([R4](#R4)).
- The adapter is exercised through its port ([R5](#R5)).
- A new or changed mapper has a round-trip test ([R6](#R6)).
- Each published port has a contract test written from the consumer's view ([R7](#R7)).
- Reads over collections assert a query count that does not grow with rows ([R8](#R8)).
- Fixtures come from shared builders with deterministic values ([R9](#R9)).
- The suite is separately named and runnable ([R10](#R10)).

## Open questions

- [R8](#R8) needs a query-counting helper that does not exist; until it is written, the rule is aspirational and the N+1 guardrail in [BE_06](../index.html#BE_06) has no teeth at any level.
- Where shared builders physically live — beside the module, or in one test-support package shared with the acceptance suite — is not decided, and deciding it late means moving every fixture.
- Whether migrations are run per suite or a schema snapshot is loaded is a speed/fidelity trade-off with no answer here; it interacts with [BE_15](../index.html#BE_15) and belongs to an ADR once migrations exist.

## Related

Requires [BE_11](../index.html#BE_11), [BE_06](../index.html#BE_06). See also [INFRA_12](../index.html#INFRA_12).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/infrastructure/repository/file-todo-list.repository.integration-spec.ts`

---

[← All conventions](../index.html)
