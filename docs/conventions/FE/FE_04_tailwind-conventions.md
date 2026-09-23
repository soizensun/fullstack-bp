---
title: 'FE_04 · Tailwind CSS conventions'
id: 'FE_04'
area: 'FE'
tier: 'P1'
status: 'draft'
updated: '2026-09-22'
requires: [FE_03]
---

[Conventions](../index.html) / Frontend / FE_04

# [FE] Tailwind CSS conventions

`P1` · `FE_04` · `draft` · `updated 2026-09-22`

**Open when:** you are styling anything.

Token-backed theme only, no arbitrary values, variant handling with cva, class ordering and merging, the responsive strategy, and the rare case where a component may own CSS.

## The rules

If you read nothing else:

1. <a id="R1"></a>Generate the theme from the tokens. A utility that is not token-backed does not exist.
2. <a id="R2"></a>Never write an arbitrary value in a class.
3. <a id="R3"></a>Write class names in full, statically. Never assemble one from pieces at runtime.
4. <a id="R4"></a>Express a component's visual options as declared variants, not as conditionals over class strings.
5. <a id="R5"></a>Merge incoming classes with a conflict-aware merge, so the caller's class wins deterministically.
6. <a id="R6"></a>Class order is the formatter's job. Never argue about it or hand-sort.
7. <a id="R7"></a>Style mobile first and step up at the token breakpoints. Never write a one-off media query.
8. <a id="R8"></a>Express a theme as a mode of the token layer. Never as a variant repeated per component.
9. <a id="R9"></a>Write CSS only for what utilities cannot express, colocated with the component and still token-backed.
10. <a id="R10"></a>Never build a component class out of utilities.

## Why

