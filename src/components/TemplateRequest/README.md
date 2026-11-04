# components/TemplateRequest/

## Files

- **`TemplateRequestModal.tsx`** — Pathologist-facing "request a new
  synoptic template" form, submits via `messageService` to the admin pool.
  Own header clearly documents both entry points (AddSynopticModal, Home
  page tile). Uses the shared `ps-modal-dark`/`ps-overlay` CSS pattern
  (not the inline-style duplication) — good. No issues.

## Batch 367 (PS-74): no inline CSS

`TemplateRequestModal.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. The "N fields · vX" line is one template key. Selection colours moved to `pathscribe.css` modifier classes. The admin message's body and subject stay English (stored message text).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).
