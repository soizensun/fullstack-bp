---
title: 'FE_03 · Design tokens, theming & the Figma pipeline'
id: 'FE_03'
area: 'FE'
tier: 'P1'
status: 'stable'
updated: '2026-09-22'
requires: [FE_02]
see_also: [FE_04, FE_06]
---

[Conventions](../index.html) / Frontend / FE_03

# [FE] Design tokens, theming & the Figma pipeline

`P1` · `FE_03` · `stable` · `updated 2026-09-22`

**Open when:** you need a color, a spacing, a font, an icon — or a designer changed one.

Token taxonomy (primitive → semantic → component), the Figma → code sync pipeline and the naming contract with designers, the semantic layer as the only theming seam (dark mode is a token mode, not an architecture), the icon set generated from Figma, and the absolute ban on hardcoded design values.

> **No design value hardcoded in the frontend — tokens only.** This is one of the repository's hard rules, and it has no exceptions. [R1](#R1) is that rule; everything else here exists to make obeying it possible.

## The rules

If you read nothing else:

1. <a id="R1"></a>Never write a color, spacing, radius, shadow, duration or font value into a component.
2. <a id="R2"></a>Consume semantic tokens. A component never references a primitive.
3. <a id="R3"></a>Name a semantic token for the role it plays, never for how it looks.
4. <a id="R4"></a>Add a component token only where a component genuinely departs from the semantic layer.
5. <a id="R5"></a>Where a design source is recorded, generate the token files from it. Never hand-edit a generated file.
6. <a id="R6"></a>Change a value in the source of record first. A change made anywhere else is a proposal, not a fix.
7. <a id="R7"></a>Express a theme as another mode of the semantic layer, never as a branch in a component.
8. <a id="R8"></a>Ship icons as a generated set from the same source. Never paste icon markup into a component.
9. <a id="R9"></a>Agree a token's name with design before it exists in either place.
10. <a id="R10"></a>Treat renaming or removing a token as breaking, and migrate every consumer in the same change.

## Why

A hardcoded color is not a small mistake that stays small. It is a value the design system can no longer see, so the next rebrand, contrast fix or dark mode misses it — silently, because nothing fails. It surfaces months later as a screen subtly the wrong blue, fixed by a manual search of the whole tree. Tokens make that search unnecessary, and only if the ban is absolute: one exception restores the problem.

The layering matters for the same reason. Components referencing raw values cannot be rethemed; those referencing primitives can be rethemed only by changing what _blue_ means globally. A semantic layer gives one place where intent maps to appearance, and once it exists a theme is a second set of values for it — not a fork of the component tree.

## Rule detail

### [R1](#R1) The ban

No literal design value in a component: not `#1e40af`, not `12px`, not `0 1px 2px rgba(0,0,0,.05)`, not `200ms`. There is no "just this once", and the reason is mechanical rather than aesthetic: the value's absence from the token layer is invisible, so the cost lands on whoever does the next global change. Where a project has no token layer yet, the first component needing a value establishes the token — adding the layer is the prerequisite for obeying this rule, not an excuse to skip it. Whether the pipeline exists is a fact `PROJECT.md` records.

**Do**

