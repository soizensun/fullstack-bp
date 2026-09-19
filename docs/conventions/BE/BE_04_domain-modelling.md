---
title: "BE_04 · Domain modelling"
id: "BE_04"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_02]
see_also: [GEN_11, GEN_14]
---

[Conventions](../index.html) / Backend / BE_04

# [BE] Domain modelling

`P1` · `BE_04` · `draft` · `updated 2026-09-19`

**Open when:** you are creating or changing a business concept.

Entities, value objects, aggregates and invariants; keeping the domain framework-free; when a rich model is warranted and when a plain service is enough.

## The rules

If you read nothing else:

1. <a id="R1"></a>A business concept with rules is a class under `domain/` that holds its own state and enforces its own invariants.
2. <a id="R2"></a>Construct through a named static factory. Keep the constructor private and validate before it returns.
3. <a id="R3"></a>Keep every field private. Expose behavior, and expose data only through an explicit snapshot.
4. <a id="R4"></a>Name a method after the business action it performs, in the words of the glossary.
5. <a id="R5"></a>A value with rules is an immutable value object: validated on creation, compared by value, replaced rather than mutated.
6. <a id="R6"></a>Model status as a value object with declared transitions. Never compare status strings in a use case.
7. <a id="R7"></a>Refuse an illegal operation by throwing a domain error that names the exact condition that failed.
8. <a id="R8"></a>Give each consistency boundary one aggregate root, and change everything inside it through that root.
9. <a id="R9"></a>Keep store-assigned ids, audit timestamps, decorators and framework types out of the domain.
10. <a id="R10"></a>Where a concept carries no rules, write no entity for it.

## Why

The default shape of a backend is a data class with public fields and a service that manipulates it. It works, and it fails in one specific way: the rules about that data end up scattered across every caller. Whether an article may be published is decided in the publish route, again in the bulk importer, again in the scheduled job — three times, and the third one is subtly wrong. Nothing is available to read that says what an article *is*, so every change means finding all the places that assumed something about it.

