# components/Config/Templates/

Admin protocol/template review workflow — the full-page lifecycle
reviewer. (The review queue list is `Config/Protocols/ReviewQueueSection.tsx`.)

**Pattern:** Standard page-pair (list → detail), plus one confirmed,
non-trivial open bug (now fixed — see Notes).

## Files

- ~~**`AdminTemplateList.tsx`**~~ — deleted in Batch 428 (nothing used
  it); the review queue is `Config/Protocols/ReviewQueueSection.tsx`.
- **`TemplateRenderer.tsx`** — Full-page protocol reviewer, reached via
  `/template-review/:templateId`. Excellent self-documented lifecycle model
  (draft → in_review → approved → published, with needs_changes as a
  rejection branch, reset as an admin escape hatch) and source-aware
  terminology (CAP "Accept/Release" vs RCPath "Ratify/Publish" vs
  ICCR/Custom "Approve/Publish"). **KNOWN BUG, see Notes (now fixed).**

  **Also fixed this pass (PRIORITY_FIXES.md #8):** this file's own
  `ModalOverlay` component — already a single, extracted, reused-in-place
  component rather than copy-pasted — had its internals converted to
  `ps-overlay`/`ps-modal-dark`. The cleanest case of this whole
  modal-consolidation effort: one edit to the component definition
  correctly fixed every place in the file that renders `<ModalOverlay>`,
  with no risk of missing a duplicate instance.

  **Real, found-and-fixed accessibility bug, per direct report
  ("occasional text that is dark and pretty much impossible to
  read")**: the same lifecycle-stepper separator (here an arrow, `→`,
  rather than a dash) used `#1e293b` — the exact same copied pattern
  fixed in `AllProtocolsSection.tsx`/`ActiveProtocolsSection.tsx` (see
  `../Protocols/README.md`). Fixed to `#64748b`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `AdminTemplateList.tsx` was listed as current; it was deleted in Batch 428.*

## Notes

- **BUG FIXED (July 2026).** `TemplateRenderer.tsx` was fully rewritten to
  fetch real content via `services/templates/templateService.ts`'s
  `getTemplate(templateId)` and render the actual `EditorTemplate` shape
  (`EditorSection`/`EditorField`, from `../Protocols/SynopticEditor.tsx`)
  directly — the same rich model the real template builder authors, with
  6 field types and per-field/per-option SNOMED/ICD coding (which the old
  renderer couldn't display at all; new `CodingBadges` component adds it).
  19 real generic (post-CAP/RCPath-licensing-cleanup) templates are
  already seeded in `editorStore` and now display correctly. Protocols
  with no authored content yet show an explicit empty state with a link
  to the editor, instead of fabricated placeholder content.
  **Deleted as fully dead, confirmed via full-`src/` grep, zero remaining
  references anywhere:** `types/templateTypes.ts` (its `AuditEvent`/
  `TemplateLifecycleState` exports were already an orphaned duplicate of
  the real `types/AuditEvent.ts`, which everything else in the app
  correctly used instead) and `src/templates/mockDcisTemplate.ts` (typed
  against the now-deleted schema). `src/templates/` is now an empty
  folder (since removed entirely). Full before/after schema comparison in
  `../Protocols/README.md`.
- Not attempted, worth a look separately: `ALLOWED_TRANSITIONS`
  (`LIFECYCLE_STYLES` was later replaced by `ps-tmplr-state--*` classes) doesn't have an entry for `'deprecated'`
  (`TemplateStatus = LifecycleState | 'deprecated'` in
  `templateService.ts`) — falls back safely via `??` today, but a
  genuinely deprecated template would just render with draft styling
  rather than something more explicit. Pre-existing, not introduced by
  this rewrite.

## Batch 328 (PS-63): review rules and no inline CSS

- **`TemplateRenderer.tsx` now waits for the service.** Approve, Publish, Needs Changes, Submit and Reset each wait for `transitionTemplate` before changing the page. Before, the page updated first and a service error was only logged.
  - **A refusal** (no approver role, self-approval, too few approvals, SNOMED below 80%) is shown in the confirm box as translated text (`templateRenderer.governance.*`), and nothing changes.
  - **Approval that needs more reviewers:** the page shows "Approval recorded (n of m)" and stays In Review.
  - **Registry status wins:** the status from the registry now wins over the page's local `ps_state_<id>` copy.
- **No inline CSS.** The per-state colours were an inline-style map; they are now `ps-tmplr-state--<state>` classes that set `--tmplr-bg/fg/border`, used by:
  - the badge;
  - the transition buttons (the disabled look is `:disabled`);
  - the flow steps (`--current` / `--past`);
  - the confirm button (`--destructive`).

  Selected answer options use `ps-tmplr-option-label--selected`. Checked in the browser against the previous look.

## Batch 428: Configuration permissions

`AdminTemplateList.tsx` was deleted (nothing used it). `TemplateRenderer.tsx` is unchanged; its approve, publish, request changes and reset now need the protocol capabilities, checked in `services/templates/templateService.ts`.

## Batch 431

`TemplateRenderer.tsx` saves trial answers through `services/templates/templateReviewWork.ts` and no longer keeps its own copy of the lifecycle state (the template service's status is the one record).

## Batch 463b

`TemplateRenderer.tsx`: a refused review or publish because a Mohs stage question's default-histology source is missing or not a choice question (`MOHS_HISTOLOGY_SOURCE`, from templateService) is shown in the user's language.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*

## Batch 511 (PS-478): full strict type-checking

`TemplateRenderer`'s three answer handlers return early when there is no template id; they are only reachable once one exists, so nothing changes.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 579

- `TemplateRenderer.tsx` (template review): a "How to review this template" guide (open while In Review; folding remembered; what it says follows the site's Template Review settings); Reset to Draft at the far end of the row, unavailable in Draft; question comments dark and labelled.
