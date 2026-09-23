---
title: 'FE_05 · Component API conventions'
id: 'FE_05'
area: 'FE'
tier: 'P1'
status: 'stable'
updated: '2026-09-22'
requires: [FE_02]
see_also: [FE_06]
---

[Conventions](../index.html) / Frontend / FE_05

# [FE] Component API conventions

`P1` · `FE_05` · `stable` · `updated 2026-09-22`

**Open when:** you are deciding what props a component takes.

Prop naming and shape, composition over configuration, controlled vs uncontrolled, ref forwarding, polymorphic components, and passing accessibility attributes through.

## The rules

If you read nothing else:

1. <a id="R1"></a>Declare props as an exported `type` alias named `<Component>Props`. Never an `interface`.
2. <a id="R2"></a>Order props required data, optional data, behavior flags, callbacks — and destructure them in that order.
3. <a id="R3"></a>Name a callback prop `on<Event>` and its implementation `handle<Event>`. Never name a boolean for its false state.
4. <a id="R4"></a>Take a second `ReactNode` prop as a child, not as a prop.
5. <a id="R5"></a>Pair every `value` with its `onChange`, and never copy a prop into state.
6. <a id="R6"></a>Forward `ref` and spread the remaining props onto the underlying element, last — on components that render exactly one.
7. <a id="R7"></a>Let `id`, `role` and every `aria-*` prop through to the element that needs them.
8. <a id="R8"></a>Add an `as` prop only when the rendered element genuinely varies, and type it so the element's own props are checked.
9. <a id="R9"></a>Turn a value every call site passes into a default or a named variant.
10. <a id="R10"></a>Delete a prop nothing passes.

## Why

A component's props are its public API, and they are the part of a frontend that is most expensive to change later: every caller pays for a rename, and callers accumulate faster than anyone audits them. The rules below exist so that the shape of that API is decided by a convention rather than by whoever wrote the first version, which is what lets a reader predict a component's props before opening it.

The second concern is what a prop invites. A component with eleven optional flags is not flexible; it is a component that has absorbed the decisions of four different pages and can no longer be reasoned about in isolation. Most of these rules push in the same direction — take structure as children, take behavior as one callback, and let the underlying element keep its own contract instead of re-inventing a worse one.

## Rule detail

### [R1](#R1) One exported props type

Props are declared once, as a `type`, exported, and named for the component so the two can never drift apart in a search. Consistency here is worth more than the differences between the two declaration forms: a codebase that mixes them makes every reader check which one they are looking at, and declaration merging — the one thing an `interface` adds — is a feature nobody wants applied to a component's props by accident. Export it because callers legitimately need to build on it.

**Enforcement:** review — the type form and the name are checkable and are a candidate guardrail ([INFRA_06](../index.html#INFRA_06)); whether the type describes the right props stays review either way.

### [R2](#R2) A fixed prop order

Required data first, then optional data, then flags that change behavior, then callbacks. The order is arbitrary in the same way that alphabetization is arbitrary and useful for the same reason: a reader scanning the top of the type learns what the component cannot render without before learning what it can be nudged into doing. Destructuring in the same order keeps the signature and the body telling one story.

**Do**

```
export type OrderRowProps = {
  orderId: string;
  total: Money;
  placedAt?: string;
  compact?: boolean;
  onSelect?: (orderId: string) => void;
};
```

**Don't**

```
export type OrderRowProps = {
  onSelect?: (orderId: string) => void;
  compact?: boolean;
  orderId: string;      // the required data, third
  placedAt?: string;
  total: Money;
};
```

**Enforcement:** review — the four groups are not machine-distinguishable.

### [R3](#R3) Callback and boolean naming

`on<Event>` is the prop; `handle<Event>` is the function passed to it. Keeping the two spellings distinct means a reader can tell a component's surface from its implementation at a glance, and it stops the same identifier meaning two things in one file. Booleans are named for the state that makes them true — `disabled`, not `enabled` used as a negative, and never `hideFooter`, which forces the reader to evaluate a double negative every time it is false. [GEN_07#R1](../index.html#GEN_07) owns naming generally; this is the part that is specific to a component's surface.

**Enforcement:** review — a prefix check would catch the callback half and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R4](#R4) Composition over configuration

One small node prop — an icon, a single action — is fine. The moment a component wants a second one, the markup it is being handed has structure, and structure passed as props arrives as an unordered bag: the call site stops looking like the thing it renders, and the component grows conditional spacing for the slots that might be missing. Children fix both. Each sub-component owns its own placement, an omitted section costs nothing, and the JSX at the call site has the shape of the output.

**Do**

```
<PageHeader>
  <PageHeader.Title>Orders</PageHeader.Title>
  <PageHeader.Subtitle>Last 30 days</PageHeader.Subtitle>
  <PageHeader.Actions>
    <ExportButton />
  </PageHeader.Actions>
</PageHeader>
```

**Don't**

```
<PageHeader
  title={<h1>Orders</h1>}
  subtitle={<p>Last 30 days</p>}
  actions={<ExportButton />}
  banner={notice ? <Notice /> : null}
/>
```

**Enforcement:** review — counting `ReactNode` props in a type is checkable and is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)); whether a slot is "small" is review.

