# services/terminologySearch/

Live REST API client for clinical terminology search — SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O, OPCS-4, CPT — against NLM Clinical Tables and UTS endpoints.

**Pattern:** Not the interface/mock/firestore triplet pattern — this is a real, direct external API integration, no mock/dictionary aspect.

## Files

- **`codeSearchService.ts`** — Relocated here July 2026 from pages/Synoptic/Codes/ — genuinely different concern from services/codes/ (which is config/dictionary only). SECURITY FIX also applied July 2026: removed a hardcoded UMLS API key fallback that had been committed to source; now throws loudly via getUmlsApiKey() if VITE_UMLS_KEY isn't set in the environment.

## Notes

- Several code systems (OPCS-4) are explicitly stubbed pending a licensed backend proxy — NLM doesn't host these (OPCS-4 needs NHS TRUD licence). **CPT is no longer one of them** — real fix, from a direct product question about a real, missing CPT-code-management UI: `searchCpt()` was a permanent, documented "not yet implemented" stub (genuinely correct reasoning at the time — NLM doesn't have CPT, AMA copyright restricts a full database) that had silently returned an empty array forever. It now searches the app's own, small, manually-curated, verified `Code_Map_Table` (`services/billing/codeMapTable.ts`) instead — not a substitute for full CPT coverage (still not available without a licensed backend), but real, legally clean data for the handful of codes this app actually tracks. Real consumer: `pages/Synoptic/Codes/AddCodeModal.tsx`'s CPT tab, which already had a fully-built UI (tabs, search, apply/undo) wired to this permanently-empty stub — also needed `MedicalCode.system` (`pages/Synoptic/synopticTypes.ts`) widened from `'SNOMED' | 'ICD'` to include `'CPT'`, and `SynopticReportPage.tsx`'s save/load callbacks fixed to actually handle the `'CPT'` case (previously any CPT code selected in this modal would have been silently dropped on save — never checked, never written to `Case.coding.cpt`).
- VITE_UMLS_KEY must be set in .env (and in any deployment platform's environment variables) for SNOMED/ICD-O search to work — see this folder's own file for the exact error if it's missing.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*