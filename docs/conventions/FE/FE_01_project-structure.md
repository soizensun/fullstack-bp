---
title: 'FE_01 · Project structure'
id: 'FE_01'
area: 'FE'
tier: 'P1'
status: 'stable'
updated: '2026-09-22'
requires: [INFRA_01]
see_also: [FE_02, FE_13]
---

[Conventions](../index.html) / Frontend / FE_01

# [FE] Project structure

`P1` · `FE_01` · `stable` · `updated 2026-09-22`

**Open when:** you do not know where a frontend file belongs.

The App Router tree, feature colocation vs the shared UI package, where atoms, molecules and organisms physically live, file naming, and the decision rule for placing a new file.

## The rules

If you read nothing else:

1. <a id="R1"></a>The web app has three source folders — `app/`, `components/`, `lib/` — plus the files the framework owns. Add no others.
2. <a id="R2"></a>A route file wires a URL to a view. Everything it renders comes from a named component defined elsewhere.
3. <a id="R3"></a>Start every new file in the private folder of the route that needs it.
4. <a id="R4"></a>Move it up one rung when a second route actually imports it — never for reuse you expect.
5. <a id="R5"></a>The ladder is route-private → `components/` → the shared UI package, and a rung may only import from a lower one.
6. <a id="R6"></a>A shared component's atomic level is the directory it sits in.
7. <a id="R7"></a>Name a folder after its primary file, and create one only when two or more files belong together.
8. <a id="R8"></a>Suffix a non-component file with the role it plays.
9. <a id="R9"></a>Never write `../` in an import. Reach another folder through the app's path alias.
10. <a id="R10"></a>A move up the ladder migrates every call site in the same change and leaves no re-export behind.

## Why

Every frontend accumulates the same two failures. The first is a `components/` directory that becomes a junk drawer: things land there because someone might reuse them, nobody does, and after a year nobody can tell which files are load-bearing. The second is the opposite — a route folder that grows a whole application inside itself, so the next page needing that table copies it. Both come from one missing answer: _where does this file go, and what moves it_.

