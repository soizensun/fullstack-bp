---
title: "GEN_12 · How to write a convention document"
id: "GEN_12"
area: "GEN"
tier: "P1"
status: "stable"
updated: "2026-09-19"
requires: [GEN_01]
---

[Conventions](../index.html) / General / GEN_12

# [General] How to write a convention document

`P1` · `GEN_12` · `stable` · `updated 2026-09-19`

**Open when:** you are writing or updating a document in this folder.

The required shape of every document here — rules, rationale, do/don't with real code, enforcement, related — so a human can skim it and an agent can extract the rule without reading the prose. Includes the template, the voice, and how to update the index.

> One author, one document, one session. Do not write two documents in one pass, and do not edit a document someone else has open. The only shared file you may touch is `../index.html`, and only the entry belonging to your document ([R10](#R10)).

## The rules

If you read nothing else:

1. <a id="R1"></a>The index entry is your commission. Do not change its scope, title, tier or file name.
2. <a id="R2"></a>Before writing a rule, read what the entry requires, the code its `data-paths` cover, and `PROJECT.md`.
3. <a id="R3"></a>Use the required sections, in order, with those names. Add no others.
4. <a id="R4"></a>At most ten rules, each an imperative one-liner with a stable id.
5. <a id="R5"></a>Every rule states its enforcement as `automated`, `partly automated`, `review` or `unenforced` — and never claims automation that does not exist today.
6. <a id="R6"></a>Never state a project fact. State the condition and let the reader check `PROJECT.md` — except for the one **Reference implementation** line [R3](#R3) allows.
7. <a id="R7"></a>One subject, one document. Cite another document's id instead of restating its rule.
8. <a id="R8"></a>700–1,400 words of explanatory prose — the scaffolding this document mandates does not count.
9. <a id="R9"></a>Use the template and the shared stylesheet. No `<style>` block, no classes outside the list.
10. <a id="R10"></a>Update your document's index entry — status and date — and nothing else on the page.

## Why

These documents are written by different people and different models, months apart, and they have to read as though one person wrote them — because a reader who has to re-learn the shape of each document stops reading them. Everything below trades a little of the author's freedom for the reader's ability to skim.

The other half is machine-readability. An agent building a read set needs to extract the rules of a document without consuming the prose around them, which is why the rules are a list at the top with stable ids rather than points made in paragraphs. A document that reads beautifully and cannot be reduced to its rules has failed at its main job.

## Rule detail

### [R1](#R1) The commission

The index entry already fixes the id, title, tier, trigger, scope summary, prerequisites and file name. The file is saved under the entry's `data-area` folder (`docs/conventions/<AREA>/`), so `data-file` stays the bare file name and the index derives the folder — `docs/adr/0002-convention-documents-are-filed-by-area.md` holds the reasoning. Your job is to expand exactly that into a document, not to redesign it. If you believe the entry is wrong — the scope is incoherent, the tier is off, the subject belongs to a neighbour — say so in your report and stop. Silently widening scope is the failure that produces four documents explaining caching slightly differently.

**Enforcement:** review — the header's `data-*` must match the entry, which is mechanically checkable ([INFRA_06](../index.html#INFRA_06)).

### [R3](#R3) The required sections

In this order, with these names. Omit an optional section entirely rather than writing "none".

| # | Section | Required | What it is |
| --- | --- | --- | --- |
| 1 | Header | yes | Id, title, tier, status, date, trigger, summary — copied from the index. |
| 2 | **The rules** | yes | The extractable core. See [R4](#R4). |
| 3 | **Why** | yes | One or two short paragraphs: what breaks without these rules. |
| 4 | **Rule detail** | yes | A block per rule that needs more than its one line. Not every rule does. |
| 5 | **Worked example** | yes | One realistic end-to-end example from this stack. |
| 6 | **Checklist** | yes | Copy-pasteable into a pull request. Mirrors the rules. |
| 7 | **Open questions** | optional | What this document could not decide. See [R5](#R5). |
| 8 | Related | yes | The index relations, as ids. No prose. May end with one **Reference implementation** line — see below. |

**Enforcement:** automated — section names and order are checkable ([INFRA_06](../index.html#INFRA_06)).

### [R4](#R4) The rules are the contract

An agent that reads only **The rules** must be able to write correct code; everything else supports a human. So each one is a single imperative line someone could disobey. A topic is not a rule ("error handling"); nor is a preference ("prefer small functions"); nor is a hedge ("consider using…"). If you cannot phrase it as an instruction, it belongs in **Why**. Ten is the cap — more than that means the commission covers two subjects, which is [R1](#R1)'s problem, not a licence to write eleven.

**Do**

```
<li id="R3" data-rule="R3">
  Return domain errors from the application layer;
  never throw an HTTP exception below the controller.
</li>
```

**Don't**

```
<li>Error handling should generally be consistent
  across layers where possible.</li>
<!-- no id, no instruction, nothing to disobey -->
```

**Enforcement:** automated — the count and the ids are checkable; the wording is review.

### [R5](#R5) Enforcement is a fixed vocabulary

Every rule in **Rule detail** ends with exactly one of these four, because a reader deciding whether to trust a rule needs to know what happens when it is broken.

- **automated** — a lint rule, a type, an architecture test or a CI gate catches it. Name it. Never claim this for something that does not exist yet.
- **partly automated** — a tool catches part of it. Say which part, and which part it cannot see.
- **review** — a human or an agent catches it, via the checklist in [GEN_06](../index.html#GEN_06).
- **unenforced** — nothing catches it. Say so plainly and add it to **Open questions** as a candidate guardrail.

**Enforcement:** automated — the vocabulary is checkable; the truth of an `automated` claim is review.

### [R6](#R6) Never state a project fact

A convention document must not say what this repository is, what stage it is at, what is installed, or what is undecided. Those change, they live in `PROJECT.md`, and a document that repeats them is wrong the day after it is written — and wrong again when the document set is copied into another project. The same applies to counts and inventories: "the 81 documents", "all three example modules", "every entry is `todo`" each have an expiry date. Write the condition instead.

**Do**

```
Open a P3 document when the project has real
users or real load — check PROJECT.md.

Cache with Redis where PROJECT.md lists it as
present; propose it first where it does not.
```

**Don't**

```
This repository is a boilerplate, so P3
does not apply yet.

Redis is not installed yet, so skip this.
```

The one exception is a **Reference implementation** line at the end of **Related**, naming example code that demonstrates the document's rules — the reasoning is in `docs/adr/0004-conventions-may-cite-a-reference-implementation.md`. It is narrow on purpose: one line, only in **Related**, only pointing at code `PROJECT.md` §3 lists as example code, and phrased as a condition so a project that deleted the example deletes the line with it. No rule, no worked example and no paragraph may cite a path.

**Do**

```
Requires [BE_02](../index.html#BE_02). See also [BE_06](../index.html#BE_06).
Reference implementation, where PROJECT.md §3 still lists it:
`apps/api/src/modules/todo/domain/`
```

**Don't**

```
R4: Name a method after the business action — see
    apps/api/src/modules/todo/domain/entity/todo-list.entity.ts
    for how we do it.
```

**Enforcement:** review — a phrase list would catch the obvious cases, and a check that every **Reference implementation** path still exists is the cheapest outstanding guardrail ([INFRA_06](../index.html#INFRA_06)).

### [R8](#R8) The length budget

The budget covers **Why**, **Rule detail**, **Worked example** and **Open questions**. Code, the header, the rules list, the checklist, the enforcement lines and **Related** are excluded — this document mandates them, so they are neither padding nor evidence of a second subject. Above the budget, a document is one of those two things. Under 400 words it probably belongs inside its neighbour, which you say in your report rather than padding to reach the floor.

**Enforcement:** automated — a word count over the four sections ([INFRA_06](../index.html#INFRA_06)).

### [R9](#R9) Markup and voice

`../assets/doc.css` is the only stylesheet, so the set cannot drift apart visually. The available classes are `wrap`, `doc`, `crumb`, `badges`, `badge`, `trigger`, `summary`, `tldr`, `rule`, `rule-id`, `why`, `enforce`, `pair`, `good`, `bad`, `callout`, `checklist` and `table-scroll` — and nothing else. Every cross-document link goes to `../index.html#<ID>`, never to the target file, because most targets have no file yet and the index entry always exists.

On voice: imperative and addressed to the reader; short sentences, one idea each; American English; no hedging — delete *should probably*, *in general*, *arguably*, because a convention that is optional is not a convention. Code examples are TypeScript from this stack, under 25 lines, and plausibly compile. Every **Don't** is a mistake someone would actually make; a strawman teaches nothing.

**Enforcement:** partly automated — the stylesheet, class list and link shape are checkable; the voice is review.

### [R10](#R10) The index entry, and only yours

When the document is done, set its entry's `data-status` and `data-updated`, and change nothing else on the page — it is the one file every author touches. Then report which `todo` entries you had to interpret and any decision you could not make ([GEN_02#R8](../index.html#GEN_02) owns the report format). Open the index afterwards: it validates its own ids, tiers, filenames and budget on load, and a document that breaks one of those shows a banner.

**Enforcement:** automated — the index self-check, plus the parity check between a header and its entry.

## Worked example

The skeleton every document starts from:

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BE_07 · API design standard</title>
    <link rel="stylesheet" href="../assets/doc.css" />
  </head>
  <body>
    <div class="wrap">
      <header class="doc" data-id="BE_07" data-area="BE" data-tier="P1"
              data-status="stable" data-updated="2026-08-15"
              data-requires="BE_05,GEN_08" data-see-also="BE_08">
        <p class="crumb"><a href="../index.html">Conventions</a> / Backend / BE_07</p>
        <h1>[BE] API design standard</h1>
        <div class="badges">
          <span class="badge P1">P1</span><span class="badge">BE_07</span>
          <span class="badge">draft</span><span class="badge">updated 2026-08-15</span>
        </div>
        <p class="trigger"><b>Open when:</b> you are adding or changing an HTTP endpoint.</p>
        <p class="summary">Resource and route naming, verbs and status codes, …</p>
      </header>

      <h2 id="rules">The rules</h2>
      <div class="tldr">
        <p>If you read nothing else:</p>
        <ol><li id="R1" data-rule="R1">Name routes after resources, never actions.</li></ol>
      </div>

      <h2 id="why">Why</h2> …
      <h2 id="detail">Rule detail</h2>
      <section class="rule" data-rule="R1">
        <h3><a class="rule-id" href="#R1">R1</a> Name routes after resources</h3>
        <p class="why">…</p>
        <div class="pair">
          <figure class="good"><figcaption>Do</figcaption><pre><code>…</code></pre></figure>
          <figure class="bad"><figcaption>Don't</figcaption><pre><code>…</code></pre></figure>
        </div>
        <p class="enforce"><b>Enforcement:</b> review — checklist item in <code>GEN_06</code>.</p>
      </section>

      <h2 id="example">Worked example</h2> …
      <h2 id="checklist">Checklist</h2><ul class="checklist">…</ul>
      <h2 id="open-questions">Open questions</h2> …
      <h2 id="related">Related</h2>
      <p>Requires <a href="../index.html#BE_05">BE_05</a>.</p>

      <footer class="doc"><p><a href="../index.html">← All conventions</a></p></footer>
    </div>
  </body>
</html>
```

And the prompt that hands one document to an agent — short on purpose, because everything else is here:

```
Write the convention document <ID> for this repository.

1. Read docs/conventions/GEN/GEN_12_how-to-write-a-convention.md
   in full and follow it exactly.
2. Read the <ID> entry in docs/conventions/index.html — it is your
   commission and it is authoritative. Do not change its scope, title,
   tier or file name.
3. Read the documents (or index entries) listed in its data-requires,
   and read PROJECT.md.
4. Read the repository code under its data-paths before writing a rule.
5. Write the file, update only that one index entry, and report which
   todo entries you interpreted and what you could not decide.

Write no other document. Change no source file outside docs/conventions/.
```

Documents are written in tier order, and within an area in numeric order, because a document may cite a lower-numbered one but never contradict it ([GEN_01#R7](../index.html#GEN_01)).

## Checklist

- File name is exactly the entry's `data-file`, saved in the entry's `data-area` folder — `docs/conventions/<AREA>/<data-file>`; header `data-*` matches the entry ([R1](#R1)).
- Prerequisites, `data-paths` code and `PROJECT.md` were read ([R2](#R2)).
- Sections appear in order, with those names, and no others ([R3](#R3)).
- Ten rules or fewer, each imperative, each with an id ([R4](#R4)).
- Every detailed rule states enforcement, and no `automated` claim is aspirational ([R5](#R5)).
- No project fact, count or inventory stated ([R6](#R6)).
- Nothing restated that another document owns ([R7](#R7)).
- Explanatory prose is within budget ([R8](#R8)).
- No `<style>`, no class outside the list, every cross-link via `../index.html#<ID>` ([R9](#R9)).
- Index entry updated — status and date, nothing else — and the page shows no banner ([R10](#R10)).

## Open questions

- Most of [R3](#R3), [R4](#R4), [R5](#R5), [R8](#R8) and [R9](#R9) are marked `automated` as checkable, but the checker is one script that does not exist. Until it does, they are review rules wearing the wrong label — the highest-priority guardrail in [INFRA_06](../index.html#INFRA_06).
- The index self-check runs in a browser on page load, so nothing catches a broken document in a pipeline. Promoting it belongs to [INFRA_09](../index.html#INFRA_09).
- [R7](#R7) is unenforceable by tooling: nothing detects the same rule stated in two documents, and that is the failure mode this whole document set is most exposed to.

## Related

Requires [GEN_01](../index.html#GEN_01).

---

[← All conventions](../index.html)
