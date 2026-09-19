# 0004 — Convention documents may cite a reference implementation

Status:   accepted
Date:     2026-09-19
Deciders: kritpavin

## Context

`BE_01`–`BE_13` hold 130 rules and, until now, no worked implementation. An agent
told to follow them had prose and nothing to pattern-match against, which is the
most expensive way to learn a convention: every author re-derives the same shape
and gets it slightly differently.

An example module (`apps/api/src/modules/todo`, with `activity-log` beside it)
now exists to close that gap. Code cites the rule it satisfies in a comment —
that direction needs no permission, because a comment names an id, not a path.

The reverse direction is blocked. `GEN_12#R6` forbids a document from stating a
project fact, and a path to a specific file is one: it is wrong the day the file
moves, and wrong again the moment the document set is copied into a project that
deleted the example. `GEN_12#R9` compounds it by allowing only
`../index.html#<ID>` links, so there is no sanctioned way to write the path down
even when it is correct.

Without a decision, an author who wants to point a reader at working code either
breaks `R6` quietly or leaves the example undiscoverable.

## Decision

A convention document may carry exactly one **Reference implementation** line, at
the end of its **Related** section, naming one or more paths to example code that
demonstrates its rules.

The carve-out is narrow and conditional on all of the following:

- It appears only in **Related**, only as the last line, and nowhere else in the
  document. No rule, no example and no prose may cite a path.
- It names example code, which `PROJECT.md` §3 already governs. A document may
  not point at product code, whose lifetime nothing tracks.
- It is phrased as a condition, not a fact: the reader is told the path holds a
  reference implementation *where `PROJECT.md` §3 still lists it*. A project that
  deleted the example deletes the line, which `GEN_03#R5` already makes part of
  initialization.

## Alternatives

- **Leave `R6` alone; discover the example by convention.** Rejected: an example
  nobody can find from the document teaches nobody. The pairing is the point.
- **Put the pointer in the index entry's `data-paths`.** Rejected: `data-paths`
  means "this document governs these globs" and is used to build a read set.
  Overloading it with "and here is an example" breaks `GEN_01#R4`.
- **Put the pointer only in `PROJECT.md` §3.** Rejected: §3 says which code is
  example code, not which convention each piece demonstrates. The mapping is
  many-to-many and belongs next to the rules.
- **Allow paths anywhere in a document.** Rejected: that is `R6` repealed rather
  than narrowed, and the failure mode `R6` exists to prevent — documents that rot
  the day the tree moves — returns in full.

## Consequences

- `GEN_12#R3`'s **Related** row and `GEN_12#R6` are amended to describe the
  carve-out. `GEN_12` moves to `updated 2026-09-19`.
- A moved or deleted example breaks the line silently. Nothing checks it today;
  a path-existence check over `docs/conventions/**` is now the cheapest
  outstanding guardrail and is logged in `INFRA_06`'s open questions.
- `GEN_03#R5` gains a step in practice: deleting the example code also means
  deleting the reference lines that point at it. Called out in `GEN_03`'s
  checklist rather than left implicit.
- The rule stays honest only while the example does. An example that drifts from
  the convention it claims to demonstrate is now a documentation bug, not just
  stale code.

Supersedes: —
Referenced by: GEN_12, BE_01–BE_13
