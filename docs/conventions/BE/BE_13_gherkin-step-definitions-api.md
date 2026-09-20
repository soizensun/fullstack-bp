---
title: "BE_13 · Gherkin step definitions & API scenarios"
id: "BE_13"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [GEN_10, BE_12]
see_also: [FE_15]
---

[Conventions](../index.html) / Backend / BE_13

# [BE] Gherkin step definitions & API scenarios

`P1` · `BE_13` · `draft` · `updated 2026-09-19`

**Open when:** a scenario from `features/` has to run against the API.

Implementing steps against the running API, step reuse, given-state setup, environment and data teardown, and what belongs at this level rather than in `BE_11`/`BE_12`.

## The rules

If you read nothing else:

1. <a id="R1"></a>Drive an `@api` scenario over HTTP against the running application. Never call a use case, repository or service directly.
2. <a id="R2"></a>Keep every HTTP detail inside the step definition. Routes, payloads, headers and status codes never appear in a feature file.
3. <a id="R3"></a>Establish given-state through the API where an endpoint exists, and through shared builders where none does.
4. <a id="R4"></a>One implementation per step phrase, shared across features. Never duplicate a phrase to change its behavior.
5. <a id="R5"></a>Pass state between steps through a per-scenario context. No module-level mutable state.
6. <a id="R6"></a>Give each scenario its own actors and data, with unique identifiers, and remove them afterwards.
7. <a id="R7"></a>Assert the product outcome. Assert response mechanics only when the contract itself is the subject.
8. <a id="R8"></a>Never read the database to assert something the API can report.
9. <a id="R9"></a>Run the application wired as it ships. Substitute only third-party providers, at their ports.
10. <a id="R10"></a>Cover the main externally visible flows here. Leave rule branches to the faster suites.

## Why

