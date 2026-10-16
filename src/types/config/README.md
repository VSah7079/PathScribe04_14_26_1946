# types/config/

Org-hierarchy configuration shapes — separate from `services/organisation/` and `services/systemConfig/`, these are the specific per-tier config records.

## Files

- **`CaseMask.ts`** — accession-number masks. Replaces the old `CaseMaskConfig.ts` (one record per organisation, with `sitePrefixMap`/`siteIndependentSequence` and a department override merged at allocation time). Each `CaseMask` is now self-contained and defined at exactly one scope — `'enterprise'`, `'facility'` (performing labs only) or `'department'` — with its own `prefix`, `maskPattern`, `sequenceDigits`, `currentSequence` and facility-timezone-aware annual reset (`resetSequenceAnnually`, `lastResetYear`). Tokens are `{PREFIX}`, `{YEAR:4}`, `{YEAR:2}`, `{SEQ:N}`; the old `{SITE}`/`{CAT}`/`{DEPT}` tokens are gone. With no mask at any scope the fallback is `{PREFIX}{YEAR:2}-{SEQ:4}` with prefix `O`. See `services/caseRegistry/README.md` for the full account.
- **`FacilityBranding.ts`** (PS-277) — report branding (logos, CLIA numbers, director details) inherited from the facility, with fallback to department and enterprise defaults.
- **`EnterpriseConfig.ts`** — Enterprise-tier feature flags (`reportingPlusEnabled`, default `false`) and record shape.
- **`HospitalConfig.ts`** — Hospital-tier feature flags (`reportingPlusEnabled`, default `true`) and record shape.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `CaseMaskConfig.ts` no longer exists — the file is `CaseMask.ts`, with one mask per scope and no `{CAT}`/`{DEPT}` tokens; added `FacilityBranding.ts`.*

---
*See [types/README.md](../README.md) for how this folder fits the whole types/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master types/README.md if this folder's overall PURPOSE changes.*
