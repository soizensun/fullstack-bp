---
title: 'FE_02 · Atomic design — layer definitions & rules'
id: 'FE_02'
area: 'FE'
tier: 'P1'
status: 'stable'
updated: '2026-09-22'
requires: [FE_01]
see_also: [INFRA_06, FE_21]
---

[Conventions](../index.html) / Frontend / FE_02

# [FE] Atomic design — layer definitions & rules

`P1` · `FE_02` · `stable` · `updated 2026-09-22`

**Open when:** you are creating a component and must decide what it is.

Exact criteria for atom / molecule / organism / template / page, what each layer may know — no data fetching or business logic below organism — and how a component is promoted or demoted.

## The rules

If you read nothing else:

1. <a id="R1"></a>Classify a component by what it is allowed to know, never by how large it looks.
2. <a id="R2"></a>An atom composes no other component from this set.
3. <a id="R3"></a>A molecule composes atoms into one job and adds nothing but their arrangement.
4. <a id="R4"></a>Name a domain concept only at organism and above.
5. <a id="R5"></a>Read data and decide business rules only at organism and above.
6. <a id="R6"></a>A template arranges organisms into a page shape and owns no data of its own.
7. <a id="R7"></a>A page is a route, and it lives with the routes.
8. <a id="R8"></a>Promote a component the moment it needs knowledge its level forbids. Never grant it an exception.
9. <a id="R9"></a>Demote a component that no longer uses the knowledge its level allows.
10. <a id="R10"></a>These five levels are the whole vocabulary. Do not invent a sixth.

## Why

Atomic design is usually taught as a size gradient — atoms are small, organisms are big — and taught that way it decides nothing. Two engineers file one component in two folders, both defensibly, and within a year the levels mean only where someone happened to put something. The gradient is not the point. The point is a dependency rule: each level knows strictly less than the one above it, and the levels exist so the knowing is visible in the tree.

