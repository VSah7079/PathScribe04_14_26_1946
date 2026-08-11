# components/Config/Models/

AI model performance/version comparison tab.

**Pattern:** Single clean component over `services/models/`.

## Files

- **`index.tsx`** — `ModelsTab`. Correctly wired to `modelService`
  (`services/models/IModelService`). Status styling for
  Active/Retired/Beta. Setting a `Voice Dictation` model as default is
  hard-blocked without a PASS-graded, reported Validation Study behind
  it (`hasPassingValidationForVoiceModel`, from
  `Config/AI/resolveVoiceAiModel.ts`) — the only point a voice model
  actually goes live, since voice has no per-client override layer to
  gate instead. Same "absolute block, no soft path" posture as the
  report-model equivalent (`Facility.internalAiModelId`).
- **Real bug found and fixed here too:** this screen's own local state
  update after calling `setDefault()` still un-defaulted every model
  regardless of type — the exact same bug just fixed in
  `mockModelService.ts`, caught a second time because the UI had its
  own separate copy of the same (now-wrong) logic. Fixed to match.

## Notes

- No issues.
- Models can now arrive here two ways: pre-seeded (as before) or
  downloaded via the ForMedrixAI store (see
  `ValidationStudies/ModelStoreModal.tsx` and
  `services/models/mockModelStoreService.ts`) — a store-downloaded
  model always lands as `Beta` status with `casesProcessed: 0`,
  displaying here identically to any other Beta model since this
  screen reads from the same `modelService.getAll()` regardless of
  how a record was created. This now includes Voice Dictation models.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
