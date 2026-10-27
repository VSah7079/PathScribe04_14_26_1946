# hrHPV result: molecular platform to PathScribe (inbound)

Batch 629 (PS-174). How a high-risk HPV result from a molecular platform reaches a cytology case, what PathScribe does with it, and what the API server and the interface engine still have to build. PathScribe decides *what* is applied, retried or refused; the interface engine does *how* the message travels and is translated.

## 1. Today and in production

| | Today (demo / front end) | Production |
|---|---|---|
| Who sends | The HPV Triage tab's **Record Negative / Record Positive** buttons build the same event (`simulatedHpvResultEvent`) and apply it | The molecular platform sends an HL7 v2 ORU^R01 to the interface engine |
| Translation | none | The engine (not PathScribe) turns the ORU^R01 into `HpvResultEventPayload` |
| Route into PathScribe | in the browser: `processInboundHpvResultEvent` | `POST /api/interface/inbound` (`INTERFACE_ENGINE_EDGE.md` §4), `messageType` = `ORU^R01`, with `payload` = `HpvResultEventPayload` |
| Applies it | `services/hl7/processInboundHpvResultEvent.ts` | the same rules on the server (the browser file is the specification until then) |

No HPV result route exists on the API server or among the legacy engine webhooks (`api/webhooks/engine/` has block exception, material location, cassette dispatch outcome and engraver status only). **Building it is the server work this document specifies.**

## 2. The payload (`src/types/events/HpvResultEventPayload.ts`)

`messageId` (idempotency; on the API the key is tenant + sending system + MSH-10), `timestamp`, `organisationId`, `siteId?`, `internalCaseId?`, `accessionNumber`, `specimenLetter`, `hrHpvResult` (`Positive` | `Negative` | `Invalid`), `abnormalFlag?` (`A` for Positive, `N` for Negative), `referenceRange?`, `genotypeDetail?` (`hpv16`, `hpv18Or45`, `otherHighRisk`), `orderReason?`, `assayStainTypeId?`.

Proposed HL7 v2 mapping, for the engine team to confirm against the platform's own interface specification (not verified against any vendor): accession from OBR-2/OBR-3, specimen letter from the specimen or container identifier (SPM or OBR), assay from OBR-4, result from OBX-5, reference range OBX-7, abnormal flag OBX-8, event time OBX-14 or MSH-7 with an offset.

## 3. What PathScribe does with it

| Result | Case state under *primary HPV with reflex* | Worklist |
|---|---|---|
| Negative | `hpv_negative_complete`: routine recall, no cytology ever | leaves HPV Triage |
| Positive, clinician-collected | `reflex_triggered`: the same specimen becomes eligible for cytology screening | moves to the screening worklist |
| Positive, self-collected | `reflex_requires_new_specimen`: never eligible; needs a new clinician-collected specimen | Recall needed |
| **Invalid** (failed or inhibited assay) | stays `awaiting_hpv_result`, **never eligible** | stays in HPV Triage, and the row now says **"hrHPV result invalid: repeat test"** (Batch 629) |
| Co-testing strategy | no triage gate; the result is shown beside the cytology | n/a |

A Positive on the standalone screening assay (`st-hpv-highrisk-screen`) also queues a genotyping order.

## 4. What the API answers the engine

`services/hl7/hpvResultInboundResponse.ts` (the server uses the same table, `engineEdgeContract.ts` `INBOUND_RESPONSES`):

| Processing outcome | API outcome | Status, engine action |
|---|---|---|
| `applied` | applied | 200, ack |
| `already-applied` (same key again) | duplicate | 200, ack |
| `case-not-found` | retryLater | 409, retry (up to 24 h, then dead letter and alert). A result can reach PathScribe before the order does. |
| `specimen-not-found` | rejected `HPV_SPECIMEN_NOT_FOUND` | 422, dead letter, AE |
| `invalid-payload` (missing field, or abnormal flag contradicting the result) | rejected `HPV_RESULT_INVALID` | 422, dead letter, AE |

Decision for Pete: a wrong specimen letter is refused straight away rather than retried (the case exists, so waiting will not fix it). If you would rather it retry for 24 hours like a missing case, it is one line.

