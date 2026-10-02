# types/patient

Batch 417. `NationalPatientIdentifier`: a patient's national healthcare identifier (`system` = an `IDENTIFIER_FORMAT_LIBRARY` id such as `mrn_nhs`, `value`, `verificationStatus` from its check digit, `verifiedAt`, `source`). Carried on `Patient.nationalIdentifiers` (`types/case/Patient.ts`) and mirrored in the MPI's identifier store. The rules are in `services/patientIdentifiers/`.

## Batch 418

`PatientRegistryConsent`: `screeningOptOut`, `cancerRegistryOptOut`, `recordedAt`, `recordedBy`, `source`. The rule is `services/registryConsent/evaluateRegistryConsent.ts`.

---
*When this folder's contents change meaningfully, update THIS file.*
