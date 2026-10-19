**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/access/

Real, tracked AccessRequest tickets — Pediatric, Pool, and Orchestration
access requests. Built per direct follow-up: "Do we Track the request to
gain access? I would think that would be a good quality metric. How long
did the Admins take, Do we generate a ticket system that has its own
status."

Confirmed directly before building this: the pre-existing "request
access" flow (`utils/accessRequests.ts`'s `sendAccessRequestToAdmins`)
only ever sent a message — no real, tracked record existed anywhere, and
the pool flow's own "already requested" check was a bare, per-browser
`localStorage` boolean, not a real, status-bearing ticket.

**Pattern:** Standard interface/mock pattern (no firestore stub yet —
genuinely new work, not a gap).

## Files

- **`IAccessRequestService.ts`** — the contract. `AccessRequest` has a
  real, three-state lifecycle (`pending` → `granted`/`denied`), with
  `resolvedAt`/`resolvedByUserId` for the real turnaround-time metric.
- **`mockAccessRequestService.ts`** — the real, currently-active
  implementation. 11 tests in `mockAccessRequestService.test.ts`.
- **`closeGrantedAccessRequests.ts`** (+ `.test.ts`) — closes pending requests once the access exists (Batch 431).
- **`accessRequestDecision.ts`** — which permission a deny needs, per request type (Batch 432).

*Corrected in the Batch 496 README audit (Oct 9, 2026): test count 10 → 11; added the two later files.*

## How this connects to the rest of the app

- **Creation** — `utils/accessRequests.ts`'s `sendAccessRequestToAdmins`
  creates a real ticket alongside the existing admin-notification
  message (same two-track pattern already proven out for Informal
  Review requests — see `services/reports/README.md`). Called from the
  three real request-access UI entry points: `WorklistTable.tsx`
  (Pediatric and Orchestration) and `PoolClaimModal.tsx` (Pool).
- **Resolution** — `closeGrantedAccessRequests.ts`'s `afterAccessMayHaveChanged()` closes a pending request as granted once the access exists. It runs after the service saves that can give access: `mockSubspecialtyService.ts` (pool membership), `mockUserService.ts` (Pediatric/Orchestration flags) and `mockFacilityService.ts` (the facility's authorized pediatric pathologists). Pediatric needs both the user flag and the facility list. See Batch 431 below.
- **Admin view** — the **Access Requests** tab on the Quality Assurance page (`components/QualityAssurance/AccessRequestResponseTab.tsx`, Operations group). It lists requests with their status and turnaround, shows average turnaround and a monthly trend, exports CSV, and lets an admin **Deny** a pending request with a reason (`accessRequestService.deny`, Batch 432). Granting is done by giving the access itself in Staff or Facility configuration, which then closes the request.
- **Quality metric** — turnaround (`resolvedAt − requestedAt`) is computed directly in that tab. There is no separate TAT type for access requests in `TATConfigSection.tsx`, and no per-admin metric in `Contribution/qualityCalculations.ts`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): resolution runs through `closeGrantedAccessRequests.ts` (the `checkAndResolve…` helpers, `ClientDictionaryPage.tsx` and `Config/Staff/AccessRequestsQueue.tsx` do not exist); the admin view is the QA Access Requests tab; there is no `ACCESS_REQUEST_RESPONSE` TAT type or `computeAccessRequestResponseOutliers`.*

## Notes

- Real, deliberate design choice: Pediatric access requires a genuine
  two-part grant. A pending request is only ever marked resolved once
  both real conditions are independently confirmed true — never assumed
  from either half alone.

## Batch 431: requests are recorded and closed

- **Recorded.** `utils/accessRequests.ts` `sendAccessRequestToAdmins` now saves an access request record (pool, pediatric or Orchestration) before messaging the admins. Before, nothing created records, so the badges and the QA Access Request Response tab had nothing to read. A second request for the same thing while one is pending reuses it. Pool requests match on the pool, the others on the case.
- **Closed when access is given.** `closeGrantedAccessRequests.ts` (new) closes a pending request as granted, with the admin and time, once the access exists. It runs after the saves that give access:
  - a pool member added (subspecialty `assignUser`/`update`);
  - a person's Pediatric or Orchestration flag (user `update`);
  - a facility's authorized pediatric pathologists (facility `update`).
  Pediatric needs both the flag and the facility list. The decision is pure (`isAccessGiven`, `requestsNowGranted`) and tested.
- **Badges.** The pool, pediatric and Orchestration "access requested" badges come from the person's own pending requests (`pendingAccessRequestsFor`).
- **Open:** nothing can deny a request yet (no admin action); it stays pending until access is given. *(Since closed: Batch 432 added `deny`, with a Deny button on the QA Access Requests tab — checked in the Batch 496 README audit.)*

## Batch 432

`deny(id, by, name, reason)`: needs the permission that gives that access (`accessRequestDecision.ts`: pool `config:staff:edit`; pediatric and Orchestration `config:staff-access:assign`) and a reason; the requester is messaged. Already-resolved requests can't be denied.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*


Batch 616: server version in `httpAccessRequestService.ts` (used when the deployment has an API server address; the demo keeps the mock). Chosen in `accessRequestServiceInstance.ts`. Contract: `docs/architecture/ACCESS_SESSION_API.md`.
