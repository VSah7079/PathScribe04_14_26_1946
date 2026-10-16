# components/EnhancementRequest/

Product enhancement request / QA feedback submission — trigger button +
modal with PHI-redacted screenshot capture.

## Files

- **`EnhancementRequestButton.tsx`** — Two modes: `enhancement` (product
  team, lightbulb icon) and `qa` (QA team, bug icon, restricted category
  set). Since Batch 447 the NavBar shows the QA button only when
  Configuration → System → Feedback says so
  (`feedbackSettingsService.qaButtonShown()`). *Batch 499:* the button's own
  production-build check (`showInProd`) is removed. Every built bundle is
  'production', validation instances included, so it hid the QA button on
  every real deployment whatever the setting said. The setting now decides
  alone.
- **`EnhancementRequestModal.tsx`** — Receives a pre-captured, PHI-redacted
  screenshot from the button; user can approve/discard before submitting.
  Uses the inline-style modal-overlay pattern — logged as one of the ~14
  instances in the modal-consolidation opportunity, see `Common/README.md`.
  No other issues. *(Since closed: it uses the shared `ps-overlay` class,
  and its remaining `style` props pass only CSS custom properties —
  checked in the Batch 496 README audit.)*

## Notes

- See `Common/README.md`'s modal-consolidation note — this folder's modal
  is one of the cited examples.


## Batch 364 (PS-349, PS-350): support references

`EnhancementRequestModal.tsx`:
- **System details:** they carry the page type and the case's support reference, never the address (`captureMetadata` is now async).
- **Identifier check:** before sending, the title and description are checked for case numbers, MRNs and other identifiers, using every format PathScribe knows. The user can replace case numbers with support references, edit the text, or send anyway.
- **Styling:** the submit button's inline opacity became a class.

## Batch 447

Sending uses `loadEnhancementConfigForSubmit()`, which takes the QA recipients and cc from Configuration → System → Feedback.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-349)

The warn-before-sending decision and case-number replacement come from `services/supportReferences/supportTicketRules.ts`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

The include-system-details tile is a switch with its state.

## Batch 568 (WCAG 2.1 AA, 4.1.2)

- `EnhancementRequestModal.tsx`: the screenshot's full-size view was a button holding its Close button. It is a dialog now (`role="dialog"`, `aria-modal`): focus moves to Close and stays inside while it is open (`hooks/useFocusTrap.ts`), Escape or a click anywhere closes it, and focus goes back to the screenshot.

## Batch 570

- `ScreenshotPreview` exported for its tests (`ScreenshotPreview.lightbox.test.tsx`: the full-size view is a modal dialog, focus on Close, Escape or a click closes it, focus returns to the picture).
