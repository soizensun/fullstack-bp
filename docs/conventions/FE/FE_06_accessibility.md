---
title: 'FE_06 · Accessibility standard'
id: 'FE_06'
area: 'FE'
tier: 'P1'
status: 'stable'
updated: '2026-09-22'
requires: [FE_05]
see_also: [FE_16]
---

[Conventions](../index.html) / Frontend / FE_06

# [FE] Accessibility standard

`P1` · `FE_06` · `stable` · `updated 2026-09-22`

**Open when:** you render anything interactive — a control, a dialog, a form field.

WCAG 2.2 AA as the baseline, semantic HTML first, keyboard and focus management, the ARIA rules, contrast guaranteed by tokens, and how accessibility is tested and enforced.

## The rules

If you read nothing else:

1. <a id="R1"></a>Meet WCAG 2.2 AA. It is the floor for merging, not a target to work toward.
2. <a id="R2"></a>Use the element that already means what you mean. Reach for ARIA only for what HTML cannot express.
3. <a id="R3"></a>Never attach behavior to an element that is not interactive.
4. <a id="R4"></a>Everything usable with a mouse is usable from the keyboard, in the order the page reads.
5. <a id="R5"></a>Never remove a focus indicator without replacing it with a more visible one.
6. <a id="R6"></a>Move focus deliberately whenever the interface changes under the user, and give it back afterward.
7. <a id="R7"></a>Give every control an accessible name, and every image an intentional alternative.
8. <a id="R8"></a>Keep every ARIA state true for as long as it is rendered.
9. <a id="R9"></a>Take contrast from the tokens, and fix a failing pair where it is defined. Never hand-pick a color to pass a check.
10. <a id="R10"></a>Assert the name, the announced state and the focus behavior in component tests.

## Why

Accessibility work is cheap done as part of building a component and expensive in every other order. Most of the rules below are about one decision — which element to render — because that decision fixes the keyboard behavior, the role, the name, the states and the focus handling at once. Get it right and most of this document is free. Get it wrong and each has to be rebuilt by hand.

The second reason is that the failure is silent for the people writing the code. A mouse user cannot tell a control is unreachable, and neither can a reviewer reading a diff. That is why so much of this is absolute: rules that depend on someone noticing do not survive a deadline, because the person who would notice is not in the room.

## Rule detail

### [R1](#R1) AA is the floor

WCAG 2.2 at level AA is the standard this document points at, and it binds the change in front of you rather than some future audit. An external standard settles disagreements by reading rather than by who feels more strongly. The rules below are the parts people get wrong most often — not a summary of AA, and meeting all ten is not a claim of conformance.

**Enforcement:** unenforced — nothing in this repository checks conformance; see **Open questions**.

### [R2](#R2) The element is the decision

A `<button>` is focusable, activates on Enter and Space, announces itself, and can be disabled — none of which you wrote. Rebuilding that on a `<div>` takes four attributes and two handlers, and the version people write is missing three. So: find the element that means it; if none does, compose from elements that do; only then add ARIA. ARIA adds no behavior — it changes what assistive technology announces, so a role on a component that does not behave that way is a lie told confidently.

**Do**

```
<button type="button" onClick={onSort}>Sort</button>
```

**Don't**

```
<div role="button" tabIndex={0} onClick={onSort}>Sort</div>
{/* no Enter, no Space, no disabled, no form participation */}
```

**Enforcement:** unenforced — nothing detects it. An accessibility lint plugin would catch the common substitutions, and is present only where `PROJECT.md`'s stack table records one.

### [R3](#R3) Behavior belongs on interactive elements

