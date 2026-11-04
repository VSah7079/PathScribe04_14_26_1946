# US electronic pathology (ePath) reporting: the API server's calls (PS-800)

Batch 620 (part E). Pete's design (Oct 19, 2026): one **generic NPCR ePath base** (HL7 v2.5.1 ORU^R01), a **state profile layer** (data per state, not code), and a **transport adapter layer** (PHIN-MS, SFTP, direct TCP, HTTPS API). No state comes first: states are profiles. **The state registry is chosen by where the work was performed (the performing facility's state), never by where the patient lives.**

PathScribe owns what and when (the profile, the checks, the queue entry, status, audit). The interface engine owns how (HL7 translation to the state's exact form, the transport, acknowledgements). Nothing here was tried against a real server or registry.

Browser side (built): `services/usEpath/` (`epathProfile.ts`, `epathRouting.ts`, `epathCheck.ts`, `epathTransport.ts` contract and mocks, `prepareEpathSubmission.ts`, `IUsEpathService`, mock, `httpUsEpathService.ts`, instance), `services/hl7/epathBuilder.ts`, Configuration > System > US ePath. Capability: `config:us-epath:manage` (high risk; Admin and Lab Director). Route style: `HTTP_SERVICES_PATTERN.md`. A refusal is a fixed code (`NOT_PERMITTED`, `NOT_FOUND`, `EXAMPLE_READ_ONLY`, `IN_USE`, `PROFILE_NOT_FOUND`, `422` with problem codes); the server decides permission and audits every change (profile id, state, facility id; no patient data).

## Service `IUsEpathService`

`/api/us-epath/us-epath`

| Method | Call | Arguments |
|---|---|---|
| `getProfiles` | `GET /api/us-epath/us-epath/get-profiles` | none |
| `saveProfile` | `POST /api/us-epath/us-epath/save-profile` | profile fields (body); no `id` creates, an `id` replaces (`NOT_FOUND` when unknown; `EXAMPLE_READ_ONLY` for the example) |
| `removeProfile` | `POST /api/us-epath/us-epath/remove-profile` | `{ id }` (`IN_USE` while an assignment names it) |
| `getAssignments` | `GET /api/us-epath/us-epath/get-assignments` | none |
| `setAssignment` | `POST /api/us-epath/us-epath/set-assignment` | `{ facilityId \| null, profileId }`; replaces that facility's earlier choice |
| `removeAssignment` | `POST /api/us-epath/us-epath/remove-assignment` | `{ facilityId }` |

## State profile

| Field | Meaning |
|---|---|
| `state` | two-letter US state or territory (`XX` only on the shipped example) |
| `requiredFields`, `optionalFields` | `SEG-n` (PID, PV1, ORC, OBR, OBX, SPM, NTE; never MSH); no field in both |
| `transport` | `phinMs`, `sftp`, `directTcp`, `httpsApi` |
| `validationRules` | `icdOMorphologyRequired`, `snomedRequired`, `specimenIdentifierRequired`, `finalReportOnly`, `providerNpiRequired` |
| `extensions` | `{ field, mode: 'required' \| 'fixed', value? }`: `fixed` puts the state's own value in that field of every such segment |
| `facilityBasis` | `technicalComponent` (default) or `reading`: which facility decides the state when the technical work was done elsewhere (PS-336) |

Problem codes on a refused `saveProfile`: `stateInvalid`, `fieldInvalid`, `fieldOverlap`, `transportInvalid`, `ruleInvalid`, `extensionInvalid`, `fixedValueRequired`, `facilityBasisInvalid`.

**Only a labelled example profile ships.** Its fields and codes show the shape and claim nothing about any state. Each real profile must be written from that state's published specification and checked with that state's registry.

## Routing (the browser's `resolveEpathRouting` is the reference)

1. The facility that performed the work decides; the patient's address is never read. When a technical-component facility differs from the reading lab, each is judged by the `facilityBasis` of its own profile (technical-component facility first).
2. A facility's profile: its own assignment, else the (non-example) profile for the facility's state, else the enterprise default assignment.
3. No facility, or no profile: the report is parked for review (`routing:noFacility`, `routing:noProfile`). Sign-out is never held.

## Base message (`buildEpathOruR01`)

MSH (ORU^R01^ORU_R01, v2.5.1), PID (PID-11 address is content only), PV1, OBR (accession, service id, ordering provider, report status F/C/P), SPM per specimen, OBX for the final diagnosis (TX) and each specimen's ICD-O-3 and SNOMED CT codes (CWE), each with result status, CLIA and the performing laboratory (OBX-15, 23, 24). A date of birth is written as the calendar date, never shifted by a time zone. **The OBR/OBX identifiers and coding-system names are defaults taken from the guide's structure and must be confirmed against the NPCR ePath implementation guide and each state's specification before a real send** (`EPATH_DEFAULTS`); a profile extension replaces any of them.

## Checks and the Outbound Queue

`checkEpathMessage` returns fixed codes (`field:PID-11`, `rule:finalReportOnly`) and never message text. A report that passes is queued on the registry feed (`epath_npcr_us`, kind `registry:epath_npcr_us`) with the profile's transport; one that fails is `HELD` for review with the `HOLD_EPATH_PROFILE` reason and the codes. A corrected report is status C. The engine reports acknowledgements back; an acknowledgement updates the queue entry. The engine must skip held messages.

Known limit: `providerNpiRequired` fails on demo cases because they carry no NPI.
