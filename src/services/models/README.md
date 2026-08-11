# services/models/

AI model registry — version/accuracy/status tracking for the AI models available to the app.

**Pattern:** Standard interface/mock/firestore pattern.

## Files

- **`IModelService.ts`** / **`mockModelService.ts`** — the local model
  catalog. Includes `create()` — previously missing entirely at every
  layer (interface, mock, UI); there was no way to add a new model to
  the system at all before this. Always forces `isDefault: false` and
  `casesProcessed: 0` on creation regardless of what the caller passes.
  `ModelType` now includes `'Voice Dictation'` alongside the existing
  report-section types — a genuinely different task (refining raw
  transcript text, not generating a report section), not folded into
  an existing type.
- **Real bug found and fixed:** `setDefault()` previously un-defaulted
  *every* model in the catalog regardless of type — correct when only
  report-generation models existed, wrong once Voice Dictation is a
  second, independent type. A deployment needs one active report model
  AND one active voice model simultaneously, not mutually exclusive
  slots. Now groups by voice vs. non-voice when clearing `isDefault`.
  `getDefault()` deliberately still excludes voice models (its two
  existing callers both predate voice support and mean "the
  report-generation default") — `getDefaultVoiceModel()` is the new,
  separate method for the voice-specific equivalent.
- **`mockModelStoreService.ts`** — a separate, deliberately distinct
  catalog: models ForMedrixAI has published but this system hasn't
  adopted yet. Entirely mock — there is no real ForMedrixAI store
  service to call. Includes both report-generation and Voice Dictation
  listings — new voice models arrive through the same store flow as
  everything else. **See `STORE_INTEGRATION_NOTES.md` in this same
  folder before doing any real integration work here** — it maps
  exactly what's faked to what a real implementation needs to do.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*