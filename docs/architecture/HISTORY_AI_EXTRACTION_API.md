# AI extraction of historical reports: settings, stored extractions and flags

Batch 621 (Pete, Oct 19 2026). When a historical case is opened in the patient history view, the AI reads its Final Diagnosis and Microscopic text and fills in the synoptic fields it can, using the existing synoptic capability. The result is **metadata beside the cached case, for the pathologist to look at. It is advisory only.**

**Advisory only, enforced.** No report, print, registry feed, billing rule, rules engine or export reads an extraction. `src/services/historyExtraction/advisoryOnly.guard.test.ts` fails the build if any module outside the extraction and display code imports it, if a case type carries it, or if a storage key is used elsewhere. Every extraction carries `verification: "ai-unverified"` and the screen always shows "AI-extracted, not verified". The server must not add extraction data to any case, report, export or feed payload either.

**Off by default.** Set for the enterprise, with a performing-facility override (the delivery-schedules pattern): the facility's own setting, else the enterprise's, else off. Which facility applies is the case's performing (ordering) facility.

Browser side (built): `services/historyExtraction/` (`historyExtraction.ts` types, hash and settings rules; `extractHistoricalSynoptic.ts` the runner; `runHistoryExtraction.ts` open/refresh flow; `historyExtractionRuntime.ts` real dependencies; `IHistoryExtractionService`, `IHistoryExtractionSettingsService`, mocks, http versions, instances); `aiIntegration/synopticFieldsPrompt.ts` (the one synoptic prompt, shared with `suggestSynopticFields`); `components/PatientHistory/HistoryExtractionPanel.tsx` (display and "flag as wrong"); `components/Config/System/HistoryExtractionSection.tsx` (setting and accuracy counts). Nothing here has been tried against a real server.

## How a run works

1. The user opens (or refreshes) a historical case in the history view. The history is shown first; the extraction starts afterwards and never delays it.
2. The setting for the case's performing facility must be on, and the user must hold `ai:history-extraction:run` (checked and audited by the authorization service). Otherwise nothing runs and nothing is shown.
3. The source text is the Final Diagnosis plus the Microscopic text, whitespace-normalised and hashed (`sourceTextHash`). A stored extraction for the same hash is used as it is: **no AI call**. A recorded failure is not an answer and is tried again on the next open or refresh. A changed text gives a new hash and a new run.
4. Two AI calls, both through `callAi` with context `{ feature: "history-extraction", caseId, facilityId }` so the PS-558 vendor policy applies (a refused vendor is recorded as `failed` / `vendorNotAllowed`):
   - choose the one published diagnostic template that fits (or none);
   - fill that template's fields with the shared synoptic prompt (confidence 0 to 100; fields under 30 are dropped; a value must be one of the field's option ids).
5. The result is saved (`save`) and one audit entry is written (`HISTORY_EXTRACTION_RUN`, type `ai`; the case id, template id, status, failure code and field count; **no patient text**).
6. A failure never breaks the history: it is stored as `status: "failed"` with a fixed code.

## Service `IHistoryExtractionService`

`/api/ai/history-extraction`

| Method | Call | Arguments |
|---|---|---|
| `getForCase` | `GET /api/ai/history-extraction/get-for-case` | `sourceCaseId` (query); the stored extraction, or null |
| `save` | `POST /api/ai/history-extraction/save` | a `HistoryExtraction` (body); replaces what is stored for that case. Needs `ai:history-extraction:run` |
| `flagAsWrong` | `POST /api/ai/history-extraction/flag-as-wrong` | `{ sourceCaseId, fieldId \| null, templateId \| null, sourceTextHash, flaggedBy }` (body); `fieldId` null flags the whole extraction; the same user flagging the same field of the same text twice returns the first flag. Needs `ai:history-extraction:flag` |
| `getFlags` | `GET /api/ai/history-extraction/get-flags` | `sourceCaseId` (query, optional) |
| `getAccuracy` | `GET /api/ai/history-extraction/get-accuracy` | none; `{ extractions, fieldsExtracted, flagged }` |

## Service `IHistoryExtractionSettingsService`

`/api/ai/history-extraction-settings`

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/ai/history-extraction-settings/get-all` | none |
| `getForFacility` | `GET /api/ai/history-extraction-settings/get-for-facility` | `facilityId` (query); the facility's own entry, or null |
| `set` | `POST /api/ai/history-extraction-settings/set` | `{ facilityId, enabled }` (body); `facilityId` null is the enterprise entry; one entry per scope. Needs `config:history-extraction:manage` |
| `remove` | `POST /api/ai/history-extraction-settings/remove` | `{ facilityId }` (body); removes a facility's own entry (`NOT_FOUND` when it has none). Needs `config:history-extraction:manage` |

Refusals are fixed codes (`NOT_PERMITTED`, `NOT_FOUND`) and never carry text from the request. A refused `set` carries the problem code `enabledInvalid`.

## `HistoryExtraction` (the stored metadata)

| Field | Meaning |
|---|---|
| `sourceCaseId` | the historical case it was read from |
| `sourceTextHash` | hash of the normalised source text: the cache key |
| `status` | `extracted`, `noText` (nothing to read), `noTemplate` (no template fits), `failed` |
| `failure` | when `failed`: `vendorNotAllowed`, `aiError`, `badResponse`, `noTemplates` |
| `templateId`, `templateName`, `templateVersion`, `templateConfidence` | the template guess: the published template in use now, not necessarily the one the report was signed on |
| `fields[]` | `{ fieldId, label, value, display, confidence? }`; `value` is an option id (comma-separated for several) or free text |
| `extractedAt` | ISO time |
| `aiService` | `{ provider, model }` that answered |
| `verification` | always `ai-unverified` |

The extracted values are patient clinical content: the server stores them with the same protection as the case, never logs them, and never puts them in an audit entry or URL.

## Capabilities

`config:history-extraction:manage` (Admin, Lab Director), `ai:history-extraction:run` and `ai:history-extraction:flag` (Pathologist, Fellow, Resident). Rows in `CAPABILITIES.md` and `AUTHORIZATION_API.md`.

## Not built / open

- The Assist-mode LIS summary hook (`patientHistory/ensureHistoryFetchStarted.ts`, `markFetched`) is a system action with no user, so a user capability cannot be enforced there. Extraction there is a follow-up (it would need a system-run permission decision from Pete); today it runs only when a person opens the case in the history view.
- Reading structured synoptics that a legacy LIS embeds in the formal report is separate (the read-only call approach).
- Accuracy is counted (extractions, fields, flags). Any target or action on the numbers is for Pete to set.

## What the server must do

- Keep one setting per scope and apply the resolution above; audit every `set` and `remove`.
- Store extractions and flags with the case's protection; enforce `ai:history-extraction:run` on `save` and `…:flag` on `flagAsWrong`.
- Keep extractions out of every case, report, export and feed payload.
- Make the AI calls with the facility's allowed vendor (PS-558); never send an extraction anywhere.
