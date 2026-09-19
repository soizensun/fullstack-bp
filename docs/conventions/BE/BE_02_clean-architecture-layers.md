---
title: "BE_02 · Clean architecture — the layers and the dependency rule"
id: "BE_02"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_01]
see_also: [INFRA_06]
---

[Conventions](../index.html) / Backend / BE_02

# [BE] Clean architecture — the layers and the dependency rule

`P1` · `BE_02` · `draft` · `updated 2026-09-19`

**Open when:** you are about to import something across layers.

Definition and responsibility of domain / application / infrastructure / interface, what each may import, and worked examples of a correct and an inverted dependency.

## The rules

If you read nothing else:

1. <a id="R1"></a>Imports point inward only: presentation → application → domain, and infrastructure → domain.
2. <a id="R2"></a>Nothing imports a file from `presentation/` or `infrastructure/`. Both are ends of the graph.
3. <a id="R3"></a>The domain layer imports nothing outside itself — no framework, no persistence library, no HTTP, no configuration, no clock, no logger.
4. <a id="R4"></a>The application layer may use the framework's dependency injection and nothing else the framework offers.
5. <a id="R5"></a>Presentation handles transport only: validate, call one use case, return its result.
6. <a id="R6"></a>Invert every outward dependency: declare an abstract class in the layer that needs it, implement it further out.
7. <a id="R7"></a>A library's types stop at the layer that owns them and never appear in a signature above it.
8. <a id="R8"></a>Bind a contract to its implementation only in the module file.
9. <a id="R9"></a>Keep framework lifecycle pieces — guards, pipes, interceptors, filters, decorators — in `presentation/` or `shared/`.
10. <a id="R10"></a>When convenience and the direction of imports conflict, add a contract. Never import upward or sideways.

## Why

The dependency rule buys exactly one thing, and it is worth naming precisely: the rules of the business stop depending on the decisions you are least sure about. Which database, which framework version, which HTTP shape, which mail provider — every one of those is a decision made early, on the least information anyone will ever have, and every one of them changes. Code that names them is code that changes with them. A domain layer that imports nothing can be read, tested and moved without any of that context, and it stays correct while the rest is replaced around it.