The ladder below answers it mechanically. A file starts in the narrowest place that holds it and climbs only when a real second consumer appears, so its position is a fact about how widely it is used rather than a guess someone made on a Tuesday — and the tree becomes machine-readable, which is what lets the import rules in [INFRA_06](../index.html#INFRA_06) exist at all.

## Rule detail

### [R1](#R1) Three folders, and the ones the framework owns

`app/` holds routes. `components/` holds UI shared by two or more routes. `lib/` holds everything that is neither — the API client, adapters, formatters. Alongside them sit the files the framework dictates by name and position: the middleware module, the static asset directory, and inside `app/` the per-segment layout, loading, error and not-found files. Those are not yours to move, and what goes in them — with route groups and dynamic segments — is [FE_11](../index.html#FE_11)'s subject. A fourth folder claims one of these three is wrong, which is a change to this document ([GEN_01#R10](../index.html#GEN_01)), not a directory you create quietly. Where the app sits in the workspace is [INFRA_01](../index.html#INFRA_01)'s.

**Enforcement:** review — a directory allow-list is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R2](#R2) Route files route

A route file resolves its params, declares its metadata, and renders a composition. It does not define the sections it renders, and holds no logic that would still make sense if the URL changed. Thin routes are cheap to move, split or wrap, and they confine the framework's default-export exception in [GEN_07#R3](../index.html#GEN_07) to a handful of files. Reading data in a route file is fine; that is [FE_09](../index.html#FE_09)'s subject, not a structural violation.

**Do**

```
// app/orders/page.tsx
import { OrderList } from './_components/order-list';

export default async function OrdersPage() {
  return <OrderList />;
}
```

**Don't**

```
// app/orders/page.tsx
export default async function OrdersPage() {
  const orders = await api.orders.list();
  const grouped = groupByStatus(orders);   // shaping
  return (
    <section>
      {/* forty lines of markup nothing else can reach */}
    </section>
  );
}
```

**Enforcement:** review — file length is checkable, but "renders a composition" is not.

### [R3](#R3) Colocate first

A new component, hook, type or helper starts inside the route that needs it, in a folder the router ignores because its name begins with an underscore: `_components/` for UI, `_lib/` for the rest, mirroring the app-level split in [R1](#R1). Colocation is the default because it is the only placement cheap to undo: a file nobody else imports can be renamed or deleted without a survey. Guessing wrong the other way is permanent — a shared file acquires importers faster than anyone removes them.

**Enforcement:** review — nothing can tell a premature abstraction from a deliberate one.

### [R4](#R4) A second consumer earns the move

One rung per promotion, and only when a second route imports the thing today. "We will need this on the settings page too" is not a consumer; neither is a component built shared-first because it felt generic. The second real caller is the first evidence of which parts are essential — without it you are designing an API against a sample size of one. If you are about to copy a file instead of importing it, that copy is the second consumer: promote it.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R5](#R5) The ladder, and which way imports point

Three rungs, widening: the route's private folder, the app's `components/` directory, then the shared UI package for anything a second app uses ([FE_13](../index.html#FE_13) owns that graduation). Imports run down the ladder only. `components/` never imports from `app/`, and nothing outside a private folder reaches into it. A sideways import means the file belongs one rung up, so promote it rather than reaching for it. `lib/` sits below the ladder: anything may import it, and it imports no UI.

**Do**

```
// app/invoices/_components/invoice-table.tsx
import { DataTable } from '@/components/organisms/data-table';
import { formatMoney } from '@/lib/format/money';
```

**Don't**

```
// app/invoices/_components/invoice-table.tsx
// reaching into another route's private folder
import { OrderTable } from '@/app/orders/_components/order-table';
```

**Enforcement:** unenforced — an import-boundary rule per rung is the highest-value guardrail this document wants ([INFRA_06](../index.html#INFRA_06)); see **Open questions**.

### [R6](#R6) The level is the directory

Under `components/`, a component lives in the directory named for its atomic level, and that directory is the only record of the level — no annotation, no suffix, nothing that could disagree with it. Putting the level in the path turns [FE_02](../index.html#FE_02)'s layer rules from advice into something a machine can check: "no data fetching below an organism" becomes a statement about paths. [FE_02](../index.html#FE_02) owns what each level means; this rule only says a change of level is a move, not an edit. The level directories stop at `components/` — a route-private component has one consumer, so classifying it buys nothing.

**Do**

```
components/
  atoms/badge.tsx
  molecules/search-field.tsx
  organisms/data-table/
    data-table.tsx
    data-table-row.tsx
```

**Don't**

```
components/
  ui/badge.tsx              // level unknowable
  search-field.tsx          // level unknowable
  tables/data-table.tsx     // grouped by topic instead
```

**Enforcement:** review — the directory names are checkable and are a candidate guardrail ([INFRA_06](../index.html#INFRA_06)); whether a component is really an atom stays review either way ([FE_02](../index.html#FE_02)).

### [R7](#R7) Folders hold families

A single file needs no folder. Create one when a component has co-located parts, and name it after the primary file inside, which repeats the folder name: `data-table/data-table.tsx` beside `data-table-row.tsx`. The file you want then carries the name you are searching for, not `index.tsx` forty times over. Grouping by topic instead rebuilds the junk drawer one level down.

**Enforcement:** review — the folder/primary-file match is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)); the decision to nest is review.

### [R8](#R8) Role suffixes

A file that is not a component says what it is in its name: `.service.ts` for a module that talks to the API, `.transform.ts` for a pure mapping between shapes, `.schema.ts` for a validation schema, `.type.ts` for type declarations, `.constant.ts` for fixed values, `.util.ts` for pure helpers, and `use-*.ts` for a hook. A component file carries no suffix; it is named after the component. The suffix makes obligations greppable — every `.transform.ts` should be pure, and one search checks it. The suffix is not the name: the stem still says what the file contains (`money.util.ts`), so [GEN_07#R1](../index.html#GEN_07)'s ban on container words holds and there is no bare `utils.ts`.

**Enforcement:** review — the suffix set is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R9](#R9) No `../`

A `../` always crosses a folder boundary, so it hides one of the relationships this document makes visible — and it breaks silently when the importing file moves, which [R4](#R4) and [R10](#R10) ask you to do routinely. Use `./` for siblings and the path alias for everything else, so an import states which rung it reaches and survives the move. The rule presupposes the alias: where the TypeScript config declares none, declaring it is the first step of obeying this rule rather than a reason to skip it — until then the imports shown here do not resolve.

**Enforcement:** unenforced — a lint rule banning parent-relative specifiers is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)). The compiler enforces the other half only once the alias exists, and reports its absence as an unresolved module.

### [R10](#R10) Finish the move

When a file climbs a rung, every importer moves to the new path in the same change and the old path stops existing. No re-export "so existing imports keep working", no alias giving one component two names. A shim is a second home for the same thing, so the tree answers the placement question two ways — the failure this document exists to prevent. [GEN_15](../index.html#GEN_15) governs deprecating what outside consumers depend on; inside one app there are none, so expand and contract land in one change.

**Enforcement:** review — an unused old path is detectable, but a re-export shim looks like ordinary code.

## Worked example

You are adding an orders page. It needs a table with a status badge in one column, and the table's empty state.

Everything starts private ([R3](#R3)) and the route file renders one component ([R2](#R2)). `order-table/` is a folder because the table has co-located parts ([R7](#R7)); `status-badge.tsx` is flat because it does not.

```
app/orders/
  page.tsx
  _components/
    order-table/
      order-table.tsx
      order-table-row.tsx
      order-table-empty.tsx
    status-badge.tsx
  _lib/
    order-status.transform.ts
```

Two weeks later invoices needs the same badge — a second consumer ([R4](#R4)), so it climbs one rung. Not to the shared package, which no second app has asked for ([FE_13](../index.html#FE_13)), but into `components/`, in the directory for its level ([R6](#R6)). Both importers move and the old file is gone in the same change ([R10](#R10)).

```
components/atoms/status-badge.tsx

// app/orders/_components/order-table/order-table-row.tsx
import { StatusBadge } from '@/components/atoms/status-badge';

// app/invoices/_components/invoice-row.tsx
import { StatusBadge } from '@/components/atoms/status-badge';
```

The table does not move, and neither does the transform: one route renders each, so promoting them would put files with one importer into the shared tree. If invoices later needs the same table, the answer is not to import `order-table` sideways ([R5](#R5)) but to promote the generic part and leave the order-specific wrapper where it is.

## Checklist

- No new top-level folder in the web app ([R1](#R1)).
- Route files render a composition and nothing they define themselves ([R2](#R2)).
- New files start in the owning route's private folder ([R3](#R3)).
- Anything promoted has a second importer today, named in the pull request ([R4](#R4)).
- No sideways import between routes, and nothing reaches into a private folder ([R5](#R5)).
- Every file under `components/` sits in a level directory ([R6](#R6)).
- Every folder is named after its primary file and holds two or more files ([R7](#R7)).
- Non-component files carry their role suffix ([R8](#R8)).
- No `../` in any import ([R9](#R9)).
- A promotion updated every call site and left no re-export ([R10](#R10)).

## Open questions

- [R5](#R5) and [R9](#R9) are the two rules most worth automating and the two nothing catches. Both are ordinary import-boundary checks — [INFRA_06](../index.html#INFRA_06) owns adding them.
- ~~[R9](#R9) needs the app's TypeScript config to map the alias to the app root.~~ Closed: the web app declares `@/*`, so the imports shown here resolve. It was the one open item that blocked work rather than improving it.
- [R6](#R6) puts the level in the path, so reclassifying a component touches every call site. [FE_02](../index.html#FE_02) should say whether that cost is acceptable at the atom/molecule line, where it happens most.

## Related

Requires [INFRA_01](../index.html#INFRA_01). See also [FE_02](../index.html#FE_02), [FE_13](../index.html#FE_13).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/app/todo-lists/`, `apps/web/components/`, `apps/web/lib/`

---

[← All conventions](../index.html)
