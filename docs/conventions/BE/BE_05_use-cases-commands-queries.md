---
title: "BE_05 · Use cases — application services, commands & queries"
id: "BE_05"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_04]
see_also: [BE_14]
---

[Conventions](../index.html) / Backend / BE_05

# [BE] Use cases — application services, commands & queries

`P1` · `BE_05` · `draft` · `updated 2026-09-19`

**Open when:** you are writing the code that performs a business operation.

One use case per file, its signature and orchestration duties, command/query separation, and where cross-cutting concerns hook in.

## The rules

If you read nothing else:

1. <a id="R1"></a>One use case per file, one public method, named `<Verb><Noun>UseCase.execute`.
2. <a id="R2"></a>A use case orchestrates and never decides a business rule. Ask the domain.
3. <a id="R3"></a>A use case either changes state or answers a question. Never both.
4. <a id="R4"></a>Commands load and save aggregates through repository ports; queries read through query contracts and never load an aggregate.
5. <a id="R5"></a>Inject the narrowest contract that covers the need, not the service that happens to implement it.
6. <a id="R6"></a>Decide workflow failures here — absence, duplication, authorization context, wrong workflow state — as application errors.
7. <a id="R7"></a>Accept a plain input object and return plain data. No transport type enters or leaves.
8. <a id="R8"></a>Open at most one transaction per use case, covering the whole write. Where the store has no transactions, one serialized read-modify-write takes its place.
9. <a id="R9"></a>Put an effect that must not be lost inside the write; put an effect that may be retried after it.
10. <a id="R10"></a>Never call a use case from another use case. Shared workflow becomes an application service.

## Why

The use case is the layer everything else is measured against: it is the list of things the system can do. When each one is a file with a verb for a name, the capability inventory is `ls application/use-cases/`, a new engineer can find where anything happens, and a route, a queue consumer and a test can all invoke the same behavior without duplicating it. When operations live as methods on a service class instead, the class grows until nobody can tell which methods are entry points and which are helpers, and the two acquire different rules.

