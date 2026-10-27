# services/batchRegistryFeed

Batch 620 (part S, PS-800). Screening programmes and registries that take a **file** instead of a message. Contract: `docs/architecture/BATCH_REGISTRY_FEED_API.md`.

| File | What it is |
|---|---|
| `batchRegistryFeed.ts` | Pure rules: the 15 selectable fields, profiles and their validation, the shipped example and NAACCR XML profiles, file names, `buildBatchFile` (CSV or XML, SHA-256), `planRun` (which records are due by the registry's delivery schedule), held-back records, the file acknowledgement and its per-record answers |
| `batchFileWriters.ts` | CSV (RFC 4180, formula-neutralising) and XML writers |
| `batchRecordSource.ts` | Builds a record from the same registry report payload the message feeds use; never kept |
| `IBatchRegistryFeedService.ts`, `mockBatchRegistryFeedService.ts`, `httpBatchRegistryFeedService.ts`, `batchRegistryFeedServiceInstance.ts` | Service, demo version (profiles and run manifests in browser data, no patient text), API version, switch |
| `screeningRegistryFeed.ts` | The batch programmes' submissions as part of the Outbound Queue's registry feed |

Permissions: `config:batch-registry-feed:manage`, `registry:batch-file:generate`. A batch programme's sign-out result is queued and goes in the next file (`queuedForBatch`); WHEN a file is made is the registry's own delivery schedule. The example profile is labelled and off; NAACCR XML is a slot that cannot be turned on yet. Tests sit beside each file.

## Batch 638

`screeningRegistryFeed.ts` leaves out NOT_ELIGIBLE entries as well as consent exclusions.
