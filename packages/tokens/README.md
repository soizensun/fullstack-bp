# `@repo/tokens`

The design token layer. Every color, spacing step, radius, type size and duration in the
frontend resolves to something in here.

## What it owns

`FE_03#R2`'s three layers, one file each, in dependency order:

| File                | Layer         | Names things after                                                    |
| ------------------- | ------------- | --------------------------------------------------------------------- |
| `src/primitive.css` | primitives    | how they look — `--grey-900`, `--space-4`                             |
| `src/semantic.css`  | semantic      | the role they play — `--surface`, `--text-danger`                     |
| `src/component.css` | component     | one component's deliberate departure (`FE_03#R4`)                     |
| `src/theme.css`     | utility theme | derives the Tailwind utilities from the two layers above (`FE_04#R1`) |

**A component consumes the semantic layer and nothing below it** (`FE_03#R2`). In practice
that means a Tailwind utility — `bg-surface`, `text-danger`, `p-4` — never `var(--grey-900)`
and never a literal.

**Dark mode is a set of values, not an architecture** (`FE_03#R7`). `semantic.css` redefines
the same role names under `prefers-color-scheme: dark` and under `[data-theme='dark']`.
No component branches on a theme, and adding a third mode touches this package only.

## Not generated, for now

`FE_03#R5` wants these files generated from the design source and never hand-edited.
`PROJECT.md` §4 records no design source, so `FE_03#R6`'s other half applies — _code is the
source of record until one lands_ — and these are hand-written. There is deliberately no
"do not edit" header: it would be false today, and a false one is worse than none.

When a design source arrives, the change that introduces the pipeline migrates these
values rather than re-deciding them, and this section goes away.

`FE_03#R8`'s generated icon set does not exist for the same reason. Nothing in this
repository ships an icon; pasted icon markup is banned and would not become allowed by
being convenient.

## Tasks

None. It is CSS with no build step and nothing to type-check. `INFRA_01#R7` asks for the
standard task names where they mean something; here none of them do, and adding an empty
script would put a name in the pipeline that never runs (`INFRA_01#R7` again, from the
other direction).

## Consumers

`apps/web`, via `app/globals.css`. Anything in `packages/ui` that grows a style will
consume it too — `FE_13#R5` makes this package that package's only design input.
