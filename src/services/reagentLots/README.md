# services/reagentLots

Reagent lots. Stain reagent lots (Configuration → System → Reagent lots). `mockReagentLotService.ts`: create / update / deactivate / reactivate.

## Batch 428: Configuration permissions

- `mockReagentLotService`: `create`, `update`, `deactivate`, `reactivate` need `config:reagent-lots:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*Parent: [services/](../README.md).*