## 5. Audit

Every applied message is written to the audit log as "hrHPV Result Received", with the case, the specimen letter and the message key, and no patient data in the text. The API server also audits rejected and dead-lettered messages by key (`INTERFACE_ENGINE_EDGE.md` §9).

## 6. Not built (server and engine)

- The server route and the engine channel for the molecular platform (per vendor).
- The idempotency record: the browser file keeps it in memory only; the server stores it as the composite key.
- Registering the platform as an allowed sending system for the tenant.
- The manual path is built (section 7); in production the API server repeats the permission check, writes the audit entry and applies the second sign-off itself.
- A result for a case with two cytology specimens uses the specimen letter; no other matching is attempted.

## 7. Manual Record Positive / Negative (Batch 630, Pete's decision of Oct 19, 2026)

The worklist's **Record Positive / Negative** stay available in production for results that do not arrive by the interface (a paper report, an interface outage, a telephoned result, a back-entry), under these controls:

- **Permission.** `cytology:hpv-result:record-manual` (high risk). Pathologist and Lab Director start with it; there is no built-in Lab Supervisor role, so a lab that has one grants it in the Role Dictionary. Checked in `recordManualHpvResult.ts`, which writes the refusal or allowance to the audit log.
- **Result Source (required).** One of `MANUAL_PAPER_REPORT`, `MANUAL_DOWNTIME_OVERRIDE`, `MANUAL_PHONE_VERIFICATION`, `MANUAL_RETROSPECTIVE_ENTRY`. The specimen keeps it as `cytologyScreening.hpvResultSource`; a result from the platform is `INTERFACE`.
- **Audit.** "Manual hrHPV Result Entered": user, time, source, the result and source it replaced. No patient data in the text. The full history stays on the specimen (`hpvManualEntries`).
- **Confirmation.** The dialog asks for the source before it records anything.
- **Second sign-off.** If the entry would replace a result that came from the interface (or has no source), it does not take effect. It waits on the row (`hpvPendingOverride`) until a **different** person who holds the permission approves it; the person who entered it cannot. Rejecting keeps the interface result. Both decisions are audited ("Manual hrHPV Result Override Approved / Rejected") and kept on the specimen (`hpvOverrideDecisions`).
- **The platform wins.** A result that then arrives from the platform is stored with source `INTERFACE` and discards any entry still waiting.
- A person's entry carries no platform flag, reference range or genotype; the earlier ones are cleared when an approved entry replaces them.

Server note: the API server owns the check, the audit entry and the pending state in production (see `AUTHORIZATION_API.md`).

## 8. Self-collected results in Australia and New Zealand (Batch 631)

**PathScribe side (built).** A self-collected specimen can never be reflexed to cytology (vaginal, not cervical, cells), so every self-collected Positive or Invalid result is a recall:

| Result | Priority | Recommendation codes (placeholder) | Target (setting, defaults shown) |
|---|---|---|---|
| Positive, HPV 16 or 18 | Urgent | `AU_REFER_COLPOSCOPY` + `AU_RECALL_CLINICIAN_LBC` / `NZ_REFER_COLPOSCOPY` + `NZ_RECALL_CLINICIAN_LBC` | Urgent: 2–4 weeks |
| Positive, another oncogenic type | Routine | `AU_RECALL_CLINICIAN_LBC` / `NZ_RECALL_CLINICIAN_LBC` | Routine: 6–12 weeks |
| Positive, genotype not reported (or only the 18/45 group) | Urgent window, no colposcopy claim | `AU_RECALL_CLINICIAN_LBC` / `NZ_RECALL_CLINICIAN_LBC` | Urgent: 2–4 weeks |
| Invalid (Australia: Unsatisfactory) | Routine | `AU_RECALL_REPEAT_COLLECTION` | Australia repeat: 6–12 weeks |
| Invalid (New Zealand: Invalid / Unsuitable) | Routine | `NZ_RECALL_REPEAT_COLLECTION` | New Zealand repeat: as soon as practicable (no fixed period); an unsatisfactory cytology is within 3 months |

