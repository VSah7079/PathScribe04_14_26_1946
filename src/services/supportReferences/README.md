**Batch 740:** `/workstations/cytology-prep` is a known route.

**Batch 645:** `/lockbox-drop-off` is in `SUPPORT_ROUTE_PATTERNS` (`supportTicketRules.ts`), so a support ticket raised from the Lockbox Drop-Off screen carries its route. The screen shows no case, so no support reference is needed.

# services/supportReferences/

Support references (Batch 364; PS-349, PS-350): non-identifying IDs that support staff use instead of case numbers.

## The idea

A support analyst must never need a patient's case number. Instead they quote a **support reference**, such as `SR-7K2Q-9MXD`. The lab's own staff, who may see patient data, look it up in PathScribe and see which case, audit entry, error or interface exception it names.

## Files

- **`ISupportReferenceService.ts`**:
  - `forRecord(kind, recordId)` returns the record's reference, creating it the first time it's asked for.
  - `resolve(ref, actor)` returns what a reference names, and audits the lookup (`support_reference.resolved`).
  - Kinds: `case`, `auditEntry`, `errorEntry`, `interfaceException`.
- **`supportReferenceRules.ts`**: the format.
  - `SR-` plus eight Crockford base-32 characters: 40 random bits, with no I, L, O or U, so it reads aloud and copies cleanly.
  - `normaliseSupportReference` accepts what people type: lower case, spaces, missing dashes, and I/L/O for 1/1/0.
- **Random, never derived.** A reference is random and stored beside the record. It is never a hash of the case number: case numbers follow a pattern, so a hash of one could be reversed by hashing every possible number. HIPAA's de-identification rule asks the same of a re-identification code.
- **`mockSupportReferenceService.ts`**: the browser store (`support_references`, cleared by Demo Reset). In production the API server issues and resolves references.
- **`supportReferenceTargets.ts`**: `describeSupportTarget` describes what a resolved reference names, for the Audit Log's lookup.
- **`supportTicketRules.ts`**: what a support ticket may say.
  - `supportPageOf(pathname)` reports the route pattern (`/report/:caseId`), never the address, and hands back the case id so the ticket can send its reference. The query string is dropped. A test keeps `SUPPORT_ROUTE_PATTERNS` in step with `App.tsx`.
  - `findIdentifiersInText` finds case numbers, MRNs and other identifiers in typed text using every format in `IDENTIFIER_FORMAT_LIBRARY`, enabled for the lab or not: a false alarm costs a warning, a miss sends patient data.
  - `replaceIdentifiers` swaps them for references.

## Where it's used

- **Case header:** a "Support reference" chip; click to create or reveal the reference and copy it.
- **Audit Log:** the same chip on audit, error and interface-exception rows, and a "Find a support reference" box. `?supportRef=` deep-links into it.
- **Case search box:** typing a reference opens the case, or the Audit Log lookup for other kinds.
- **Support tickets** (`enhancementRequestService.ts`):
  - the system details carry the page pattern and the case's reference;
  - the modal warns about identifiers in the text and can replace case numbers with references.

## Not covered yet

- **Patient names in typed text:** they can't be recognised by pattern.
- **Attachments** the user adds.
- **Interface messages** carry their own `messageId` from the Engine; this adds a reference for the exception record, not the message.

## Batch 421

`SUPPORT_ROUTE_PATTERNS` gains `/registry-exceptions` (its test checks every App.tsx route is listed; the full suite caught the miss).

## Batch 429: view-only sections, equipment log for the bench

`/batch-management/equipment-log` added to the known routes.

## Batch 434

`SUPPORT_ROUTE_PATTERNS` gains `/batch-management/wsi-scan` (Slide scanning).

## Batch 446

- `recordIdFor(ref, kind)`: the record a page address names. It takes the exact form only and isn't audited, because opening the record is checked and audited by its own service.
- Case pages are now addressed by reference (`services/caseAddresses/`).
- A support ticket from a case page carries the reference already in the address (`enhancementRequestService.captureMetadata`).

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-349)

`supportTicketRules.ts`: whether to warn before sending a support ticket and the offer to replace case numbers, moved out of `EnhancementRequestModal.tsx` and tested.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 495

`supportTicketRules.ts`: `/report-preview/:caseId` added to the known routes, so a support ticket raised from the preview window names the page by its route pattern (the guard test `knows every route in App.tsx` caught it).

## Batch 497

`/report-preview/:caseId` removed from the known routes — the window was retired.

## Batch 518

Added the new route `/batch-management/label-reprint` to the route list for support tickets. The full suite's first Batch 518 run caught the gap.

## Batch 522

Added the new route `/consult` to the route list for support tickets (PS-290).

## Batch 527

The route tests read both `App.tsx` and `SignedInApp.tsx`, where every route after sign-in now lives (PS-486).

## Batch 550 (PS-539 phase 2d)

- `supportTicketRules.ts`: `/my-exports` (the new My exports page) is one of the routes a support reference can name.

## Batch 573

- `caseSupportReference.ts` (new): a case's support reference for the live hub, from the API server (`GET /api/cases/{caseId}/support-reference`, `CASE_API.md` §8) so every user of a case has the same one; the browser's own service in the demo. Used by the `caseReport` notice and presence.

## Batch 617 (part C): server versions (PS-514)

The support reference service here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/DICTIONARIES_CONFIG_API.md`. The mocks are unchanged.
- Batch 730: `/batch-management/workflow-reports` added to `SUPPORT_ROUTE_PATTERNS`.
