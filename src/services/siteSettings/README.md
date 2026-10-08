# services/siteSettings

Batch 480. The per-site analog of `services/labSettings/` — same two-function shape, same mock-phase-is-browser-storage / production-is-the-API-server posture, but keyed by a real Site id rather than lab-wide, for settings that genuinely vary per site (for example `inking_validation_mode` — see `services/grossing/inkingSiteSettings.ts`).

| File | What it does |
|---|---|
| `siteSettingsStore.ts` | `readSiteSetting(siteId, key, fallback)` / `saveSiteSetting(siteId, key, value)`. Mock phase: browser storage, keyed `${key}:${siteId}` so settings for different sites never collide in the same browser. Production (PS-345): the API server, same as `labSettingsStore`. This is the only file that changes then. |

Built deliberately ahead of the Organisation/Site admin UI (still unbuilt — tracker Section B). When that UI ships, it reads/writes through these same two functions; nothing here needs to change, only a real settings screen gets built on top of it. Each setting's own service checks who may change it before saving here (for example `services/grossing/inkingSiteSettings.ts` checks `config:inking-validation-mode:manage`).

---
*Update this file when a site-level setting moves here or the storage changes.*
