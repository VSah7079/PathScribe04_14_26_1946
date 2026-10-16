# services/runtimeConfig/

Batch 547 (PS-539 phase 2d, readiness review §9 item 1). One build serves every deployment. Full account: `docs/architecture/RUNTIME_CONFIG.md`.

| File | What it does |
|---|---|
| `runtimeSettings.ts` | The 37 settings (Batch 555 added `VITE_SERVER_JOBS`) a deployment's `config.json` may carry (`RUNTIME_SETTINGS`, same names as the `VITE_*` variables), and `parseRuntimeConfig`, which checks one: known names only; addresses as the services take them (`endpointProblem`, `proxyProblem`); and the build rules (`buildRuleProblems`). A server build needs an API server and SSO; a demo build refuses server addresses. Pure. |
| `loadRuntimeConfig.ts` | Reads `/config.json` at start-up, never cached. A 404 or the host's own page means none. |
| `runtimeEnv.ts` | `appEnv()`: every setting, config.json's value over the build's. This and `main.tsx` are the only places that read `import.meta.env.VITE_*`. Each variable is named, never the whole object (Batch 444's rule). |

`main.tsx` reads config.json, then loads `startApp.tsx`, or shows `components/RuntimeConfigError/`.

Guards: `runtimeConfig.guard.test.ts` checks that:
- no other file reads a `VITE_` variable directly;
- every typed variable is named in `runtimeEnv.ts`;
- the settings are the typed variables less the two build-only ones;
- `main.tsx` loads nothing else first;
- the example config.json is valid;
- the CSP generator covers every address setting;
- this folder imports nothing else at run time.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- The app's code is preloaded while config.json is read: `scripts/vite/preloadAppStart.ts` adds `modulepreload` tags for `startApp.tsx` and its static imports to `index.html` (the chunk walk is `scripts/static-chunk-closure.mjs`). Test: `preloadAppStart.test.ts`. Carried over from Batch 547.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `VITE_SERVER_JOBS`, the recurring jobs the API server runs (a server deployment's setting only; 37 settings).

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: with an API server, the app also reads the server's `/api/config` (`loadRuntimeConfig.ts` `withServerConfig`) after config.json, before any service is created.
  - **Settings:** only those marked `fromServer` in `RUNTIME_SETTINGS` (`parseServerSettings`). Others are refused with `NOT_FROM_SERVER`, and addresses with `ADDRESS_NOT_FROM_SERVER`.
  - **Which value wins:** config.json, then the server, then the build.
  - **Build rules:** checked on the merged settings.
  - **Time limit:** a 5 s limit covers the whole reply.
  - **Hosting regions:** `hosting` (`parseServerHosting`) is kept by `runtimeEnv.ts` (`setServerHosting`, `serverHosting`). `hostingRegions.ts` gives the rows administrators see.
