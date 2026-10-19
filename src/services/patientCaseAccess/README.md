# patientCaseAccess

Batch 613. Access to a patient's other cases.

When a pathologist working up or signing out a case finds the patient has other cases they cannot open (another organisation, facility or subspecialty pool), the patient history and the case workup show how many, never which. They can ask for access with a reason from a short list. The assigned pathologist of any of those cases, or an administrator, approves or declines; the requester is told either way. A grant covers the patient (linked identities included) and stays open until someone revokes it, with a reason the person is told.

| File | What it does |
|---|---|
| `patientCaseAccessRules.ts` | Pure decisions: which cases are restricted, who may decide (never your own request, never PathScribe support), audit entries and messages. No patient name, date of birth, MRN or free-text note is written to the audit log. |
| `patientCaseAccessService.ts` | `createPatientCaseAccess(deps)` for tests; `getPatientCaseAccess()` wires the app services; `getRestrictedCaseCount(patientId, user)`. Capabilities: `patient:other-cases:request-access`, `patient:other-cases:decide-access`. |
| `patientCaseAccess.test.ts` | Rules and the full request, approve, view, revoke path with in-memory fakes. |

The notice is `components/PatientHistory/RestrictedCasesNotice.tsx`; the administrator's list of active grants is on the Quality Assurance access-request tab. Requests are stored as access requests of type `patient_cases` and reset with the demo data.
