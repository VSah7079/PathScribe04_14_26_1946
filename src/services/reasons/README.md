**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.



# services/reasons

`mockReasonDictionaryService.ts`: one reason dictionary, scoped by category (post-sign-out billing change, addendum, amendment, correction).

## Batch 399

New category **SURGEON_UNAVAILABLE**: why a critical intraoperative result went to a member of the surgical team rather than the operating surgeon (scrubbed in a critical step, communication delegated, intraoperative emergency, not in the room, Other). Seed reasons added after a browser stored its list are now merged in (`withMissingSeedRecords`).

## Batch 438 (PS-146): clinically significant revision reasons

- `revisionReasonRules.ts`: each amendment and correction reason has a `clinicallySignificant` switch. Starting values: diagnosis, margin, stage and tissue reclassification are on; clerical corrections are off. `revisionRecommendation` says what a released revision recommends; addenda never do.
- `mockReasonDictionaryService.ts`: adding, editing, deactivating and reactivating a reason now needs `config:revision-reasons:manage` (`guardConfigWrites`).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*


Batch 616: server version in `httpReasonDictionaryService.ts` (used when the deployment has an API server address; the demo keeps the mock). Chosen in `reasonDictionaryServiceInstance.ts`. Contract: `docs/architecture/LAB_DICTIONARIES_API.md`.
