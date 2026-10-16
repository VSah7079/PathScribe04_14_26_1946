# pages/RegistryExceptionsPage

Batch 421 (Registry Engine SRS v2.1, FR-008.6/7). Quality & Compliance → Registry Exceptions, `/registry-exceptions`, behind `ScreenGate` (`screen:registry-exceptions:open`).

Every screening or cancer registry submission that needs a person: held, not delivered, rejected (fixable or outright), no answer in 72 hours, or conflicting answers. Latest version only. Filter chips with counts; Details lists each finding and the acknowledgement as received; Open case; Re-validate and resend (`registry:submission:resend`, via `CapabilityButton`).

Rendering only. The rules are in `services/registrySubmission/` (`registryExceptions.ts`, `resendRegistrySubmission.ts`); `hooks/useRegistryExceptions.ts` loads the rows (running the 72-hour escalation) and runs a resend.

## Batch 423

- **Capture as CAPA** on each row raises it for CAPA review in Quality Assurance (`captureRegistryExceptionAsCapa`), the same way the interface dead-letter screens do. A row with an open CAPA shows **CAPA open**.
- Rows held because a registry is live without a current go-live approval show as **held**, with the code `REGISTRY_LIVE_NOT_APPROVED`.

## Batch 424

**Attestation required** is its own filter and status ("Held: attestation required"). With it selected, **Resend all** runs the catch-up. Approving go-live also does this automatically.

## Batch 425

- **Revised after acceptance:** a new filter and status. A registry changed data it had accepted; the row shows the changed fields, and a CAPA deficiency is raised automatically. **Mark reviewed** (`registry:revision:review`) takes the row off the list.
- **Patient details:** edit the patient's national identifiers and opt-outs after accessioning (`PatientRegistryDetailsModal`), then resend a held row.
- **Download transmission audit:** screening, cancer or both (`qa:registry-transmission-audit:export`).
- Only the signed-in user's organisation's cases are listed.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 550 (PS-539 phase 2d: exports through the server)

- The transmission audit download goes through the export service; with the API server its notice says when the file is ready (no toast here).
