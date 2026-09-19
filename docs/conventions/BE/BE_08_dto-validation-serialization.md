---
title: "BE_08 · DTOs, validation & serialization"
id: "BE_08"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_07]
see_also: [GEN_11]
---

[Conventions](../index.html) / Backend / BE_08

# [BE] DTOs, validation & serialization

`P1` · `BE_08` · `draft` · `updated 2026-09-19`

**Open when:** data enters or leaves the API.

Request DTO vs domain model vs response model, where validation runs, schema conventions, transformation and whitelisting, and never letting an entity reach the wire.

## The rules

If you read nothing else:

1. <a id="R1"></a>Keep three shapes apart: the request DTO, the domain model, and the response model. Never merge two of them.
2. <a id="R2"></a>Validate every value entering from outside against a schema, at the boundary — bodies, path and query parameters, headers, job payloads and provider callbacks alike.
3. <a id="R3"></a>Declare the schema once and derive the type from it. Never write the shape twice.
4. <a id="R4"></a>Reject or strip unknown fields. A use case receives validated data or nothing.
5. <a id="R5"></a>Never let a domain entity or a persistence record reach the wire.
6. <a id="R6"></a>Choose every exposed field deliberately. Never spread an object into a response.
7. <a id="R7"></a>Keep business rules out of the schema, and format checks out of the domain.
8. <a id="R8"></a>Normalize once, at the boundary. Nothing downstream re-parses or re-trims.
9. <a id="R9"></a>A DTO holds data only — no methods, no framework or persistence concerns, no defaults that carry business meaning.
10. <a id="R10"></a>One request DTO and one response DTO per operation, named after it. Never reuse a DTO across operations.

## Why

One shape for everything is the most tempting simplification in a backend, and the one that costs the most. The moment a class is both what a client may send, what the business is, and what the client sees, three unrelated forces pull on one file: a field added for the UI becomes a field a client may write; a field the domain needs internally becomes a field the world can read; renaming anything internal becomes a breaking API change. The three shapes are separate because they change for different reasons and at different speeds.