```
.card {
  background: var(--color-surface-raised);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

**Don't**

```
.card {
  background: #ffffff;      /* invisible to every future theme */
  padding: 16px;
  border-radius: 8px;
}
```

**Enforcement:** unenforced — a lint rule rejecting literal colors, lengths and durations outside the token layer is the single highest-value guardrail this document wants ([INFRA_06](../index.html#INFRA_06)); see **Open questions**.

### [R2](#R2) Three layers, and components see one

Primitives name values — `blue-600`, `space-4`. Semantic tokens name intent in terms of primitives — `color-action`, `color-surface-raised`. Components reference the semantic layer and nothing below it. A component reaching for `blue-600` has asserted this button is blue in every theme — the assertion the layering exists to prevent — and it looks harmless because the value came from the palette. The palette is not the contract; the semantic layer is. All three layers live in one package, so "outside the semantic layer" is a path as well as a name ([INFRA_01](../index.html#INFRA_01) owns where that package sits).

**Enforcement:** unenforced — "no primitive token referenced outside the semantic layer" is a name-prefix check and the second guardrail worth building ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Name the role

`color-danger`, not `color-red`. A token named for its appearance is a primitive with extra steps: the day danger becomes orange, every consumer is renamed or lying. Role names also make review possible — `color-danger` on a save button is visibly wrong where `color-red-600` is not. The role vocabulary is shared with design ([R9](#R9)).

**Enforcement:** review — a deny-list of appearance words in semantic token names is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R4](#R4) Component tokens are the exception

A component token — `button-primary-background` — is for a component that departs from the semantic layer by design, not by accident. It is the escape hatch, load-bearing because it is rare: a set where every component has its own tokens has re-created hardcoded values with longer names and a build step. Before adding one, check whether the need is really a missing semantic token — usually it is.

**Enforcement:** review — the count of component tokens is measurable, and a growing one is the signal; nothing measures it today.

### [R5](#R5) Generated, not written

Token files are build output. They are committed — a checkout builds without reaching the design tool, and a diff shows what a designer changed — and never edited by hand. A hand edit is silently reverted by the next sync: it works, then stops, and the commit that broke it looks routine. [GEN_08#R4](../index.html#GEN_08) makes the same call for the API contract.

**Enforcement:** review — a generated-file header plus a CI check that regeneration produces no diff would close it ([INFRA_09](../index.html#INFRA_09)).

### [R6](#R6) The design source wins

Where `PROJECT.md` records a design source, a wrong value is wrong there, and that is where it is fixed. Changing it in code creates a divergence neither side can see: the designer's file says one thing, the product another, and the next regeneration picks a winner arbitrarily. A token the code needs and design has not defined is a request ([R9](#R9)), not a local addition. Where no design source is recorded, code is the source of record until one lands, and the change introducing the pipeline migrates those tokens rather than re-deciding them.

**Enforcement:** review — the regeneration check in [R5](#R5) catches a code-side edit; it cannot tell an intended change from an unintended one.

### [R7](#R7) A theme is a mode, not an architecture

Dark mode is a second set of values for the semantic layer. Nothing else changes: no component knows a theme exists, branches on one, or imports anything theme-specific. This rule breaks in small, reasonable-looking ways — a conditional class here, a hand-picked dark variant there — each a place the next theme must be added by hand. A component that seems to need the theme needs a semantic token that does not exist yet ([R4](#R4)). The same holds for density or high contrast. Contrast requirements are [FE_06](../index.html#FE_06)'s; the token layer satisfies them once, for every mode.

**Do**

```
/* one component, every theme */
.panel { background: var(--color-surface); }

:root            { --color-surface: var(--grey-0); }
[data-theme=dark]{ --color-surface: var(--grey-900); }
```

**Don't**

```
const theme = useTheme();
<div style={{
  background: theme === 'dark' ? '#111827' : '#ffffff',
}} />
```

**Enforcement:** unenforced — a component importing a theme-reading hook is greppable, and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R8](#R8) Icons come from the pipeline

Icons are design values too, and pasted markup has every problem a hardcoded color has plus two: it carries the fill and size it was drawn with, and it duplicates — the same icon lands in the tree four times, subtly different, and a redraw fixes one. Generate the set from the same source, expose it as one typed surface so a wrong name is a compile error rather than an empty box, and take color and size from tokens at the call site.

**Enforcement:** review — the checklist item is the only thing that catches this today. Once a generated set exposes its names as a type, the compiler catches a wrong name; it never catches pasted markup.

### [R9](#R9) The name is agreed before it exists

Where there is a design counterpart, the naming contract is the whole pipeline: the name is agreed before the token is created on either side, because a name invented independently twice is two tokens nobody notices until both are in use. It is one conversation per new role — what is this for, what is it called, does something already cover it — and the step people skip in a hurry, which is how a set acquires `color-border`, `color-outline` and `color-stroke` meaning one thing. A translation table between design and code names means it failed. Where no counterpart exists yet, [R3](#R3) still binds and the first author names it.

**Enforcement:** unenforced — nothing detects two tokens that mean one thing.

### [R10](#R10) Renaming is breaking

A removed or renamed token breaks every consumer, and not loudly — an undefined custom property falls back to nothing rather than erroring, so you get a transparent background, not a build failure. A rename therefore migrates every consumer in the same change — on both sides of the pipeline where there are two — and a deletion waits for the last consumer. [GEN_15](../index.html#GEN_15) owns deprecation generally; what this adds is that the token layer gets no grace period, because the thing that would normally catch the mistake never fires.

**Enforcement:** review — a check that every referenced token name resolves would make this loud, and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

## Worked example

A designer adds a warning banner to the order page: pale amber background, darker amber text, a warning icon.

None of those values goes into the component ([R1](#R1)). The conversation happens first: this is a warning surface and warning text, so the names are `color-surface-warning` and `color-text-warning`, agreed before either exists ([R9](#R9)) — named for the role, not for amber ([R3](#R3)).

```
/* generated — do not edit */
:root             { --color-surface-warning: var(--amber-100); }
[data-theme=dark] { --color-surface-warning: var(--amber-900); }
```

The component references the semantic names only ([R2](#R2)) and the dark variant costs it nothing — no branch, no second component, no knowledge a theme exists ([R7](#R7)). The icon comes from the generated set by name ([R8](#R8)).

```
<aside className={styles.banner}>
  <Icon name="warning" />
  {message}
