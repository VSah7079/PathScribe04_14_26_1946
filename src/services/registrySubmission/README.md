# services/registrySubmission

Batch 419 (Registry Engine SRS v2.1, FR-008.4, FR-008.5, FR-008.8). The header every registry payload carries, cancer and screening alike.

| File | What it does |
|---|---|
| `registrySubmissionHeader.ts` | `buildRegistrySubmissionHeader(input, priorQueueEntries)` → `{ submissionGuid, submissionVersion, masterTransactionId, messageType, environment, isDuplicateRetry, previousSubmissionGuid?, specimenId }`. `retryRegistrySubmissionHeader` for a resend. Pure. |
| `sha256.ts` | Synchronous SHA-256 (checked against the FIPS 180-4 vectors), so the ids derive the same way everywhere. |

**The rules.**
- `masterTransactionId`: one per facility, case, specimen and registry. Every version of a result links back to it.
- `submissionVersion`: 1, then one more than the latest earlier submission for that specimen and registry.
- `submissionGuid`: the SRS formula, a hash of facility, case, specimen, sign-out time and version, shaped as a GUID (version nibble 8). The same report always gets the same id.
- `messageType`: `NEW` until the registry has been *sent* a version; then `CORRECTION` (the diagnosis changed, or a case re-signed out) or `AMENDMENT` (an addendum). A correction of a result that was only ever held goes as `NEW`.
- `environment`: from the lab's settings, default `test`. The interface engine maps it to the wire format's test flag (HL7 MSH-11 `T`, FHIR `meta.security` TEST).
- `isDuplicateRetry`: a resend from the queue (`retryDispatch`) keeps the id and sets this, so the registry can drop the duplicate.

**Where it is used.** `screeningRegistry/submitScreeningRegistryResult.ts` (sign-out, correction, addendum), `cancerRegistry/dispatchCancerRegistryReportIfApplicable.ts` (case-level: `specimenId: 'case'`), and both registry queues' `retryDispatch`. Stored on each queue entry as `submission`; absent on an exclusion (nothing was built) and on entries from before Batch 419.

## Batch 420: acknowledgements and the status lifecycle

| File | What it does |
|---|---|
| `registryAcknowledgement.ts` | Reads a registry's answer from an HL7 ACK (MSA-1, MSA-2 = our submission id, ERR segments), a FHIR OperationOutcome, or the interface engine's status JSON, into one shape with findings (FATAL / CRITICAL_REJECT / WARNING / INFORMATIONAL). `applyRegistryAcknowledgement`: awaiting, overdue or rejected takes the answer; an accepted submission is never reopened (a different answer is a `conflict`); the same answer twice is a `duplicate`. `registrySubmissionsToEscalate`: the 72-hour rule. Pure. |
| `recordRegistryAcknowledgement.ts` | Finds the submission by id in the cytology or cancer registry queue, stores the answer with its raw text, moves the status, audits. `escalateStaleRegistrySubmissions`: sent and silent for 72 hours → `ackOverdue`; undeliverable for 72 hours → retries stopped. |
| `recordRegistryAcknowledgementDeps.ts` | The real queues. |

Status, beside the transport status on each queue entry (`registryStatus`): `awaitingAck` when sent → `accepted` | `acceptedWithWarnings` | `rejectedRecoverable` | `rejectedFatal`, or `ackOverdue`. A resend clears it until it is sent again. The server endpoint is specified in `docs/architecture/REGISTRY_ACKNOWLEDGEMENT_API.md`.

## Batch 421: the Registry Exceptions worklist and resend

| File | What it does |
|---|---|
| `registryExceptions.ts` | Which submissions are exceptions: `held`, `deliveryFailed` (retries stopped), `rejectedRecoverable`, `rejectedFatal`, `ackOverdue`, `conflict` (accepted, then a different answer). Only the latest version of each result shows; consent exclusions, accepted, waiting and still-retrying submissions never do. Rows carry the findings and the raw acknowledgement. `registryLabelKey`, `registryExceptionCaseView` (Batch 446: the case and view, not an address). Pure. |
| `registryExceptionsService.ts` | The worklist's load: the 72-hour escalation, then the rows. |
| `resendRegistrySubmission.ts` | "Re-validate and resend", `registry:submission:resend`. Rebuilds from today's data. Still held → nothing queued, the reasons come back. Same content (`registryContentHash`): the registry rejected it → refused (`unchanged`); otherwise the same submission again, same id, `isDuplicateRetry`. Changed content → a new version through the normal path (NEW if the registry holds no accepted version, else CORRECTION / AMENDMENT). Audited either way. |
| `rebuildRegistrySubmission.ts` | The rebuild: a cytology entry through `prepareScreeningRegistrySubmission`, a cancer entry through `prepareCancerRegistrySubmission`. Reports when the case, the result, the registry or eligibility has gone. |
| `registryExceptionsDeps.ts` | The real services behind all three. |

`registrySubmissionHeader.ts` gains `kind` on the header, `registryContentHash`, and the rule that a version the registry rejected is one it doesn't hold (so a fixed resend of a rejected first submission is NEW, not CORRECTION).

## Batch 423: live-register holds and Capture as CAPA

