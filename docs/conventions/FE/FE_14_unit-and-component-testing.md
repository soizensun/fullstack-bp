---
title: 'FE_14 · Unit & component testing'
id: 'FE_14'
area: 'FE'
tier: 'P1'
status: 'draft'
updated: '2026-09-22'
requires: [FE_05]
see_also: [FE_15, FE_21]
---

[Conventions](../index.html) / Frontend / FE_14

# [FE] Unit & component testing

`P1` · `FE_14` · `draft` · `updated 2026-09-22`

**Open when:** you wrote a component or a hook.

Testing behaviour, not implementation; queries by role; what to mock (the network, not components); hook testing; and the coverage expectation per atomic level.

## The rules

If you read nothing else:

1. <a id="R1"></a>Test what a user can perceive and do. Never a prop, a state value, or an internal call.
2. <a id="R2"></a>Find elements the way a user does: by role and accessible name.
3. <a id="R3"></a>Render the real component tree. Never substitute a child component.
4. <a id="R4"></a>Mock the network, and nothing below it.
5. <a id="R5"></a>Drive the component through real user events, not by calling its handlers.
6. <a id="R6"></a>Assert the accessible name and the announced state, not only the text.
7. <a id="R7"></a>Test a hook through a component that uses it.
8. <a id="R8"></a>Cover by atomic level: every state at the bottom, every behaviour in the middle, nothing at the top.
9. <a id="R9"></a>Keep tests deterministic: fixed data, controlled time, no real network.
10. <a id="R10"></a>Never skip, delete or weaken a test to make a build pass.

## Why

The failure mode this document exists to prevent is a suite that passes while the product is broken. It comes from tests that assert implementation: a component's state after a click, a prop passed to a mocked child, a class name. Those pass through any refactor that preserves the mechanism and fail on every refactor that does not — the opposite of what you want, and they never notice that the button became unclickable.

