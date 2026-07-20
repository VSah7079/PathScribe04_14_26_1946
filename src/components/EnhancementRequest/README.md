# components/EnhancementRequest/

Product enhancement request / QA feedback submission — trigger button +
modal with PHI-redacted screenshot capture.

## Files

- **`EnhancementRequestButton.tsx`** — Two modes: `enhancement` (product
  team, lightbulb icon) and `qa` (QA team, bug icon, restricted category
  set, dev-only unless `showInProd`). No issues.
- **`EnhancementRequestModal.tsx`** — Receives a pre-captured, PHI-redacted
  screenshot from the button; user can approve/discard before submitting.
  Uses the inline-style modal-overlay pattern — logged as one of the ~14
  instances in the modal-consolidation opportunity, see `Common/README.md`.
  No other issues.

## Notes

- See `Common/README.md`'s modal-consolidation note — this folder's modal
  is one of the cited examples.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