Validation is the other half. Everything from outside is hostile until parsed ([GEN_09](../index.html#GEN_09)), and "outside" is wider than the request body — it includes the query string, the path parameter that will be interpolated into a query, and the job payload your own system enqueued last week under an older version of the code. Parsing all of it once, at the edge, is what lets every layer beneath treat its inputs as known-shaped and stop re-checking. Validation scattered through the layers is validation nobody can confirm ran.

## Rule detail

### [R1](#R1) Three shapes, three reasons to change

The request DTO is what a client is permitted to send. The domain model is what the business is ([BE_04](../index.html#BE_04)). The response model is what a client is permitted to see. They overlap today and will not tomorrow: the first grows optional fields for clients, the second grows internal state, the third grows fields assembled from several sources.

Request DTOs live in `application/dto/request/`, response DTOs in `application/dto/response/` ([BE_01](../index.html#BE_01)). Neither is a domain type, and neither is a persistence record.

**Enforcement:** review.

### [R2](#R2) Everything from outside, at the boundary

Every transport-facing input is parsed before the operation begins: request bodies, query strings, path parameters, headers that carry data, and the payloads of jobs, messages and provider callbacks. A path parameter is the one people skip — it looks like an id, and it is a string that a caller chose.

"At the boundary" means in the controller or consumer layer, before the use case is called, so that a use case's input type is a promise the compiler can keep ([BE_05](../index.html#BE_05)).

**Enforcement:** review — wiring a global validation pipe makes the request half automatic; the job and callback half stays with the author either way.

### [R3](#R3) The schema is the declaration

Write the schema, derive the TypeScript type from it, and use that type everywhere. Declaring an interface *and* a validator lets the two drift, and the drift is silent: the compiler is satisfied by the interface while the runtime obeys the validator.

**Do**

```
export const CreateArticleSchema = schema.object({
  title: schema.string().trim().min(1).max(200),
  sectionIds: schema.array(schema.uuid()).max(50).default([]),
});

export type CreateArticleInput = Infer<typeof CreateArticleSchema>;
```

**Don't**

```
export interface CreateArticleInput {   // one source of truth
  title: string;
  sectionIds: string[];
}
export const CreateArticleSchema = schema.object({ … });   // and another
```

Which library provides the schema builder is not this document's decision — check `PROJECT.md` for what is installed before writing against one, and propose it if it is not. The rule is schema-first and single-declaration, whichever library holds it.

**Enforcement:** partly automated — the type-checker keeps call sites honest once the type is derived; nothing prevents declaring a parallel interface.

### [R4](#R4) Unknown fields do not pass

A schema that ignores unknown keys lets a client send `{ title, authorId, isAdmin }` into an object that is later spread somewhere that reads one of those. Strip what was not declared, or reject the request outright; either is fine, and silently forwarding is not.

The corresponding rule on the write side is that a use case never receives a raw object from the transport. If the input type it declares came from a schema, that is already true.

**Enforcement:** review — this is a whitelist setting on the parser and a strong candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R5](#R5) and [R6](#R6) Nothing leaks outward

An entity that reaches the wire publishes the model's internals as an API contract, which then cannot change without breaking clients — the exact coupling [BE_04](../index.html#BE_04) built private state to avoid. A persistence record on the wire does the same for the schema, and usually exposes columns nobody chose to publish: internal flags, soft-delete markers, a foreign key to another module's table.

So the response model is assembled, field by field, from projections and results ([BE_06](../index.html#BE_06)). Spreading is the failure mode to watch for, because it survives review by looking short:

**Don't**

```
return { ...articleRecord, author: { ...userRecord } };
// ships deletedAt, internalNotes, passwordHash, and the next column someone adds
```

**Do**

```
return {
  id: article.id,
  title: article.title,
  publishedAt: article.publishedAt,
  author: { id: author.id, displayName: author.displayName },
};
```

The second version also fails loudly when a field disappears, which is the behavior you want from a contract.

**Enforcement:** review — a ban on spreading a record into a response value is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) Shape here, rules there

The schema decides whether the input is *well formed*: type, length bounds, format, enumerated membership, required and optional. The domain decides whether it is *allowed*: whether this title may be used, whether this transition is legal, whether this actor may do it ([BE_04](../index.html#BE_04)).

Putting a business rule in a schema hides it from every non-HTTP caller and makes it unavailable to the model. Putting format checking in the domain forces every entity to defend against strings that should never have got that far. The dividing question: would this check still make sense if the operation arrived from a queue rather than a request? If yes, it is the domain's.

**Enforcement:** review.

### [R8](#R8) Normalize once

Trimming, case-folding, coercing a numeric string, parsing an instant into a date, applying a default: all of it happens in the schema, so everything downstream receives values already in their final form. Re-normalizing later is how two parts of the system come to disagree about whether a title is trimmed. Which representation is "final" for instants, money, identifiers and enumerations is [GEN_11](../index.html#GEN_11)'s.

**Enforcement:** review.

### [R10](#R10) One DTO per operation

`CreateArticleDto` belongs to creating an article and to nothing else. Sharing it with the update operation means the two are the same request forever, or diverge through optional fields until neither is readable. Reuse belongs to the *schema* — compose a shared fragment — not to the DTO that names an operation ([GEN_07](../index.html#GEN_07)).

**Enforcement:** review.

## Worked example

Creating an article, from wire to store and back.

The route declares `CreateArticleDto` for the body. Parsing it produces a trimmed title, a bounded array of section ids, and nothing else — a client sending `authorId` or `status` has those stripped ([R4](#R4)), which matters because both are decided by the server: the author from the authenticated actor, the status by the domain.

The controller calls the use case with plain values ([BE_05](../index.html#BE_05)):

```
create(@Body() body: CreateArticleDto, @Actor() actor: ActorContext): Promise<CreateArticleResponse> {
  return this.createArticle.execute({ ...body, authorId: actor.id });
}
```

The use case builds the domain object through its factory, which enforces rules the schema cannot know — that the sections exist and belong to this author, that a draft may be created at all ([R7](#R7)). Note what the schema *did* catch: fifty sections maximum, so a request with fifty thousand never reaches a rule, a query, or memory.

The response is its own model: the identifier and the fields the client needs to render the result, assembled explicitly ([R6](#R6)). It is not the entity, and not the record that was written.

One boundary is easy to forget. The same article is also published by a scheduled job reading a payload written days earlier. That payload is outside data ([R2](#R2)) — the code that wrote it has since been deployed twice — so the consumer parses it against a schema before invoking the same use case. If the shape changed, the failure is a clear parse error at the edge instead of an undefined field three layers in.

## Checklist

- Request, domain and response shapes are three distinct types ([R1](#R1)).
- Every external input — body, params, query, headers, job payloads — is parsed at the boundary ([R2](#R2)).
- The schema is the single declaration; the type is derived ([R3](#R3)).
- Unknown fields are stripped or rejected ([R4](#R4)).
- No entity or persistence record appears in a response ([R5](#R5)).
- Every response field is written out explicitly; nothing is spread ([R6](#R6)).
- Schemas check shape; the domain checks rules ([R7](#R7)).
- Normalization happens once, in the schema ([R8](#R8)).
- DTOs carry no behavior ([R9](#R9)) and are not shared across operations ([R10](#R10)).

## Open questions

- Where the schemas physically live once the contract direction in `PROJECT.md` §5 is settled is not decided here: a shared package makes the client reuse them, generation from the specification makes the API the source. [GEN_08](../index.html#GEN_08) owns the decision; this document's rules hold either way.
- [R5](#R5) and [R6](#R6) are the rules whose breach is a privacy incident rather than a bug, and both are review-only. A response-shape assertion in the acceptance suite ([BE_13](../index.html#BE_13)) would be cheap and is not yet written.
- Nothing checks that a schema's bounds exist at all, so an unbounded array or string can ship silently ([R4](#R4)).

## Related

Requires [BE_07](../index.html#BE_07). See also [GEN_11](../index.html#GEN_11).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/presentation/dto/`

---

[← All conventions](../index.html)
