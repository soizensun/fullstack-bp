# 0008 — Tailwind 4, with cva and tailwind-merge, over a token package

Status:   accepted
Date:     2026-09-22
Deciders: kritpavin

## Context

`FE_04` describes styling in terms of a utility framework whose theme is
generated from a token layer, and names the two pieces of tooling it requires by
role rather than by package: something that declares a component's visual
options as variants (`R4`), and something that merges an incoming `className`
conflict-aware (`R5`). Its open questions ask for the packages to be recorded in
an ADR, because *"the first implementation sets the precedent"*.

Neither the framework nor the token layer existed. `PROJECT.md` §4 listed
Tailwind and the tokens package as *planned*, and `FE_04` is explicit that where
the framework is not present you propose it rather than write against it.

`FE_03` is the harder constraint. It is a hard rule — no design value hardcoded,
tokens only — and `R1` says that where a project has no token layer, _"the first
component needing a value establishes the token"_. The FE reference
implementation is that first component.

## Decision

Tailwind 4 for the utilities, `class-variance-authority` for variants,
`tailwind-merge` (with `clsx`) for merging, and a new `packages/tokens` holding
`FE_03#R2`'s three layers.

The layering is what makes the choice work, and it needs one non-obvious move.
Tailwind 4's `@theme` cannot be redeclared per selector, so it cannot itself
hold the dark values. The token package therefore keeps two names per role:

```
primitive.css   --grey-900              the value
semantic.css    --surface: var(--grey-0)          the role, swapped per mode
theme.css       @theme inline { --color-surface: var(--surface) }   the utility
```

A component writes `bg-surface`. It never sees a primitive (`FE_03#R2`), and the
mode swap happens a layer below the utility, so dark mode costs a component
nothing (`FE_03#R7`).

`prettier-plugin-tailwindcss` sorts classes, which is `FE_04#R6` — class order
carries no meaning, so it is the formatter's job and not a review topic.

## Alternatives

- **CSS Modules with the same token package.** Rejected, but it was close: the
  repository already uses CSS Modules and it satisfies `FE_03` on its own. It
  loses `FE_04` entirely, which would leave a P1 document with no worked example
  in the very change that exists to provide worked examples.
- **Tailwind's default theme, with tokens layered on top.** Rejected: it leaves
  two scales in the utility set, so `p-4` and `bg-slate-900` are equally
  available and the design system holds only by everyone typing the right one.
  `FE_04#R1` is specifically about removing that choice.
- **`@theme` without `inline`.** Rejected: utilities would emit a copy of the
  value rather than a reference, so the semantic layer's mode swap would not
  reach them and each theme would need its own utility set.
- **One name per role instead of two.** Not available. `@theme inline
{ --color-surface: var(--color-surface) }` is self-referential, and moving the
  mode swap up into `@theme` is what `@theme` cannot do.
- **Defer the whole thing and write the example unstyled.** Rejected: `FE_03`'s
  hard rule has no unstyled exemption, and a reference implementation that
  demonstrates no styling convention leaves `FE_03` and `FE_04` exactly as
  unexemplified as before.

## Consequences

- `PROJECT.md` §4 moves Tailwind to *present* and splits the token row: the
  package exists, the Figma pipeline still does not.
- `packages/tokens` is hand-written, which `FE_03#R5` forbids for a generated
  token file. `R6`'s other half licenses it — _"where no design source is
  recorded, code is the source of record until one lands"_ — and the package
  deliberately carries no "do not edit" header, because that header would be
  false today. The change that introduces a design source migrates these values
  rather than re-deciding them.
- `FE_03#R8`'s generated icon set has no source to be generated from, so it does
  not exist, and the example uses no icons rather than pasting markup the rule
  forbids. `FE_03` is cited as a reference implementation on the strength of
  `R1`–`R7`; `R8` and the pipeline half of `R5`/`R6`/`R9` remain unexemplified.
- `FE_04#R2`'s ban on arbitrary values is still enforced by nothing. It is the
  rule the document says it rests on, and it is a one-line pattern match; it is
  the first guardrail `INFRA_06` should gain.
- Three runtime dependencies enter the web app for styling. `cva` and
  `tailwind-merge` are small and do one thing each, but they are now part of
  what every component imports, and replacing either later is a change to every
  component that declares variants.

Supersedes: —
Referenced by: FE_03, FE_04, `packages/tokens/README.md`
