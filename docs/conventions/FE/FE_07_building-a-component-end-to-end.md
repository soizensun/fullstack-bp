---
title: 'FE_07 · Building a component end to end'
id: 'FE_07'
area: 'FE'
tier: 'P1'
status: 'draft'
updated: '2026-09-22'
requires: [FE_06]
see_also: [FE_14, FE_21]
---

[Conventions](../index.html) / Frontend / FE_07

# [FE] Building a component end to end

`P1` · `FE_07` · `draft` · `updated 2026-09-22`

**Open when:** you have been handed a Figma frame and told to build it.

The one worked path from frame to merged component — token check, atomic level, component API, story, test, accessibility pass — with the real code at each step. Read this instead of re-deriving `FE_02`–`FE_06` every time.

## The rules

If you read nothing else:

1. <a id="R1"></a>Search for the component before you design one. The frame is a request, not proof that nothing exists.
2. <a id="R2"></a>Reconcile every value in the frame against the tokens before writing a line, and raise the ones that do not resolve.
3. <a id="R3"></a>Decide the atomic level from what the component is allowed to know, and put it where that level lives.
4. <a id="R4"></a>Design the props from the states in the frame, not from the one screen you were given.
5. <a id="R5"></a>Build the states the frame does not draw: empty, loading, error, too-long, too-many.
6. <a id="R6"></a>Reach the keyboard and the accessible name before you reach the styling.
7. <a id="R7"></a>Write the story as you build, one per state you claimed to support.
8. <a id="R8"></a>Test the behavior you promised, through the interface a user has.
9. <a id="R9"></a>Run the accessibility pass on the built component, not on the frame.
10. <a id="R10"></a>Say in the pull request what you reused, which tokens were missing, and which states you did not build.

## Why

This document exists because the alternative is re-deriving the same sequence every time, and skipping a different step each time. `FE_02` through `FE_06` each own one decision; a person holding a Figma frame needs them in an order, with the expensive steps early. That is the whole contribution here — no new rules, one path.

