---
title: "INFRA_01 · Monorepo structure (Turborepo)"
id: "INFRA_01"
area: "INFRA"
tier: "P0"
status: "stable"
updated: "2026-09-19"
requires: [GEN_01]
see_also: [INFRA_03, BE_01, FE_01]
---

[Conventions](../index.html) / Infrastructure / INFRA_01

# [Infra] Monorepo structure (Turborepo)

`P0` · `INFRA_01` · `stable` · `updated 2026-09-19`

**Open when:** you are adding a workspace, or you do not know where a file belongs.

What lives in `apps/` vs `packages/` vs `docs/`, the anatomy of a package, how a new workspace is created and named, and the catalogue of packages the boilerplate ships with — what each one owns.

## The rules

If you read nothing else:

1. <a id="R1"></a>`apps/` holds things that deploy. `packages/` holds things that are imported. `docs/` holds the conventions and the decisions.
2. <a id="R2"></a>Add no other top-level directory without a decision recorded as an ADR.
3. <a id="R3"></a>One workspace is one manifest, one name, one purpose.
4. <a id="R4"></a>Name every workspace for what it is, and scope package names consistently.
5. <a id="R5"></a>A package's entry point is its public surface. An app publishes nothing.
6. <a id="R6"></a>Nothing in `packages/` imports from `apps/`, and no app imports another app.
7. <a id="R7"></a>Every workspace exposes the standard task names, and no script exists without its pipeline task.
8. <a id="R8"></a>Configuration two workspaces need becomes a config package, never a copied file.
9. <a id="R9"></a>A new workspace states what it owns, who will depend on it, and why it is not part of an existing one.
10. <a id="R10"></a>Keep the repository map true in the same change that makes it wrong.

## Why

A monorepo's value is that one change can cross a boundary and still be reviewed, tested and released together. Its risk is that the same property makes every boundary optional: nothing physically stops the web app importing a file out of the API app, and once that happens the two are one deployable that merely looks like two.

