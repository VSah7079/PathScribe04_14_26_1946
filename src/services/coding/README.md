# services/coding

Batch 594. One shape for a diagnosis or procedure code in any coding system, so a new revision (ICD-11, later ICD-12) is data, not new fields and new code. Design and rules: `docs/architecture/DIAGNOSIS_CODING.md`.

- **`codedEntry.ts`:** `CodedEntry` (system, release, code, display, source, AI detail, mapped-from). `source` is `typed`, `map`, `ai`, `rule` or `legacy`. An ICD-11 cluster (`2C25.Y&XH0P4`) is one value. Ids match the system pills in the Add Code window.
- **`codeSystemPolicy.ts`:** which systems a jurisdiction uses and when: a role (`off`, `optional`, `required`) with an optional start date per system. `roleOn`, `activeSystems`, `requiredSystems`, `missingRequiredSystems`, `entriesOutsidePolicy`. Pure; today's date is passed in. `defaultCodePolicy` asks for nothing and keeps ICD-11 off, as today.
- **`caseCodingAdapter.ts`:** reads a case's older `CaseCoding` fields into entries (source `legacy`) and writes entries back (`toCaseCoding`), so saved data does not change. A system the older fields cannot hold comes back in `unrepresented` and is not dropped.

- **`codeSystemPolicyRules.ts`** (Batch 595): the checks (`NO_RULES`, `BAD_SYSTEM`, `BAD_ROLE`, `BAD_DATE`, `DUPLICATE`, `TOO_MANY`) and the audit wording for a jurisdiction's policy record.
- **`codeSystemPolicyService.ts`, `mockCodeSystemPolicyService.ts`** (Batch 595): `list`, `save`, `reset` (need `config:code-systems:manage`; audited `CODE_SYSTEM_POLICY_CHANGED`), `policyFor` (the saved policy or the default; a system read), `served`. Exported from `@/services` as `codeSystemPolicyService`. Settings screen: `components/Config/System/CodeSystemsSection.tsx`.

**Where the policy is applied (Batches 607 and 614):** the Add Code window, case coding display, sign-out check, outbound messages, case search (SNOMED and ICD fields), the specimen edit window (SNOMED fields) and the order message built at accession (no diagnoses when ICD-10 is off). A screen with a system switched off says so in a short note (`CodeSystemOffNote`) instead of leaving the field out silently. Helpers: `systemsOffByPolicy`, `systemAllowed`, `orderDiagnosesAllowed`, `policyOffersNone`. The cancer-registry message is deliberately not filtered (it follows the registry's own required fields). Server enforcement stays a server task.

## Batch 607

- **`codePolicyEnforcement.ts`:** `pillStates` (Add Code window), `signOutCodeCheck`, `collectCaseEntries`, `filterOutbound`, audit builders for the sign-out override and withheld codes (system names only).
- **`caseCodingEntries.ts`:** `reconcileEntries`, `withEntries` keep `Case.coding.entries` and the older lists in step.
- **`simulatedIcdMap.ts`:** seeded ICD-10 to ICD-11 pairs, Simulated. **`icdO3Morphology.ts`:** bundled ICD-O-3 morphology table searched in the ICD-O tab. **`opcs4Sample.ts`:** Simulated OPCS-4 reference sample.
- **Now wired:** the Add Code window, the sign-out check (`useSignOutWorkflow.ts`) and the charge message (`billing/jsonWebhookBuilder.ts`) read the policy.

## Batch 617 (part A): server versions (PS-514)

`codeSystemPolicyService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CONFIG_SERVICES_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