The second thing it buys is a working test pyramid. When a use case depends on abstract contracts rather than a driver, its test needs no container, no network and no fixtures, so it runs in milliseconds and someone actually writes it ([BE_11](../index.html#BE_11)). Every dependency that leaks upward is a test that quietly becomes an integration test.

The cost is real: an interface you have to define, a binding you have to write, one more file to open when tracing a call. That cost is paid per contract, so [R6](#R6) is a rule about direction, not about quantity — where a boundary buys nothing, do not create one ([BE_03](../index.html#BE_03)).

## Rule detail

### [R1](#R1) The four layers

| Layer | Owns | May import |
| --- | --- | --- |
| `domain/` | Business concepts, invariants, transitions, contracts it needs | Its own layer only |
| `application/` | Workflow: orchestration, authorization context, transactions | `domain/`, framework DI |
| `infrastructure/` | Implementations: persistence, providers, mappers | `domain/`, its libraries |
| `presentation/` | Transport: routes, request/response shapes, status codes | `application/`, `domain/` types |

`shared/` and `infrastructure/` at the app level ([BE_01](../index.html#BE_01)) sit outside a module and follow the same direction: a module may use them, they never import a module.

The table above says what may import what. The question that actually comes up is the other one — *where does this code go* — and it is answered by naming the decision the code is making:

| The code decides… | It belongs in |
| --- | --- |
| Whether a business rule holds, or what a state becomes | An entity, value object or domain service ([BE_04](../index.html#BE_04)) |
| The order of steps, what is missing, who is asking, what commits together | A use case ([BE_05](../index.html#BE_05)) |
| How an aggregate is stored and rebuilt | A repository and its mapper ([BE_06](../index.html#BE_06)) |
| What fields a screen needs and how to select them | A query service ([BE_06](../index.html#BE_06)) |
| What another module is told or asked | A published port and its adapter ([BE_03](../index.html#BE_03)) |
| The route, the status code, the wire shape | A controller and its DTOs ([BE_07](../index.html#BE_07), [BE_08](../index.html#BE_08)) |

When two answers seem to fit, the code is doing two things. Split it before deciding where it lives.

**Enforcement:** automated — `apps/api/scripts/check-architecture.mjs` checks the import graph for layer direction ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) The domain imports nothing

No decorators, no injection, no base classes from a library. A domain file is plain TypeScript, constructed with `new`, and its test needs no test module. This is the rule people break for the most reasonable-sounding reasons: a validation library that is *right there*, a persistence decorator that saves writing a mapper, an injected clock. Each one moves a business rule inside someone else's release cycle.

Things the domain needs but cannot reach — the current time, a generated identifier, a fact owned by another module — arrive as arguments or as a contract ([R6](#R6)).

**Do**

```
// domain/entity/article.entity.ts
export class Article {
  private constructor(private props: ArticleProps) {}

  publish(at: Date): void {
    this.props.status = this.props.status.transition('PUBLISH');
    this.props.publishedAt = at;
  }
}
```

**Don't**

```
// domain/entity/article.entity.ts
import { Injectable } from '@nestjs/common';
import { Column, Entity } from 'some-orm';

@Entity() @Injectable()          // the domain now has a framework
export class Article {
  @Column() status: string;      // and a schema, and a migration
}
```

**Enforcement:** automated — `apps/api/scripts/check-architecture.mjs` enforces the import allow-list for `**/domain/**` ([INFRA_06](../index.html#INFRA_06)).

### [R4](#R4) The application layer uses DI, and stops there

A use case is a class the container can construct: `@Injectable()`, constructor injection, nothing else. No request or response object, no HTTP exception, no decorator that reads a header, no module-lifecycle hook. The framework is how the object is built, not what it does — which is what keeps a use case callable from a queue consumer, a scheduled job or a test with no HTTP anywhere in the stack.

Two files in `application/` are allowed to reach persistence directly, because reading the store *is* their job: a query service assembling a read projection ([BE_06](../index.html#BE_06)), and an adapter implementing a published port ([BE_03](../index.html#BE_03)). Both convert at the boundary and return plain data, so [R7](#R7) still holds for everything that leaves them. Nothing else in `application/` — no use case, no application service, no DTO — may import the module's `infrastructure/` or the persistence library.

**Enforcement:** review.

### [R6](#R6) Inversion, and where the abstract class lives

Nest resolves providers by token, and an abstract class is both a type and a runtime value — so it is the contract and the token at once, with no string tokens to keep in sync and no `@Inject()` at the call site. Use an abstract class, never an interface.

The contract lives in the layer that *needs* it, not the layer that satisfies it: a use case needing persistence gets a port in `domain/`, implemented in `infrastructure/`. That is what makes the arrow point inward — the implementation depends on the abstraction, and the abstraction depends on nothing.

**Do**

```
// domain/repository/article-repository.port.ts
export abstract class ArticleRepositoryPort {
  abstract findById(id: string): Promise<Article | null>;
  abstract save(article: Article): Promise<void>;
}

// infrastructure/repository/article.repository.ts
export class ArticleRepository implements ArticleRepositoryPort { … }
```

**Don't**

```
// application/use-cases/publish-article.use-case.ts
import { ArticleRepository } from '../../infrastructure/repository/article.repository';

constructor(private readonly repo: ArticleRepository) {}
// the use case now depends on the driver, and its test needs one
```

**Enforcement:** partly automated — the type-checker rejects an implementation that drifts from its port; nothing yet rejects an import of the concrete class.

### [R7](#R7) Library types stop at their layer

A persistence record, a query builder, a request object, a provider's SDK type: each may exist in the layer that owns it and may not appear in a parameter, a return type, or a field of anything the layer above it touches. Translation happens at the boundary that owns the library — a mapper for persistence ([BE_06](../index.html#BE_06)), a DTO for transport ([BE_08](../index.html#BE_08)).

The reason is not purity. A leaked type is a dependency the compiler will not let you remove later: swapping the library becomes a change to every file that mentioned it, which is precisely the change this whole structure exists to keep small.

**Enforcement:** review.

### [R8](#R8) Wiring lives in the module file

`providers` is where an abstract class is bound to a class that implements it, and it is the only place either name appears together. Reading one module file tells you every contract the module satisfies and everything it depends on — which makes the module file the thing to read in review, and the thing to change when an implementation is replaced.

**Do**

```
providers: [
  PublishArticleUseCase,
  { provide: ArticleRepositoryPort, useClass: ArticleRepository },
],
```

**Enforcement:** review.

## Worked example

Publishing an article, one call crossing every layer.

The controller resolves the actor and the parameter, then calls the use case ([R5](#R5)). It knows no repository and no entity — only the response model it declares.

```
@Post(':id/publish')
publish(@Param('id') id: string, @Actor() actor: ActorContext) {
  return this.publishArticle.execute({ articleId: id, actorId: actor.id });
}
```

The use case orchestrates ([R4](#R4)): load through the port, let the entity decide, save through the port. It never asks *whether* the article may be published — that is a business rule and it lives on the entity ([BE_04](../index.html#BE_04)). Its own decisions are workflow ones: absence is an application error, and the actor is checked against the aggregate's own answer.

```
const article = await this.articles.findById(input.articleId);
if (!article) throw new ArticleNotFoundError(input.articleId);
article.assertCanPublishBy(input.actorId);
article.publish(new Date());
await this.articles.save(article);
```

Every name here is declared inward: `ArticleRepositoryPort` in `domain/`, `Article` in `domain/`, `ArticleNotFoundError` in `application/` ([BE_09](../index.html#BE_09)). The repository implementing the port lives in `infrastructure/` and is named nowhere but the module file ([R8](#R8)).

Now the inverted version, which is what this document exists to prevent. Someone needs the publish time formatted for an email, so the entity imports the mail service; the mail service imports config; config imports the framework. The domain now has a framework, a template engine and a network call in its test, and the rule that decides whether an article may be published cannot be read without them. The fix is not a smaller import — it is a port: the domain says *what* it needs, the module file says *who* provides it.

## Checklist

- Every import in the change points inward ([R1](#R1)); nothing imports `presentation/` or `infrastructure/` ([R2](#R2)).
- No framework, persistence, transport or configuration import under `domain/` ([R3](#R3)).
- The use case uses DI and no other framework feature ([R4](#R4)).
- The controller validates, calls one use case, and returns ([R5](#R5)).
- Every new outward dependency is an abstract class declared in the layer that needs it ([R6](#R6)).
- No library type appears in a signature above its own layer ([R7](#R7)).
- Bindings appear only in the module file ([R8](#R8)).
- Guards, pipes, interceptors and filters are in `presentation/` or `shared/` ([R9](#R9)).

## Open questions

- [R1](#R1) and [R3](#R3) are now checked by `apps/api/scripts/check-architecture.mjs` ([INFRA_06](../index.html#INFRA_06)). [R2](#R2) — nothing imports `presentation/` or `infrastructure/` — is not yet, and this is the document whose violations are most expensive to unwind later, since one leaked type spreads through every file that touches it.
- The adapter exception in [R4](#R4) is a real hole in the layer rule, kept because moving adapters to `infrastructure/` costs a delegation layer for cross-module reads. It should be revisited once more than one module publishes ports.

## Related

Requires [BE_01](../index.html#BE_01). See also [INFRA_06](../index.html#INFRA_06).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/`

---

[← All conventions](../index.html)