A feature file is the one artifact a non-engineer can read and an engineer must satisfy ([GEN_10](../index.html#GEN_10)). That only stays true if the step definitions carry the whole translation: the moment a route or a status code appears in a scenario, the file stops being a description of the product and becomes a second, worse copy of the API tests — and the people it was written for stop reading it.

This suite is also the only one that exercises the system as a caller experiences it: real routing, real guards, real validation, real filters, real wiring. Every layer below has been tested with the layer above substituted, so this is where a missing provider binding, a guard applied to the wrong route, or a filter that never registered actually shows up.

It is also the slowest suite you own, and its cost grows with every scenario. That is why [R10](#R10) matters as much as the rest: it stays valuable only if it stays small.

## Rule detail

### [R1](#R1) Over HTTP, always

A step calls the API the way a client does. Reaching into the container to invoke a use case skips exactly the things this suite exists to check — the route, the guard, the pipe, the filter — while looking like a passing test.

The application under test is started once for the suite, against real backing services in containers ([BE_12](../index.html#BE_12)). Whether the client is an HTTP library or the framework's test client does not matter, as long as the request travels the real pipeline.

**Enforcement:** review — an import of anything under `src/modules/**/application/**` in a step file is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R2](#R2) The translation lives here

The scenario says what happened in the product's words; the step says how that reaches the API. This is the division of labour that makes both files worth having, and it is broken one convenient parameter at a time.

**Do**

```
// feature
When the creator publishes the article

// step
When('the creator publishes the article', async function () {
  this.response = await this.api
    .as(this.actors.creator)
    .post(`/v1/articles/${this.articleId}/publish`);
});
```

**Don't**

```
// feature — a route, an id and a status code in a business document
When the creator sends POST "/v1/articles/{articleId}/publish"
Then the response status should be 200
```

**Enforcement:** review — a grep for HTTP verbs, paths and status codes inside `features/**` is trivial and worth automating ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Given-state through the front door, where there is one

Prefer building preconditions with the API itself: an article that exists was created by the create endpoint. That keeps the setup honest — the state is reachable by a real caller — and it makes the scenario fail when the setup path breaks, which is information.

Where no endpoint can produce the state (a record only a migration or another system creates, a state reached only by time passing), use the shared builders and insert directly ([BE_12](../index.html#BE_12)). Keep those cases few and obvious, because each one asserts a state your API cannot actually produce.

**Enforcement:** review.

### [R4](#R4) One phrase, one implementation

Step reuse is what keeps the suite from becoming a thousand bespoke functions. Before writing a step, search for the phrase; if a near-identical one exists, use it rather than adding a variant that differs by a word. Two phrasings of the same action drift, and nobody discovers it until one is fixed.

The corollary is that a step is written to be reusable: parameterized by the actor and the subject, without assumptions about which scenario is running.

**Enforcement:** review.

### [R5](#R5) and [R6](#R6) A scenario owns its world

Each scenario gets a fresh context object holding its actors, the identifiers it created, and the last response. Steps read and write only that. Module-level variables shared between scenarios produce order-dependent failures that are almost impossible to attribute ([BE_12](../index.html#BE_12)).

Data is unique per scenario — generated identifiers, generated email addresses — so scenarios can run beside each other, and it is removed afterwards. Independence is [GEN_10](../index.html#GEN_10)'s rule; this is how it is honored at this level.

**Enforcement:** partly automated — running scenarios in a randomized order surfaces shared state; cleanup itself is review.

### [R7](#R7) and [R8](#R8) Assert what the product promised

"The article appears in the public listing" is asserted by reading the public listing and finding it — not by checking a status code, and not by querying a table. Asserting through the API keeps the test at the level a user cares about, and keeps it passing through internal changes that preserve behavior.

Reading the database to assert is the shortcut that hollows this suite out: it can confirm a row exists while the endpoint that should expose it is broken, and it couples a business scenario to a schema.

The exception is when the contract *is* the behavior: a validation rejection, an authentication failure, a permission refusal, a specific error code. Those are what the scenario is about, so asserting the status and the code is asserting the product ([BE_09](../index.html#BE_09), [GEN_08](../index.html#GEN_08)).

**Enforcement:** review.

### [R9](#R9) Wired as it ships

The application under test uses its real module wiring: real guards, real filters, real interceptors, real configuration shape ([BE_10](../index.html#BE_10)). Substituting a module to make a scenario easier removes the only place that module's wiring is checked.

Third-party providers are the exception, substituted at their ports ([BE_03](../index.html#BE_03)) — nothing sends a real email, charges a real card, or depends on someone else's availability for the build to pass. Where a provider substitute records what it was asked to do, a scenario may assert on that: it is an observable product outcome.

**Enforcement:** review.

### [R10](#R10) Main flows only

Two to five scenarios per capability, covering what the product promises: the happy path, and the refusals that are themselves business rules a stakeholder would name. Every additional branch — each invariant, each edge of a transition table — belongs in the fast suite where it costs milliseconds ([BE_11](../index.html#BE_11)).

The test for a proposed scenario: would a stakeholder recognize it as a promise the product makes? If it only makes sense to someone who has read the code, it is a unit test wearing a costume.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

## Worked example

`article-publishing.feature`, and what its steps do.

```
Scenario: A creator publishes an article and readers can find it
  Given a creator with a draft article
  When the creator publishes the article
  Then the article appears in the public article list
  And readers can open the article
```

`Given a creator with a draft article` registers an actor with unique credentials and creates the draft through the create endpoint, storing the actor and the identifier on the scenario context ([R3](#R3), [R5](#R5), [R6](#R6)). No fixture file, no direct insert — the state is one a real creator could reach.

`When the creator publishes the article` performs the request as that actor and keeps the response ([R2](#R2)).

`Then the article appears in the public article list` calls the public listing as an anonymous reader and looks for the article's title. It does not assert `200`, and it does not query a table ([R7](#R7), [R8](#R8)). That is what makes it meaningful: it fails if publishing succeeded but visibility rules exclude the article — the defect a status-code assertion would miss entirely.

A second scenario is worth its cost:

```
Scenario: An article without sections cannot be published
  Given a creator with an empty draft article
  When the creator publishes the article
  Then the article is rejected as incomplete
```

The refusal is a business rule a stakeholder would state, so it belongs here; the step asserts the error code from the catalogue, because for a refusal the contract is the outcome ([BE_09](../index.html#BE_09)). The other four ways publishing can fail — wrong status, wrong owner, unprocessed images, missing article — stay in the fast suite ([R10](#R10)).

Both scenarios reuse `When the creator publishes the article` unchanged ([R4](#R4)). Teardown removes the actors and articles the context recorded, so a second run behaves identically ([R6](#R6)).

The browser half of this feature — if the same capability is also exercised through the UI — is [FE_15](../index.html#FE_15)'s, against the same feature file and the same wording ([GEN_10](../index.html#GEN_10)).

## Checklist

- Every step reaches the application over HTTP ([R1](#R1)).
- No route, payload, header or status code appears in the feature file ([R2](#R2)).
- Preconditions use the API where an endpoint exists ([R3](#R3)).
- The step phrase is reused, not duplicated ([R4](#R4)).
- State passes through the scenario context only ([R5](#R5)).
- Data is unique per scenario and cleaned up ([R6](#R6)).
- Assertions are product outcomes, except where the contract is the subject ([R7](#R7), [R8](#R8)).
- The application is wired as it ships; only third-party providers are substituted ([R9](#R9)).
- The capability has a handful of scenarios, not a branch inventory ([R10](#R10)).

## Open questions

- Where step definitions live is unresolved: beside the module they exercise, or in one suite-level directory. The index entry allows both, and the first choice made will be copied everywhere — it deserves an ADR before the second feature file exists.
- Nothing decides how `@api` and `@browser` scenarios share the same feature file without running the setup twice ([FE_15](../index.html#FE_15)); the answer affects [R3](#R3) and [R6](#R6) directly.
- Whether this suite runs against the same containers as [BE_12](../index.html#BE_12) or its own is an [INFRA_09](../index.html#INFRA_09) decision with a real effect on pipeline time.

## Related

Requires [GEN_10](../index.html#GEN_10), [BE_12](../index.html#BE_12). See also [FE_15](../index.html#FE_15).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/test/steps/todo-list.steps.ts`, `features/todo-list.feature`

---

[← All conventions](../index.html)
