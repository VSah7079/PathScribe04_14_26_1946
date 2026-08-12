# components/TemplateRequest/

## Files

- **`TemplateRequestModal.tsx`** — Pathologist-facing "request a new
  synoptic template" form, submits via `messageService` to the admin pool.
  Own header clearly documents both entry points (AddSynopticModal, Home
  page tile). Uses the shared `ps-modal-dark`/`ps-overlay` CSS pattern
  (not the inline-style duplication) — good. No issues.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
