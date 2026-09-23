---
title: 'FE_08 · Server vs Client components'
id: 'FE_08'
area: 'FE'
tier: 'P1'
status: 'stable'
updated: '2026-09-22'
requires: [FE_01]
see_also: [FE_09, FE_20]
---

[Conventions](../index.html) / Frontend / FE_08

# [FE] Server vs Client components

`P1` · `FE_08` · `stable` · `updated 2026-09-22`

**Open when:** you are about to write `'use client'`.

Default to server, where the boundary belongs, what may cross it, and the common mistakes that drag the whole tree to the client.

## The rules

If you read nothing else:

1. <a id="R1"></a>Write every component as a server component. Reach for the client directive only for state, effects, event handlers, or a browser API.
2. <a id="R2"></a>Put the directive on the entry of an interactive subtree — never on a leaf a client parent already covers, and never on a barrel.
3. <a id="R3"></a>Extract the interactive part instead of marking the container that holds it.
4. <a id="R4"></a>Send only serializable data across the boundary. Behavior crosses as a server action or not at all.
5. <a id="R5"></a>Keep anything that reads a secret, a token, or the environment out of the client graph.
6. <a id="R6"></a>Hand a server-rendered subtree to a client component through `children`, never by importing it.
7. <a id="R7"></a>Mount providers in one thin client wrapper. Never convert a layout to hold one.
8. <a id="R8"></a>Wrap a client-only third-party component once, in your own module, and import that.
9. <a id="R9"></a>Never cross the boundary to read data.

## Why

The directive is not a per-file annotation; it is a cut through the import graph. Every module reachable from a client entry becomes client code, so a directive placed one level too high quietly ships a subtree — and its dependencies — to the browser. This is the failure mode of App Router codebases: not a deliberate decision to render on the client, but a hundred small ones, each locally reasonable, that add up to an application which renders on the server and then does it all again.

The boundary is also a security surface. Server components can read things client components must never see, and the only thing standing between a credential and a browser bundle is which side of the cut its module ended up on. Both concerns point the same way: keep the cut low, keep it deliberate, and know exactly what crosses it.

## Rule detail

### [R1](#R1) Server is the default

