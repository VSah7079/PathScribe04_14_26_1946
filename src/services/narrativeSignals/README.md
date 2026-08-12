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