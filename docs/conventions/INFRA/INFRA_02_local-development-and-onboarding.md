---
title: "INFRA_02 · Local development & onboarding"
id: "INFRA_02"
area: "INFRA"
tier: "P0"
status: "stable"
updated: "2026-09-19"
requires: [GEN_01]
see_also: [INFRA_04, INFRA_07, INFRA_10]
---

[Conventions](../index.html) / Infrastructure / INFRA_02

# [Infra] Local development & onboarding

`P0` · `INFRA_02` · `stable` · `updated 2026-09-19`

**Open when:** you need the project running on your machine.

Zero-to-running in one command: prerequisites, install, compose up, seed data, and the standard task names (`dev`, `build`, `test`, `lint`) every workspace must expose.

## The rules

If you read nothing else:

1. <a id="R1"></a>A clean clone reaches a running application in one documented command, on a machine with only the declared prerequisites.
2. <a id="R2"></a>Declare prerequisites as pinned versions in the repository, not as instructions in a README.
3. <a id="R3"></a>Never require a global install for something the repository can provide locally.
4. <a id="R4"></a>Backing services start from the repository's own definition, at the versions production uses.
5. <a id="R5"></a>Ship the example environment file so that copying it is enough to start.
6. <a id="R6"></a>Ship seed data that is deterministic, idempotent, and safe to re-run.
7. <a id="R7"></a>Every workspace answers to the same task names, runnable from the root or scoped to one workspace.
8. <a id="R8"></a>Anything a developer must do once is a script. Anything they must remember is a default.
9. <a id="R9"></a>A failed first run is a defect in the setup, not in the person running it.
10. <a id="R10"></a>Change the setup and its documentation in the same change, and verify it from a clean clone.

## Why

The first hour decides more than it should. A setup that takes a day teaches everyone that the repository is fragile, and the workarounds people invent to get running — a globally installed tool, a hand-edited environment file, a service someone started once — become invisible differences between machines. Every "works on mine" is one of those, made months earlier.

