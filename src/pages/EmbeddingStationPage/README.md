# pages/EmbeddingStationPage/

**NEW (Sep 2026)** — PS-285, second of the PS-284→285→286→287→288 workstation-build sequence. A dedicated, bench-facing surface for the embedding tech: scan a cassette barcode, confirm the piece count against what was recorded at grossing (or one-touch flag a genuine discrepancy), pick a base mold size and record orientation instructions, group split cassettes from one specimen so they're all embedded together, and reprint a damaged/wax-obscured cassette label with a mandatory reason. Built to visually match `MicrotomyWorkstationPage.tsx`/`GrossingScreenPage.tsx` (same header/back-button pattern, same `ps-overlay`/`ps-modal-dark` modal convention, same dark palette) per the same direct visual-consistency guidance PS-284 followed — sibling workstation to sibling workstation.

**Route**: `/workstations/embedding` — deliberately NOT nested under the `:caseId`-scoped, `synopticLoader`-gated clinical route group, for the identical reason `MicrotomyWorkstationPage.tsx`'s own README states: an embedding tech works cassette-by-cassette across many cases in a single shift. Lives in the same non-case-scoped, `ScannerProvider`-wrapped route group in `App.tsx` as Microtomy. Reached from its tile on the Pathology Workspace hub (`/pathology-workspace`, `PathologyWorkspacePage.tsx`); the route needs `screen:embedding:open`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the tile is on the Pathology Workspace hub, not `Home.tsx` (`PathologyWorkspacePage.tsx`, `App.tsx` ScreenGate `embedding`).*

## Files