</aside>

/* .banner { background: var(--color-surface-warning);
              color: var(--color-text-warning); } */
```

A week later the amber fails a contrast check. The fix lands in the design source and regenerates ([R6](#R6), [R5](#R5)): one value changes, every consumer follows, nobody searches the codebase. That is the whole return — and the return a single hardcoded `#fef3c7` elsewhere would have quietly cancelled.

## Checklist

- No literal color, length, shadow, duration or font value in any component ([R1](#R1)).
- Components reference semantic tokens only — no primitives ([R2](#R2)).
- Every new semantic token is named for its role ([R3](#R3)).
- Any component token is justified in the pull request ([R4](#R4)).
- No generated token file was hand-edited ([R5](#R5)).
- Every value change started in the source of record — the design source where `PROJECT.md` records one ([R6](#R6)).
- No component branches on the current theme ([R7](#R7)).
- Icons come from the generated set, by name ([R8](#R8)).
- Every new token name was agreed with design first, or named under [R3](#R3) where there is no counterpart ([R9](#R9)).
- Any rename migrated every consumer in the same change ([R10](#R10)).

## Open questions

- [R1](#R1) is a hard rule with no automated enforcement — the widest gap here. A lint rule rejecting literal colors, lengths and durations outside the token layer closes most of it and is the first guardrail to build ([INFRA_06](../index.html#INFRA_06)).
- Every rule here presumes a token layer and a sync from the design source. The layer now exists; the sync does not, and `PROJECT.md` is still the only place that says so. Under [R6](#R6) that makes the token files the source of record, so they are hand-written and deliberately carry no generated-file header ([ADR 0008](../../adr/0008-tailwind-with-cva-and-tailwind-merge.md)). [R5](#R5), [R6](#R6)'s design-source half, [R8](#R8) and [R9](#R9) therefore have no worked example — [R8](#R8) most visibly, since with no source to generate from, the reference implementation ships no icons at all rather than pasting markup the rule forbids.
- The sync direction is not fixed here — whether code pulls or the tool pushes on publish. Both satisfy every rule above and differ only in who notices drift first, and the choice is expensive enough to reverse that it wants an ADR ([GEN_13](../index.html#GEN_13)).
- [R2](#R2) and [R7](#R7) are unenforced and each names its candidate check above. [R9](#R9) names none and is hardest to automate, being a conversation; the closest proxy is a check that no two semantic tokens resolve to the same primitive ([INFRA_06](../index.html#INFRA_06)).

## Related

Requires [FE_02](../index.html#FE_02). See also [FE_04](../index.html#FE_04), [FE_06](../index.html#FE_06).

Reference implementation, where `PROJECT.md` §3 still lists it: `packages/tokens/`

---

[← All conventions](../index.html)
