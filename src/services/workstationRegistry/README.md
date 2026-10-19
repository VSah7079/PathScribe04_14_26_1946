# workstationRegistry (Batch 612)

Registers named computers at a performing-lab facility (for example "Grossing Station A") with a long-lived, revocable token and a context binding (facility, room, discipline, functional area, point of care, and optionally a report printer and a label printer).

- `workstationRegistryRules.ts`: pure rules. Name and context checks, token shape (`pswt_` plus 48 hex characters), SHA-256 hashing, token checks (current token, previous token during the 24-hour grace after a rotation, revoked, expired), display state (active, expiring soon, expired, revoked), and the print routing input a workstation supplies.
- `workstationRegistryService.ts`: the service factory. `register` and `rotateToken` return the token once; only its hash is stored. `revoke` needs a reason and is final. `checkIn` is the Simulated token check and records last seen. Every change is audited and PHI-free.
- `workstationRegistryServices.ts`: wires the browser demo and applies the two capabilities, `config:workstations:manage` (register, change) and `config:workstation-tokens:manage` (rotate, revoke, check in).
- Print routing: `printRouting/resolveRealPrintRoutingContext.ts` fills the workstation tier from the registered workstation this browser is bound to (per-computer setting `pathscribe_registered_workstation_id`). A revoked or removed workstation contributes nothing.
- Screen: Configuration > System > Workstations (`components/Config/System/WorkstationsSection.tsx`).
- Server contract for the backend team: `docs/architecture/WORKSTATION_REGISTRY.md`. The site agent program and the real token check are the backend team's work; the browser check is Simulated and labelled so.

## Batch 617 (part C): server versions (PS-514)

The workstation registry service here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/DICTIONARIES_CONFIG_API.md`. The mocks are unchanged.
