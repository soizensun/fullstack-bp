---
title: "BE_11 · Unit testing"
id: "BE_11"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [BE_05]
see_also: [BE_12, FE_13]
---

[Conventions](../index.html) / Backend / BE_11

# [BE] Unit testing

`P1` · `BE_11` · `draft` · `updated 2026-09-19`

**Open when:** you wrote domain or use-case code.

What deserves a unit test (domain and use cases first), the runner and its config, test naming, arrange/act/assert, test doubles vs real objects, and coverage expectations with their limits.

## The rules

If you read nothing else:

1. <a id="R1"></a>Unit-test the domain and the use cases. Everything else has to earn a test.
2. <a id="R2"></a>Name a test after the actor, the action and the observable outcome, in business language.
3. <a id="R3"></a>One behavior per test: arrange, act, assert, with no branching and no loop.
4. <a id="R4"></a>Test through the public surface. Never reach into private state to set up or to assert.
5. <a id="R5"></a>Substitute ports; use the real domain objects.
6. <a id="R6"></a>Assert the outcome. Verify a call only when making the call *is* the outcome.
7. <a id="R7"></a>Build test data with factories, not with literals copied between tests.
8. <a id="R8"></a>Keep every test deterministic: inject the clock and the identifiers, no sleeps, no shared state, no dependence on order.
9. <a id="R9"></a>Write no unit test for code with no logic — a pass-through, a projection query, a DTO.
10. <a id="R10"></a>Never skip, delete or weaken a test to make a build pass.

## Why

