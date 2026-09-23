# `@repo/api`

The typed client for the API app, and the wire types it is built from.

## What it owns

`GEN_08` puts the contract in one direction: the API app defines it, OpenAPI serializes
it, this package is generated from that, and the web app imports this package and never
redefines a wire type. This package is the third link.

It owns three things and nothing else:

- **`src/generated/schema.ts`** — the wire types, generated from `apps/api/openapi.json`.
  Build output that happens to be committed (`GEN_08#R4`): committed so a checkout
  type-checks without running the API app, never edited, because the next generation
  discards the edit silently.
- **`src/client.ts`** — one typed client over those types, which sets the correlation id
  on every request (`GEN_08#R6`, `FE_10#R5`).
- **`src/api-error.ts`** — one error shape carrying the stable code from the catalogue
  (`GEN_08#R5`, `FE_10#R7`).

It does **not** own view models, formatting, or anything a screen needs — those belong to
the consumer, at its boundary (`FE_10#R6`, `GEN_08#R9`).

## What it exports

`src/entry.ts` is the whole public surface (`GEN_07#R6`): `createApiClient`,
`CORRELATION_ID_HEADER`, `ApiError`, `API_UNREACHABLE`, and the `paths` / `components` /
`operations` types. There are no deep imports past it.

## Tasks

```bash
bun run lint
bun run check-types
```

Regenerating is the API app's task, because the API app owns the contract:

```bash
turbo run contract:generate --filter=api
```

That writes `apps/api/openapi.json` and this package's `src/generated/schema.ts`. Both are
committed, and both must be regenerated — never hand-edited — when the contract changes
([ADR 0006](../../docs/adr/0006-the-contract-is-generated-from-the-api-app.md)).
