# Dead / Duplicate Code Tracking

Separate from `PRIORITY_FIXES.md` (which tracks functional bugs, gaps, and
UX issues) — this document exists specifically to track dead code (unused
variables, functions, components, imports, duplicated blocks) found and
fixed across the application, as part of pre-IP-submission cleanup.

**Why a separate document:** `PRIORITY_FIXES.md` is already large and
focused on behavioral correctness. Dead code is a different category —
it doesn't cause incorrect behavior, but it clutters the codebase and
isn't something an IP attorney (or a future engineer) should have to
puzzle over. Tracking it separately keeps both documents focused and
makes it easy to confirm, at submission time, that a systematic dead-code
sweep was actually done rather than left to incidental discovery during
unrelated work.

## Methodology

Manual review during folder-by-folder README passes (`services/`,
`components/`, `pages/SynopticReportPage/`, etc.) catches *some* dead code
incidentally, but isn't exhaustive — it depends on a reviewer happening to
notice an unused declaration while reading for other reasons.

For a definitive, tool-verified pass: temporarily enable
`noUnusedLocals` and `noUnusedParameters` in
`tsconfig.json` and run `npx tsc --noEmit -p .`
across the whole project. This will surface unused variables/parameters
project-wide, not just in one file — expect real noise the first time
this runs. Review the results folder-by-folder rather than fixing
everything in one giant pass, logging genuine findings below.

**Status: RUN, CURRENTLY CLEAN.** Corrected during the `src/pages/`
review (August 2026) — this doc previously said the flags were still
`false` and the sweep hadn't run. Checked directly: both flags are
already `true` in `tsconfig.json`. Confirmed the check is genuinely
active (positive-control test: a deliberately-injected unused variable
in `AccessionPage.tsx` was correctly flagged as `TS6133`, then removed).
With both flags on, `npx tsc --noEmit -p .` currently returns zero
errors project-wide — no unused locals or parameters anywhere in the
codebase right now. Whoever flipped the flags on didn't update this
doc; noting it here so the record matches reality. Worth re-running
this same check periodically (e.g. before the copyright deposit and
before any WCAG cert push) since it's a fast, zero-cost way to catch
drift — a future edit could just as easily reintroduce an unused
variable without anyone noticing.

## Found and fixed so far (incidental, during manual review)

- **`OrchestratorReportPanel.tsx`** (`pages/SynopticReportPage/components/`)
  — entire 917-line file was dead. Component itself never imported/
  rendered anywhere in the app (confirmed via full-repo grep); only its
  `OrchestratorSection` type was still referenced, by two files
  (`hooks/usePreviewChannel.ts`, `pages/ReportPreview/ReportPreviewPage.tsx`),
  both repointed to the byte-for-byte-identical type in
  `OrchestratorSectionEditor.tsx` (the file that actually superseded it —
  confirmed by that file's own header comment). File deleted entirely.

- **`SequencerPanel.tsx`** (`pages/SynopticReportPage/components/`) —
  `DocSection` component defined but never referenced anywhere in the
  file. Removed.

- **`LeftReportPanel.tsx`** (`pages/SynopticReportPage/components/`) —
  `markRef` (a `useRef`) was written to in `handleMarkMount` but never
  read anywhere; the actual scroll-into-view logic already used the
  local `el` parameter directly. Removed.

- **`SynopticReportPage.tsx`** — a 7-line comment block (originally
  written for `setSectionDirty`, explaining why it adds/removes just its
  own named dirty-section entry) was duplicated immediately below its
  correct location, misplaced directly above the unrelated
  `activeSpecimenId` state declaration. Clear copy-paste artifact.
  Removed.

- **`AccessionPage/AccessionPage.tsx`** (found during `src/pages/`
  review, August 2026) — 4 unnecessary `as any` casts, none load-bearing.
  `(allTemplates as any[])` — `listTemplates()` already returns the
  properly-typed `Protocol[]`, which already has `id`/`name`/`category`/
  `isDiagnostic`; the cast did nothing but suppress real type-checking.
  `status: 'accessioned' as any` — `'accessioned'` is already a real
  member of the `CaseStatus` union; no cast needed. The Patient object
  literal's `as any` and the `specimens: ... as any` — both objects
  already structurally matched `Patient`/`Specimen[]` once checked.
  Verified by removing all four and running `npx tsc --noEmit -p .`
  project-wide: zero new errors. One `as any` in the same file
  (`setSex(e.target.value as any)`) was narrowed to
  `as 'M' | 'F' | 'U'` rather than removed outright — a native
  `<select>`'s value is inherently untyped `string`, so some assertion
  is genuinely needed there, just not `any`.

## Deferred / not yet actioned

(none currently — see Methodology above for the
`noUnusedLocals`/`noUnusedParameters` sweep, now resolved rather than
deferred)

---
*Update this file whenever dead/duplicate code is found and fixed, whether
via manual review or the tool-assisted sweep above.*
