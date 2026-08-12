# components/ValidationStudies/

## Files

- **`ValidationStudiesSection.tsx`** (917 lines, the largest single-file
  folder) — Parallel-run validation study management, 3 sub-tabs (Studies/
  Dashboard/Reports). Wired to real services throughout (validationStudy,
  narrativeSignal, client, physician, reportTemplate). Not read
  line-by-line at this size; no issues surfaced at the architecture/import
  level. The "AI Model Being Validated" field in `StudyFormModal` links out
  to `ModelStoreModal` (below) — "Don't see the model you need? Browse the
  ForMedrixAI store," shown only when creating a new study.
- **`ModelStoreModal.tsx`** — browse/download UI for the ForMedrixAI
  store (see `services/models/mockModelStoreService.ts` and its
  `STORE_INTEGRATION_NOTES.md` — entirely mock right now). Downloading
  a listing creates a real local `AIModel` record (always Beta,
  never default), selects it immediately in the study form's dropdown,
  and refreshes the parent's model list via the existing
  `onRefresh`/`load()` mechanism — no separate refresh path invented.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