- `registryExceptions.ts`: a submission held with `REGISTRY_LIVE_NOT_APPROVED` shows as **held**. This happens when a registry is set to its live register without a current go-live approval (`services/registryGoLive/`).
- `rebuildRegistrySubmission.ts` takes a `liveHold` dependency, so a resend to a live register without an approval stays held.
- The header (`registrySubmissionHeader.ts`) carries `templateVersion`, the registry template the payload was built to. Go-live counts only test submissions accepted on the version being approved.
- `captureRegistryExceptionAsCapa.ts` (Pete: "ability to, if needed, to create a CAPA") raises a worklist row into Quality Assurance's CAPA lifecycle, as the interface dead-letter screens' **Capture as CAPA** does.
  - It creates an open case-level deficiency of type `def-registry-submission-failure`, whose comment names the registry, version, environment, findings and queue entry.
  - It allows one open CAPA per submission. It needs `screen:registry-exceptions:open` and is audited.
  - `registryRowsWithOpenCapa` lets the worklist show **CAPA open**.

## Batch 424

- **New kind: Held, attestation required.** `registryExceptions.ts` gives `attestationRequired` its own kind (`REGISTRY_LIVE_NOT_APPROVED`, shown as "Held: attestation required"), separate from **held** (identifier or codes not ready).
- **Resend all.** `resendAllRegistrySubmissions` is the worklist's bulk catch-up. Each row still goes through `resendRegistrySubmission`, so each is permission-checked, re-validated and audited.
- **Rebuild uses the send gate.** `rebuildRegistrySubmission` takes `sendGate` in place of Batch 423's `liveHold`. A resend is held or skipped exactly as a first send is.
- **Correction.** The acknowledgement files' comments said answers come back "through the hospital's interface engine". The engine is ForMedrixAI's, shipped with PathScribe; a site's own engine is used only when the site insists.

## Batch 425 — JSON only, revisions after acceptance, the transmission audit, organisation scope

- **JSON only.** `registryAcknowledgement.ts` reads only the interface engine's normalised JSON (`submissionId` or `submissionGuid`, `status`, `ackCode`/`responseCode`, `findings[]`). The HL7 v2 ACK and FHIR OperationOutcome readers from Batch 420 are gone; the engine reads those (PS-331). Anything else is refused as `notNormalizedJson`. The registry's response code is kept on each answer (`responseCode`).
- **Revisions after acceptance** (`recordRegistryRevision.ts`). A registry's `REVISED` message (`REGISTRY_RESPONSE_UPDATED`, or `status: "REVISED"` with `revisedPayload`) about an accepted submission:
  - is stored (`registryRevisions[]` on the queue entry);
  - raises a CAPA deficiency `def-registry-revised-post-acceptance` automatically, which counts as the row's CAPA on the worklist;
  - is audited;
  - shows on the worklist as `revisedPostAcceptance` until someone with `registry:revision:review` marks it reviewed (`reviewRegistryRevision`).

  A repeat (same `payloadHash`) is a duplicate. A revision of something not accepted is refused. `recordRegistryResponse` routes one posted message to the answer or the revision path.
- **Transmission audit** (`registryTransmissionAudit.ts`): one row shape and CSV column set for screening and cancer submissions:
  - sent time;
  - registry status;
  - response code;
  - answered time;
  - the revision count.

  No patient identifiers. `exportRegistryTransmissionAudit` (in `registryExceptionsService.ts`) checks `qa:registry-transmission-audit:export`.
- **Organisation scope.** `loadRegistryExceptionsForUser` and `countRegistryExceptionsForUser` keep only the cases the signed-in user can see. The case router's own filter does this, so it covers organisation and facilities. The count feeds the nav and tile badges. The go-live catch-up still uses the unscoped load.
- A cancer report held for missing mandatory data (`HOLD_MISSING_MANDATORY_DATA`, `services/cancerRegistry/cancerRegistryMandatoryData.ts`) is a `held` row; a resend re-checks it.

## Batch 446

`registryExceptionCaseView(row)` (was `registryExceptionCaseRoute`) returns the case and view, not an address. The screen opens it by reference.

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 538

`sha256.ts` adds `sha256HexBytes` (over raw bytes). `sha256Hex` (over a UTF-8 string) is unchanged. Report documents hash their PDF bytes with it.

## Batch 550 (PS-539 phase 2d: exports through the server)

- The registry transmission audit export goes through the export service (`registryExceptionsDeps.ts`, with `{ queue }`); with the API server its notice reports the outcome (`viaServer`), so the page doesn't toast a count.

## Batch 551 (PS-539 phase 2d: the Server jobs view)

- Carried over from Batch 550: `exportRegistryTransmissionAudit` doesn't read the queues when exports go through the server (`exportsViaServer`, from `exportService.viaServer`); the server builds the file from the queue.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: the worklist's 72-hour escalation stops in the browser once the server runs `registry.escalateStale` (`loadRegistryExceptions`, `runServerJobs`).

## Batch 605

`simulateRegistryAcknowledgement.ts` plays the registry's answer (accepted, warnings, rejected, silent) through the real acknowledgement recorder. `simulateRegistrySubmission.ts` hands queued cancer registry reports to the simulated registry (marks them sent, awaiting an answer) with a PHI-free audit entry; the case panel is `CaseRegistryReportPanel`.

## Batch 638

AWAITING_ELIGIBILITY entries show as Held on the Registry Exceptions screen but cannot be resent from it; `resendRegistrySubmission` accepts `eligibilityVerified` only from the CSMS eligibility answer (which has already enforced its own capability). NOT_ELIGIBLE entries are closed and no longer shown.