### [R5](#R5) Controlled, uncontrolled, or both on purpose

A `value` prop without an `onChange` produces a field the user cannot type in, and the bug reads like a framework problem rather than an API one. Offer `value` plus `onChange` for the controlled form, `defaultValue` for the uncontrolled one, and never both in the same call — as a union whose members exclude each other's props. A plain union is not enough: it catches the missing `onChange` and lets a call passing both straight through, because a union admits any property one member declares. Copying a prop into state with an effect is the same mistake wearing a disguise: it creates a second source of truth that is correct exactly until the prop changes. Where the value should live in the first place is [FE_17](../index.html#FE_17)'s subject.

**Do**

```
export type FieldProps =
  | { value: string; onChange: (v: string) => void; defaultValue?: never }
  | { value?: never; onChange?: never; defaultValue?: string };

<Field value={v} onChange={handleChange} />              // ok
<Field defaultValue="draft" />                           // ok
<Field value={v} />                                      // TS2322
<Field value={v} onChange={handleChange} defaultValue="d" />  // TS2322
```

**Don't**

```
export type FieldProps =
  | { value: string; onChange: (v: string) => void }
  | { defaultValue?: string };

<Field value={v} onChange={handleChange} defaultValue="d" />  // compiles
```

**Enforcement:** partly automated — written with those mutual exclusions, the props type makes both invalid calls a compile error for every caller; that the author wrote it that way, and the effect-copy pattern, are review.

### [R6](#R6) Forward the ref, spread the rest

A component that renders exactly one element is a wrapper, and a wrapper that swallows `ref` breaks focus management, scroll-into-view, measurement, and every library that needs a handle on a node — usually far from the file that caused it. Extend that element's own props, spread what you did not name onto it, and put the spread last so a caller can override a default you set. Components that render a subtree do not spread: there is no single obvious destination, and picking one silently is worse than not offering it.

**Do**

```
export type IconButtonProps =
  React.ComponentPropsWithRef<'button'> & { label: string };

export function IconButton({ label, children, ...rest }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} {...rest}>
      {children}
    </button>
  );
}
```

**Don't**

```
export type IconButtonProps = {
  label: string;
  onClick: () => void;   // one of the element's twenty props, re-declared
};

export function IconButton({ label, onClick }: IconButtonProps) {
  // no ref, no type, no aria-*, no data-* — all swallowed
  return <button onClick={onClick} aria-label={label} />;
}
```

**Enforcement:** review — nothing detects a wrapper that quietly drops its ref.

### [R7](#R7) Accessibility props pass through