A component earns the client boundary by needing something only a browser has: state that survives a render, an effect, a DOM event handler, or an API like storage or geometry. Nothing else qualifies. In particular, needing data does not ([R9](#R9)), and neither does being visually complex. The default matters because it is the one that keeps working as a page grows: server components add nothing to the bundle, so a page that stays server-rendered gets cheaper per section rather than more expensive.

**Enforcement:** partly automated — hooks or event handlers in a server component fail the build; the choice to add the directive at all is review.

### [R2](#R2) One directive per subtree

The directive marks an entry point, and everything imported below it is already client code — so repeating it on each leaf is noise at best. At worst it changes meaning: a file with the directive is a client entry in its own right, and the framework then checks the props of everything it exports for serializability, which turns an ordinary callback prop between two client components into an error report. A barrel is the worst place of all, because it drags every module it re-exports across the cut whether or not the importer wanted them.

**Enforcement:** review — the directive is visible in a diff, but nothing knows which file is the intended entry.

### [R3](#R3) Push the boundary down

When a mostly-static section needs one interactive control, the fix is a new component around the control, not a directive at the top of the section. This is the single highest leverage habit in an App Router codebase — the difference between shipping a button and shipping the page that contains it. It also tends to improve the structure independently: the extracted piece is the part with behavior, which is the part worth naming and testing ([FE_14](../index.html#FE_14)).

**Do**

```
// app/orders/_components/order-filter.tsx
'use client';
export function OrderFilter({ value }: OrderFilterProps) { /* … */ }

// app/orders/_components/order-toolbar.tsx  — stays on the server
export function OrderToolbar({ value }: OrderToolbarProps) {
  return (
    <div>
      <h2>Orders</h2>
      <OrderFilter value={value} />
    </div>
  );
}
```

**Don't**

```
// app/orders/_components/order-toolbar.tsx
'use client';   // the heading, the layout and every import below: client

export function OrderToolbar({ value }: OrderToolbarProps) {
  const [open, setOpen] = useState(false);
  return /* … */;
}
```

**Enforcement:** review — a bundle budget catches the accumulated cost, never the individual decision ([FE_20](../index.html#FE_20)).

### [R4](#R4) What may cross

Props going from a server component to a client one are serialized, so they must be plain data: primitives, arrays, plain objects, dates. Not class instances, not a database handle, not a function. This is a real constraint on API design, not a technicality — passing a whole domain object across usually means the client component was handed more than it needs, and trimming it to the fields it renders is both the fix and an improvement. When behavior genuinely has to cross, it crosses as a server action, which [FE_09](../index.html#FE_09) owns.

**Enforcement:** automated — the framework rejects a non-serializable prop at the boundary, when the path renders. A path no test or page visit reaches is unchecked until it runs.

### [R5](#R5) Server-only stays server-only

A module that reads a secret, signs a request, or touches the environment must never appear in the import graph of a client entry — and the mistake is easy, because the import that pulls it across is often three modules away and looks like a helper. Keep those modules in one place ([FE_01#R1](../index.html#FE_01)), import them only from server components, and never re-export them from a module a client component uses. Marking them so the build fails on a client import is far better than remembering; see **Open questions**. The rule about what may never reach a browser at all is [GEN_09#R1](../index.html#GEN_09).

**Enforcement:** unenforced — a server-only marker module turns this into a build error. It is a dependency, so it is present only if `PROJECT.md`'s stack table lists it; no row means no marker, and nothing catches this.

### [R6](#R6) Children cross, imports do not

A client component cannot import a server component — the import makes it client code. But it can render one, if the server component is passed in as `children` and the composition happens above the boundary. This is how an interactive shell keeps a server-rendered body: the shell takes a slot, the page fills it. Reaching for the import instead is what turns a tab strip into a client-rendered page.

**Do**

```
// app/orders/page.tsx  — composition happens here, on the server
export default function OrdersPage() {
  return (
    <Collapsible>
      <OrderSummary />   {/* stays a server component */}
    </Collapsible>
  );
}
```

**Don't**

```
// app/orders/_components/collapsible.tsx
'use client';
import { OrderSummary } from './order-summary';  // now client code

export function Collapsible() {
  return open ? <OrderSummary /> : null;
}
```

**Enforcement:** review — the import is legal; only its cost gives it away.

### [R7](#R7) Providers get a wrapper

Context providers need the client boundary, and a layout is the worst possible place to put one: it is the highest node in a subtree, so marking it hands the whole route group to the client. Put the providers in a single client component that renders `children`, and have the layout render that. The layout stays a server component, the provider tree is in one file, and the boundary sits exactly where the state does.

**Enforcement:** review — a directive on a layout file is greppable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R8](#R8) Wrap third-party client components once

A library component that uses hooks internally cannot be rendered from a server component directly. Wrapping it once in your own client module gives the rest of the codebase one import to use, one place to set defaults, and one file to change when the library does — instead of a directive sprinkled across every page that touches it. The wrapper is also where the library's API meets [FE_05](../index.html#FE_05)'s.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R9](#R9) Never go client to read data

Needing data is the most common bad reason to add the directive. A server component can read directly, with no round trip, no loading state, and no credential in the browser; a client component that fetches on mount turns one server render into a request waterfall and a spinner. The cases where a client read is the right answer exist, and [FE_09](../index.html#FE_09) lists them — none of them start with "it was easier here".

**Enforcement:** review — [FE_09](../index.html#FE_09)'s rules are where this is caught in practice.

## Worked example

The orders page shows a heading, a status filter, and a table. The filter has a dropdown, so it needs state; nothing else does.

The wrong instinct is to mark the page or the toolbar, because the filter lives inside them. Instead the filter becomes its own component and carries the only directive on the route ([R3](#R3)). The table stays on the server and reads its own data ([R9](#R9)); the page composes the two.

```
app/orders/
  page.tsx                    server
  _components/
    order-toolbar.tsx         server
    order-filter.tsx          'use client'  ← the only one
    order-table/
      order-table.tsx         server, reads data
      order-table-row.tsx     server
```

The filter needs to change the list when it changes. It does not fetch, and the table is not imported into it ([R6](#R6)): the filter writes to the URL, the route re-renders on the server, and the table reads the new value. What the filter receives across the boundary is the current value — a string ([R4](#R4)).

```
// app/orders/page.tsx
export default async function OrdersPage({ searchParams }: PageProps<'/orders'>) {
  const { status } = await searchParams;
  return (
    <>
      <OrderToolbar status={status} />
      <OrderTable status={status} />
    </>
  );
}
```

Later, the page needs a toast after an action. The temptation is a directive on the layout so the provider can live there; instead the providers move into one client wrapper the layout renders ([R7](#R7)), and the layout stays a server component.

## Checklist

- Every new component is a server component unless it needs state, an effect, an event handler, or a browser API ([R1](#R1)).
- Each directive sits on a subtree entry — none on leaves, none on barrels ([R2](#R2)).
- The interactive part was extracted rather than its container marked ([R3](#R3)).
- Everything crossing the boundary is plain data ([R4](#R4)).
- No module that reads a secret or the environment is reachable from a client entry ([R5](#R5)).
- Server subtrees reach client components through `children` ([R6](#R6)).
- No layout carries the directive; providers live in a wrapper ([R7](#R7)).
- Third-party client components are wrapped once ([R8](#R8)).
- No directive was added in order to fetch something ([R9](#R9)).

## Open questions

- [R5](#R5) is the rule with real consequences and no enforcement. A marker module that fails the build when server-only code is imported from a client entry closes it; adding it is a dependency decision, so it belongs to [INFRA_06](../index.html#INFRA_06) and `PROJECT.md`, not here.
- [R2](#R2) and [R7](#R7) are greppable — a directive on a barrel or a layout file is a string match. Whether that is worth a guardrail, or whether it produces too many false positives to be useful, is undecided.
- Nothing here sets a budget for how much of a route may end up client-rendered. [FE_20](../index.html#FE_20) owns bundle budgets, and until one exists, [R3](#R3) is enforced only by whoever reviews the diff.

## Related

Requires [FE_01](../index.html#FE_01). See also [FE_09](../index.html#FE_09), [FE_20](../index.html#FE_20).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/app/todo-lists/`

---

[← All conventions](../index.html)
