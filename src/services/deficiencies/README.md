# services/deficiencies/

Specimen/requisition deficiency tracking and resolution — modeled deliberately on CoPathPlus's Deficiency+Resolution dictionary pattern.

**Pattern:** Two small admin dictionaries (DeficiencyType, ResolutionType) plus the actual SpecimenDeficiency records and a ManagementReview workflow.

## Files

- **`IDeficiencyService.ts`** — First concrete use: 'Could Not Match Specimen to Dictionary' at Accession order import — deliberately generic, built to extend to future deficiency types without a bespoke flag per scenario.

## Notes

- Deliberately NOT the 'unblock now, admin approves later' governance pattern used for Physician/Client/SpecimenCategory — a deficiency is a workflow event resolved by whoever has bench context, not an entity needing admin-queue deduplication.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*