A caller labelling your component, associating it with a description, or marking it current must be able to. Extending the element's props ([R6](#R6)) gives you this for free; a hand-listed props type takes it away, and the caller's only remaining option is a wrapper element that changes the layout. When a component renders several elements, route these deliberately — the label belongs on the control, not on the decorative container around it. Which attributes a component _must_ carry is [FE_06](../index.html#FE_06)'s subject, not this one's.

**Enforcement:** review — accessibility linting catches missing attributes, not ones a component refuses to accept ([FE_06](../index.html#FE_06)).

### [R8](#R8) Polymorphism is a last resort

An `as` prop is justified when one visual treatment genuinely has to render as different elements — a button that is sometimes a link, a heading whose level depends on where it sits. It is not justified as a way to avoid writing a second component, because the cost lands on everyone: the props type becomes generic, the errors get worse, and the component's real contract gets harder to read. When you do add it, keep it typed, so passing an anchor's `href` is only valid when the element is an anchor.

**Enforcement:** review — the type check follows from the implementation, but the decision to be polymorphic is a judgment.

### [R9](#R9) The same argument everywhere is a default

If every call site passes the same value, that value is not a decision the caller is making — it is the component's behavior, restated at every use, waiting to drift. Make it the default. If two clusters of call sites pass two different sets of values, that is a variant: name it, and let the prop select between named variants instead of exposing the knobs individually. This is the rule that keeps a shared component's surface from growing in proportion to the number of pages that use it.

**Enforcement:** review — a grep over call sites shows it, but nothing runs that grep.

### [R10](#R10) A prop with no caller is not API

An optional prop nobody passes is surface without a user: it is untested, it constrains every future refactor, and it reads as a supported feature to the next person. Delete it and add it back when a caller exists — the same reasoning that governs promotion in [FE_01#R4](../index.html#FE_01), applied one level down.

**Enforcement:** review — dead-code analysis rarely reaches individual props.

## Worked example

A confirmation dialog is needed on the orders page. The first draft takes everything as props, which is how most of them start:

```
type ConfirmDialogProps = {
  title: ReactNode;
  body: ReactNode;
  footer: ReactNode;
  hideClose?: boolean;
  onOk: () => void;
};
```

Three node props means the structure belongs to the children ([R4](#R4)). `hideClose` is named for its false state ([R3](#R3)), and `onOk` names a button rather than an event. The dialog also renders one element at its root, so it should extend that element's props rather than list a few of them ([R6](#R6), [R7](#R7)).

```
export type ConfirmDialogProps =
  React.ComponentPropsWithRef<'dialog'> & {
    open: boolean;
    dismissible?: boolean;
    onConfirm: () => void;
    onDismiss?: () => void;
  };
```

Required data, then the optional flag, then callbacks ([R2](#R2)); every `aria-*` the caller needs still reaches the element. The sections become sub-components, so a dialog without a footer needs no conditional spacing:

```
<ConfirmDialog open={isOpen} onConfirm={handleConfirm} aria-labelledby="del">
  <ConfirmDialog.Title id="del">Delete order?</ConfirmDialog.Title>
  <ConfirmDialog.Body>This cannot be undone.</ConfirmDialog.Body>
</ConfirmDialog>
```

Two months on, every caller passes `dismissible={false}`. That is not a decision anyone is making, so it becomes the default and comes off the call sites ([R9](#R9)). If a second caller then wants the dialog to render as a non-modal panel, resist `as` until the visual treatment is genuinely identical ([R8](#R8)) — two components are usually the cheaper answer.

## Checklist

- Props are an exported `<Component>Props` type alias ([R1](#R1)).
- Required, optional, flags, callbacks — in the type and in the destructure ([R2](#R2)).
- Callbacks are `on<Event>`; no boolean is named for its false state ([R3](#R3)).
- At most one `ReactNode` prop; the rest are children ([R4](#R4)).
- Controlled and uncontrolled forms are distinct, and no prop is copied into state ([R5](#R5)).
- Single-element components forward `ref` and spread rest last ([R6](#R6)).
- `id`, `role` and `aria-*` reach the right element ([R7](#R7)).
- Any `as` prop is justified in the pull request and typed ([R8](#R8)).
- No value is passed identically at every call site ([R9](#R9)).
- No prop without a caller ([R10](#R10)).

## Open questions

- Only [R5](#R5) is enforced today, and only by a type the author has to write. [R1](#R1) and [R3](#R3) are the two a lint rule could take over almost entirely, and [R4](#R4)'s node-prop count is a type-level check — [INFRA_06](../index.html#INFRA_06) owns adding them.
- [R6](#R6) assumes a component's underlying element is stable enough to extend its props. For components in the shared package that constraint is stronger, because the element becomes part of a published surface — [FE_13](../index.html#FE_13) should say whether it is allowed to change in a minor version.
- [R9](#R9) says a cluster of call sites becomes a variant but not where variants are declared, which depends on how styling expresses them ([FE_04](../index.html#FE_04)).

## Related

Requires [FE_02](../index.html#FE_02). See also [FE_06](../index.html#FE_06).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/web/components/atoms/`, `apps/web/components/molecules/page-header.tsx`

---

[← All conventions](../index.html)
