**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/narrativeSignals/

Captures AI-vs-pathologist-edit diffs for Validation Studies, with PHI de-identification built in at capture time.

**Pattern:** Standard interface/mock/firestore pattern, plus one real standalone utility.

## Files

- **`deidentification.ts`** — Genuinely valuable, well-built PHI utility — strips measurements/dates/MRN/biomarker-values/TNM-staging/Gleason-scores/accession-numbers from narrative text while preserving structural language. Used exclusively within this folder's own pipeline (confirmed correctly scoped, not needed elsewhere as of this review).

## Notes

- Real, live feature — seed data references an actual Validation Study id ('vs-demo-001').

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 616 (part E) — server version

API-server version of `NarrativeSignal` (`httpNarrativeSignalService.ts`, contract `TEMPLATE_SIGNALS_API.md`), picked by `narrativeSignalServiceInstance.ts` (and the others beside it) when an API address is configured; the mock stays the default in the demo. See `docs/architecture/HTTP_SERVICES_PATTERN.md`.
