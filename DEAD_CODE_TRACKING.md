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

For a definitive, tool-verified pass (not yet run as of this writing):
temporarily enable `noUnusedLocals` and `noUnusedParameters` in
`tsconfig.json` (currently both `false` — confirmed, this is why `tsc`
hasn't been flagging any of this on its own) and run `npx tsc --noEmit -p .`
across the whole project. This will surface unused variables/parameters
project-wide, not just in one file — expect real noise the first time
this runs. Review the results folder-by-folder rather than fixing
everything in one giant pass, logging genuine findings below.

**Status: methodology decided, full tool-assisted sweep not yet run.**

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

## Deferred / not yet actioned

- **Full project-wide `noUnusedLocals`/`noUnusedParameters` sweep** — see
  Methodology above. Not yet run. Given the likely volume of results,
  plan to review in batches aligned with whichever folder is currently
  under README review, rather than as one separate mega-task.

---
*Update this file whenever dead/duplicate code is found and fixed, whether
via manual review or the tool-assisted sweep above.*