Putting state and the rules over it in one class inverts that. There is one file that answers "when is this legal", one place to change it, and one place to test it — with no database, no framework and no HTTP, so the test is fast and reads like the rule ([BE_11](../index.html#BE_11)). Callers get shorter and stupider, which is the goal: a use case that reads `article.publish()` cannot get the rule wrong, because it does not contain the rule.

The cost is ceremony, and it is not always worth paying. A concept with no rules — a category with a name, a code table, a value that is only ever read — gets no entity, no factory and no value object ([R10](#R10)). Modelling it produces files that only ever forward, which is why every layer here is allowed to be absent when it has nothing to hold ([BE_01](../index.html#BE_01)).

## Rule detail

### [R2](#R2) The factory is where legality is decided

A private constructor plus named static factories means an instance cannot exist in an invalid state, anywhere, ever. That is a stronger guarantee than validating in the caller, and it removes the defensive checks the rest of the code would otherwise carry.

Name factories for how the thing comes into being: `createDraft` for a new one with the rules of creation, `create` (or `rehydrate`) for one being rebuilt from stored state by a mapper ([BE_06](../index.html#BE_06)). Both validate; they differ in what they are allowed to accept.

**Do**

```
export class Article {
  private constructor(private props: ArticleProps) {}

  static createDraft(data: CreateDraftArticle): Article {
    if (!data.title.trim()) throw new ArticleTitleRequiredError();
    return new Article({ ...data, id: newId(), status: ArticleStatusVO.Draft });
  }
}
```

**Don't**

```
const article = new Article();
article.title = input.title;          // an invalid Article existed in between
article.status = 'DRAFT';
if (!article.title) throw new BadRequestException();
```

**Enforcement:** partly automated — the type-checker rejects `new` outside the class once the constructor is private; whether the factory validates is review.

### [R3](#R3) Private state, and one snapshot

Public fields make every caller a co-author of the model: it can be read, mutated, and depended upon in shapes you never intended. Keep fields private and add an accessor only where a caller genuinely needs the value.

Mappers need everything, and that is the one legitimate wide read. Give the entity a single method returning a plain snapshot of its state — a value the mapper turns into storage and the test asserts against. That keeps one wide surface, named, instead of a field-by-field leak.

**Enforcement:** partly automated — `private` is checked by the compiler; whether the accessor should exist is review.

### [R4](#R4) Methods are named in the business's words

`publish()`, `withdraw()`, `assertCanPublishBy(actorId)` — not `setStatus('PUBLISHED')`, not `update(fields)`. A setter names a field; a method names a decision, and only a method can carry the rule. The vocabulary comes from [GEN_14](../index.html#GEN_14): if the business says *withdraw*, the method is not `unpublish`.

A method that only assigns is a setter with a longer name. If there is no rule, ask whether the field belongs to this concept at all.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R5](#R5) Value objects

A value object exists for a value that has rules a `string` or a `number` cannot carry: an email address, a slug, a grade level, a percentage, a monetary amount. It validates in its factory, is immutable after it, and is compared by value rather than identity. Which primitives are already modelled — money, identifiers, instants, enumerations — is [GEN_11](../index.html#GEN_11)'s, and it is not this document's job to re-decide them.

Two limits. Do not wrap a value that has no rules; `class Title { constructor(public value: string) {} }` adds a file and buys nothing. And do not create a second wrapper around a concept a neighbouring submodule already models — share it ([BE_01](../index.html#BE_01)).

**Enforcement:** review.

### [R6](#R6) Status is a machine, not a string

Every entity with a lifecycle attracts the same bug: a transition allowed in one caller and forbidden in another. Declare the transitions once, as data, inside a status value object, and let the entity ask it. Then adding a state is one edit and the illegal moves are visible in one table.

**Do**

```
const TRANSITIONS = {
  DRAFT:     { PUBLISH: 'PUBLISHED' },
  PUBLISHED: { WITHDRAW: 'WITHDRAWN', EDIT: 'PENDING_EDIT' },
  WITHDRAWN: { PUBLISH: 'PUBLISHED' },
} as const;

transition(action: ArticleAction): ArticleStatusVO {
  const next = TRANSITIONS[this.value][action];
  if (!next) throw new InvalidArticleTransitionError(this.value, action);
  return new ArticleStatusVO(next);
}
```

**Don't**

```
// in a use case
if (article.status !== 'DRAFT' && article.status !== 'WITHDRAWN') {
  throw new ConflictException('cannot publish');
}
```

**Enforcement:** review — a lint rule banning status-string comparison outside `domain/` is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) Refusal is an exception, named exactly

A domain rule that fails throws, and the class name is the rule: `ArticleTitleRequiredError`, `InvalidArticleTransitionError`, `ArticleNotOwnedByActorError`. A boolean return makes ignoring the answer the default; a generic `InvalidArticleError` makes every failure look alike to a caller and to the wire ([BE_09](../index.html#BE_09) owns the taxonomy, the codes and how these reach a response).

What the domain must not throw is anything about transport. No HTTP exception, no status code — those belong to layers the domain cannot see ([BE_02](../index.html#BE_02)).

**Enforcement:** review.

### [R8](#R8) The aggregate is the consistency boundary

The aggregate root is the object that must be internally consistent after every operation, and it is therefore the unit that is loaded, changed and saved as one. Children inside it — the sections of an article, the lines of an order — are reached and modified through the root, never loaded or saved independently.

Draw the boundary at what must be *immediately* consistent, and keep it small. Something outside that must react is an event, not a bigger aggregate ([BE_16](../index.html#BE_16)); making two aggregates consistent in one transaction is [BE_14](../index.html#BE_14)'s subject and usually a sign the boundary is drawn in the wrong place.

**Enforcement:** review.

### [R9](#R9) Nothing from the store, nothing from the framework

Identifiers are generated in the domain, not assigned by the database, so an entity is complete before it is saved and its identity is stable in a test ([GEN_11](../index.html#GEN_11)). Audit columns — created, updated, deleted timestamps — belong to the persistence layer, not the model, unless a business rule reads them; then it is a real field with a business name, not a column that leaked upward.

**Enforcement:** review — an import allow-list under `**/domain/**` would catch the framework half ([INFRA_06](../index.html#INFRA_06)); the audit-field half is review.

## Worked example

An article aggregate, and what each rule contributes.

`Article.createDraft` validates the title and starts in `Draft` ([R2](#R2)). Sections are created through the root, so an article with two sections numbered 1 and 1 cannot exist ([R8](#R8)). The status is a value object owning the transition table ([R6](#R6)).

Publishing looks like this on the entity:

```
assertCanPublishBy(actorId: string): void {
  if (this.props.authorId !== actorId) throw new ArticleNotOwnedByActorError(this.props.id);
  if (this.props.sections.length === 0) throw new ArticleHasNoSectionsError(this.props.id);
}

publish(at: Date): void {
  this.props.status = this.props.status.transition('PUBLISH');
  this.props.publishedAt = at;
}
```

Three things are worth noticing. The clock is an argument, because the domain may not reach one ([R9](#R9)). Ownership is asserted by the aggregate, since it is the thing that knows who owns it — the use case supplies the actor but does not know the rule ([BE_05](../index.html#BE_05)). And the illegal transition is refused by the status object, so the same refusal covers the scheduled publisher and the bulk importer without either repeating it.

The rule that does *not* live here: whether the article's images have finished processing. That is another module's fact, so the use case fetches it through a port and applies the policy ([BE_03](../index.html#BE_03)). If the policy itself is intricate — several facts, one business rule — it becomes a domain service in `domain/service/`: a stateless object, still framework-free, that takes plain inputs and decides. What it must not become is a private method on the use case, where the next caller will not find it.

Finally, the counter-example. The article's *category* is a name and a code, read-only, with no rules. It gets no entity, no value object and no repository — the read that needs it selects it in the projection ([R10](#R10)). Modelling it would produce four files that only ever forward, and every future reader would have to check whether one of them hides a rule.

## Checklist

- Every new rule lives on an entity, a value object or a domain service — not in a use case or a controller ([R1](#R1)).
- Constructors are private; every instance comes from a validating factory ([R2](#R2)).
- No public field; wide reads go through one snapshot ([R3](#R3)).
- Method names are business actions in glossary words ([R4](#R4), [GEN_14](../index.html#GEN_14)).
- Values with rules are immutable value objects; values without rules are not wrapped ([R5](#R5), [R10](#R10)).
- Status transitions are declared once, inside the domain ([R6](#R6)).
- Each refusal throws a domain error naming its exact condition ([R7](#R7)).
- Children are created and changed through their root ([R8](#R8)).
- No decorator, store-assigned id or audit timestamp in `domain/` ([R9](#R9)).

## Open questions

- Domain events are named here only as the alternative to a larger aggregate ([R8](#R8)); how an entity records one and who publishes it is [BE_16](../index.html#BE_16)'s and [BE_17](../index.html#BE_17)'s, and until those exist the mechanism is unstated.
- [R10](#R10) is a judgment with no test, and it is the rule most likely to be applied inconsistently across modules by different authors. A worked counter-example is the best tool available today.

## Related

Requires [BE_02](../index.html#BE_02). See also [GEN_11](../index.html#GEN_11), [GEN_14](../index.html#GEN_14).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/domain/`

---

[← All conventions](../index.html)
