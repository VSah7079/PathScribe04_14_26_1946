# Registry batch files: the API server's calls (PS-800)

Batch 620 (part S). A registry or screening programme that takes a **file** instead of a message has a **profile**: its format, columns and file name. PathScribe owns what and when (the profile, the registry's own delivery schedule, which records are in a file, what is held back, the audit); the interface engine owns how (carrying the file, retries, the registry's answer). The file is made from the **same registry report payload** the message feeds use, so a case reads the same either way.

Browser side (built): `services/batchRegistryFeed/` (`batchRegistryFeed.ts` rules, `batchFileWriters.ts`, `batchRecordSource.ts`, `IBatchRegistryFeedService`, mock, `httpBatchRegistryFeedService.ts`, instance, `screeningRegistryFeed.ts`) and Configuration > System > Registry Batch Files. Capabilities: `config:batch-registry-feed:manage` (profiles; high risk; Admin and Lab Director) and `registry:batch-file:generate` (make a file; high risk; Admin; requires the first). Route style: `HTTP_SERVICES_PATTERN.md` §7. A refusal is a fixed code. Nothing here was tried against a real server.

## Service `IBatchRegistryFeedService`

`/api/registry/batch-registry-feed`

| Method | Call | Arguments |
|---|---|---|
| `getProfiles` | `GET .../get-profiles` | none |
| `saveProfile` | `POST .../save-profile` | the profile (body); no `id` creates, an `id` replaces (`NOT_FOUND` when unknown) |
| `removeProfile` | `POST .../remove-profile` | `{ id }`; the two shipped profiles are `PROFILE_PROTECTED` |
| `isBatchProgram` | `GET .../is-batch-program` | `screeningRegistryId` (query); true while an enabled profile is keyed to `screening:<id>` |
| `getRuns` | `GET .../get-runs` | `profileId` (query, optional); manifests, newest first |
| `preview` | `POST .../preview` | `{ profileId }`; counts only: waiting, due now, would be held back, overdue, next due, whether the schedule is a batch one |
| `buildRun` | `POST .../build-run` | `{ profileId, manual }`; returns `{ run, content }`; the file is returned once and never stored |
| `recordFileAcknowledgement` | `POST .../record-file-acknowledgement` | `{ runId, status, fileSha256?, rejections?, fileErrorCodes? }` |

## Profile

`id`, `name`, `registryKey` (`screening:<id>` or `cancer:<id>`, the key the delivery schedule uses), `format` (`csv`, `xml`, `naaccr_xml`), `enabled`, `isExample`, `delimiter` (`,` `;` tab), `includeHeaderRow`, `neutraliseFormulas`, `xmlRootElement`, `xmlRecordElement`, `fileCode`, `fileNamePattern` (`{program}` `{date}` `{time}` `{seq}`, UTC), `columns` (`field`, `header`, `required`), `updatedAt`. Fifteen fields can be chosen for a column (patient identifier, name, date of birth, accession, screening date, specimen adequacy, general categorisation, primary and additional interpretations, HPV result, recommendations, facility id and name, submission kind, signed-out time).

Shipped profiles: an **example** (labelled as such; a made-up layout, off) and **NAACCR XML** (abstract-level cancer feed; **not built**, cannot be turned on: `formatNotAvailable`). A real programme's layout must come from that programme's published specification.

Problem codes on a refused `saveProfile` (`PROFILE_REFUSED:<code>`): `nameRequired`, `registryRequired`, `formatInvalid`, `formatNotAvailable`, `delimiterInvalid`, `fileCodeInvalid`, `filePatternInvalid`, `columnsRequired`, `fieldDuplicate`, `fieldInvalid`, `headerRequired`, `headerNotElementName`, `xmlElementInvalid`.

## How the server must decide (the browser's `buildRun` is the reference)

1. **Permission:** `registry:batch-file:generate`, audited. Refusals: `NOT_PERMITTED`, `NOT_FOUND`, `PROFILE_DISABLED`.
2. **Which records:** entries of that registry waiting in the registry queue (not held, not failed, not an opt-out). The registry's own delivery schedule (`planRun`) says which are due; `manual: true` takes everything waiting. No record due: `NO_RECORDS`.
3. **Held back:** a record missing a required column is not in the file; it is marked failed with `REGISTRY_NOT_READY` and the missing field names, and appears on the Outbound Queue.
4. **The file:** CSV (RFC 4180, CRLF; a cell starting `= + - @` tab or CR gets a leading apostrophe when `neutraliseFormulas`) or XML (UTF-8, characters XML cannot carry dropped). Name from the pattern; `sequence` counts up per profile. SHA-256 of the content.
5. **Marked sent** and a **manifest** stored (file name, format, count, checksum, sequence, entry refs, held-back list, status `awaitingAck`). No patient data and no file content is kept. Audit text carries the file name, counts and checksum only.
6. **A submission to a batch programme is queued, not dispatched** when it is signed out (`submitScreeningRegistryResult` outcome `queuedForBatch`).

## The registry's answer to a file

`recordFileAcknowledgement` takes `ACCEPTED`, `ACCEPTED_WITH_WARNINGS`, `REJECTED_FILE` or `PARTIAL` (with per-record `rejections`), plus the checksum the registry computed. A checksum that is not the file's: `CHECKSUM_MISMATCH`, nothing recorded. An answered run: `ALREADY_ANSWERED`. Each record's answer goes through the existing acknowledgement path (`recordRegistryAcknowledgement`, `statusJson`): refused records become `REJECTED_RECOVERABLE` with the registry's codes, so they show as rejected on the Outbound Queue with the correction window and can be fixed and re-queued for the next file. Run status: `accepted`, `partlyRejected` or `rejected`.

## Not built

NAACCR XML abstract-level output; real registry layouts; SFTP delivery and pick-up of the answer (the interface engine's job); resending a single record directly from the Registry Exceptions screen still dispatches as a message for a batch programme.
