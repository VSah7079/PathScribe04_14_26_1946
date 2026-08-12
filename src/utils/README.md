# src/utils/

Pure, mostly-stateless helper functions — date/time formatting, name
formatting, accession normalization, specimen labeling, device
detection, and the embedded guide-PDF assets. This is one of the
cleanest folders in the whole codebase: most files here are genuinely
excellent, carefully-reasoned, well-tested pure functions with real
edge-case handling documented inline. A few real findings turned up
anyway.

## Real findings

**1.2MB+ of dead file bloat, removed:**
- `index.css` — a stale, orphaned duplicate of the real, actually-loaded
  `src/index.css` (imported in `main.tsx`). Confirmed nothing imports
  this copy anywhere, and confirmed by direct comparison that every
  class it defines already exists in the real file, more refined.
  Deleted.
- Three stale timestamped backups of `guideAssets.ts`
  (`.bak_20260605_094452`/`.bak_20260624_132635`/`.bak_20260626_134327`,
  ~1.2MB combined), left behind by `Update-GuideAssets.ps1` with no
  cleanup step. Also fixed *why* they kept accumulating: `.gitignore`
  already had a `*.bak` rule meant to catch exactly these, but the
  real filenames the script generates have a timestamp *after* `.bak`,
  which that glob never matched. Added `*.bak_*` alongside it.

**An incomplete prior consolidation, completed:** `caseUrgency.ts`'s
own header comment claims a past fix consolidated `WorklistTable.tsx`'s
and `WorklistPage.tsx`'s independently-diverging "is this case urgent"
logic into one shared function. Checking whether that actually held:
`WorklistPage.tsx` did correctly adopt it; `WorklistTable.tsx` never
did — it still had its own separate, locally-defined copy (a
`useCallback`) reachable from 12+ call sites, implementing identical
logic in parallel, including the same redundant `any` cast the shared
version also had. Harmless today since both computed the same thing,
but it defeated the entire point of the original fix — a plausible
future change (the comment itself anticipates a facility-configurable
STAT-vs-Rush distinction) would have silently applied to only one of
the two files. Migrated `WorklistTable.tsx` to the real shared
function, removed its local duplicate and the redundant cast. Full
writeup in `PRIORITY_FIXES.md` item #35.

**Minor, not acted on:** `synopticFieldLabels.ts` exports
`CAP_FIELD_LABELS` as an explicitly-labeled "legacy export — kept for
backwards compatibility." Confirmed zero consumers anywhere in the
codebase. Left it alone rather than removing it — unlike undocumented
dead code found elsewhere in this review, this one is a deliberate,
self-documented choice by whoever wrote it, and it's a zero-cost
re-export, not something adding real maintenance burden.

## Files (the rest — genuinely clean, no changes needed)

- **`formatDate.ts`** — locale/jurisdiction-aware date, datetime, age,
  and relative-time formatting. Deliberately keeps `formatAuditTimestamp`
  UTC-and-locale-independent, distinct from the other, locale-dependent
  formatters — correct for compliance logs, with the reasoning stated
  inline.
- **`facilityTime.ts`** — the most carefully-verified file in this
  folder. Real, deliberate timezone-stable date bucketing (a stored
  case belongs to the facility's calendar day, not the viewing
  device's), with the DST-safe offset math and, notably, an inline
  comment documenting a sign-flip bug in an *earlier* version of this
  exact function that was caught via direct numeric verification and
  removed before shipping — not just fixed, verified.
- **`deviceDetection.ts`** — real device-vs-resized-window detection
  for the Intraop mobile workflow (checks viewport width *and* pointer
  coarseness together, specifically because a narrow desktop window
  isn't the same thing as a real phone). Includes a real, working
  escape-hatch pair (`setDesktopViewOverride`/`clearDesktopViewOverride`)
  — the doc comment for the latter notes it was added specifically
  because the former originally shipped with no way to reverse it.
- **`barcodeFormatMapping.ts`** — maps this app's `BarcodeType` union to
  ZXing's real `BarcodeFormat` enum, confirmed against the installed
  package's own type declarations rather than assumed from memory.
  Deliberately restricts scanning to only the 5 formats this app
  models, not ZXing's full format list, to avoid a scanner picking up
  an incidental product barcode in frame.
- **`normalizeAccession.ts`** — infers hyphen position in a typed/spoken
  accession number from the configured pattern, with real fallback
  behavior for anything that doesn't look like an accession (returned
  unchanged, never mangled).
- **`personName.ts`** — the Prefix/Given/Family/Preferred/Suffix name
  model, explicitly designed to handle cases rigid First/Middle/Last
  fields break on (Spanish double surnames, Hungarian name order, no
  middle name). Legacy `firstName`/`lastName` bridge kept for the ~15
  not-yet-migrated consumers.
- **`specimenLabeling.ts`** — the alpha/numeric specimen-vs-block
  labeling pair (CAP/NSH alternating convention) — structured so a
  component literally cannot pick alpha for both specimen and block
  independently, since block labeling is always derived as the
  opposite of whatever the specimen style is.
- **`flagAdapter.ts`**, **`formatLabel.ts`**, **`synopticFieldLabels.ts`**,
  **`caseRevisionDisplay.ts`** — small, clean, single-purpose. No
  issues.
- **`guideAssets.ts`** (5.3MB) — auto-generated by
  `Update-GuideAssets.ps1`, embeds the Admin/User Guide PDFs as base64
  for blob-URL opening (avoids React Router intercepting a direct PDF
  route). Confirmed it's exactly what its own header comment claims —
  nothing unexpected in it.
