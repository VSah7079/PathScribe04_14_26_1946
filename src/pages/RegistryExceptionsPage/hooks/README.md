# pages/RegistryExceptionsPage/hooks

Batch 421. `useRegistryExceptions(user)`: loads the worklist (`loadRegistryExceptions`, which runs the 72-hour escalation first), keeps the filter and counts, and runs a resend then reloads. No decisions here: they are in `services/registrySubmission/`.

## Batch 423

`useRegistryExceptions` also returns `captureCapa(row)` and `hasCapa(row)`. The set of rows with an open CAPA is loaded with the rows.

## Batch 424

`resendAll()` resends every row shown, through `resendAllRegistrySubmissions`.

## Batch 425

`useRegistryExceptions` loads only the user's own organisation's rows (`loadRegistryExceptionsForUser`). It adds:
- `markReviewed`: `reviewRegistryRevision`, needs `registry:revision:review`;
- `exportAudit`: `exportRegistryTransmissionAudit`, needs `qa:registry-transmission-audit:export`.

---
*When this folder's contents change meaningfully, update THIS file.*