The other half is what a use case must *not* do. It is the layer with access to everything — the domain, the ports, the transaction, the clock — so it is where business rules go to hide. A conditional in a use case that decides whether something is allowed is a rule that the next caller will not get. The discipline that keeps this layer thin is [R2](#R2): the use case supplies facts and applies the answer; the domain decides ([BE_04](../index.html#BE_04)).

## Rule detail

### [R1](#R1) One file, one operation, one entry point

The class name is a sentence in the imperative: `PublishArticleUseCase`, `EnrollLearnerUseCase`, `GetArticleDetailUseCase`. `execute` is the only public method; anything else it needs is private, and if a private method grows a rule of its own it belongs in the domain instead.

Two operations that share most of their steps are still two files. Merging them behind a flag argument produces the one thing this rule exists to prevent: an entry point whose behavior you have to trace to name.

**Enforcement:** review — the one-public-method shape is mechanically checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R2](#R2) Orchestrate, do not decide

The duties of a use case are: load what is needed, call the domain, persist the outcome, record the consequences, return the result. Everything that reads as *whether* — whether this is allowed, whether this transition is legal, whether these values are consistent — belongs to an entity, a value object or a domain service.

The reliable smell is a conditional in a use case whose branches mention business vocabulary.

**Do**

```
const article = await this.articles.findById(input.articleId);
if (!article) throw new ArticleNotFoundError(input.articleId);

article.assertCanPublishBy(input.actorId);   // the rule lives in the domain
article.publish(this.clock.now());
await this.articles.save(article);
```

**Don't**

```
if (article.status !== 'DRAFT') throw new ConflictException();
if (article.authorId !== input.actorId) throw new ForbiddenException();
if (article.sections.length === 0) throw new BadRequestException();
article.status = 'PUBLISHED';
```

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R3](#R3) and [R4](#R4) Commands and queries take different paths

A command changes state. It loads a whole aggregate through a repository port, because it needs the object's behavior and its invariants, and it saves through the same port ([BE_06](../index.html#BE_06)).

A query answers a question. It reads a projection — exactly the fields the response needs, assembled by a query service — and never rebuilds an aggregate to read three of its properties. Read paths have different needs from write paths: joins, pagination, sorting, fields from several sources, audit columns the domain does not model. Forcing them through the aggregate makes both worse.

The rule that keeps them honest is that a query returns without writing. A "read" that lazily creates a missing record is a command; name it as one.

**Enforcement:** review.

### [R5](#R5) Inject the narrow contract

A read use case depends on the *question*, not on the class that answers it. Declare a small contract — one method, the shape this use case needs — and inject that; the query service implementing it may answer several such contracts, and the module file binds them ([BE_02](../index.html#BE_02)).

This is what keeps a use case's test small: substituting one method is a line, substituting a service with eleven is a fixture. It also keeps the blast radius of a query change to the contracts that actually named it.

**Enforcement:** review.

### [R6](#R6) Workflow failures are the use case's own

Some failures are not business rules and have no home in the domain: the thing was not found, the request duplicates one already accepted, the actor's role does not permit this operation, the workflow is in a state this step cannot start from. Those are the use case's decisions, raised as application errors distinct from domain errors ([BE_09](../index.html#BE_09)).

The distinction that matters: the domain refuses because the *concept's* rules forbid it; the use case refuses because the *request* cannot proceed. Both are exceptions; neither is an HTTP concern.

**Enforcement:** review — the location split (`application/*.errors.ts` versus `domain/*.errors.ts`) is checkable ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) Plain in, plain out

The input is an interface declared next to the use case; the result is plain data. No request object, no response object, no framework decorator, nothing that ties the operation to the transport that happened to trigger it. That is what makes the same use case callable from a route, a consumer, a job and a test ([BE_02](../index.html#BE_02)).

Validation of transport input has already happened by the time `execute` runs ([BE_08](../index.html#BE_08)), so the input type is trusted — but only in shape. A use case therefore never re-parses its own input: a schema call inside `execute` means either the boundary is not doing its job, or the use case is being handed raw outside data by a caller that skipped one. Rules about the *values* are a different matter and still belong to the domain.

**Enforcement:** partly automated — the type-checker catches a transport type in the signature once it is declared; nothing prevents declaring it.

### [R8](#R8) and [R9](#R9) One transaction, and what sits outside it

If a use case writes more than once, those writes are one transaction, opened at the top of `execute` and closed at the end of the write ([BE_14](../index.html#BE_14) owns the mechanism). Never two transactions in one operation, and never a transaction opened below the use case: only this layer knows what "the whole operation" means.

Then sort the consequences. An effect that must not be lost if the request succeeds — a message another module depends on, an audit entry — is recorded *inside* the transaction, so it commits with the change ([BE_17](../index.html#BE_17)). An effect that can be retried, and whose failure must not roll back the write — invalidating a cache, warming a projection — happens *after* it ([BE_19](../index.html#BE_19)). An effect that is neither is a design question, not a call you make inline.

**Enforcement:** review.

### [R10](#R10) No use case calls another

Chaining use cases produces nested transactions, doubled authorization, and errors that are meaningful at one level and confusing at the next. When two operations genuinely share a middle, extract that middle into an application service in `application/` that both call — a plain injectable with no route, no transaction of its own, and no rules that belong in the domain.

The same applies across modules, more strongly: another module's use case is not reachable at all ([BE_03](../index.html#BE_03)). It is reached through a port whose adapter may delegate to that use case.

**Enforcement:** review — an import of `**/use-cases/**` from another use case is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

## Worked example

`PublishArticleUseCase`, in full shape.

It injects four things: the article repository port, a port to another module for a fact it needs, the unit of work, and the outbox recorder. It injects no query service — this is a command ([R4](#R4)) — and no logger-driven branching.

```
async execute(input: PublishArticleInput): Promise<PublishArticleResult> {
  await this.uow.run(async () => {
    const article = await this.articles.findByIdForUpdate(input.articleId);
    if (!article) throw new ArticleNotFoundError(input.articleId);   // R6

    article.assertCanPublishBy(input.actorId);                        // R2
    await this.assertImagesReady(article.imageIds());                 // R2, via a port
    article.publish(this.clock.now());

    await this.articles.save(article);                                // R8: same transaction
    await this.outbox.record(articlePublished(article));              // R9: inside
  });

  await this.cache.invalidate(articleDetailKey(input.articleId));     // R9: after
  return { id: input.articleId };
}
```

`assertImagesReady` is the interesting line. The *fact* — are these images processed — belongs to another module and arrives through a port ([BE_03](../index.html#BE_03)). The *rule* — an article may not be published with unprocessed images — is business logic, so it is a domain policy the private method calls, not an `if` written here ([BE_04](../index.html#BE_04)). The private method exists to fetch and adapt, not to decide.

The load is a locking read, because this operation guards on state and then writes it; without the lock, two concurrent publishes both pass the guard ([BE_14](../index.html#BE_14)). The outbox record is inside the transaction, so a rollback takes the message with it; the cache invalidation is outside, because a failed invalidation must not undo a successful publish ([R9](#R9)).

Its read sibling, `GetArticleDetailUseCase`, injects one narrow contract ([R5](#R5)), returns the projection it receives — possibly deciding that absence is an error, which is a workflow decision and therefore its own ([R6](#R6)) — and touches no repository, no aggregate and no transaction.

## Checklist

- One file, one use case, one public `execute` ([R1](#R1)).
- No conditional in the use case decides a business rule ([R2](#R2)).
- The operation is a command or a query, and takes that path throughout ([R3](#R3), [R4](#R4)).
- Every injected dependency is the narrowest contract available ([R5](#R5)).
- Not-found, duplicate, authorization-context and wrong-state failures are application errors ([R6](#R6)).
- Input and output are plain types ([R7](#R7)).
- At most one transaction, covering the whole write ([R8](#R8)).
- Effects that must not be lost are inside it; retryable effects are after it ([R9](#R9)).
- No use case calls another; shared workflow is an application service ([R10](#R10)).

## Open questions

- Whether commands and queries should be separated by folder as well as by rule — `use-cases/commands/` and `use-cases/queries/` — is unresolved. It would make [R3](#R3) visible in the tree at the cost of churn when an operation changes kind.
- [R9](#R9) has no rule for an effect that is neither safely lost nor safely retried — a third-party call that charges money, for instance. That case needs [BE_17](../index.html#BE_17) and probably an ADR.
- Nothing today prevents a use case from injecting a concrete query service instead of a contract ([R5](#R5)), and this is the rule most quietly eroded by convenience.

## Related

Requires [BE_04](../index.html#BE_04). See also [BE_14](../index.html#BE_14).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/application/use-cases/`, `apps/api/src/modules/todo/application/service/`

---

[← All conventions](../index.html)
