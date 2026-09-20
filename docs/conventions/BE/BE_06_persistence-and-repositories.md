---
title: "BE_06 · Persistence & the repository pattern"
id: "BE_06"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_05]
see_also: [INFRA_12, BE_15]
---

[Conventions](../index.html) / Backend / BE_06

# [BE] Persistence & the repository pattern

`P1` · `BE_06` · `draft` · `updated 2026-09-19`

**Open when:** you need to read or write data.

Keeping the database pluggable: repository ports in the domain, adapters in infrastructure, no ORM types above the adapter, where a query may live, and the read-model escape hatch.

## The rules

If you read nothing else:

1. <a id="R1"></a>Declare a repository port in `domain/repository/`; implement it in `infrastructure/repository/`.
2. <a id="R2"></a>A repository speaks domain only: it accepts and returns entities, or `null`, and it throws no workflow error.
3. <a id="R3"></a>`save` returns `void`. A repository never returns what it just wrote.
4. <a id="R4"></a>A mapper owns the translation between stored record and entity. Nothing else knows both shapes.
5. <a id="R5"></a>Name the store in `infrastructure/` only — a repository, a query implementation, or an adapter. Nowhere else.
6. <a id="R6"></a>One repository per aggregate root, loading and saving the whole aggregate.
7. <a id="R7"></a>A read projection is answered by a query contract declared in `application/query-port/` and implemented in `infrastructure/`, never by a repository.
8. <a id="R8"></a>A query service returns a projection, `null` or `[]` — never a record, never an entity, and never a thrown error.
9. <a id="R9"></a>Keep the number of queries independent of the number of rows. Batch by ids; never query inside a loop.
10. <a id="R10"></a>Derive the schema from the domain. Never let the store's shape dictate the model.

## Why

The database is the dependency hardest to change and easiest to spread. Its types are convenient — they already have the fields — so they travel upward one signature at a time, until the query language is part of the business logic and the model is whatever the tables happened to be. Each of those changes looked harmless.