- **`EmbeddingStationPage.tsx`** — the page itself: a scan-to-begin entry state; once a block/cassette resolves, a three-panel layout (Left: a quick specimen block summary — every block on this specimen and its status, current one marked; Center: `EmbeddingCenterPanel`; Right: `CassettePrintPanel`). Owns the mandatory-reason reprint modal (`components/CassetteReprintModal.tsx` since Batch 401; same `ps-overlay`/`ps-modal-dark` convention as Microtomy's own remove-reason modal) and the block Comment Drawer. Also owns the global `PATHSCRIBE_SCAN` listener, identical `STATION:`-prefix-guarded pattern to every other real listener in this app.
- **`components/EmbeddingCenterPanel.tsx`** — the center-panel interactive controls: toggleable Tiny Tissue/Fragile/Decal Required alert badges plus read-only derived Biopsy/Needle Core badges, Piece Count Verification (expected-vs-observed with a Confirm action), Discrepancy Reporting (the four real one-touch reason buttons), Base Mold Size quick-select chips, Orientation Instructions (free-text + quick-fill buttons), and Multi-Cassette/Split-Block grouping (pick sibling blocks on this specimen, group them, see a pending/complete banner once grouped).
- **`components/CassettePrintPanel.tsx`** — the right-panel device status, on-demand cassette reprint action (requests the parent's mandatory-reason modal rather than owning it — see that file's own header comment), cumulative reprint count/last reason, and a schematic (non-decodable) cassette label preview — same honest "no real printer telemetry" posture as `HardwarePrintPanel.tsx`'s own header comment.
- **`components/CommentDrawer.tsx`** — a self-contained copy of the block-comment drawer (not a shared import from `MicrotomyWorkstationPage/`), deliberately simpler than that one: embedding-station comments have no "prints on label" concept, so there's no print toggle here.
- **`hooks/useEmbeddingStation.ts`** — wraps `utils/embeddingOperations.ts`'s pure functions (plus the reused `setBlockAlertFlags` from `utils/microtomyOperations.ts` — see below) with real persistence (`caseRouter.updateCase`, optimistic update — same shape as `useMicrotomyWorkstation.ts`), the scan-resolution flow (`resolveMaterialFromScan`, block/slide targets only — see Scope cuts below), the real cassette print dispatch chain (station → `supportsPrinting` + printer profile → `printSettingsService.get()` → `printCassetteLabel`), and raises the real, existing `def-tissue-discrepancy` deficiency (via `specimenDeficiencyService`) on a genuine piece-count mismatch or a one-touch discrepancy flag — the exact same mechanism/comment wording `useSpecimenBlockManagement.ts`'s own `handleUpdateBlock` already uses, never a second, parallel QA channel.

## Related files elsewhere

- **`utils/embeddingOperations.ts`** (+ `.test.ts`, 17 tests) — the pure, tested business logic: `confirmPieceCount`, `flagEmbeddingDiscrepancy`, `setMoldAndOrientation`, `groupSplitBlocks`/`resolveSplitBlockGroupStatus`, `recordCassetteReprint`, `addEmbeddingBlockComment`, `resolveEmbeddingAlertBadges`. Constants: `EMBEDDING_DISCREPANCY_REASONS`, `CASSETTE_REPRINT_REASONS`, `EMBEDDING_MOLD_SIZES`, `EMBEDDING_ORIENTATION_QUICK_FILLS`.
- **`utils/microtomyOperations.ts`** — `setBlockAlertFlags` (Tiny Tissue/Fragile/Decal Required toggle) is reused verbatim here rather than duplicated; it's a genuinely generic `HistologyBlock` operation with no microtomy-specific meaning, built for PS-284.
- **`types/case/Specimen.ts`** — `HistologyBlock` extended with `moldSize` (`EmbeddingMoldSize`), `orientationInstructions`, `splitBlockGroupId`, `lastDiscrepancyReason`/`lastDiscrepancyReportedBy`/`lastDiscrepancyReportedAt` (`EmbeddingDiscrepancyReason`), `lastCassetteReprintReason`/`lastCassetteReprintOrderedBy`/`lastCassetteReprintOrderedAt`/`cassetteReprintCount` (`CassetteReprintReason`).
- **`services/deficiencies/`** — `def-tissue-discrepancy` (pre-existing) is the real deficiency raised here; this is a reuse, not a new deficiency type.
- **`utils/labels/printCassetteSlideLabel.ts`** / **`services/printSettings/IPrintSettingsService.ts`** (`CassetteLabelLayoutConfig`/`DEFAULT_CASSETTE_LABEL_LAYOUT`) — the identical real GS1/ZPL cassette print path and layout config every other cassette-print call site in this app already uses; nothing new added here.

## Notes

- Built with `useTranslation()` from the start — every visible string goes through the `embeddingStation.*` locale namespace, across all 5 languages (see `i18n/README.md`'s running log). Only the new `home.embeddingTile.*` strings were converted in the not-yet-fully-converted `Home.tsx` *(since moved: the tile's strings are now `pathologyWorkspace.embeddingTile.*` on the Pathology Workspace hub — checked in the Batch 496 README audit)*, same precedent as the Microtomy tile before it.
- **Multi-Cassette / Split-Block Tracking is deliberately the opposite concept from the pre-existing `sharedCassetteId`** (multiple *specimens* sharing one cassette): `splitBlockGroupId` covers one *specimen's* tissue split across several cassettes (A1/A2/A3). The two fields are never conflated or cross-checked against each other in this pass.
- **Biopsy/Needle Core alert badges are deliberately NOT new stored booleans** — they're derived live from the specimen's own linked `SpecimenEntry.type`/`procedure` (looked up once per work item), never a second, driftable copy of a fact the dictionary entry already states.
- **"Audit Triggers: routes an alert to the histotechnology supervisor"** is implemented as the real, existing `def-tissue-discrepancy` deficiency landing in the real, existing QA working queue (`QualityAssurancePage.tsx`) supervisors already monitor — not a new, separate paging/notification channel.
- Deliberate scope cuts for this pass, matching PS-284's own documented precedent exactly: no `MatrixBlock`-level scan resolution or embedding (a cassette shared by multiple specimens is a genuinely separate data shape, not covered here), schematic (non-decodable) cassette label preview. (Voice wiring was also out of scope here at first; Batch 401 added it, see below.)
- **Real fix (foot-pedal follow-up, Sep 2026):** foot-pedal support was originally disclaimed here as out of browser reach — re-verified and found incorrect. `useFootPedal.ts` (same real hook already working for `SynopticReportPage.tsx`'s dictation controls and now `MicrotomyWorkstationPage.tsx`'s own Print/Etch Next) is now wired into this page: Pedal 1 confirms piece count against the expected, grossing-recorded count — PS-285's own named "hands-free triggers for piece-count confirmation." Guarded to no-op with no open work item, no known expected count, or a block already `'Embedded'`. Its sibling trigger, "advancing to next queued cassette," is deliberately NOT wired — this page has no real queue/next-item navigation to advance (a pure scan-to-open, single-cassette workspace), so there's nothing honest to bind a pedal to yet.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`EmbeddingStationPage.tsx`: the patient name in the context bar is tagged. The page reads scan stations through `@/services`, so it came off the mock-import baseline.

## Batch 367 (PS-74): no inline CSS

`components/CassettePrintPanel.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 401 (PS-359): Field Requirements

The page follows the organisation's Field Requirements (page "embedding", `services/fieldRequirements/embeddingChecks.ts`):

- **Confirm** (piece count): the observed count is locked and must be a whole number of 0 or more (before, any number typed, even negative or a fraction, went through to the operation). The base mold size and orientation instructions are optional switches an organisation can turn on. Required labels are starred, "Still required: …" says what is missing, and Confirm stays off until it is complete. Confirm now sends the orientation box's current text with it, saved in the same update, so text typed just before Confirm is neither missed nor overwritten.
- **Comment drawer:** the comment text (locked), same pattern.
- **Cassette reprint:** `components/CassetteReprintModal.tsx`. Before, choosing a reason in the list reprinted at once, so a mis-tap printed a label; now the reason is chosen, then Reprint pressed. The reason is locked.
- `hooks/useEmbeddingStation.ts` checks the same rules for Confirm, Add comment and Reprint, so the foot pedal (Pedal 1, Confirm) is held to them too. It reads the scan station through `@/services` and came off the deployment baseline.
- **Voice:** the page sets `VOICE_CONTEXT.EMBEDDING` while open: "confirm count" / "confirm embedding" (`EMBEDDING_CONFIRM_PIECE_COUNT`, Ctrl+Alt+Shift+C) and "add comment" (`EMBEDDING_ADD_COMMENT`, Ctrl+Alt+Shift+A) act exactly as the buttons do.
- **Translated:** block status, mold sizes, orientation quick fills (inserted in the user's language, since the field is free text), discrepancy and reprint reasons (still stored in English), the comment times (user's locale), the scan errors and the reprint errors.
- The EmbeddingCenterPanel is keyed by block, so scanning a new cassette while one is open no longer carries the previous block's typed count and orientation over.
- Tests: `components/embeddingRequirements.test.tsx`.
- Not changed: the split-block panel and the Tissue Discrepancy deficiency's comment text (a stored QA record, English).

## Batch 460

`useEmbeddingStation.ts` checks the scan target before the specimen. A matrix block now gets "Embedding takes block cassettes only" instead of "specimen not found". Matrix blocks at Embedding are still not supported.

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 511 (PS-478): full strict type-checking

`useEmbeddingStation` refuses an unreadable observed piece count explicitly. The required-field check before it already did, so nothing changes.

## Batch 669 — saving, discrepancy flag (ws-8, ws-10, ws-11)

- **Saving.** Every change goes through `commit` in `hooks/useEmbeddingStation.ts`, which saves with the shared `services/workstationSave/runCaseAction.ts` (via `hooks/useWorkstationSave.ts`): the operation is re-applied to the newest copy of the case on a version conflict (3 tries). A save that still fails shows "Not saved" (`saveError`, a `role="alert"` banner under the identity bar) and reloads the stored block, instead of leaving the change on screen as saved (it used to log to the console only). Nothing is raised or printed for an unsaved change (no Tissue Discrepancy item, no reprint).
- **A flagged discrepancy stops Confirm** (button, voice, foot pedal and the hook) until it is cleared. **Clear flag** sits beside "Last flagged", one click, no confirmation (it can be flagged again); it writes the audit entry "Embedding discrepancy cleared" (`buildEmbeddingDiscrepancyClearedAudit`). The Tissue Discrepancy item in Quality is not closed by it (QA does that).
- **"Last flagged ... (by X)"** shows the person's name (looked up from the stored user id with `userService.getById`; the id is the fallback).
- **The Tissue Discrepancy item** a mismatch or flag raises is now confirmed on screen ("has been raised for QA"), and a failed raise (a rejected call or a not-ok answer) shows a red line, not only the console.
- DOB uses `utils/formatDate.ts`; the status list on the left shows `embeddingStation.blockStatus.*` through `blockStatusLabelKey`.
- Tests: `hooks/useEmbeddingStation.test.tsx` (new), `components/embeddingRequirements.test.tsx`, `utils/embeddingOperations.test.ts`.
