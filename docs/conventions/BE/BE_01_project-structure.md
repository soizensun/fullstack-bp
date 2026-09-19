---
title: "BE_01 · Project structure & module anatomy"
id: "BE_01"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [INFRA_01]
see_also: [BE_02, BE_03]
---

[Conventions](../index.html) / Backend / BE_01

# [BE] Project structure & module anatomy

`P1` · `BE_01` · `draft` · `updated 2026-09-19`

**Open when:** you are adding a module, or you do not know where a backend file belongs.

Folder layout of the API app, the canonical file tree of one module, file naming, where anything new is allowed to go, and the checklist for scaffolding a new module.

## The rules

If you read nothing else:

1. <a id="R1"></a>The API app has four source areas — `modules/`, `shared/`, `infrastructure/`, `config/` — plus the bootstrap files. Add no others.
2. <a id="R2"></a>Every business capability is one directory under `modules/`, named in the glossary's words.
3. <a id="R3"></a>A module's only top-level directories are `domain/`, `application/`, `infrastructure/`, `presentation/`. Create one when it has a file, not before.
4. <a id="R4"></a>Every module declares its Nest module in `<name>.module.ts` and its public surface in `index.ts`, both at the module root.
5. <a id="R5"></a>Inside a layer, group files by the role they play, using the role folders in the tree under [R3](#R3) and no others.
6. <a id="R6"></a>Suffix every file with its role — `.use-case.ts`, `.controller.ts`, `.port.ts`, `.adapter.ts`, `.repository.ts`, `.entity.ts`, `.vo.ts`, `.mapper.ts`, `.errors.ts`, `.dto.ts`.
7. <a id="R7"></a>Split a module into submodules under one context directory when it owns a second aggregate; concepts both submodules need live in `<context>/shared/domain/`.
8. <a id="R8"></a>Put a file in `shared/` only when a second module already imports it, and in `infrastructure/` only when it wraps a provider rather than a business capability.
9. <a id="R9"></a>Reach another module only through its barrel, through the app's path alias. Never `../` out of your own module.
10. <a id="R10"></a>Scaffold a module with every item on the checklist below, or not at all.

## Why

A backend that grows by technical layer — one `controllers/` folder, one `services/` folder, one `entities/` folder — makes the cheap question expensive. To understand one capability you open five directories and read past forty files that have nothing to do with it, and to delete that capability you grep. Grouping by capability first and by layer second means a module is a directory you can read end to end, hand to one person, test in isolation, and eventually lift out of the deployable without archaeology.

The second half of the layout is the part people skip: a module needs a *stated* public surface. Without one, the boundary in [BE_03](../index.html#BE_03) is a promise rather than a fact, because any file is one relative path away from any other. The barrel makes the surface a file someone has to edit on purpose, and the role folders make the layer of a file visible from its path — which is what lets an import rule be written down at all ([BE_02](../index.html#BE_02)) and later machine-checked ([INFRA_06](../index.html#INFRA_06)).

## Rule detail

### [R1](#R1) Four areas

`modules/` holds capabilities and is where nearly everything you write goes. `shared/` holds code that is genuinely common to modules and belongs to none of them — the base error classes, cross-cutting guards, pipes, filters and interceptors, the transaction boundary abstraction. `infrastructure/` holds an integration with one technical provider that no single capability owns — the logger, the cache client, the storage client. `config/` is [BE_10](../index.html#BE_10)'s subject. Alongside them sit the files the framework dictates: the bootstrap entry point and the root application module, which imports every module and nothing else.

A fifth area means one of the four is wrong, which is a change to this document ([GEN_01#R10](../index.html#GEN_01)) and not a directory you create quietly. Where the app itself sits in the workspace is [INFRA_01](../index.html#INFRA_01)'s.

**Enforcement:** review — a directory allow-list is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Four layers, and their role folders

Each layer directory holds role folders, so a file's job is legible from its path:

```
modules/<capability>/
  <capability>.module.ts        wiring: providers, imports, exports
  index.ts                      public surface (BE_03)
  domain/                       entity/ value-object/ service/
                                repository/ port/ types/
                                <name>.errors.ts

modules/<context>/              a context with more than one aggregate
  shared/domain/                concepts both submodules own
  shared/application/           read contracts both submodules use
  <submodule>/                  the anatomy above, per aggregate
  application/                  use-cases/ dto/ query-port/ port/
                                service/ types/ adapter/
                                <name>.errors.ts
  infrastructure/               entity/ mapper/ repository/ query/
  presentation/                 <name>.controller.ts
```

What each layer may import is [BE_02](../index.html#BE_02); what `domain/port/` means next to `domain/repository/` is [BE_03](../index.html#BE_03) and [BE_06](../index.html#BE_06). Here they are only places. An empty role folder is noise — add it with its first file.

Four of these were added after the first module was built, because the original list had nowhere to put things the other documents require: `application/port/` for an outbound contract that is not a query ([BE_02#R6](../index.html#BE_02)), `application/service/` for the application service [BE_05#R10](../index.html#BE_05) creates when two use cases share a workflow, `application/types/` for the projections a query contract returns, and `infrastructure/query/` for the implementation behind that contract ([BE_06#R7](../index.html#BE_06)).

**Enforcement:** review — the folder vocabulary is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) The role suffix

Casing and naming a file after its export are [GEN_07](../index.html#GEN_07)'s. The suffix is this document's, because it is what makes a violation visible in a diff: a `.controller.ts` importing a `.repository.ts` is wrong at a glance, with no need to open either file. One exported class per file, named for the file.

**Do**

```
application/use-cases/publish-article.use-case.ts
domain/repository/article-repository.port.ts
infrastructure/repository/article.repository.ts
```

**Don't**

```
application/articles.service.ts     // which layer? which role?
domain/helpers.ts                   // a drawer, not a role
infrastructure/index.ts             // an internal barrel (GEN_07#R6)
```

**Enforcement:** review — a file-name pattern per role folder is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) Submodules and the shared kernel

One module owns one aggregate. When a second aggregate turns out to belong to the same bounded context — it shares the context's language and its lifecycle — nest both as submodules of a context directory, each with the full four-layer anatomy, rather than growing one module until nobody can read it.

Sharing between submodules goes through the context, never sideways. A concept both need goes in `<context>/shared/domain/`; a read contract both need goes in `<context>/shared/application/`. A submodule still does not reach into a sibling's `domain/`, `application/` or `infrastructure/` — the relaxation a shared context buys is the two shared folders, not a general permission ([BE_03](../index.html#BE_03)). And keep the shared folders for concepts that are genuinely the context's: a wrapper type that exists so a submodule can rename someone else's value object is ceremony ([BE_04](../index.html#BE_04)).

**Enforcement:** review.

### [R8](#R8) `shared/` earns its place, `infrastructure/` names its provider

Both directories attract files that belong to a module. The test for `shared/` is possession, not prediction: a second module imports it *today*, and no module owns it. The test for `infrastructure/` is that it is a technical capability with a swappable provider, not a business capability with a domain — a mail sender belongs there, sending the welcome email does not.

The failure this prevents is a `shared/utils/` that becomes the place code goes when nobody wants to decide, and which every module then depends on in both directions.

**Enforcement:** review.

### [R10](#R10) Scaffolding is all-or-nothing

A half-scaffolded module is worse than none, because the next person copies it. Everything on the checklist exists before the pull request opens, including the vertical slice: one route reaching one use case reaching one port with one test at each end. If a piece is genuinely not needed yet — no persistence, no cross-module port — leave the folder out ([R3](#R3)) rather than leaving it empty.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

## Worked example

A new `subscriptions` capability, one aggregate, one route, one repository:

```
apps/api/src/modules/subscriptions/
  subscriptions.module.ts
  index.ts
  domain/
    entity/subscription.entity.ts
    value-object/billing-period.vo.ts
    repository/subscription-repository.port.ts
    subscription.errors.ts
  application/
    use-cases/start-subscription.use-case.ts
    use-cases/start-subscription.use-case.spec.ts
    dto/request/start-subscription.request.dto.ts
    dto/response/start-subscription.response.dto.ts
    subscription.errors.ts
  infrastructure/
    entity/subscription.record.ts
    mapper/subscription.mapper.ts
    repository/subscription.repository.ts
  presentation/subscription.controller.ts
```

There is no `domain/port/` and no `application/adapter/`: nothing outside the module calls it yet, so it publishes nothing ([BE_03](../index.html#BE_03)). There is no `query-service/`: the one route is a command. Both appear the day something needs them, and not before ([R3](#R3)).

`index.ts` exports `SubscriptionsModule` and nothing else. `SubscriptionRepositoryPort` stays unexported — it is an internal persistence contract, and exporting it would hand every other module write access to this aggregate ([BE_06](../index.html#BE_06)). The root application module imports `SubscriptionsModule`; no other module does.

When billing later grows its own aggregate, the directory becomes `modules/subscriptions/` as a context with `subscriptions/subscriptions/` and `subscriptions/invoices/` beneath it ([R7](#R7)), and the money value object both need moves to `subscriptions/shared/domain/` ([GEN_11#R5](../index.html#GEN_11)).

## Checklist

- No new top-level source area; the file sits in one of the four ([R1](#R1), [R8](#R8)).
- Module directory named after the capability, in glossary words ([R2](#R2), [GEN_14](../index.html#GEN_14)).
- Only the four layer directories, each with at least one file ([R3](#R3)).
- `<name>.module.ts` and `index.ts` exist at the module root ([R4](#R4)).
- Every file is in a role folder and carries its role suffix ([R5](#R5), [R6](#R6)).
- A second aggregate became a submodule; shared concepts sit in the context's `shared/domain/` ([R7](#R7)).
- No import reaches into another module by relative path ([R9](#R9)).
- The new module ships a full vertical slice with tests ([R10](#R10)).

## Open questions

- Every rule here is a path shape, and path shapes are the cheapest thing a machine can check. Until [INFRA_06](../index.html#INFRA_06) exists they are all review rules, and they are the highest-value guardrails the backend has.
- Where a module's Gherkin step definitions live is unsettled — beside the module or in the app's test root. [BE_13](../index.html#BE_13) decides it; this document follows.

## Related

Requires [INFRA_01](../index.html#INFRA_01). See also [BE_02](../index.html#BE_02), [BE_03](../index.html#BE_03).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/modules/todo/`, `apps/api/src/modules/activity-log/`

---

[← All conventions](../index.html)
