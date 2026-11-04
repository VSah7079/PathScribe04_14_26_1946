**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/cassetteColors/

The real color dictionary — White, Blue, Red, Pink, Green/Mesh, Yellow, and any admin-added colors — that `services/cassetteRouting/`'s rules reference by key. Fully admin-manageable through Configuration → System → Cassette Colors (Lab Materials & Workflows): an admin can add a genuinely new color (name, hex, fallback policy) without any code change, and every routing rule referencing it updates automatically.

**Pattern:** Standard interface/mock pattern (no firestore stub currently).

*Corrected in the Batch 496 README audit (Oct 9, 2026): the screen is a section of Configuration → System, not its own Configuration tab.*

## Files

- **`ICassetteColorService.ts`** — the contract: `CassetteColorDefinition` (id, key, displayName, hexCode, `fallbackBehavior`: `'auto' | 'prompt'`, `fallbackColorId`, active).
- **`mockCassetteColorService.ts`** — the real, active implementation, `localStorage`-backed. Seeds White (prompt-only fallback, deliberately never auto-substitutes — see the file's own header for why), Blue/`COLOR_BIOPSY`, Red/`COLOR_STAT` (prompt fallback — a STAT case should never silently lose its urgent visual signal), Pink/`COLOR_RUSH`, Green-Mesh/`COLOR_CELLBLOCK` (prompt fallback — a fragile cell block silently substituted into a non-mesh cassette risks real material loss), Yellow/`COLOR_SMALL_BIOPSY`.

## Notes

- Fallback policy lives on the color itself, not on each rule that references it — "what to substitute for Blue" is a real property of Blue, not something every individual rule should decide separately.
- `color-pink`/`COLOR_RUSH` is seeded but, as of this writing, has zero real routing rules pointing at it — it exists as an available option, not because any current rule uses it. Confirmed directly before adding the separate `COLOR_SMALL_BIOPSY` (Yellow) rather than repurposing Pink, which would have been misleadingly labeled.

## Batch 428: Configuration permissions

- `mockCassetteColorService`: `create`, `update`, `deactivate`, `reactivate` need `config:cassette-colors:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*


Batch 616: server version in `httpCassetteColorService.ts` (used when the deployment has an API server address; the demo keeps the mock). Chosen in `cassetteColorServiceInstance.ts`. Contract: `docs/architecture/LAB_DICTIONARIES_API.md`.
