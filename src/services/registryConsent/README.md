# services/registryConsent

Batch 418 (Registry Engine SRS v2.1, FR-008.1). What a patient's registry opt-out means, and the one way to record it.

| File | What it does |
|---|---|
| `evaluateRegistryConsent.ts` | `evaluateRegistryConsent(domain, consent, settings)`: a screening opt-out always excludes (every cervical programme is consent-based); a cancer registry opt-out is overridden by statute unless `CancerRegistrySettingsConfig.honoursPatientOptOut` is true. `consentExclusionMessage` is the English text stored on the audit record and the queue entry. Pure. |
| `recordPatientRegistryConsent.ts` | `patient:registry-consent:record` enforced; written to the case's patient and mirrored to the MPI (`setRegistryConsent`); audited. Clearing both flags removes the record. |
| `recordPatientRegistryConsentDeps.ts` | The real services it uses. |

**Where it is applied.** `cytology/signOutCytologyCase.ts` (`dispatchToRegistry`): an excluded case is audited as "Registry submission excluded by consent" and a queue entry is marked failed `EXCLUDED_BY_CONSENT` with `maxRetriesExceeded: true`, so it shows in the transmission audit and is never resent. `cancerRegistry/dispatchCancerRegistryReportIfApplicable.ts`: excluded only where the lab honours the opt-out; otherwise sent, with an audit entry "Registry opt-out overridden by statute".

**Recorded where.** `types/patient/PatientRegistryConsent.ts` on `Patient.registryConsent` and `MasterPatientRecord.registryConsent`. Entered on the Accession page (`components/Common/RegistryConsentFields.tsx`).

**Not yet.** A Configuration switch for `honoursPatientOptOut` (the cancer registry settings screen is on the deployment baseline and needs its own clean-up first; the setting is honoured by the service today). Editing an opt-out after accession. An HL7 source for consent (PID-… / a CON segment).

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Versioned per case; a `conflict` outcome is new.

---
*When this folder's contents change meaningfully, update THIS file.*
