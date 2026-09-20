---
title: "BE_03 · Module boundaries & independence"
id: "BE_03"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-08-31"
requires: [BE_02]
see_also: [INFRA_03, BE_16]
---

[Conventions](../index.html) / Backend / BE_03

# [BE] Module boundaries & independence

`P1` · `BE_03` · `draft` · `updated 2026-08-31`

**Open when:** one module needs something that belongs to another.

What a module owns — its data, its rules — its public surface, the ban on reaching into another module's internals or joining across their tables, and how a genuinely shared concept is resolved.

## The rules

If you read nothing else:

1. <a id="R1"></a>A module owns its data and every rule over it. No other module reads or writes that data directly.
2. <a id="R2"></a>The module's barrel is its entire public surface: its Nest module, its published ports, and the types those ports use.
3. <a id="R3"></a>Never export an entity, repository port, use case, query contract, DTO or error class from the barrel.
4. <a id="R4"></a>Never import another module's `application/`, `infrastructure/` or `presentation/`. The barrel or nothing.
5. <a id="R5"></a>Declare a cross-module need as a port in the *provider*, named for the fact or the action the consumer wants.
6. <a id="R6"></a>A port returns plain data — never a domain entity, never a persistence record.
7. <a id="R7"></a>Never join, transact, or migrate across two modules' tables.
8. <a id="R8"></a>Add a port where the boundary buys something. Where it buys nothing, do not create the boundary.
9. <a id="R9"></a>Resolve a concept two modules both need by giving it one owner or one shared home — never by copying it.
10. <a id="R10"></a>Name the provider module only in your module file. Everywhere else, depend on the port.

## Why

A modular monolith is a bet: that you can have the deployment simplicity of one process and the change isolation of separate services, as long as the boundaries hold. The bet is lost quietly. One module imports another's repository because it is faster than adding a port; one query joins two modules' tables because they are in the same database anyway. Neither breaks anything that day. A year later the two modules cannot be reasoned about, tested, or released separately, and nobody can point at the commit where that became true.

What makes the boundary hold is that crossing it must be a decision someone writes down. A port is that written decision: it names the fact one module wants from another, in the consumer's language, and it can be counted, reviewed and eventually deleted. A relative path into `../../other-module/infrastructure/` is the same coupling with none of the evidence.