That makes the set testable rather than decorative. "Does this component know the product exists?" has one answer; "is this big?" does not. And because [FE_01#R6](../index.html#FE_01) puts the level in the path, these rules become checkable statements about an import graph wherever the level is a path — the only reason [INFRA_06](../index.html#INFRA_06) can ever enforce any of it.

## Rule detail

### [R1](#R1) Knowledge, not size

Work down the questions, stopping at the first yes. Does it render at a URL? A page. Only arrange sections? A template. Know a domain concept, read data, or decide a business rule? An organism. Compose other components? A molecule. Otherwise, an atom. A thousand-line date picker is an atom if it knows only dates; a fourteen-line panel reading the signed-in user is an organism. The classification binds every component wherever it lives; only the _directory_ is restricted, recording the level under `components/` and nowhere else ([FE_01#R6](../index.html#FE_01)), since a route-private component has one consumer and nothing to disambiguate. It still has a level and still obeys its limits.

**Enforcement:** review — the questions are answerable by a reader, and by a machine only once the import graph is checked ([INFRA_06](../index.html#INFRA_06)).

### [R2](#R2) Atoms compose nothing

An atom is the floor: a button, an input, a badge, an icon. It may render as many HTML elements as it needs — the test is not element count but whether it imports another component from the set. The moment it does it is arranging, which is a molecule's job. This is the one boundary with a purely mechanical test, deliberately: it has the most files and callers, so it must be decidable without a conversation.

**Do**

```
// components/atoms/status-badge.tsx — imports no component
export function StatusBadge({ status, ...rest }: StatusBadgeProps) {
  return <span data-status={status} {...rest} />;
}
```

**Don't**

```
// components/atoms/status-badge.tsx
import { Icon } from '@/components/atoms/icon';   // composes → molecule

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span><Icon name={status} />{status}</span>;
}
```

**Enforcement:** unenforced — "no import from `components/` inside `components/atoms/`" is one import-boundary rule and the cheapest guardrail this document wants ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) Molecules arrange, and stop there

A molecule puts atoms together to do one job a user would name: a labelled field, a search box, a pagination control. It may hold local UI state — which item is focused, whether the menu is open — since that is about the arrangement, not the product. It may not add knowledge: no domain vocabulary ([R4](#R4)), no reads, no rules ([R5](#R5)). If you cannot name its job without naming your product, it is an organism.

**Enforcement:** review — "one job" is a judgment; the knowledge limits it inherits from [R4](#R4) and [R5](#R5) are not.

### [R4](#R4) The domain starts at organism

Below organism, props speak the vocabulary of interfaces — `label`, `value`, `items`. At organism and above they may speak the business's — `order`, `invoice`. The test is the props type, not the file name: a `Table` taking an `orders` prop has named the domain, whatever you called it. This line makes the lower levels reusable across products, and is why [FE_13](../index.html#FE_13) can promote an atom into a shared package without your business.

**Do**

```
// components/molecules/data-row.tsx
export type DataRowProps = { label: string; value: string };
```

**Don't**

```
// components/molecules/data-row.tsx
export type DataRowProps = { order: Order };   // domain → organism
```

**Enforcement:** review — a domain word in a props type below organism is greppable once [GEN_14](../index.html#GEN_14) lists the words, and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R5](#R5) Data and rules start at organism

Nothing below an organism reads from the API or decides anything the business could change its mind about — not a fetch, not a permission check, not "orders over ten thousand show the approval banner." Those take the answer as a prop, which makes them trivially testable and keeps a rule in one place rather than spread across the leaves that display it. [FE_09](../index.html#FE_09) owns how an organism reads; [FE_08](../index.html#FE_08) owns which side of the boundary.

**Enforcement:** unenforced — an import ban on the data client below `components/organisms/` catches the fetching half mechanically; the business-logic half stays review ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) Templates are shape, not content

A template says where things go — a two-column layout with a sidebar, a detail page with a hero and a body. It takes its sections as children and owns none, so it renders correctly with nothing in it. That is what makes it worth having: page geometry is decided in one place, and stays decidable because that place never knows what it arranges. A template that reaches for data is an organism pretending to be reusable.

**Enforcement:** review — "owns no data" is visible in the props type, but nothing checks it.

### [R7](#R7) Pages are routes

The page level is not a directory under `components/`; it is the route file, where [FE_01#R2](../index.html#FE_01) puts it. The framework makes that half unbreakable — nothing outside a route renders as one — so the violation this rule is about is a page-shaped component under `components/` rendered by a one-line route: an `OrdersPage` filed as an organism. It exists to be reused, which a page cannot be. Two routes wanting the same thing want a template plus organisms.

**Enforcement:** review — [R10](#R10)'s allow-list has no `pages/` entry, so that spelling is caught; a page-shaped component filed as an organism is not.

### [R8](#R8) Promote instead of excusing

When an atom needs a domain word or a molecule needs to read something, the answer is never a small exception — the component is a different level now. Under `components/` the file moves; in a route's private folder it changes level in place, climbing a rung only when [FE_01#R4](../index.html#FE_01)'s second consumer earns one. Exceptions are how levels stop meaning anything: the first is always defensible, and after four nobody trusts that something in `atoms/` is safe to reuse. If moving it feels wrong, the component is doing two jobs — split it.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06).

### [R9](#R9) Demote too

The ladder runs both ways, and the downward direction is the one everybody skips — nothing prompts it, so attach it to the change that causes it: when the last privilege its level allows is gone — the last read _and_ the last domain prop — move it in that change. Leaving it put keeps a component in a directory whose rules it no longer needs, and the level stops predicting what is inside. Demotion is also the cheapest reuse there is.

**Enforcement:** review — nothing notices that a component has stopped using a privilege.

### [R10](#R10) Five levels, no sixth

Atom, molecule, organism, template, page. Not `widgets/`, not `common/`, not a level invented for what is hard to classify. A sixth is always proposed for the same reason — a component that does not fit — and the difficulty is the signal: two jobs ([R8](#R8)), or classification by size ([R1](#R1)). Five levels everyone applies beats seven each applies differently. Which levels need a story is [FE_21](../index.html#FE_21)'s question.

**Enforcement:** review — a directory allow-list under `components/` is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

## Worked example

An orders page needs a status badge, a control to filter by status, and the table.

The badge renders one element, composes nothing ([R2](#R2)), and says `status`, not `order` ([R4](#R4)). Atom. The filter composes a label and a select into one job and holds its menu state, naming nothing from the domain ([R3](#R3)). Molecule. The table reads the orders and knows what one is ([R5](#R5)). Organism.

```
app/orders/_components/     one route, so no level directory — but every file has a level
  status-badge.tsx          atom       status: 'open' | 'paid'
  filter-select.tsx         molecule   options, value, onChange
  order-table.tsx           organism   reads orders, renders both
```

Two weeks later the badge needs a tooltip and reaches for the tooltip atom. That import makes it a molecule ([R2](#R2)) — not because it grew but because it started arranging. It is still route-private, so nothing moves; only its level changed ([R8](#R8)). When invoices becomes a second consumer it climbs to `components/molecules/`, and the level first appears in a path.

Later a second surface renders the table over a customer's orders, which it already holds, so the table stops reading and takes `orders` as a prop. It decides nothing now but still names the domain, so it stays an organism ([R4](#R4)). Had the prop become plain rows, that would be a demotion ([R9](#R9)): losing the fetch is not losing the domain.

## Checklist

- The level was chosen by the questions in [R1](#R1), not by size ([R1](#R1)).
- Nothing in `atoms/` imports another component ([R2](#R2)).
- Every molecule has one nameable job and adds nothing else ([R3](#R3)).
- No props type below organism names a domain concept ([R4](#R4)).
- No read and no business rule below organism ([R5](#R5)).
- Templates take their sections as children and own no data ([R6](#R6)).
- No page outside the routes, and no page reused ([R7](#R7)).
- Anything that outgrew its level was reclassified, and moved if it lives under `components/` — no exception granted ([R8](#R8)).
- Anything that lost its privileges moved down ([R9](#R9)).
- No directory under `components/` beyond `atoms/`, `molecules/`, `organisms/`, `templates/` ([R10](#R10)).

## Open questions

- [FE_01](../index.html#FE_01) asks whether encoding the level in the path costs too much at the atom/molecule line. It does not, and [R2](#R2) is why: that boundary has a mechanical test — does the file import another component — so crossing it is a rename, not a redesign, and the props do not change. It is crossed routinely, as the example shows, and that is affordable because the test is mechanical. The expensive boundary is molecule/organism: settled below that line, provisional above it.
- [R2](#R2) and [R5](#R5) are each one import-boundary rule; neither exists. Each turns a level's contract into something CI can hold — [INFRA_06](../index.html#INFRA_06) owns adding them. Both reach only the shared tree, because only there is the level a path ([R1](#R1)); classification inside a route's private folder is review by construction.
- [R4](#R4) depends on which words are domain words — [GEN_14](../index.html#GEN_14)'s list. Until it exists the rule is applied from memory, and two reviewers can disagree in good faith about `account`.

## Related

Requires [FE_01](../index.html#FE_01). See also [INFRA_06](../index.html#INFRA_06), [FE_21](../index.html#FE_21).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/components/`, `apps/web/app/todo-lists/_components/`

---

[← All conventions](../index.html)
