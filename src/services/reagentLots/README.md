**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/reagentLots

Reagent lots. Stain reagent lots (Configuration → System → Reagent & Solution Lots). `mockReagentLotService.ts`: create / update / deactivate / reactivate.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the section's on-screen name is "Reagent & Solution Lots".*

## Batch 428: Configuration permissions

- `mockReagentLotService`: `create`, `update`, `deactivate`, `reactivate` need `config:reagent-lots:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*Parent: [services/](../README.md).*

Batch 616 (part D, PS-508): server version of ReagentLotService (`http<Name>Service.ts`, instance file `<name>ServiceInstance.ts`; mock in the demo, API server when an address is configured). Calls: `docs/architecture/REAGENTS_LABELS_API.md`.