The opposite failure is real too, and this document does not ask for it. Ports cost files, indirection, and a name for every fact. Where two modules are one team's, one deployable's, and have never changed independently, that cost buys optionality nobody will exercise ([R8](#R8)).

## Rule detail

### [R1](#R1) Ownership is data plus rules

Owning a table is not ownership. The module that owns a concept owns every write to it and every rule about when a write is legal, so the rule cannot be bypassed by writing from somewhere else. If a second module needs a state to change, it asks for the *change* — an action port — and the owner decides whether it is allowed.

The test is a sentence: name the module that would be at fault if this data were wrong. That module owns it.

**Enforcement:** review.

### [R2](#R2) The barrel is the surface

`index.ts` at the module root exports the Nest module and the module's published contracts. It is a file whose diff is worth reading closely: an addition there is a new public commitment, and additions accumulate.

It is also the *only* barrel: no internal `index.ts` re-exporting a layer, because that turns a private tree into a public one by accident ([GEN_07#R6](../index.html#GEN_07)).

**Do**

```
// modules/articles/index.ts
export { ArticlesModule } from './articles.module';
export { FindPublishedArticlePort } from './domain/port/find-published-article.port';
export type { PublishedArticleView } from './domain/types/find-published-article.types';
```

**Don't**

```
export { ArticleRepositoryPort } from './domain/repository/article-repository.port';
export { Article } from './domain/entity/article.entity';
export { PublishArticleUseCase } from './application/use-cases/publish-article.use-case';
```

**Enforcement:** review — the export list is mechanically checkable against the folder each symbol comes from, and is a strong candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Why a repository port is never published

`domain/port/` and `domain/repository/` look alike and mean opposite things. A repository port is an internal persistence contract: it loads and saves *your* aggregate, in domain types, for your own use cases ([BE_06](../index.html#BE_06)). A published port is a contract with the outside: it answers a question or performs an action, in the caller's terms.

Exporting a repository hands another module write access to your aggregate in a shape that skips every rule you wrote. Exporting an entity is the same leak in slow motion: the consumer now depends on your internal model, so your refactor becomes their breaking change. A caller that needs persisted data gets a view named for the fact it wants.

**Enforcement:** review — checkable from the source folder of each exported symbol ([INFRA_06](../index.html#INFRA_06)).

### [R5](#R5) The port lives in the provider, named by the consumer's need

A port belongs to the module that can honor it, not the one that wants it — otherwise every module accumulates contracts describing its neighbours. Name it for the fact or the action, in verb form, not for the mechanism: `ResolveAuthorProfilesPort`, `SuspendAccountPort`, `FindPublishedArticlePort`. Avoid a generic `execute()`; the method name is where the meaning is.

The mechanics, which are worth fixing once so every port reads the same way:

- `domain/port/<name>.port.ts` declares an abstract class and nothing else; its input, result and view types live beside it in `domain/types/<name>.types.ts`.
- An adapter `implements` the port; it never `extends` it. Extending inherits an abstract class as a base and silently loses the contract check.
- One adapter may satisfy several ports. Bind each token to that one instance rather than registering the class twice, and export the tokens — not the adapter.
- A consumer injects the port type and keeps the `Port` suffix on the parameter name, so the call site says which contract it is using.

An adapter that duplicates a use case is the failure to watch for. If the logic it needs is already a use case or query service the provider's own routes call, delegate to it; if nothing else uses it, let the adapter own the logic outright and delete the use case that existed only to be wrapped.

**Do**

```
// provider: modules/articles
export abstract class FindPublishedArticlePort {
  abstract find(articleId: string): Promise<PublishedArticleView | null>;
}

// consumer: modules/moderation — constructor injection, no provider internals
constructor(private readonly findPublishedArticle: FindPublishedArticlePort) {}
```

**Don't**

```
// consumer reaches in and re-implements the owner's rules
import { ArticleRepository } from '@/modules/articles/infrastructure/repository/article.repository';

const row = await this.articleRepo.findById(id);
if (row.status === 'PUBLISHED' && !row.deletedAt) { … }
```

**Enforcement:** review.

### [R7](#R7) No join, no shared transaction

This is a hard rule and has no exception. A join across two modules' tables makes one module's schema part of the other's contract, in the one place no import graph can see it. A shared transaction does the same to their lifecycles.

Composition happens in application code: ask each owner for what it owns, then assemble. Which mechanism does the asking — a port, an event, or a maintained read model — is [BE_16](../index.html#BE_16)'s. Where the assembly would run one query per row, that is a query-shape problem with a batched answer, not a reason to join ([BE_06](../index.html#BE_06)).

**Enforcement:** review — this is a hard rule of the repository, and the one most likely to be broken by a performance fix under time pressure.

### [R8](#R8) Ceremony has a budget

Ask what change the port makes cheap, and whether that change is likely. A port is worth its cost where the domain is volatile, where more than one consumer exists, or where the module is a genuine extraction candidate. It is not worth it because the neighbouring module has one.

One category is always worth it regardless: a port to an external system. The need ("store a file", "send a message") is stable while the provider is not, so the abstraction pays for itself the first time the provider changes.

Where a port buys nothing, the honest answer is usually that the two things are one module ([R9](#R9)) — not that the boundary may be crossed informally.

**Enforcement:** review.

### [R9](#R9) A shared concept gets one home

Three legitimate resolutions, in order of preference. Give the concept one owner and publish a port to it. Or, if both modules are submodules of one bounded context, move it to that context's shared domain ([BE_01](../index.html#BE_01)). Or, if it is a primitive with no domain of its own — money, an identifier, a date range — it belongs with the shared data primitives ([GEN_11](../index.html#GEN_11)).

Copying is not on the list. Two definitions of one concept diverge at the first bug fix, and the second definition is the one nobody remembers to update.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

## Worked example

Moderation needs to show a reported article to a reviewer, and to take it down.

The reported article is a *fact* moderation reads. Articles declares `FindPublishedArticlePort`, returning a `PublishedArticleView` with the id, title, author id and published time — the fields moderation actually renders, not the article's internal shape ([R6](#R6)). Articles' adapter implements it from its own persistence; when the article's model changes, the view stays still and moderation does not rebuild.

The takedown is an *action*, and this is where the boundary earns its cost. Moderation must not set a status column: whether an article can be withdrawn, what that does to its publish state, and what it emits are articles' rules. So articles declares `WithdrawArticlePort`, and its adapter delegates to the same use case the author's own route calls. One rule, one implementation, two callers.

Moderation's module file imports `ArticlesModule` and injects both ports ([R10](#R10)). Nothing else in moderation names articles. Its use-case tests substitute the two ports and run with no article code loaded at all ([BE_11](../index.html#BE_11)) — the practical proof that the boundary is real.

The tempting shortcut is one query joining reports to articles, ordered and paginated in the database. It is faster to write, and it makes the two schemas one schema ([R7](#R7)). The composition that survives is: page the reports moderation owns, then resolve that page's article ids in a single batched call ([R6](#R6)) — a fixed number of queries, no join, and either side free to move.

## Checklist

- The data the change writes belongs to the module writing it ([R1](#R1)).
- Every new barrel export is a Nest module, a published port, or a port type ([R2](#R2), [R3](#R3)).
- No import reaches into another module's `application/`, `infrastructure/` or `presentation/` ([R4](#R4)).
- Each new cross-module need is a port in the provider, named for the fact or action ([R5](#R5)).
- Every port returns plain data ([R6](#R6)).
- No query, transaction or migration spans two modules' tables ([R7](#R7)).
- Each new port names the change it makes cheap ([R8](#R8)).
- A shared concept has exactly one definition ([R9](#R9)).

## Open questions

- [R2](#R2) and [R3](#R3) are decidable from the export list and remain unchecked today; the barrel diff is review's only signal. [R4](#R4) is now checked by `apps/api/scripts/check-architecture.mjs` ([INFRA_06](../index.html#INFRA_06)).
- [R7](#R7) is invisible to an import-graph check, because the coupling lives in a query string. Detecting it needs schema ownership recorded somewhere a linter can read — unsolved, and worth an ADR when it is solved.
- [R8](#R8) has no threshold, deliberately. Whether a tiering scheme is worth writing down should be revisited once a project has enough modules to disagree about it.

## Related

Requires [BE_02](../index.html#BE_02). See also [INFRA_03](../index.html#INFRA_03), [BE_16](../index.html#BE_16).

---

[← All conventions](../index.html)
