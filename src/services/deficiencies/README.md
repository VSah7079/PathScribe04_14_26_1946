# services/deficiencies/

Specimen/requisition deficiency tracking and resolution — modeled deliberately on CoPathPlus's Deficiency+Resolution dictionary pattern.

**Pattern:** Two small admin dictionaries (DeficiencyType, ResolutionType) plus the actual SpecimenDeficiency records and a ManagementReview workflow.

## Files

- **`IDeficiencyService.ts`** — First concrete use: 'Could Not Match Specimen to Dictionary' at Accession order import — deliberately generic, built to extend to future deficiency types without a bespoke flag per scenario. **Updated in a later session:** `DeficiencyType` gained an optional `level?: 'case' | 'specimen' | 'both'` field — a real gap found and fixed after confirming every existing type showed up identically in both the case-level and specimen-level reporting contexts on the Accession page, regardless of whether it actually applied (e.g. "Container Damaged" showing up as a selectable option for a whole-case deficiency). Optional and defaults to 'both' when absent, so existing/unclassified data isn't silently hidden anywhere. `mockDeficiencyTypeService.ts`'s 8 seed types were classified accordingly; the admin config screen (`components/Config/System/DeficienciesSection.tsx`) grew a Level selector to manage it going forward.

## Notes

- Deliberately NOT the 'unblock now, admin approves later' governance pattern used for Physician/Client/SpecimenCategory — a deficiency is a workflow event resolved by whoever has bench context, not an entity needing admin-queue deduplication.
- The *complete*, permanent historical record of `SpecimenDeficiency` data (all statuses, for compliance/inspection purposes) is surfaced separately in `pages/AuditLogPage.tsx`'s "Quality Control" tab — this services layer doesn't distinguish "active work" from "permanent record" itself, that split lives entirely in which UI queries it and how.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*