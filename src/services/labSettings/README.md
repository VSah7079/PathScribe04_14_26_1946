# services/labSettings

Batch 431. Where lab-wide settings are kept: report document style, the lab's page size and margins, the AI provider settings and orchestrator default, and protocol lifecycle state.

| File | What it does |
|---|---|
| `labSettingsStore.ts` | `readLabSetting(key, fallback)` / `saveLabSetting(key, value)`. Mock phase: browser storage under the same keys as before. Production (PS-345): the API server, so every workstation in a lab sees the same settings. This is the only file that changes then. |

Each setting's own service checks who may change it before saving here (for example `services/reportAppearance/pageSetup.ts` checks `config:report-appearance:manage`). System, enterprise and hospital configuration has its own store, `services/systemConfig/systemConfigStore.ts`.

---
*Update this file when a lab-wide setting moves here or the storage changes.*