Utility classes solve one problem completely — the growing, unowned stylesheet where nobody can tell what a rule affects or whether deleting it is safe — and introduce one of their own: every value in the codebase becomes writable inline, so the design system holds only as long as everyone types the right utility. That is what the first two rules are for. When the theme is generated from the tokens and arbitrary values are impossible, the utility set _is_ the design system, and a value that does not exist cannot be used ([FE_03](../index.html#FE_03)).

The second half is about what utilities are bad at. A component with four visual options and conditional class strings becomes unreadable at the exact moment it becomes important, and two components that concatenate classes differently will conflict in ways that depend on stylesheet order rather than on intent. Declared variants and a conflict-aware merge remove both, and they are the two pieces of tooling this document actually requires.

Whether this framework is installed is a project fact — `PROJECT.md` is the only place that says so. Where it is not present, propose it before writing against it rather than assuming.

## Rule detail

### [R1](#R1) and [R2](#R2) The theme is the tokens, and nothing escapes it

The framework's theme is generated from the token layer rather than typed alongside it: colors, spacing, radii, shadows, breakpoints, type scale, durations. Then `bg-surface-raised` and `p-4` _are_ tokens, and there is no second scale competing with the first.

Which is why arbitrary values are banned outright. An arbitrary value is a hardcoded design value with different syntax — the exact thing the hard rules forbid — and it is worse than a hardcoded value in CSS because it is invisible to a stylesheet audit and impossible to theme.

**Do**

```
<div className="bg-surface-raised p-4 rounded-md text-body">
```

**Don't**

```
<div className="bg-[#1b1f24] p-[13px] rounded-[6px] text-[15px]">
```

When the value you need does not exist, that is the useful signal: either round to the scale, or the design needs a new token agreed at its source ([FE_03#R9](../index.html#FE_03)). Neither answer is a bracket.

**Enforcement:** review — arbitrary-value syntax is a trivial pattern match and is the single highest-value guardrail this document wants ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Classes are static strings

The framework finds classes by scanning source text, so a class assembled at runtime is a class that is not generated — it works in development and vanishes in the production build, which is the worst failure shape available.

**Do**

```
const tone = isDanger ? 'text-danger' : 'text-muted';
```

**Don't**

```
const tone = `text-${isDanger ? 'danger' : 'muted'}`;   // neither class is generated
```

Write every class in full somewhere the scanner can see it, and select between whole strings.

**Enforcement:** review — a template literal inside a class expression is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R4](#R4) and [R5](#R5) Variants and merging

A component's visual options are declared once, as a map from variant to classes, with the defaults stated. That gives the component a typed API for its appearance ([FE_05](../index.html#FE_05)) instead of a conditional expression that grows a branch per option, and it puts every option in one readable place.

**Do**

```
const button = cva('inline-flex items-center rounded-md font-medium', {
  variants: {
    tone: { primary: 'bg-accent text-on-accent', quiet: 'bg-transparent text-body' },
    size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4' },
  },
  defaultVariants: { tone: 'primary', size: 'md' },
});
```

**Don't**

```
className={`rounded-md ${isPrimary ? 'bg-accent' : ''} ${isQuiet ? 'bg-transparent' : ''} ${small ? 'h-8' : 'h-10'}`}
```

Two booleans that are never independently true are one variant ([FE_05](../index.html#FE_05)); a flag that changes the whole body is two components ([GEN_16#R7](../index.html#GEN_16)).

Then merge. A component that accepts a `className` must combine it with a conflict-aware merge, so a caller passing `p-6` replaces the component's `p-4` rather than both landing and the winner being decided by stylesheet order. Naive concatenation makes overrides work by luck.

**Enforcement:** review — a `className` prop concatenated rather than merged is detectable by inspection ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) and [R7](#R7) Order and breakpoints

Class order carries no meaning, so it is the formatter's, exactly as file formatting is ([INFRA_05#R2](../index.html#INFRA_05)). A sorted order also makes diffs readable and stops two people reordering the same line forever.

Layout is mobile first: the unprefixed classes describe the narrow case and each breakpoint adds what changes. The breakpoints come from the tokens and are the same everywhere; a bespoke media query for one component is a second, invisible breakpoint set that nothing else respects ([FE_03](../index.html#FE_03)).

**Enforcement:** partly automated — the class sorter enforces order where it is wired; the breakpoint rule is review.

### [R8](#R8) Themes are token modes

A second theme — dark, high contrast, a tenant's palette — is another mode of the semantic token layer, so components stay unaware of it ([FE_03#R7](../index.html#FE_03)). Adding a per-component dark variant means every component must be revisited for every future theme, and one of them will be missed.

If a component needs a theme-specific variant, that is evidence a semantic token is missing: the component wants a role the token layer does not name yet.

**Enforcement:** review — a theme-prefixed utility in a component is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R9](#R9) and [R10](#R10) The narrow case for CSS

Some things utilities genuinely cannot express: keyframes, complex selector relationships, print rules, a third-party widget's internals. Those get real CSS, colocated with the component that owns it, scoped so it cannot leak, and still reading its values from tokens rather than literals.

What must not happen is the inverse: bundling utilities into a component class. That reintroduces the stylesheet the utilities replaced, hides the composition from every reader of the markup, and produces a class whose meaning is only discoverable in another file. When several elements share a long class list, the answer is a component ([GEN_16](../index.html#GEN_16)), not a class.

**Enforcement:** review — the directive that composes utilities into a class is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

## Worked example

A button in the shared package.

Its base classes carry what never varies — layout, radius, weight, focus ring — and its variants carry tone and size, with defaults ([R4](#R4)). Every value is a token utility: no bracket anywhere ([R2](#R2)). The focus ring is token-backed and never removed, which is where this document meets [FE_06#R5](../index.html#FE_06).

It accepts `className` and merges it conflict-aware, so a caller passing `w-full` composes and a caller passing `px-6` overrides the size variant's padding deterministically ([R5](#R5)).

The dense list wants a smaller button. That is a `size` value, added to the variant map once ([R4](#R4)) — not a `dense` boolean, and not `className="h-7 px-2"` at the call site, which would be a size the design system does not have.

Dark mode requires no change to this component at all ([R8](#R8)): `bg-accent` resolves through the semantic layer, and the palette swaps beneath it. When a designer asks for a "slightly softer" accent in dark mode only, the change is in the token's dark value, not in a class on the button.

One thing does need CSS ([R9](#R9)): the pending state's spinner animation is a keyframe, which lives in a small colocated stylesheet next to the component, its duration read from a token. It is a dozen lines, it never grows, and nothing else imports it.

## Checklist

- Every utility resolves to a token; no arbitrary values ([R1](#R1), [R2](#R2)).
- No class name is assembled at runtime ([R3](#R3)).
- Visual options are declared variants with defaults, not conditional class strings ([R4](#R4)).
- Any `className` prop is merged conflict-aware ([R5](#R5)).
- Classes are formatter-sorted ([R6](#R6)).
- Layout is mobile-first at the token breakpoints; no bespoke media query ([R7](#R7)).
- No theme-specific variant in a component ([R8](#R8)).
- Any CSS is colocated, scoped, token-backed, and covers something utilities cannot express ([R9](#R9), [R10](#R10)).

## Open questions

- [R2](#R2) is the rule the whole document rests on and it is the easiest to break under deadline pressure. Until the arbitrary-value check exists ([INFRA_06](../index.html#INFRA_06)), this convention is one hurried change away from being decorative.
- ~~The document names variant and merge tooling by role rather than by package; the first implementation sets the precedent and it should be recorded in an ADR.~~ Recorded in [ADR 0008](../../adr/0008-tailwind-with-cva-and-tailwind-merge.md). The document still names them by role, which is correct — the ADR is where the packages belong.
- Where a shared component's variant map lives when both apps need the same options is unresolved, and interacts with [FE_13](../index.html#FE_13). Duplicating the map is the likely accident.

## Related

Requires [FE_03](../index.html#FE_03).

Reference implementation, where `PROJECT.md` §3 still lists it: `packages/tokens/src/theme.css`, `apps/web/components/`, `apps/web/lib/cn.util.ts`

---

[← All conventions](../index.html)
