# services/siteSettings

Batch 480. A generic, per-scope settings store — same two-function shape, same mock-phase-is-browser-storage / production-is-the-API-server posture as `services/labSettings/`, but keyed by whatever id string a caller passes in (originally meant for a real Site id, for settings that genuinely vary per site), rather than lab-wide.

| File | What it does |
|---|---|
| `siteSettingsStore.ts` | `readSiteSetting(id, key, fallback)` / `saveSiteSetting(id, key, value)`. Mock phase: browser storage, keyed `${key}:${id}` so settings for different ids never collide in the same browser. Production (PS-345): the API server, same as `labSettingsStore`. This is the only file that changes then. |

**Structured Inking, Module 3 (PS-359 follow-up):** `services/grossing/inkingSiteSettings.ts`, the one real caller, now passes `facilityId` (`Case.order?.facilityId`) rather than a Site id — Batch 480/481's own Site-scoped design turned out to be a real architecture gap (no case ever resolves a real `siteId`), and Pete chose to re-scope to facility now rather than defer again. Nothing in *this* file changed to make that possible — these two functions were already keyed generically by whatever id string is passed in, despite the file's own name. Each setting's own service still checks who may change it before saving here (for example `services/grossing/inkingSiteSettings.ts` checks `config:inking-validation-mode:manage`).

Built deliberately ahead of the Organisation/Site admin UI (still unbuilt — tracker Section B). When that UI ships, it reads/writes through these same two functions; nothing here needs to change, only a real settings screen gets built on top of it.

---
*Update this file when a site-level setting moves here or the storage changes.*