The second reason is that the same path is walked by more than people. The pipeline installs and builds from a clean checkout every time ([INFRA_09](../index.html#INFRA_09)), and an agent working in this repository starts from the same state with none of the tribal knowledge. If the documented path is not the real path, both fail in ways that look like bugs in the code.

So the target is not "documented"; it is *short*. Every step in the onboarding path is a step that can rot, and the way to keep it correct is to have fewer of them.

## Rule detail

### [R1](#R1) and [R2](#R2) One command, pinned prerequisites

The documented path is: clone, install, start. Anything else that must happen — generating a client, building a package other workspaces import, starting a database — is either part of that command or part of the task graph that command triggers ([INFRA_13](../index.html#INFRA_13)).

Prerequisites are declared where a tool can read them, not prose a person interprets: the package manager and its version, the runtime and its version, and the container runtime if services need one. A pinned declaration is what makes "it works on my machine" a testable claim. Which versions those are is a project fact — `PROJECT.md` and the manifests hold them, not this document.

**Enforcement:** review — a version check at install time is a candidate guardrail ([INFRA_06](../index.html#INFRA_06)); nothing verifies the documented path itself except a person running it.

### [R3](#R3) Nothing global

A globally installed tool is a version nobody agreed on, invisible in the repository, different on every machine, and absent in the pipeline. Everything the project needs is a dependency of the workspace that needs it, invoked through that workspace's tasks ([INFRA_04](../index.html#INFRA_04)).

The narrow exceptions are the prerequisites themselves — the package manager, the runtime, the container runtime — because something has to exist before the repository can provide anything. That list is short by design, and adding to it is a decision, not a convenience.

**Enforcement:** review.

### [R4](#R4) Services come from the repository

A database, a cache or a broker used in development is defined in the repository and started from it, at a version that matches what production runs ([INFRA_10](../index.html#INFRA_10), [INFRA_12](../index.html#INFRA_12)). Not the one someone installed years ago; not a shared remote instance that two developers can corrupt for each other.

The failure this prevents is the expensive kind: code that works against a locally installed older version and fails in production on a feature that behaves differently, discovered after deploy. Which services a project actually has is a fact in `PROJECT.md` — check there before writing a setup step that assumes one.

**Enforcement:** review.

### [R5](#R5) and [R6](#R6) Environment and data

The example environment file lists every variable the application needs, with values that work locally, so copying it is the whole configuration step ([INFRA_07](../index.html#INFRA_07) owns its conventions and what may never appear in it). A variable that has no safe local value is documented as needing a real one — and it is the only kind of manual step in the path.

Seed data ships with the repository and is deterministic: the same command produces the same data, twice in a row, without failing the second time. That is what makes a bug reproducible between two people, and what lets tests and demos share a known starting point ([BE_12](../index.html#BE_12)).

**Enforcement:** review — a variable present in configuration but missing from the example file is mechanically detectable ([INFRA_06](../index.html#INFRA_06)).

### [R7](#R7) The same verbs everywhere

Every workspace answers to the same task names ([INFRA_01#R7](../index.html#INFRA_01)), which is what lets one command at the root run all of them and one flag scope the work to a single workspace. Someone moving between the API and the web app should not have to learn a second vocabulary, and neither should the pipeline.

A workspace with nothing to do for a task still declares it. A missing task is a hole in the graph; a task that does nothing is an answer.

**Enforcement:** partly automated — the task runner fails on an undeclared task; whether a workspace declares all of them is review.

### [R8](#R8) Scripts and defaults

Two categories of manual step, both removable. Something done once — installing hooks, generating a client, creating a local certificate — becomes a script invoked by the setup command. Something remembered every time — a port, a flag, a service URL — becomes a default in configuration.

The test for a step in this document: could it be code? If yes, it should be, because a documented step is a step that will be skipped, mistyped, or silently changed while the document stays the same.

**Enforcement:** review.

### [R9](#R9) and [R10](#R10) Onboarding is maintained, not written once

When a new person's first run fails, the output of that failure is the highest-value bug report the repository gets, and the fix belongs in the setup rather than in a note passed to the next person. The same applies to an agent: a task that begins by working around a broken install has found a defect ([GEN_02](../index.html#GEN_02)).

So a change that touches installation, services, environment or tasks updates the documented path in the same change, and is verified from a clean clone — a fresh checkout in an empty directory, not the working copy where the missing step already happened three months ago.

**Enforcement:** review — a pipeline job that runs the documented path from scratch is the real check, and belongs to [INFRA_09](../index.html#INFRA_09).

## Worked example

A developer joins and needs the stack running.

They install the two prerequisites their machine does not have, at the versions the repository pins ([R2](#R2)). They clone, copy the example environment file, and run the setup command. It installs dependencies from the lockfile, starts the backing services the project defines, runs migrations, seeds data, and leaves both applications running in watch mode ([R1](#R1), [R4](#R4), [R6](#R6)).

Nothing was installed globally, and no service was already running on the machine ([R3](#R3)). One value in the environment file is a real credential the project cannot fake; it is the only line in the setup document that asks the reader to do something, and it says who to ask ([R5](#R5)).

Now the maintenance half, which is where this document earns its place. A change adds a cache to the API. Three things move together: the service joins the repository's own service definition at the version production will run ([R4](#R4)), its connection variable is added to the example file with a working local value ([R5](#R5)), and the setup command starts it without any new step for the reader ([R8](#R8)). Nobody is told to "also run the cache".

The change is verified by cloning into an empty directory and running the documented path — not by running it in the working copy, where the service is already up and the variable is already set ([R10](#R10)). That distinction is the whole rule: the second check passes for everyone who already has the project working, which is everyone except the person this document is for.

## Checklist

- A clean clone reaches a running app with the documented command ([R1](#R1)).
- Prerequisites are pinned in the repository ([R2](#R2)); nothing new requires a global install ([R3](#R3)).
- Backing services come from the repository's own definition, at production versions ([R4](#R4)).
- Every new variable is in the example file with a safe local value ([R5](#R5)).
- Seeds are deterministic and safe to re-run ([R6](#R6)).
- The workspace declares every standard task ([R7](#R7)).
- New manual steps became scripts or defaults ([R8](#R8)).
- The setup path and its documentation changed together, verified from a clean clone ([R10](#R10)).

## Open questions

- [R10](#R10)'s clean-clone verification is manual, and it is the step most likely to be skipped precisely when it matters — on the change that breaks onboarding. A scheduled pipeline job doing exactly this is the fix and belongs to [INFRA_09](../index.html#INFRA_09).
- The document assumes one setup command exists. Whether it is a script, a task, or the package manager's own lifecycle hook is unsettled, and the first implementation will set the precedent.
- Nothing says what the setup does when a prerequisite is present but at the wrong version — fail, warn, or attempt an install. Failing loudly is the safest default and is not yet decided.

## Related

Requires [GEN_01](../index.html#GEN_01). See also [INFRA_04](../index.html#INFRA_04), [INFRA_07](../index.html#INFRA_07), [INFRA_10](../index.html#INFRA_10).

---

[← All conventions](../index.html)
