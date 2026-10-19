# services/specimenCategories/

Coarse-grained specimen classification controlling workflow at Accession (e.g. 'Surgical Tissue') — the level ABOVE the fine-grained Specimen Dictionary entry.

**Pattern:** Standard interface/mock pattern (no firestore stub; production is the API server).

*Corrected in the Batch 496 README audit (Oct 9, 2026): there is no `firestoreSpecimenCategoryService.ts`.*

## Notes

- Deliberately separate from services/specimenDictionary/ — see that folder's README for the fine-grained counterpart. A SpecimenEntry references a specimenCategoryId, letting an incoming order resolve to a known workflow before the specific dictionary entry is resolved.
- **Real, per direct follow-up ("Can we cleanup those 12 errors?"): `SpecimenCategory.retentionOverrideDays` was missing from this type entirely** — a real, genuine `tsc` error (confirmed, not assumed), even though `SpecimenCategoriesSection.tsx` (Config/System/) and `services/retentionPolicy/resolveRetentionEligibility.ts`'s own `resolveCategoryOverride()` both already, genuinely depended on it. `RetentionPolicy.ts`'s own doc comment had always pointed here as the real, intended attachment point — the field itself just never got added. Added now, typed via `services/retentionPolicy/RetentionPolicy.ts`'s own `RetentionOverrideDays` (a one-directional import, confirmed no circular-dependency risk — that file never imports from here). `mockSpecimenCategoryService.ts`'s own `add()`/`update()` needed no changes — both already spread generically, handling any field including this one without special-casing. *(Since changed: `SpecimenCategoriesSection.tsx` no longer exists anywhere in the repo, and `resolveCategoryOverride()` now reads `Department.retentionOverrideDays` (`services/departments/`), not this field. No screen uses this service today; it is only exported from `services/index.ts`. Checked in the Batch 496 README audit.)*

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part C): server versions (PS-514)

The specimen category service here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/DICTIONARIES_CONFIG_API.md`. The mocks are unchanged.