Testing through what a user perceives inverts that. A test that finds the button by its accessible name and asserts what appears afterwards keeps passing while the internals are rewritten, and fails when the product changes — including when a control quietly loses its accessible name, which is a real defect that no other test in the pipeline catches ([FE_06](../index.html#FE_06)).

The mocking boundary follows from the same idea. The network is genuinely outside the thing under test, so it is the honest seam. A mocked child component is _inside_ it: substituting one asserts that the parent talks to a fake correctly, which is true no matter how broken the real child is.

Which runner and library the project uses is a fact in `PROJECT.md` — check there before adding a file, and propose one where none is configured rather than assuming.

## Rule detail

### [R1](#R1) and [R2](#R2) Behaviour, found the way a user finds it

Write the test as a sentence about the product — what the user does, what they then see — and let that decide the assertions. Never reach for a prop, a state value, an internal function call, a class name, or a test id where a user-visible identifier exists.

The query order follows the same logic: role and accessible name first, then label text, then visible text. A test id is the last resort, for something a user genuinely cannot name ([FE_15#R5](../index.html#FE_15)), not the first thing reached for because it is stable — its stability is exactly the problem, since it survives the control becoming unreachable.

**Do**

```
await user.click(screen.getByRole('button', { name: 'Place order' }));
expect(await screen.findByRole('status')).toHaveTextContent('Order placed');
```

**Don't**

```
fireEvent.click(container.querySelector('.btn-primary')!);
expect(wrapper.state('submitted')).toBe(true);
```

**Enforcement:** review — container and class-name queries are greppable and are a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) and [R4](#R4) The mocking boundary

Render the real tree. A mocked child turns the test into an assertion about a fake, and it hides the integration that is usually where the defect is — a prop renamed on one side only, a callback never wired.

Mock at the network instead, with request handlers that return realistic payloads for the endpoints under exercise ([FE_10](../index.html#FE_10)). That keeps the client, the mapping to view models and the rendering all real, which is nearly all of what can break.

Two other things stay real unless the test is about them: routing, and any provider the tree needs. Wrapping in the app's real providers once, in a shared render helper, is cheaper than mocking them and far more faithful.

**Enforcement:** review — a module mock of a component path is greppable ([INFRA_06](../index.html#INFRA_06)).

### [R5](#R5) and [R6](#R6) Real events, and the assertions people forget

Drive the component the way a browser does — typing that fires each key, clicks that focus first, tabbing that respects order. Calling a handler directly skips exactly what breaks: the disabled attribute, the element that intercepts the click, the field that never received focus.

Then assert more than text. A control's accessible name, an expanded or checked or busy state, an error associated with its field, focus after a dialog closes — these are the product's actual promises to a large group of users ([FE_06#R10](../index.html#FE_06)), and this suite is the only place they are checked automatically.

**Enforcement:** review.

### [R7](#R7) Hooks are tested through a component

A hook has no behaviour outside a component: its rules, its re-renders and its effects only exist in that context. Render a small component that uses it and assert what that component shows — not the hook's return value in isolation.

If the hook holds logic worth testing without a component, that logic is a pure function and belongs in one ([GEN_16](../index.html#GEN_16)). Extracting it is usually the better answer than a harness.

**Enforcement:** review.

### [R8](#R8) Coverage by level, not by percentage

The expectation differs by what a component is allowed to know ([FE_02](../index.html#FE_02)):

| Level          | Expectation                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Atom           | Every state it claims — variants, disabled, error, loading. They are cheap and they are the shared surface.     |
| Molecule       | The behaviour it composes: what the arrangement does that the parts do not.                                     |
| Organism       | The behaviours that matter — the states around data, the refusals, the empty and error cases. Not every branch. |
| Template, page | Nothing here. Whole flows are the browser suite's ([FE_15](../index.html#FE_15)).                               |

No global percentage target is set, deliberately. A number is satisfiable by tests that assert nothing, and chasing it produces exactly the implementation-shaped tests this document bans. Stories cover the visual states ([FE_21](../index.html#FE_21)); this suite covers what happens when someone interacts.

**Enforcement:** review — a missing spec for a shared component is detectable per level and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R9](#R9) and [R10](#R10) Determinism, and the red test

Fixed data from shared builders, controlled time, no real network, no dependence on test order ([BE_12#R9](../index.html#BE_12) is the same rule server-side). A flaky component test is almost always an unawaited async update, and the fix is to await the assertion rather than to add a delay.

And the hard rule: never skip, delete or weaken a test to go green. If the behaviour changed on purpose, the test changes in that same change, with the reason. If it did not, the test found something ([GEN_05](../index.html#GEN_05)).

**Enforcement:** review — a skipped or focused test is greppable and is a candidate CI gate ([INFRA_06](../index.html#INFRA_06)).

## Worked example

An order row with a cancel action.

The suite is named for the capability, and each test for a promise ([BE_11#R2](../index.html#BE_11) states the same naming rule server-side). Rendering uses the shared helper that wraps the real providers ([R3](#R3)), and network handlers return an order fixture built by the shared builder ([R4](#R4), [R9](#R9)).

_It shows the order's total and status._ Found by role and text, asserting the formatted total — which proves the mapper ran ([FE_10#R6](../index.html#FE_10)), not just that a string appeared.

_Cancelling asks for confirmation, then reports success._ A real click on the button found by its accessible name ([R2](#R2), [R5](#R5)); the dialog is asserted by its role and its own accessible name; confirming triggers the request the handler serves, and the success message is asserted as a live region rather than as text on the page ([R6](#R6)).

_A shipped order cannot be cancelled._ The handler returns the error code from the catalogue, and the test asserts what the user sees — the reason, and that the row is still there ([FE_10#R7](../index.html#FE_10)). It does not assert the code, which is the client's concern, not the user's.

_Focus returns to the cancel button when the dialog closes._ One line, and the only automated check that this works at all ([R6](#R6), [FE_06](../index.html#FE_06)).

What is deliberately absent: no test that the child row component received the right props ([R3](#R3)), no snapshot standing in for an assertion, and no test of the checkout flow that follows — that is one browser scenario, not twenty component tests ([R8](#R8), [FE_15](../index.html#FE_15)).

## Checklist

- Every assertion is about what a user perceives ([R1](#R1)).
- Elements are found by role and accessible name; test ids are a documented last resort ([R2](#R2)).
- The real tree renders; no child component is mocked ([R3](#R3)); mocking happens at the network ([R4](#R4)).
- Interactions use real user events ([R5](#R5)).
- Accessible names, states and focus are asserted, not only text ([R6](#R6)).
- Hooks are exercised through a component ([R7](#R7)).
- Coverage matches the component's atomic level ([R8](#R8)).
- Data and time are fixed; nothing depends on order ([R9](#R9)).
- No test was skipped, deleted or weakened ([R10](#R10)).

## Open questions

- [R8](#R8) sets expectations per level with nothing to enforce them, and the level is derivable from the path ([FE_01#R6](../index.html#FE_01)) — so "a shared component with no spec" is checkable and is not checked.
- The shared render helper and the request handlers are assumed to exist without a home. Where they live, and whether the handlers are shared with the browser suite ([FE_15](../index.html#FE_15)), should be decided before the second feature copies them.
- ~~No runner is named, because it is an open decision in `PROJECT.md`.~~ Closed by [ADR 0007](../../adr/0007-vitest-is-the-web-test-runner.md). The document still names no runner, which is right; the project file does.
- [R3](#R3) bans substituting a child component and [R4](#R4) puts the seam at the network, but a server action is neither and both: it is an HTTP endpoint the browser posts to ([FE_09#R5](../index.html#FE_09)), so replacing it is mocking the network — and it is also a module the component imports, so replacing it looks exactly like the thing [R3](#R3) forbids. The distinction matters because the action's module cannot be loaded in a test process at all. The reference implementation replaces the module and says why; the rule should say it rather than leaving each author to argue it.
- [R8](#R8) puts nothing at the template and page level, and the runner cannot render an async server component, so a data-reading organism is covered by neither this suite nor — until [FE_15](../index.html#FE_15) has an implementation — any other.

## Related

Requires [FE_05](../index.html#FE_05). See also [FE_15](../index.html#FE_15), [FE_21](../index.html#FE_21).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/lib/test/`, `apps/web/components/atoms/badge.test.tsx`, `apps/web/app/todo-lists/[listId]/_components/todo-item-list/todo-item-row.test.tsx`

---

[← All conventions](../index.html)
