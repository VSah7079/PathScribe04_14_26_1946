# services/terminologyLicence/

The customer's SNOMED CT and ICD-O-3 licences and the rules that follow from them (Batch 623, PS-130).

- `terminologyLicence.ts` (pure): `licenceStatus` (none, off, active, expired; the expiry date is the last valid day), `activeLicensedSystems`, `validateLicenceDraft` / `validateLicences` (turning one on needs holder, edition and reference; the date must be real), `isWellFormedCode`, `parseRuleCoding` (the rule form's two optional code pairs), `ruleCodingDraftOf`, `todayIso`.
- `terminologyLicence.test.ts`: status on the last valid day and the day after, validation, code shapes, and which codes a finding carries.

The licences are stored on the enterprise settings (`EnterpriseConfig.terminologyLicences`), so recording one needs `config:code-systems:manage`, checked in `systemConfig/systemConfigChangeChecks.ts`. Which code a finding carries is decided in `abnormalDetection/resolveFindingCoding.ts`. PathScribe ships no SNOMED CT or ICD-O-3 content and cannot tell whether a well-shaped code exists in the customer's edition.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
