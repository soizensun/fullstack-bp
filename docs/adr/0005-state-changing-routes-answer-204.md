# 0005 — State-changing routes answer 204, not 200 with the resource

Status:   accepted
Date:     2026-09-19
Deciders: kritpavin

## Context

Building the reference implementation surfaced a conflict between three rules
that cannot all hold for a `PATCH` or a sub-resource action:

- `BE_07#R2`'s table maps *change some fields* to `PATCH` → `200`, and an
  *action finished when the response is sent* to `POST` → `200`.
- `BE_07#R7` says a `200` returns the resource itself, not an envelope.
- `BE_05#R3` says a use case either changes state or answers a question, never
  both.
- `BE_07#R3` says a controller validates, calls **exactly one** use case, and
  returns its result.

To answer `200` with the resource, a command use case must also read — which
`BE_05#R3` forbids — or the controller must call a second use case, which
`BE_07#R3` forbids. There is no arrangement that satisfies all four.

`GEN_01#R7` breaks ties for the lower-numbered document of the same area, so
`BE_05` wins and `BE_07`'s table is the rule that has to give.

## Decision

A route that only changes state answers `204 No Content`.

- `PATCH` and sub-resource actions that mutate and return nothing → `204`.
- `POST` that creates → `201` with the new resource's identity. Returning the id
  of the thing you just made is not a read: nothing was queried to produce it,
  and `BE_07#R8`'s idempotent replay needs it.
- An action whose *result* is genuinely new information — bulk completion
  reporting which items changed — answers `200` with that result. It is still not
  a read: the value is a product of the change, not a projection of stored state.
- A caller that wants the updated resource issues the `GET`. That is one extra
  round trip, and it keeps the command path free of a read.

`BE_07#R2`'s table gains a *Change state, return nothing* → `204` row, and a note
that `200` applies where an action produces a result of its own.

## Alternatives

- **Let commands return the updated projection.** Rejected: it repeals
  `BE_05#R3` for every mutating route, which is most of them, and the CQRS split
  that rule protects is the reason the read side can diverge from the write side
  at all.
- **Let the controller call a command then a query.** Rejected: it repeals
  `BE_07#R3`, and it hides a second use case behind one route, so the
  specification no longer says what a route does.
- **Return `200` with an empty body.** Rejected: dishonest. `204` is the status
  that means exactly this, and a `200` with no body confuses generated clients.
- **Keep the conflict and let each author pick.** Rejected: it guarantees the
  API is inconsistent across modules, which is the failure the convention set
  exists to prevent.

## Consequences

- Clients that want the post-change state make a second request. For a UI that
  already re-fetches a list after a change, this costs nothing; for one that
  optimistically renders the response body, it is a change.
- The generated specification is more honest: a `204` route declares no response
  schema, so nothing implies a body that is not sent.
- `BE_07` moves to `updated 2026-09-19`. `BE_05` is unchanged — it won.
- The reference implementation follows this: `PATCH /v1/todo-lists/{id}`,
  `POST .../archive`, `POST .../complete` and `POST .../reopen` all answer `204`;
  `POST /v1/todo-lists` answers `201`; `POST .../items/complete` answers `200`
  with the ids it changed.

Supersedes: —
Referenced by: BE_05, BE_07