The architecture in [BE_02](../index.html#BE_02) exists partly so that these tests can be fast and boring. A domain object is constructed with `new` and a use case is constructed with substituted ports, so the whole business behavior of the system is testable in milliseconds with no container, no network and no fixtures. If a unit test here needs a database, something above it is wrong — the test is telling you about a leaked dependency, and it is worth listening to.

The naming rule is the one that decides whether the suite is worth anything in two years. Tests named after classes and methods describe the code as it was written, so they duplicate it: they pass when the code is refactored and fail when it is renamed, which is exactly backwards. Tests named after behavior describe what the business promised, so they survive refactoring and fail when the promise breaks. A suite of the second kind is also the most accurate specification anyone will read.

Coverage is a diagnostic, not a target. High coverage over a suite that asserts interactions proves the code was executed, not that it is right, and chasing the number produces exactly the tests [R9](#R9) forbids.

## Rule detail

### [R1](#R1) What gets tested

Domain objects first: they hold the rules, they have no dependencies, and their tests are the cheapest in the codebase. Use cases second: orchestration, workflow failures, the branches around ports ([BE_05](../index.html#BE_05)).

Below that, ask what could break. A repository is exercised where it meets a real store ([BE_12](../index.html#BE_12)), not with a substituted driver — a test of a mocked query proves the mock. A controller that validates and forwards has nothing to test that the acceptance suite does not cover better ([BE_13](../index.html#BE_13)).

Which runner and configuration the API app uses is a project fact — check `PROJECT.md` before adding a file, and propose the runner if none is present.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R2](#R2) Names describe behavior

The reader of a failing test is someone who did not write it, at a bad moment. The name should tell them what the system promised, without opening the file: who acted, what they did, what should be true afterwards. Use the glossary's words ([GEN_14](../index.html#GEN_14)) and the vocabulary of the feature, not of the implementation.

**Do**

```
describe('article publishing', () => {
  it('makes a draft visible to readers when its author publishes it', …);
  it('refuses to publish an article that has no sections', …);
  it('refuses to publish an article the actor does not own', …);
});
```

**Don't**

```
describe('PublishArticleUseCase', () => {
  it('should call articleRepo.save once', …);
  it('should throw if findByIdForUpdate returns null', …);
  it('happy path', …);
});
```

The second set names classes, methods and mocks. Every one of those names changes under a refactor that changes no behavior — and none of them says what the product does.

**Enforcement:** review.

### [R3](#R3) and [R4](#R4) One behavior, through the front door

Three sections, separated by blank lines: arrange the world, perform one action, assert one outcome. A test containing an `if` is two tests; a test looping over inputs is a table of cases, which the runner has a construct for.

Set up through factories and public methods, and assert through the public surface. Reaching into private fields to force a state couples the test to the implementation and, more often, sets up a state the real system cannot produce — so the test passes for a situation that cannot happen while missing the one that can.

**Enforcement:** review.

### [R5](#R5) and [R6](#R6) Substitute the edges, keep the middle real

A use-case test substitutes ports — repositories, cross-module ports, the outbox, the cache — and uses the real entities and value objects. Substituting the domain would test the mock's opinion of the rules; the rules are the thing under test.

Then assert what changed, not how. The outcome of publishing is that the article is published and the saved article reflects it — captured by inspecting what was handed to the substituted repository. `expect(save).toHaveBeenCalledTimes(1)` proves a method ran; it does not notice that the wrong article was saved.

The genuine exception is when the call *is* the effect: a message recorded to the outbox, an audit entry appended, an action port invoked on another module. There, the fact that it was called — and with what — is the observable outcome ([BE_05](../index.html#BE_05)).

**Do**

```
await useCase.execute({ articleId, actorId: authorId });

const saved = articles.save.mock.calls[0][0];
expect(saved.status()).toBe('PUBLISHED');
expect(outbox.record).toHaveBeenCalledWith(expect.objectContaining({ type: ARTICLE_PUBLISHED }));
```

**Don't**

```
expect(articles.findByIdForUpdate).toHaveBeenCalled();
expect(articles.save).toHaveBeenCalled();
expect(uow.run).toHaveBeenCalled();
// passes if the article was never actually published
```

**Enforcement:** review.

### [R7](#R7) Factories, not literals

Every test needs an article; none of them cares about most of its fields. A factory with sensible defaults and an overrides argument keeps each test's arrangement down to the one thing it is about, and keeps a new required field from breaking forty tests.

Name the factory for the state it produces — `publishedArticle()`, `draftArticleWithoutSections()` — so the arrangement reads as a precondition. Where these live and how they are shared with slower suites is [BE_12](../index.html#BE_12)'s.

**Enforcement:** review.

### [R8](#R8) Determinism

A flaky test is worse than no test: it trains everyone to re-run the build. The usual causes are all avoidable at this level. Time comes in as an argument or an injected clock, never `new Date()` inside the code under test ([BE_04](../index.html#BE_04)). Identifiers are supplied. There is no `sleep`, no shared mutable module state between tests, and no test that depends on another having run first — each arranges what it needs.

**Enforcement:** partly automated — the runner can randomize test order, which surfaces inter-test dependencies; the rest is review.

### [R9](#R9) Do not test the absence of logic

A test for a use case that forwards one argument, a query service that only shapes a query, a DTO that only declares fields, or a getter, asserts that the code is what the code is. It costs a file, slows the suite, and has to be updated by every refactor while catching nothing.

The judgment is "could this be wrong in a way the type-checker would not catch". If not, skip it. Behavior that only exists once the pieces are wired together is covered a level up ([BE_12](../index.html#BE_12), [BE_13](../index.html#BE_13)).

**Enforcement:** review — a coverage target would actively fight this rule, which is why none is set.

### [R10](#R10) A red test is information

Never skip, delete, loosen an assertion, or widen a matcher to make a build pass; that is a hard rule of the repository. If the test is wrong, fix the test in a change that says so and explains why the old expectation was mistaken. If the behavior changed on purpose, the test change is part of that change and belongs in its diff. And a bug gets a failing test before it gets a fix ([GEN_05](../index.html#GEN_05)).

**Enforcement:** review — a skipped or focused test is trivially greppable and is a candidate CI gate ([INFRA_06](../index.html#INFRA_06)).

## Worked example

The publish use case, four tests, no database.

The suite is named for the capability — `article publishing` — and each test for a promise ([R2](#R2)). The arrangement uses a factory to produce a real `Article` in a known state and substituted ports for everything around it ([R5](#R5), [R7](#R7)):

```
const article = draftArticle({ authorId, sections: [section()] });
articles.findByIdForUpdate.mockResolvedValue(article);
```

*Publishing makes the article visible.* Act, then assert on the article handed to `save`: its status is published and its published time is the injected clock's ([R6](#R6), [R8](#R8)). One more assertion earns its place — the outbox received the publication message — because that call *is* an outcome other modules depend on.

*An article without sections is refused.* Arrange a draft with no sections, expect the domain error class, and assert that nothing was saved. The error type is asserted, not its message ([BE_09](../index.html#BE_09)).

*Someone who is not the author is refused.* Same shape, different arrangement. Note that neither of these tests knows *where* the rule lives — both would still pass if the ownership check moved between the entity and a domain service, which is what makes them safe to keep.

*A missing article is reported as not found.* The repository substitute returns `null`; the test expects the application error ([BE_05](../index.html#BE_05)).

What is deliberately absent: no test that the unit of work was used, no test that the repository was queried, no test of the controller that calls this. The first two are mechanism ([R6](#R6)); the third has no logic to break ([R9](#R9)) and is covered where it is real ([BE_13](../index.html#BE_13)).

The entity gets its own suite, smaller and faster still: the transition table, the ownership rule, the title invariant — constructed with `new`, no substitutes at all.

## Checklist

- Domain and use-case changes ship with tests in the same change ([R1](#R1)).
- Every test name states actor, action and outcome in business words ([R2](#R2)).
- One behavior per test; no branching ([R3](#R3)); no private state touched ([R4](#R4)).
- Ports are substituted; domain objects are real ([R5](#R5)).
- Assertions are about outcomes, except where a call is the outcome ([R6](#R6)).
- Arrangements use factories ([R7](#R7)).
- Time and identifiers are injected; no sleeps, no shared state ([R8](#R8)).
- No test added for code with no logic ([R9](#R9)).
- No test skipped, deleted or weakened to go green ([R10](#R10)).

## Open questions

- No coverage threshold is set, deliberately ([R9](#R9)) — but nothing replaces it as a signal that a rule shipped untested. Mutation testing on the domain folder is the better instrument and has no owner.
- [R2](#R2) is the rule most often broken by generated test scaffolding, which names tests after classes by default. Whether the project should ship a template that starts from behavior naming is unresolved.
- The boundary between this document and [BE_12](../index.html#BE_12) is stated by dependency, not by folder; two suites in one directory with different runtime needs will eventually confuse the pipeline ([INFRA_09](../index.html#INFRA_09)).

## Related

Requires [BE_05](../index.html#BE_05). See also [BE_12](../index.html#BE_12), [FE_13](../index.html#FE_13).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/domain/entity/todo-list.entity.spec.ts`, `apps/api/test/support/`

---

[← All conventions](../index.html)
