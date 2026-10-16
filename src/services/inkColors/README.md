# services/inkColors/

Structured Inking, Module 3 (PS-359 follow-up) — the ink-colour admin palette deferred by Batch 480 ("the ink-colour admin palette that would let Severity 3 actually trigger") and Batch 481 ("the ink-colour admin palette (needed for Severity 3 to ever trigger)").

## Files

- **`IInkColorService.ts`** — `InkColor` (id, name, code, active, createdAt, updatedAt) and the service interface (getAll/getById/create/update/deactivate/reactivate). Deliberately simpler than `services/cassetteColors/ICassetteColorService.ts`, the closest precedent — see this file's own header for why a margin ink colour needs none of cassette colours' `key`/fallback-policy/performing-lab-scope fields (there's no routing Engine dispatch, no hopper that can be "unavailable").
- **`mockInkColorService.ts`** — browser-storage-backed (`storageGet`/`storageSet`, key `ink_colors`), seeded with seven common histology margin-inking colours. Every mutating method (`create`/`update`/`deactivate`/`reactivate`) is wrapped by `guardConfigWrites` against `config:ink-color:manage` — same pattern as every other Configuration dictionary in this app.

## Real consumers

- **`services/grossing/resolveInkingValidationSeverity.ts`** — the active palette's codes are the real dictionary `MarginInkApplication.colorCode` is validated against for the Severity 3 `margin_ink_color_unmapped` check (optional `activeInkColorCodes` parameter).
- **`pages/GrossingScreenPage/GrossingScreenPage.tsx`** — the margin/ink inline forms pick a colour from the active palette via a `<select>`, instead of free-text colour name/code inputs.
- **`components/Config/System/InkColorsSection.tsx`** — the admin UI (table + add/edit modal), registered in `systemSections.ts`, `components/Config/System/index.tsx`'s switch, and `services/screens/configSectionAccess.ts` (`ink_colors`).

## Notes

- Capability `config:ink-color:manage` is `group: 'configLab'`, high-risk, and has no explicit `capabilitySeeds.ts` entry — it's picked up by Admin and Lab Director automatically through the `CONFIG_SECTIONS` auto-sweep (any capability whose group is in `CONFIG_GROUPS`), the same mechanism `config:stain-dictionary:manage` and `config:cassette-colors:manage` rely on.
- `MarginInkApplication.colorCode`/`colorName` are stored as given at the time of application and never re-looked-up from this live dictionary later (same append-only, point-in-time-copy convention as every other clinical log in this app) — deactivating or removing a colour here never changes a historical ink application's own recorded colour, only the choices offered for a *new* one.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