The layout is what makes the boundaries visible before the tooling enforces them ([INFRA_03](../index.html#INFRA_03)). Two directories carry the whole distinction — a thing that deploys and a thing that is imported — and every other question follows from which one you are in. Keeping that answerable in one glance is worth more than any grouping scheme that reads better in a file tree.

The second reason is uniform task names. A tool that runs work across a repository can only be useful if every workspace answers to the same verbs; the moment one app calls it `compile` and another calls it `build`, the graph has a hole and someone starts running commands by hand.

## Rule detail

### [R1](#R1) and [R2](#R2) Three directories

`apps/` holds deployables: something you can start, containerize and point traffic at. `packages/` holds libraries and configuration consumed by import. `docs/` holds this convention set and the decision records behind it ([GEN_13](../index.html#GEN_13)).

Which specific workspaces exist, and which of them are example code, are project facts — `PROJECT.md` is the only place that states them, and it is the file to read before assuming a package is there.

A fourth top-level directory is a claim that one of the three is wrong. That may be true, and it is an ADR, not a `mkdir`.

**Enforcement:** review — a top-level allow-list is trivially checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) and [R4](#R4) One workspace, one name

A workspace is a directory with its own manifest, its own dependencies and its own tasks. Two things sharing a manifest are one workspace and will be released, cached and tested as one, whatever the folder names suggest.

Name a workspace for what it is, in the domain's words, and keep the scoping consistent within each directory: if one package is scoped, every package is. Inconsistent naming is not cosmetic — the name is what appears in every dependency list, every filter flag and every cache key, and a mixture means everyone guesses.

**Do**

```
apps/api          name: api            (or a consistent scope)
apps/web          name: web
packages/ui       name: @repo/ui
packages/api      name: @repo/api
```

**Don't**

```
packages/ui       name: ui             # unscoped among scoped siblings
apps/web          name: @repo/web-app  # a second naming scheme
packages/shared   name: @repo/utils    # directory and name disagree
```

**Enforcement:** review — name-to-directory agreement and a consistent scope are checkable ([INFRA_06](../index.html#INFRA_06)).

### [R5](#R5) The entry point is the surface

A package declares what it exports, and that declaration is its API: anything reachable through it is public and anything else is internal. Deep-importing past it makes a private file public without anyone deciding, and the next refactor breaks a consumer that was never supposed to exist ([GEN_07#R6](../index.html#GEN_07), [INFRA_03](../index.html#INFRA_03)).

Apps are the other end of the graph: they are consumed by users, not by code, so they export nothing and nothing imports them.

**Enforcement:** review — deep imports are detectable from the import graph ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) The direction of the graph

Packages may not import apps, and apps may not import each other. Both are the same rule seen twice: dependencies point toward the reusable end, so a package can be tested, versioned and extracted without dragging a deployable behind it.

Two apps that need to agree on something meet in a package. That is the *only* meeting point, and it is what keeps them independently releasable. What that shared package may contain is [INFRA_03](../index.html#INFRA_03)'s, and for the API-to-web seam specifically, [GEN_08](../index.html#GEN_08)'s.

**Enforcement:** review — this is the highest-value import-graph check in the repository ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) Uniform tasks

Every workspace answers to the same verbs — the development task, the build, the tests, the lint — and each is declared in the task pipeline so the tool knows what depends on what, what can be cached, and what can run in parallel. A workspace that has no meaningful build still declares the task; a no-op is an answer.

The corollary is the one people skip: adding a script to a workspace means adding its task to the pipeline. A script that exists only in a manifest runs on the machine of whoever remembers it, never in the pipeline, and is not part of any graph. How those tasks declare inputs, outputs and caching is [INFRA_13](../index.html#INFRA_13)'s.

**Enforcement:** review — a script with no matching pipeline task is mechanically detectable ([INFRA_06](../index.html#INFRA_06)).

### [R8](#R8) and [R9](#R9) Config packages, and the cost of a workspace

A lint configuration, a type-check base, a test-runner base: each is consumed by several workspaces, so each is a package that they extend rather than a file that they copy. Copies drift, and the drift shows up as a rule that is enforced in one workspace and not another.

Creating a workspace is not free. It adds a manifest to maintain, a node in every graph, a boundary to cross, and a release surface. So a new one comes with three sentences: what it owns, who will import it, and why it is not a directory inside something that already exists. "It might be reused" is a prediction, and the answer to a prediction is to leave the code where its consumer is until a second one appears ([GEN_16](../index.html#GEN_16)).

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

## Worked example

A second deployable is proposed: a worker that consumes background jobs.

It deploys, so it is `apps/worker` ([R1](#R1)), with the same name shape as its siblings ([R4](#R4)) and the standard tasks wired into the pipeline ([R7](#R7)). It exports nothing ([R5](#R5)).

The interesting part is what it shares with the API app. It needs the same domain modules and the same configuration schema — and it may not import them from `apps/api` ([R6](#R6)). Three honest options: the worker is a second entry point *inside* the API workspace rather than a new one; the shared code moves down into a package both import; or the worker genuinely owns its own copy because it is a different concern that merely looks similar ([GEN_16](../index.html#GEN_16)).

The first is usually right and is the one people skip, because a new directory feels like progress. A separate process is not the same thing as a separate workspace: two entry points in one workspace deploy as two images from one build, share the module graph without a boundary crossing, and cost nothing to keep in step. A new workspace is warranted when the two have genuinely different dependencies and different release cadences — and that claim is the third sentence in [R9](#R9).

If the shared code does move to a package, it moves once, whole, with its call sites migrated in the same change and no re-export left behind in the app it came from ([GEN_16#R8](../index.html#GEN_16)).

Either way, the repository map in `AGENTS.md` changes in that same change ([R10](#R10)). A map that lags is worse than none: it is the first thing a new reader trusts.

## Checklist

- The new thing is in `apps/` if it deploys, `packages/` if it is imported ([R1](#R1)); no new top-level directory ([R2](#R2)).
- It has its own manifest, one purpose, and a name matching its directory and its siblings' scope ([R3](#R3), [R4](#R4)).
- Its public surface is its entry point; no deep import was added ([R5](#R5)).
- No package imports an app, and no app imports another ([R6](#R6)).
- Standard tasks exist, and every script has a pipeline task ([R7](#R7)).
- Shared configuration is extended from a config package, not copied ([R8](#R8)).
- A new workspace states what it owns, who depends on it, and why it is not part of an existing one ([R9](#R9)).
- The repository map was updated in the same change ([R10](#R10)).

## Open questions

- [R4](#R4)'s consistency requirement has no stated answer for whether apps should carry the same scope as packages. Either is defensible; the mixture is not, and the first workspace added after this document will settle it by accident unless someone decides.
- Nothing here says how a package that is *only* used by one app should be treated. [GEN_16#R4](../index.html#GEN_16) says it belongs to that app, which implies such packages should be rare — but the boilerplate's own catalogue is the test case, and it belongs to `PROJECT.md` to describe.

## Related

Requires [GEN_01](../index.html#GEN_01). See also [INFRA_03](../index.html#INFRA_03), [BE_01](../index.html#BE_01), [FE_01](../index.html#FE_01).

---

[← All conventions](../index.html)