- **Recommendation codes (Batch 632).** The six codes are an internal PathScribe namespace (`recommendationCodes.ts`). In the register payload each is an envelope `{ recommendation_code, display_text, authority: "PATHSCRIBE_INTERNAL", status: "PLACEHOLDER_MAPPED", target_registry: "AU_NCSR" | "NZ_NCSP" }`; the interface engine maps them to each register's own codes. The screen shows the translated description, never the code. A 16/18 result carries two codes (colposcopy referral and clinician LBC).
- **The target windows are a setting (Batch 632).** Configuration > Cytology > Screening Strategy > "Self-collected HPV recall windows": Urgent, Routine, Australia repeat and New Zealand repeat, in whole weeks (1 to 52, first number not after the second); leaving both boxes empty means "as soon as practicable". Changing them needs `config:cytology-screening-strategy:manage`. They apply to the Recall needed tile and to the payload's `targetWeeks` (null when there is no fixed period).
- Which rule applies follows the **performing laboratory's jurisdiction** (the lab that processes and reports the specimen, found the way the app finds a case's performing lab), falling back to the institution-wide Jurisdiction setting when none is assigned. Only AU and NZ have it; every other jurisdiction keeps the standard Recall needed tile. The ordering facility's jurisdiction is not used.
- The inbound `genotypeDetail` may now carry `hpv18` and `hpv45` separately beside the existing `hpv18Or45` group; send them when the platform reports them. The group alone cannot tell 18 (urgent) from 45 (routine), so it is treated as "not reported".
- An Invalid result on a self-collected specimen no longer sits as "Awaiting": it goes to Recall needed as a repeat collection.
- A recall closes by itself when the same patient has a **later** clinician-collected cervical (GYN cytology) case (any GYN sample for a repeat collection). Matching is by patient and creation time only until the register supplies its own identifiers.
- **Per country, with the lab's own wording (Batch 640).** The same card has a **Country** dropdown (Australia, New Zealand). Each country keeps its own target windows (a country with none saved uses the shared set saved before Batch 640, then the defaults) and its own recall wording, per language and per kind (positive result, invalid result). Text written there replaces the built-in text for that country and language, with `{{type}}` and `{{next}}` filled in; an empty box means the built-in text. Saving is audited (`RECALL_SETTINGS_CHANGED`). So the windows and wording no longer wait for each programme's sign-off: the lab's administrator sets what its programme says. The built-in wording (Pete's text from the programme guidance) and the default windows remain the starting point. The recommendation **codes** are not editable here and nothing in PathScribe waits on them: the interface engine maps the six internal keys to each register's codes during programme onboarding (`docs/product/RECALL_SIGNOFF.md` section 2).

**What PathScribe hands the engine.** `buildHpvRegistryResultPayload` (services/cytology) is the structured JSON for a register message: collection method `CL`/`SC`, result, genotype as `HPV_16` / `HPV_18` / `HPV_OTHER` (with `genotypeResolved`), patient demographics and national identifiers, the recall recommendation, and `laboratoryAccreditationId`. The registry ids `ncsr_australia` and `ncsp_new_zealand` are placeholders. **PathScribe does not hold the lab's NATA accreditation identifier**: it is sent as null.

**Engine and onboarding (not PathScribe work), from Pete, Oct 19, 2026.**
- *Australia, NCSR* (operated by Telstra Health): governed by the Summary Guide for Pathology Laboratories reporting to the NCSR (NPAAC Tier 4 guidance). Needs Medicare number with IRN or IHI, full demographics, the CL/SC flag, HPV 16 / HPV 18 / other oncogenic (not a bare positive), and the laboratory's NATA identifier. Test credentials, certificates and endpoints come only after the laboratory signs an integration agreement and passes conformance testing with the NCSR Pathology Integration Team; the pilot lab's Pathology IT Director or Quality Manager starts the onboarding ticket.
- *New Zealand, NCSP register* (Health New Zealand | Te Whatu Ora): specification and onboarding come from Health NZ's integration teams under the national laboratory contract; the same CL/SC and genotype needs apply. No transmission code until a formal integration project exists. No Jira ticket yet.
- None of the above is verified against the primary documents. Treat message formats as unconfirmed until the specifications are in hand.

