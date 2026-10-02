# services/grossingRoutingOverrides/

Admin-managed per-client exceptions to a Department's default Grossing Template.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Real gap this closed: AccessionPage.tsx always passed an empty overrides array before this admin screen existed — this is that screen's real data layer, not new design.

## Batch 428: Configuration permissions

- `mockGrossingRoutingOverrideService`: `add`, `update`, `remove` need `config:grossing-routes:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*