The order is not arbitrary. Reuse comes first because it is the only step that can cancel the others ([GEN_16](../index.html#GEN_16)). Tokens come second because an unresolvable value is a conversation with design, and finding it after the component is built means rewriting it ([FE_03](../index.html#FE_03)). The atomic level comes third because it decides where the file goes and what it may import ([FE_02](../index.html#FE_02)); discovering at review that your atom reads the session means starting over. Accessibility comes before styling because a name and a focus order are structural, and retrofitting them means rebuilding the markup ([FE_06](../index.html#FE_06)).

## Rule detail

### [R1](#R1) and [R2](#R2) Before the first line

Two checks, both cheap, both expensive to skip.

Search for what exists — the catalog first, then the shared surfaces, then sibling routes ([GEN_16](../index.html#GEN_16)). A frame drawn by a designer who was not looking at your component library is a request for an outcome, not evidence that nothing satisfies it. Half the time the answer is an existing component plus a variant.

Then reconcile the frame's values against the tokens. Every color, spacing step, radius, shadow, duration and type style either resolves to a semantic token or it does not. The ones that do not are the interesting output of this step: a value that is off by two pixels is usually a drawing artifact, and a genuinely new value is a token that has to be agreed and added at its source before you consume it ([FE_03](../index.html#FE_03)). What you must not do is hardcode it "for now" — that is the one decision this whole layer exists to prevent.

**Enforcement:** review — a hardcoded design value is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)); an unresolved token is not detectable at all.

### [R3](#R3) The level, then the location

Ask what the component is allowed to know, not how big it is ([FE_02](../index.html#FE_02)). Does it render at a URL, arrange sections, name a domain concept or read data, compose other components, or none of those? That answer fixes the directory ([FE_01](../index.html#FE_01)) and, with it, what the component may import.

Do this before writing, because the level constrains the props. An atom cannot take an `order` prop; if the frame implies it needs one, you are building an organism, and knowing that now is worth an hour later.

**Enforcement:** review.

### [R4](#R4) and [R5](#R5) Props from states, not from the screen

A frame shows one state of one instance. The component's props are the states it must express, which is a wider set than what was drawn: the item with a very long name, the list with one item and with forty, the value that is missing, the action that is in flight, the thing the user is not allowed to do.

Design the props from that list, following [FE_05](../index.html#FE_05) — required data first, callbacks last, one `variant` union rather than three booleans that are never independently true. Then build the states the frame skipped. Empty, loading and error are the three that get discovered in production, and the fix at that point is a different component.

**Do**

```
type OrderRowProps = {
  order: OrderSummary;
  variant?: 'default' | 'compact';
  onSelect?: (id: string) => void;
};
```

**Don't**

```
type OrderRowProps = {
  order: OrderSummary;
  isCompact?: boolean;
  isInline?: boolean;      // never true with isCompact
  hideActions?: boolean;   // named for its false state
};
```

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R6](#R6) Keyboard and name before styling

Build the semantic markup first: the element that already means what you mean, reachable in reading order, with an accessible name ([FE_06](../index.html#FE_06)). Style it after. Working the other way produces a styled `div` that has to be rebuilt as a `button`, and the rebuild usually loses something.

The practical test at this step is to use the thing with the mouse unplugged before it looks finished.

**Enforcement:** review — accessibility linting catches some of it; focus order and name quality are review ([FE_06](../index.html#FE_06)).

### [R7](#R7) and [R8](#R8) Story and test, as you go

Write the story for each state as you build that state, not afterward. A story written at the end documents the states you remembered; a story written as you go is how you notice the empty case has no design. Which levels require stories and what each must show is [FE_21](../index.html#FE_21)'s.

The test asserts the promise, not the implementation: what a user can see, name and do. Query the way a user finds things, assert the accessible name and the announced state, and mock the network rather than the components under it ([FE_14](../index.html#FE_14) owns the how).

**Enforcement:** review — a missing story or spec is detectable per atomic level and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R10](#R10) The three sentences at the end

The pull request says what you reused or why nothing fit ([GEN_16](../index.html#GEN_16)), which frame values did not resolve to a token and what happened to them ([FE_03](../index.html#FE_03)), and which states you deliberately did not build. The third is the one that matters most: an unbuilt empty state that nobody wrote down is indistinguishable from one nobody thought of.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

## Worked example

A frame for an order row: avatar, customer name, status pill, amount, a menu button.

**Search.** The catalog has a status pill and an avatar; the row does not exist. Outcome: `reused StatusPill and Avatar; new OrderRow because nothing composes a two-column row with a trailing menu` ([R1](#R1)).

**Tokens.** Everything resolves except the pill's amber, which is two steps off the warning token, and a 14px gap that is not on the spacing scale. The amber is a drawing artifact and uses the token; the gap is a real question, so it is raised with design before the build rather than rounded silently ([R2](#R2)).

**Level.** It names `order` and takes an `OrderSummary`, so it is an organism, and it lives under the organism directory ([R3](#R3), [FE_02](../index.html#FE_02)).

**API.** From the states, not the frame: a `compact` variant for the dense list, `onSelect`, and no boolean pair ([R4](#R4)). The amount is already formatted by the caller — formatting is a shared concern, not this component's.

**States.** The frame draws one. The build adds a very long customer name that truncates with the shared clamp, a missing avatar that falls back to initials, and a pending state for the menu action ([R5](#R5)). An empty state is not this component's job — a row is never empty; the list that holds it has that case.

**Accessibility.** The row is a list item; the menu is a real button with an accessible name that includes the customer, so a screen-reader user hearing five of them can tell them apart. Focus order runs name → status → menu, matching the reading order ([R6](#R6), [FE_06](../index.html#FE_06)).

**Story and test.** One story per state claimed — default, compact, long name, no avatar, pending ([R7](#R7)). The test asserts that the menu button is reachable by its name, that selecting the row calls back with the order id, and that the status is announced ([R8](#R8)).

**The pull request** names the two reused primitives, the 14px gap still open with design, and that the pending state is wired but not yet used by any caller ([R10](#R10)).

## Checklist

- The catalog and shared surfaces were searched; the outcome is in the pull request ([R1](#R1), [R10](#R10)).
- Every frame value resolves to a token, or is raised at its source ([R2](#R2)).
- The atomic level was decided from what the component knows, and the file is where that level lives ([R3](#R3)).
- Props express the states, with no boolean pair and no prop named for its false state ([R4](#R4)).
- Empty, loading, error and the overflow cases are built or explicitly deferred ([R5](#R5)).
- The component is usable from the keyboard and has an accessible name ([R6](#R6)).
- One story per claimed state ([R7](#R7)); the test asserts behavior through the user's interface ([R8](#R8)).
- The accessibility pass ran against the built component ([R9](#R9)).

## Open questions

- [R9](#R9) names a pass without naming its tools, because which of them exist is a project fact. Until [FE_21](../index.html#FE_21) and [INFRA_06](../index.html#INFRA_06) settle the toolchain, "the accessibility pass" means a person following [FE_06](../index.html#FE_06)'s checklist.
- Nothing here covers a frame that arrives without states — no empty, no error, no loading. That is the most common real defect in a handoff, and the convention set has no agreed way to send one back.
- The path assumes the component is new. A change to an existing shared component has a different sequence, dominated by its consumers ([FE_13](../index.html#FE_13)), and no document walks it.

## Related

Requires [FE_06](../index.html#FE_06). See also [FE_14](../index.html#FE_14), [FE_21](../index.html#FE_21).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/components/atoms/badge.tsx` with `apps/web/components/atoms/badge.test.tsx`

---

[← All conventions](../index.html)