Two constructs keep it contained. The repository is the write side: it hides the store behind a contract in domain terms, so a use case can be tested with a substitute and the store swapped by rewriting one folder. The query service is the read side, because pretending reads are writes is the other common failure — the projection a screen needs rarely matches the shape a rule needs ([BE_05](../index.html#BE_05)).

Both rest on one rule: whatever leaves a store-aware file is plain data or a domain object. That seam is the whole bet.

## Rule detail

### [R1](#R1) The port is domain, the implementation is infrastructure

The port is an abstract class in `domain/repository/`, framework-free, declaring the loads and saves this aggregate needs — nothing generic, no `findAll(criteria)` escape hatch, no method handing out a query builder. The class fulfilling it lives in `infrastructure/repository/`, named in the module file and nowhere else ([BE_02](../index.html#BE_02)). It is never barrel-exported: publishing it hands another module write access to your aggregate ([BE_03](../index.html#BE_03)).

**Enforcement:** review — the folder-to-layer mapping and the barrel exclusion are both checkable ([INFRA_06](../index.html#INFRA_06)).

### [R2](#R2) and [R3](#R3) A repository's vocabulary

Parameters and returns are domain objects: a loader returns the entity or `null`, a mutation reporting a fact may return a boolean, and nothing else crosses.

Two things a repository does *not* do. It does not return a projection, a row or a record from a loader: those are reads, and reads have their own construct ([R7](#R7)). And it throws no workflow error — not `NotFound`, not `Forbidden`. It is a persistence executor; whether absence is an error is the use case's decision ([BE_05](../index.html#BE_05), [BE_09](../index.html#BE_09)). A repository throwing `ArticleNotFoundError` takes that decision from every future caller, including the one that wanted to create the article when it was missing.

`save` returns `void` deliberately: returning the entity invites callers to depend on values the store filled in, which is how store-assigned ids and audit columns reach the domain ([BE_04](../index.html#BE_04)).

**Do**

```
export abstract class ArticleRepositoryPort {
  abstract findById(id: string): Promise<Article | null>;
  abstract findByIds(ids: string[]): Promise<Article[]>;
  abstract save(article: Article): Promise<void>;
}
```

**Don't**

```
abstract findOne(options: FindOneOptions<ArticleRecord>): Promise<ArticleRecord>;
abstract save(article: Article): Promise<ArticleRecord>;
abstract getQueryBuilder(): SelectQueryBuilder<ArticleRecord>;
```

**Enforcement:** partly automated — the type-checker enforces the signatures once the port declares them; that the port declares no store type, and that the implementation does not throw, are review.

### [R4](#R4) The mapper is the only bilingual file

One file per aggregate translates both ways: record to entity through the rehydrating factory, entity to record through its snapshot ([BE_04](../index.html#BE_04)). It is separate from the repository because it is what changes when either side does, which is what makes the change visible.

**Enforcement:** review.

### [R5](#R5) Store-aware places, and no others

An earlier wording put a query service in `application/` and let it name the store. That made the application layer import infrastructure, which [BE_02#R1](../index.html#BE_02) forbids; [GEN_01#R7](../index.html#GEN_01) resolves the clash for the lower-numbered document, so the contract stays in `application/query-port/` and every store-aware file lives in `infrastructure/`.

Persistence records live in `infrastructure/entity/`, declared separately from the domain entity even when the fields match today — once the two are one class, the coupling in [R10](#R10) is invisible.

Three kinds of file may name the store, because querying it is their job, and all three live in `infrastructure/`:

- A repository and its mapper, in `infrastructure/repository/` and `infrastructure/mapper/`.
- A query implementation in `infrastructure/query/`, assembling a read projection behind the contract its use case depends on ([R7](#R7)).
- An adapter in `infrastructure/`, implementing a port this module published ([BE_03](../index.html#BE_03)).

Everything else is out: no persistence import in a use case, application service, DTO, controller or anything under `domain/`; no schema decorator on a domain class; no store type in a port or a projection. [BE_02#R7](../index.html#BE_02) is the general form of this rule.

**Enforcement:** review — an import allow-list for the persistence package, with those three path patterns as the exceptions, is the most valuable single guardrail this document could have ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) One repository per aggregate

The unit is the aggregate root, not the table: loading an article loads its sections and neither has a repository of its own ([BE_04](../index.html#BE_04)). A repository per table reintroduces the partial writes the aggregate prevents. A load may take several queries — fine, as long as the number is fixed ([R9](#R9)).

**Enforcement:** review.

### [R7](#R7) Which construct answers the need

One question decides it: does the call cross a module boundary?

| The need | Crosses a boundary? | Construct | Returns |
| --- | --- | --- | --- |
| Load or save your own aggregate | No | `domain/repository/<name>-repository.port.ts` | Entity, `null`, `void` |
| Read a projection inside your own module or context | No | `application/query-port/<name>.query-port.ts` + a query service | `Projection` |
| Read a fact or trigger an action in another module | Yes | `domain/port/<name>.port.ts` + an adapter ([BE_03](../index.html#BE_03)) | `View` |

A query service may do what an aggregate makes awkward: join within the module, sort, paginate, read audit columns. It must not validate inputs, decide policy, or throw — a use case gives it valid instructions and interprets what comes back ([BE_05](../index.html#BE_05)).

**Enforcement:** review.

### [R8](#R8) Read outputs, and what they are called

`null` for a missing single read, `[]` for an empty list. Absence is data; it becomes an error only where a use case says so ([BE_09](../index.html#BE_09)). A query service importing an error class has already taken that decision.

Four names carry the whole read vocabulary, and using them consistently means a reader knows a type's direction of travel without opening it:

| Name | Is | Crosses |
| --- | --- | --- |
| `Row` | A raw result of one query | Nothing — local to a query or mapper |
| `Projection` | An internal read model | Module or context |
| `View` | What a published port returns | Module boundary |
| `Result` | A wrapper such as a page plus its total | Wherever its contents do |

Name the read *contract* for the question (`FindArticleDetailQuery`) and its implementation for what it reads (`ArticleQueryService`). One service usually satisfies several contracts; use cases inject the contract ([BE_05](../index.html#BE_05)).

**Enforcement:** review.

### [R9](#R9) Query count does not follow row count

The N+1 read is this architecture's most common performance defect, because composing per row is the natural way to write it. A page plus one batched resolution is two queries; mapping over the page and awaiting per item is a query per row, and it passes every test with three rows in the database.

Fixed queries in parallel are fine. The test is not whether calls are concurrent; it is whether their number is a function of cardinality.

**Do**

```
const page = await this.articles.page(filter);
const authors = await this.resolveAuthorProfiles.resolve(page.items.map(a => a.authorId));
```

**Don't**

```
const page = await this.articles.page(filter);
const items = await Promise.all(
  page.items.map(async a => ({ ...a, author: await this.resolveAuthorProfiles.resolve([a.authorId]) })),
);
```

**Enforcement:** review — an await inside a `map` over a query result is greppable and a good candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R10](#R10) The schema follows the domain

Model the aggregate, then derive the tables. A model shaped by an existing schema inherits storage decisions: nullable columns standing in for states, denormalized fields the domain cannot name, a foreign key that is really an unenforced invariant.

Migrations are [BE_15](../index.html#BE_15)'s; which store exists at all is a project fact to check in `PROJECT.md` before designing against one ([INFRA_12](../index.html#INFRA_12)).

**Enforcement:** review.

## Worked example

The article aggregate, both paths.

*Write.* `ArticleRepositoryPort` declares `findById`, `findByIds` and `save` ([R2](#R2)). `ArticleRepository` issues the fixed set of queries that rebuild the aggregate and hands the records to `ArticleMapper.toDomain`, which calls the entity's rehydrating factory — so an invalid stored row fails at the boundary rather than silently inside a rule ([BE_04](../index.html#BE_04)). `save` takes the snapshot, writes the root, reconciles the children, returns nothing ([R3](#R3)). A missing article is `null`.

The use case sees none of this. Its test substitutes the port and would keep passing through a change of store ([BE_11](../index.html#BE_11)).

*Read.* The article list needs title, author name, published date and a comment count, filtered and sorted. Aggregates would load every article whole and still lack the author name, which another module owns. So `ArticleQueryService` implements `ListArticlesQuery`, runs two fixed queries — page and total — and returns `ArticleListItemProjection[]` in a `Result` ([R7](#R7), [R8](#R8)). Author names arrive through one batched port call ([R9](#R9)) returning `AuthorProfileView` — a `View`, because it crossed a boundary.

The use case injects `ListArticlesQuery`, not the service class ([BE_05](../index.html#BE_05)), and decides what an empty page means.

The escape hatch: when a projection is too expensive to assemble per request, the answer is a maintained read model — not a cross-module join ([R9](#R9), [BE_03](../index.html#BE_03)). That is a decision with an owner and an update path, and it belongs to [BE_16](../index.html#BE_16).

## Checklist

- The port is in `domain/repository/`, the implementation in `infrastructure/repository/` ([R1](#R1)).
- Repository signatures are domain types; no projection returned, nothing thrown, `save` returns `void` ([R2](#R2), [R3](#R3)).
- A mapper is the only file that knows both shapes ([R4](#R4)).
- The store is named only inside `infrastructure/` ([R5](#R5)).
- The repository's unit is the aggregate, not the table ([R6](#R6)).
- The need was routed through the table in [R7](#R7) before a construct was written.
- Reads return a projection, `null` or `[]`, named by the vocabulary in [R8](#R8).
- No read issues a query per row ([R9](#R9)).
- The schema change follows a model change, not the reverse ([R10](#R10)).

## Open questions

- [R9](#R9) is stated as a shape rule because a threshold would be wrong everywhere; that leaves it dependent on a reviewer noticing. A query-count assertion in integration tests ([BE_12](../index.html#BE_12)) would turn it into evidence.
- How a repository participates in a transaction is deliberately absent, since [BE_14](../index.html#BE_14) owns it. Until that document exists, reaching a repository with a transaction without leaking the driver is unstated — the most likely place for [R5](#R5) to break.
- Whether a query service may call another module's port directly, or must go through the use case, is unsettled — and should be decided before several modules choose differently.

## Related

Requires [BE_05](../index.html#BE_05). See also [INFRA_12](../index.html#INFRA_12), [BE_15](../index.html#BE_15).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/infrastructure/`, `apps/api/src/modules/todo/domain/repository/`

---

[← All conventions](../index.html)
