# services/browserData

Batch 525 (PS-485). No patient data is kept in browser storage when PathScribe runs against its API server.

| File | What it does |
|---|---|
| `browserDataPolicy.ts` | `browserMayKeepData(apiServerConfigured)`: data may be kept in the browser only in the demo, with no API server (`VITE_API_BASE_URL` set neither in the build nor, since Batch 547, in the deployment's `config.json`). `dataMayPersistInBrowser()` reads the build's setting; tests override it. |
| `dataStorage.ts` | `dataStorage` (for localStorage) and `tabDataStorage` (for sessionStorage). In the demo these are the browser's own storage; on a server deployment they are memory for the tab. `MemoryStorage`, `storageKeys()`. `services/mockStorage.ts` and every service that held data in browser storage now write through these. |
| `browserKeepList.ts` | What a server deployment keeps in the browser: display preferences (`ps_ui_*`), the language, workstation settings, the minimal sign-in session, SSO sign-in state, the PubMed headline cache. `removeBrowserDataCopies()` runs at start-up (`main.tsx`) and, on a server deployment, removes every other key from localStorage and sessionStorage: the cases, drafts, patient history, case masks and QA records a demo or older version left there. |
| `browserData.guard.test.ts` | App-wide: only the listed modules (preferences, workstation, session) touch localStorage / sessionStorage directly, each with its reason; nothing uses IndexedDB; every keep-list key is still used. |
| `browserData.test.ts` | The policy, the stores, the clean-up, the session profile, and a case worked on a server deployment leaving nothing clinical in browser storage (with a demo control). |

**The session profile** (`auth/sessionProfile.ts`): on a server deployment only who is signed in and how is stored (id, name, email, role, initials, voice profile, sign-in method). The staff-record fields (signature image, credentials, access flags, tenant) stay in memory, and after a reload the session restore fills them in again from the staff record.

**Until the HTTP services exist** (the India team's API server, PS-539), a server deployment's mock data lives only as long as the tab. That is intended: the server is the record. The demo is unchanged.

**The demo reset** (`demoReset/`) still clears the browser's own storage; it is a demo tool.

## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.

## Batch 544

`browserData.test.ts`: the staff fixture's signature is a link, not a data URL (signatures are links since Batch 544).

## Batch 547

Deployment settings here are read through `appEnv()` (`services/runtimeConfig/`): the deployment's `config.json` at start-up, else the build's `VITE_*` value (`docs/architecture/RUNTIME_CONFIG.md`).
