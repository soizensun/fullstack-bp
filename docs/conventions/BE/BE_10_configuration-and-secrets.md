---
title: "BE_10 · Configuration & secrets in the application"
id: "BE_10"
area: "BE"
tier: "P1"
status: "draft"
updated: "2026-09-19"
requires: [INFRA_07, GEN_09]
---

[Conventions](../index.html) / Backend / BE_10

# [BE] Configuration & secrets in the application

`P1` · `BE_10` · `draft` · `updated 2026-09-19`

**Open when:** the code needs a value that differs per environment.

The typed, schema-validated config module, fail-fast on boot, the ban on reading `process.env` anywhere else, and per-module config namespaces.

## The rules

If you read nothing else:

1. <a id="R1"></a>Read `process.env` in exactly one file. Everywhere else, configuration arrives as an injected value.
2. <a id="R2"></a>Parse the whole environment against a schema at boot, and exit non-zero when it fails.
3. <a id="R3"></a>Hand out typed values — numbers, booleans, durations, lists — never raw strings.
4. <a id="R4"></a>Split configuration into namespaces, and give a module only the namespace it needs.
5. <a id="R5"></a>Never default a secret, and never default a value whose fallback would weaken production.
6. <a id="R6"></a>Never branch on the environment name in business code. Express the difference as a configuration value.
7. <a id="R7"></a>Derive computed values once, at boot, inside the config layer.
8. <a id="R8"></a>Keep configuration out of the domain entirely. A rule that varies takes its value as an argument.
9. <a id="R9"></a>Ship a new variable's schema entry and its example entry in the same change.
10. <a id="R10"></a>Never log a configuration value, return one from an endpoint, or put one in an error message.

## Why

Configuration failures share one shape: the application starts, serves traffic, and only fails when it reaches the line that needed the value that was never set. That might be minutes later, in a payment path, at a time when the deployment already looks successful. Parsing everything at boot converts that class of incident into a container that will not start — the cheapest possible failure, at the moment someone is already watching.

The second problem is dispersion. `process.env.SOMETHING` is legal in every file, always a `string | undefined`, and invisible to every audit. Once dozens of them exist, nobody can list what the application needs to run, the same variable is read with two different fallbacks in two files, and a rename becomes a search-and-hope. One boundary file makes the requirement a declaration: the schema *is* the answer to "what does this service need".

