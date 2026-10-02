# services/patientIdentifiers

Batch 417 (Registry Engine SRS v2.1, §5 and FR-004). A patient's **national healthcare identifiers**, kept apart from the lab's MRN, with their check digits run. Every registry keys on one of these (the NHS number, the BSN, the IHI), never on the MRN.

| File | What it does |
|---|---|
| `checkDigits.ts` | The check-digit rule per identifier system, keyed by its `IDENTIFIER_FORMAT_LIBRARY` id. `verifyNationalIdentifier(system, raw)` → `verified` / `failedChecksum` / `unchecked` with a reason key under `nationalIdentifiers.reasons.*`. `NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION` says which systems a jurisdiction's patients carry. Pure. |
| `classifyHl7PatientIdentifier.ts` | Which system an HL7 PID-3 repetition is, from its CX.5 type code and CX.4 assigning authority; the lab's jurisdiction settles an unnamed `NH`. Pure. |
| `recordNationalPatientIdentifier.ts` | The one way a person records one: `patient:national-identifier:record` enforced, the check digit run, written to the case's patient and mirrored to the MPI, audited (the value stays out of the audit text). A failed value is kept, marked `failedChecksum`, so the registry hold can name it; a blank value removes. |
| `recordNationalPatientIdentifierDeps.ts` | The real services it uses. |

**Rules and their status.** Confirmed against a published example or a known test value: NHS, CHI, H&C (via `utils/ukPatientIdValidation.ts`), BSN (`111222333`), KVNR (`A123456780`), PPSN (`1234567FA`, `1234567T`), AU IHI (Luhn), Belgium (mod 97, with the "2" prefix for births from 2000). From memory of the specification, unconfirmed: NZ NHI (new mod 23, legacy mod 11), FR NIR (mod 97 with the Corsica rule), IE IHI (mod 11), CA provincial (Luhn, Ontario only). No check digit PathScribe may run: KR RRN (format only; PIPA, and digits issued after October 2020 are random). The SRS asks each JCP's sign-off lead to confirm its rule against the official specification.

**Where it is read.** `screeningRegistry/screeningRegistryEngine.ts` (`resolveRegistryPatientIdentifier`: the verified national identifier first, the MRN as a format-checked fallback for records from before Batch 417; a failed or missing one holds the submission with its own reason). `cancerRegistry/buildCancerRegistryReportPayload.ts` carries the list. `hl7/processAdtMessage.ts` records them from PID-3. `components/Common/NationalIdentifierFields.tsx` is the input on the Accession page. `components/Search/CaseSearchBar.tsx` searches their values.

**Corrections made here.** The H&C number's library format was wrong (2 letters + digits; it is 10 digits in the 32–39 range), the NHS description said Luhn (it is mod 11), and the CHI example `1401740054` failed its own check digit (now `1401740057`).

## Batch 424

`normalizeNationalIdentifier` treats dots as separators too. The Belgian register number is written `YYMMDD-SSS.CC`, which is its format's own pattern and example. Before this fix the dot made every correctly written number fail its check. It was found while generating synthetic identifiers.

## Batch 425 — changes after accessioning send an A08

`recordNationalPatientIdentifier` takes `announce: true` for a change made after accessioning (the Registry Exceptions page's **Patient details**). The patient then gets the existing A08 demographic update, with `sourceOperation: 'recordNationalIdentifier'`; its snapshot already includes the national identifiers. Accessioning itself sends none. A blank value now also removes the identifier from the MPI (`removeFromMpi`); before, it was removed only from the case.

---
*When this folder's contents change meaningfully, update THIS file.*
