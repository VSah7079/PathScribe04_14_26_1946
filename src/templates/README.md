# components/Config/Templates/

Admin protocol/template review workflow — the review queue list and the
full-page lifecycle reviewer.

**Pattern:** Standard page-pair (list → detail), plus one confirmed,
non-trivial open bug (now fixed — see Notes).

## Files

- **`AdminTemplateList.tsx`** — Template review queue list. Thin, correct —
  single mock entry today, navigates to `/template-review/:templateId`.
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

  **Separate, later fix (PRIORITY_FIXES.md #15) — real, active bug, not
  dead code.** The state-transition handler's `auditAndNotify` call
  passed a generic `action: 'state_transition'` string — a leftover from
  an old, now-deleted notification stub's own separate action-naming
  convention. The real `NOTIFY_ON_ACTIONS` list
  (`types/SynopticAuditEvents.ts`) uses specific per-action strings
  (`template.needs_changes`, `template.approved`, `template.published`,
  `template.submitted_for_review`), so the notify-check inside
  `sendSynopticNotification` would always have failed silently regardless
  of any other fix. **Net effect: reviewer/author email notifications for
  every real protocol lifecycle transition (approve/reject/publish/
  resubmit) were never actually attempted, with no visible error
  anywhere** — found via a full organization-check sweep of `services/`
  that started as a routine "duplicate filename" finding
  (`synopticNotificationService.ts` existed in two places — see
  `services/README.md`), not by inspecting this file directly. Fixed by
  mapping the real transition `target` to its correct action string;
  `target === 'in_review'` (both first submission and resubmission after
  `needs_changes`) maps to `'template.submitted_for_review'` — a
  deliberate, discussed simplification rather than adding a distinct
  resubmission event type, with a real one-line hook noted for adding an
  `isResubmission` payload flag later if reviewer-notification-fatigue
  from rapid back-and-forth edits ever becomes a real complaint. Verified
  fixed end-to-end via live console testing — confirmed the real
  recipient-resolution/email-building code path now genuinely executes
  (it correctly fails only at the final network call, since no real
  backend notification endpoint exists in this app yet — expected, a
  separate, pre-existing limitation, not a new bug).

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
  folder. Full before/after schema comparison in
  `../Protocols/README.md`.
- Not attempted, worth a look separately: `ALLOWED_TRANSITIONS`/
  `LIFECYCLE_STYLES` don't have an entry for `'deprecated'`
  (`TemplateStatus = LifecycleState | 'deprecated'` in
  `templateService.ts`) — falls back safely via `??` today, but a
  genuinely deprecated template would just render with draft styling
  rather than something more explicit. Pre-existing, not introduced by
  this rewrite.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