Secrets sharpen both. A defaulted secret is worse than a missing one, because it works — quietly, with a value that is in the source, and therefore in the repository, forever ([GEN_09](../index.html#GEN_09)).

## Rule detail

### [R1](#R1) One reader

One file in `config/` touches `process.env`; every other file receives values through injection. That file is the only place where a variable name appears as a string, which makes the set of variables greppable and a rename a single edit.

The rule extends to indirect reads: no framework helper that resolves a variable by name at a call site, and no library configured with a bare environment lookup somewhere in a module file.

**Enforcement:** review — a lint rule banning `process.env` outside `config/` is the obvious guardrail and is a candidate for [INFRA_06](../index.html#INFRA_06); the boundary file itself carries the single documented exception.

### [R2](#R2) Fail fast, at boot

Parse the environment against the schema before the application is constructed, and exit non-zero with the list of what failed — every failure at once, not the first. A configuration mistake is then a startup log a human can read and a deployment that never takes traffic.

What must not happen is a partial start: parsed lazily on first use, or with a warning and a fallback. Both convert a config error into a runtime incident, and the fallback path is the one nobody tested.

**Do**

```
const parsed = ApiEnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.issues);
  process.exit(1);
}
```

**Enforcement:** review.

### [R3](#R3) Typed, not stringly

The environment is strings; nothing downstream should be. Coerce in the schema: a port is a positive integer, a timeout is a number of milliseconds, a flag is a boolean, an origin list is an array. Bound what can be bounded — a positive integer, a minimum secret length, a URL that parses — so the invalid value is rejected at boot rather than interpreted later.

`Number(process.env.TIMEOUT)` scattered through the code is the failure this prevents: `NaN` propagates a long way before it means anything.

**Enforcement:** partly automated — the type-checker keeps consumers honest once the schema derives the type; the coercion itself is review.

### [R4](#R4) Namespaces

Group values by the concern that uses them — the HTTP server, the store, the cache, the mail provider — and inject the group. A module that receives one namespace cannot accidentally depend on another module's settings, and reading a module file tells you what environment it needs.

One flat object injected everywhere is the anti-pattern: it makes every module depend on every variable, so nothing can be extracted later without carrying the whole schema.

**Enforcement:** review.

### [R5](#R5) No secret has a default

A default for a secret means the application starts without it, in production, with a value that is public. Secrets are required fields with no fallback and a minimum length. The same applies to any value whose default weakens the system: an allow-list that defaults to "everything", a verification flag that defaults to off, a token lifetime that defaults to a year.

Defaults are for values that are genuinely safe everywhere — a page size, a local port, a log level.

**Enforcement:** review — checklist item in [GEN_06](../index.html#GEN_06); a schema convention of "no `.default()` on a secret-named field" is checkable ([INFRA_06](../index.html#INFRA_06)).

### [R6](#R6) No environment-name branching

`if (env === 'production')` in business code is a rule that was never tested where it matters, in the environment where it does not run. Whatever the branch was protecting is a capability: name it — `emailDeliveryEnabled`, `seedDataEnabled`, `strictOriginCheck` — and let each environment set it.

Composition-time differences are the exception: choosing which adapter implements a port in the module file is a wiring decision ([BE_02](../index.html#BE_02)), and it is still driven by a named configuration value rather than by the environment's name.

**Enforcement:** review.

### [R7](#R7) and [R8](#R8) Derive at boot; keep the domain clean

Values assembled from other values — a full base URL, a decoded key, a parsed list — are computed once in the config layer and injected in final form. Recomputing per request is wasted work and, worse, a second place the derivation can be wrong.

And the domain never sees any of it. A rule that depends on a configured number takes that number as an argument, from the use case that has it ([BE_04](../index.html#BE_04), [BE_02](../index.html#BE_02)). Otherwise the domain acquires an environment, and its tests acquire a fixture.

**Enforcement:** review.

### [R9](#R9) The variable and its example ship together

A new variable that is not in the example file breaks every other developer's next start, and the breakage looks like a bug in the code they just pulled. The schema entry, the example entry and the code that uses it belong to one change. What the example file may contain — a placeholder, never a real value — and how secrets reach each environment are [INFRA_07](../index.html#INFRA_07)'s.

**Enforcement:** review.

### [R10](#R10) Configuration does not travel

No configuration value in a log line, a trace attribute, an error message, a health response or a debug endpoint. This applies to more than secrets: internal hostnames, bucket names, provider account identifiers and queue names are reconnaissance, and they leak by being convenient to print while debugging.

The exception is a deliberate, curated startup line — the values chosen for it, never the object.

**Enforcement:** review.

## Worked example

The API app's configuration, end to end.

`config/env.ts` is the only file that mentions `process.env` ([R1](#R1)). It parses one schema per namespace and exits on failure ([R2](#R2)):

```
export const ApiEnvSchema = schema.object({
  PORT: schema.coerce.number().int().positive().default(3000),
  API_BASE_URL: schema.url(),
  SESSION_SECRET: schema.string().min(32),          // no default: R5
  ALLOWED_ORIGINS: schema.csv(schema.url()),        // typed as a list: R3
  SESSION_IDLE_TTL_MS: schema.coerce.number().int().positive().default(30 * 60 * 1000),
});
```

`SESSION_SECRET` has a minimum length and no fallback, so a deployment with a placeholder never starts. `ALLOWED_ORIGINS` arrives as an array, so the CORS setup does not split a string at a call site ([R3](#R3)). `SESSION_IDLE_TTL_MS` has a default, because thirty minutes is safe everywhere.

A module that needs the mail provider injects the mail namespace and nothing else ([R4](#R4)). Its adapter receives an object with a typed host, port and credential; it never learns the variable names, so replacing the provider is a change to one namespace and one adapter ([BE_03](../index.html#BE_03)).

Now the rule that varies. Suppose a draft article expires after a configured number of days. The temptation is for the entity to read the config. Instead the use case reads it and passes it in — `article.expireIfOlderThan(now, this.articleConfig.draftTtlDays)` — so the rule stays testable with a literal and the domain stays free of the environment ([R8](#R8)).

Finally, what the change looks like in review: a schema entry, an example entry, a namespace consumer, and no new `process.env` anywhere ([R9](#R9)). If the diff shows a variable read at a call site, the review question is not "is this value right" but "why is it here".

## Checklist

- No new `process.env` outside the config boundary ([R1](#R1)).
- The variable is in the schema, and a bad value stops the boot ([R2](#R2)).
- The value is typed and bounded, not a string ([R3](#R3)).
- It belongs to a namespace, and only its consumers receive it ([R4](#R4)).
- No secret or security-relevant value has a default ([R5](#R5)).
- No branch on the environment name ([R6](#R6)).
- Derived values are computed at boot ([R7](#R7)); the domain takes values as arguments ([R8](#R8)).
- The example file was updated in the same change ([R9](#R9)).
- No configuration value is logged, returned or embedded in an error ([R10](#R10)).

## Open questions

- [R1](#R1) is the rule this document exists for and the one most easily broken by a single convenient line; a lint rule would end the discussion permanently and belongs to [INFRA_06](../index.html#INFRA_06).
- Secret rotation without a restart has no answer here: every value is parsed at boot, so rotating one means a deploy. That is acceptable at small scale and should be revisited when a secrets manager is introduced ([INFRA_07](../index.html#INFRA_07)).
- Whether feature flags are configuration or their own subsystem is unresolved ([R6](#R6) pushes toward configuration); [INFRA_16](../index.html#INFRA_16) owns their lifecycle and the boundary between the two is not drawn.

## Related

Requires [INFRA_07](../index.html#INFRA_07), [GEN_09](../index.html#GEN_09).

Reference implementation, where `PROJECT.md` §3 still lists it: `apps/api/src/config/`

---

[← All conventions](../index.html)
