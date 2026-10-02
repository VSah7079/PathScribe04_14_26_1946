# services/flags/

Case/specimen flag dictionary (STAT, Malignant, Second Opinion Requested, etc.) — administrative and computational tag classes.

**Pattern:** Standard interface/mock/firestore pattern.

## Batch 428: Configuration permissions

- `mockFlagService`: `add`, `update`, `deactivate`, `reactivate` need `config:case-flags:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

`resolveLisFlagDefinition.ts` (new): the flag a LIS-reported code stands for, adding it to the catalog when it's new. Moved out of the report page's header bar; it uses the catalog unchecked, since the LIS sync, not the person, adds it.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*