A click handler on a `<div>` produces a control only a mouse can reach. It is the most common accessibility defect, invisible in every screenshot, usually introduced for a layout reason — a wrapper that needed to be clickable. Move the handler onto the element that should have had it rather than bolting `tabIndex` and a key handler onto the wrapper ([R2](#R2)). If the whole card should be clickable, the card contains a link or button that covers it; the card stays inert.

**Enforcement:** unenforced — this is the most mechanically detectable rule here and nothing detects it; see **Open questions**.

### [R4](#R4) Keyboard parity, in reading order

Every action reachable with a pointer is reachable with Tab, Enter, Space and the arrow keys a widget expects. Two things break this. A positive `tabIndex` moves an element out of document order and desynchronizes the two the moment anyone edits the markup — use `0` or `-1`. And CSS reordering changes what the eye sees but not what Tab follows, so a visual order disagreeing with DOM order is a keyboard bug that renders correctly.

**Enforcement:** review — tab order has to be walked; a lint rule can only catch a positive `tabIndex`.

### [R5](#R5) Focus stays visible

Removing the focus ring makes a keyboard user's position invisible, and it is done routinely because the default ring is ugly. Replacing it is fine and often better: a token-backed outline with adequate contrast against both the component and its background ([R9](#R9)). What is never fine is removing it and adding nothing, hover styles included. Suppressing the ring for pointer interaction only is the one narrowing allowed, because it keeps the keyboard case intact.

**Enforcement:** unenforced — an outline reset is greppable in CSS and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) Focus is moved, never abandoned

When something opens, focus goes into it; while open, it stays inside; when it closes, it returns to what opened it. On a route change it goes somewhere meaningful. The common failure is not doing the wrong thing — it is doing nothing, which leaves focus on an element that no longer exists and drops the user at the start of the page. Where a trigger unmounts before its dialog closes, name the fallback; [FE_16](../index.html#FE_16) owns the form-error case.

**Enforcement:** review — a component test can assert it ([R10](#R10)), but nothing requires the test.

### [R7](#R7) Names and alternatives

Every control announces something useful: visible text where there is text, an explicit label where it is an icon. "Button" is what a nameless control announces, and a user hearing five has no way to choose. Images divide in two — one carrying information needs an alternative conveying it, a decorative one needs an empty alternative so it is skipped rather than read as a filename. The matching obligation on component authors is [FE_05#R7](../index.html#FE_05): a component that swallows `aria-*` makes this rule impossible to obey from outside.

**Enforcement:** unenforced — a missing `alt` is mechanically detectable, and whether the text is useful is review.

### [R8](#R8) ARIA states must stay true

`aria-expanded`, `aria-selected`, `aria-checked`, `aria-invalid` — each is an assertion about right now, and each is wrong the moment the state changes and the attribute does not. That is worse than omitting it: a missing state leaves the user to explore, a stale one tells them something false. So a state attribute is derived from the same value that drives the render, never set in a separate branch and never left hardcoded.

**Do**

```
<button aria-expanded={isOpen} aria-controls={panelId}>
```

**Don't**

```
<button aria-expanded="false">   {/* true after the first click */}
```

**Enforcement:** review — a hardcoded state string is greppable; a state that drifts from a second source is not.

### [R9](#R9) Contrast comes from the tokens

AA sets the ratios: 4.5:1 for body text, 3:1 for large text and for the boundary of a control or focus indicator against what sits behind it. Those apply to a pair of values, not a component, so they are satisfied in the token layer for every mode at once ([FE_03#R7](../index.html#FE_03) owns that half). A component that hand-picks a color to pass a check has broken the guarantee for every mode it did not check. If a pair fails, the pair is wrong and is fixed where defined.

**Enforcement:** unenforced — contrast between two named tokens is exactly computable and nothing computes it; see **Open questions**.

### [R10](#R10) Test the way a user arrives

A component test reached through the accessibility tree fails when the button became a div, when the label went missing, when the state stopped being announced — turning the suite into the enforcement this document otherwise lacks. [FE_14](../index.html#FE_14) owns the query policy and the runner; what this rule adds is the assertions, which are this document's subject: that the name is right, that the state is announced, that focus went where [R6](#R6) says. Browser scenarios have their own selector policy ([FE_15](../index.html#FE_15)) and this rule does not reach them.

**Enforcement:** review — nothing requires the assertions, and nothing would know a component test from a browser scenario without being told.

## Worked example

A button opens a dialog confirming a deletion.

The element decides most of it ([R2](#R2)): a native dialog opened with `showModal()` traps focus, closes on Escape and exposes the right role. Opened with `show()` it does none of that. What remains is naming and focus.

```
function open() {
  dialogRef.current?.showModal();
  cancelRef.current?.focus();   // the initial target, chosen deliberately
}

<button type="button" onClick={open}>Delete order</button>

<dialog ref={dialogRef} aria-labelledby={titleId} onClose={returnFocus}>
  <h2 id={titleId}>Delete order?</h2>
  <p>This cannot be undone.</p>
  <button type="button" ref={cancelRef} onClick={close}>Cancel</button>
  <button type="button" onClick={confirm}>Confirm delete</button>
</dialog>
```

The dialog is named by its own heading, not a duplicated string ([R7](#R7)). Focus is placed on a named target when it opens and returned to the trigger on close ([R6](#R6)) — named rather than left to the element, because the framework's `autoFocus` fires at mount, while the dialog is still closed. The return names a fallback, since the trigger can unmount meanwhile. Both actions are real buttons, reachable in reading order ([R4](#R4), [R3](#R3)), each named distinctly so a list of them can be told apart ([R7](#R7)).

The destructive action takes `color-text-danger` on `color-surface` rather than a red eyeballed here; if that pair is under 4.5:1, the pair is fixed where it is defined, not the component ([R9](#R9)). Its focus ring is a token outline, not the removed default ([R5](#R5)).

The test asserts the name and where focus landed — so if someone later turns either button into a styled `<div>`, or the dialog stops placing focus, the suite fails rather than the user ([R10](#R10)).

```
await user.click(screen.getByRole('button', { name: 'Delete order' }));
const dialog = screen.getByRole('dialog', { name: 'Delete order?' });
expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
```

## Checklist

- The change meets WCAG 2.2 AA, not just the ten rules here ([R1](#R1)).
- Every interactive thing is a native element or composed from them, with ARIA only for what HTML cannot express ([R2](#R2)).
- No handler on a non-interactive element ([R3](#R3)).
- Every action is reachable by keyboard, and DOM order matches visual order ([R4](#R4)).
- No focus indicator removed without a more visible replacement ([R5](#R5)).
- Focus moves on open, stays inside, returns on close with a named fallback — and goes somewhere meaningful on a route change ([R6](#R6)).
- Every control has a name; every image has an intentional alternative ([R7](#R7)).
- Every ARIA state is derived from the value that drives the render ([R8](#R8)).
- No color hand-picked for contrast, and any pair below its ratio was fixed where it is defined rather than worked around ([R9](#R9)).
- Component tests assert the name, the announced state and where focus landed ([R10](#R10)).

## Open questions

- Every rule here is `review` or `unenforced`, and accessibility is where that matters most, because the person who would notice the defect is not on the team. Four would cover much of it and none exists: an accessibility lint plugin ([R2](#R2), [R3](#R3), [R7](#R7)), a contrast computation over the token pairs ([R9](#R9)), a grep for outline resets ([R5](#R5)), and required assertions in component tests ([R10](#R10)) — [INFRA_06](../index.html#INFRA_06)'s, in that order. None establishes conformance itself ([R1](#R1)), which no tool can.
- ~~[R10](#R10) presumes a component test runner for the web app, and none was recorded.~~ Closed by [ADR 0007](../../adr/0007-vitest-is-the-web-test-runner.md). What remains is narrower: [R10](#R10)'s assertions cannot reach a component that reads data, because the test runner cannot render an async server component. Those are the components most likely to lose a name.
- Automated checks reach perhaps a third of AA, and this document does not say what covers the rest. A manual keyboard and screen-reader pass is the usual answer; which flows, and how often, is a product decision.

## Related

Requires [FE_05](../index.html#FE_05). See also [FE_16](../index.html#FE_16).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/app/todo-lists/[listId]/_components/`, `apps/web/app/globals.css`

---

[← All conventions](../index.html)
