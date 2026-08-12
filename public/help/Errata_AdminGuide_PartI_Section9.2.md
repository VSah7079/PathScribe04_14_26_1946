# Errata — Admin Guide Part I, Section 9.2 ("The Seven Phases")

**To:** Whoever owns the PathScribe Admin Guide
**Re:** Phase 2 and Phase 3, Section 9.2, Part I — Administration
**Date flagged:** June 2026

---

## The problem

Section 9.2 describes Phase 2 ("Gross Submission & AI Protocol Assignment") and Phase 3 ("Microscopic Entry & Protocol Re-Evaluation") as implemented behavior, including specific audit event names:

- `GROSS_SAVED`, `AI_PROTOCOL_PROPOSED`, `SYNOPTIC_ASSIGNED` (Phase 2)
- `MICRO_SAVED`, `PROTOCOL_CHANGE_PROPOSED`, `PROTOCOL_CHANGE_ACCEPTED` / `REJECTED` (Phase 3)

Phase 3 is additionally marked "**NEW in v0.9.0**," which reads as a shipped-feature changelog note, not a forward-looking design note.

**This does not match the current code.** Specifically, in `SynopticReportPage.tsx`:

- The only thing that opens `ProtocolChangeModal` anywhere in the codebase is a hardcoded, `import.meta.env.DEV`-gated "⚡ Sim Microscopic" button. Its `onClick` directly calls `handleProtocolChangesDetected([...])` with a static, fake payload (`id: 'demo-proto-1'`, fixed breast-core→breast-invasive scenario, 92% confidence) — it does not read any real microscopic text, gross text, or case data.
- There is no save handler on Gross or Microscopic text anywhere that emits `GROSS_SAVED` or `MICRO_SAVED`, or that calls any AI evaluation service.
- `OrchestratorEngine`'s callback interface (`onSectionStart`, `onToken`, `onSectionComplete`, `onComplete`, `onError`) has no hook that evaluates protocol/template fit against case content.
- None of the six audit event types named above appear anywhere in the application code.

In short: Section 9.2 describes the *intended design* for this feature, written as if it were already built and audited. It isn't, yet.

## Why this matters

This is the same class of problem Part II, Section 7 already identified and corrected for the narrative-generation pipeline — that section now opens with an explicit "CORRECTED — June 2026" box explaining that the previously-documented pipeline was disconnected from real code, and has since been fixed. Section 9.2 needs the equivalent treatment, except the underlying feature hasn't been built yet, so the fix here is a documentation correction, not a code one (yet).

Worth noting separately: **Part II carries a standing disclaimer** ("Text content in this Part has been verified directly against application code") that Part I does not. Section 9.2 is a concrete example of why that disclaimer matters — a reader has no way to know, from Part I alone, that this section wasn't held to the same verification standard.

## Suggested fix

Add a callout box immediately under the Section 9.2 heading, before Phase 1, in the same style as existing callouts elsewhere in this guide:

> **NOT YET IMPLEMENTED (as of this writing)**
> Phases 2 and 3 below, including the listed audit event names (`GROSS_SAVED`, `AI_PROTOCOL_PROPOSED`, `SYNOPTIC_ASSIGNED`, `MICRO_SAVED`, `PROTOCOL_CHANGE_PROPOSED`, `PROTOCOL_CHANGE_ACCEPTED`/`REJECTED`), describe the **intended** design for AI-driven protocol assignment and re-evaluation. None of this is wired up in the current application — there is no trigger on Gross or Microscopic save, and none of the audit events listed are emitted anywhere. The Protocol Change Review *modal* exists and is functional once given real data, but nothing in the current build supplies it real data. Treat this section as a specification, not a description of current behavior, until this notice is removed.

Additionally:
- Remove or qualify the "**NEW in v0.9.0**" label on Phase 3 — nothing shipped in v0.9.0 that matches this description.
- Consider whether Part I should adopt the same "verified directly against application code" disclaimer Part II uses, at least for Section 9, given this is the second time a documented-as-built feature in this guide has turned out not to exist (the first being the narrative pipeline Part II already corrected).

## What's actually being worked on, for context

This isn't a dead idea — Phase 2/3 as described is close to the real target architecture currently being designed (Stages 0–2 of a broader Orchestration workflow). The gap is purely "this got written up as done before it was built," not "this is wrong and should be removed." Once the real evaluation service and triggers exist, this section can be de-flagged and the audit event names re-verified against whatever the actual implementation emits (they may not end up named exactly as drafted here).
