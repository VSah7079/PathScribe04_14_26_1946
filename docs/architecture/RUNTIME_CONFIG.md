# Runtime configuration: one build for every deployment (PS-539 phase 2d)

Readiness review §9 item 1: "One build should serve every deployment." Until Batch 547, 38 `VITE_*` settings were fixed into the JavaScript when the app was built, so every hospital needed its own build. Since Batch 547:
- A deployment's settings come from a `config.json` file beside `index.html`, read when the app starts and before any service is created.
- The names are the same as the `VITE_*` variables.

Setting up a site: `deploy/runtime-config/README.md`.

## 1. How it works

1. **`src/main.tsx` reads `/config.json`** (`services/runtimeConfig/loadRuntimeConfig.ts`), never from a cache.
   - **A 404, or the host's own page:** there's no config.json, so the build's own values are used, as before. This is the demo.
   - **Anything else:** the file is read and checked against the list of settings (`runtimeSettings.ts`, `parseRuntimeConfig`). That includes a file served as text, which is never skipped silently.
2. **If config.json breaks a rule,** PathScribe doesn't start. It shows what's wrong, by setting name, never by value (`components/RuntimeConfigError/RuntimeConfigErrorScreen.tsx`, in the user's language).
3. **Otherwise the app starts** (`src/startApp.tsx`, everything `main.tsx` did before). Every service reads its settings through `appEnv()` (`runtimeEnv.ts`): config.json's value, else the build's.

   Services that read a setting when they load (sign-in, the hub, the renderer, the interface receiver, the instance role) load only after config.json has been read. `runtimeConfig.guard.test.ts` checks that `main.tsx` imports nothing else up front.

## 2. The settings

There are 37 (36 until Batch 555), listed with what each does in `RUNTIME_SETTINGS` (`src/services/runtimeConfig/runtimeSettings.ts`):
- the API server;
- the instance role (`VITE_APP_ENV`);
- sign-in: the mode, and each identity provider's authority, client id and scopes;
- the live-updates hub, the report renderer and the interface receiver;
- AI: the provider, model, proxy, endpoints and region;
- terminology: NLM, CPT and ICD-10;
- the enhancement-request address, voice, and the breached-password check;
- *Batch 555:* `VITE_SERVER_JOBS`, the recurring jobs the API server runs (comma-separated names from `MESSAGE_BUS_API.md` §5, for example `delivery.retrySweep, release.dueSweep`). The browser stops standing in for exactly those (`serverJobs/browserStandIns.ts`, readiness review §7). Left empty, the browser keeps running every one while someone is signed in, so no job is ever left with no runner. Set it job by job in phase 2e, as each job and its data move to the server. A name this version doesn't know is reported in the browser console, and the browser keeps running that job. Not allowed in a demo build.

Two stay with the build: `VITE_APP_VERSION` (the build's own version) and `VITE_BABAKHANI_EMAIL` (a demo account).

**Nothing secret is a setting.** config.json is sent to every browser, as the app's code is. No setting is named like a key, password or token, and sign-in uses public client ids only (Batch 444's rule, `envExposure.guard.test.ts`).

## 3. The rules

| Rule | Problem shown |
|---|---|
| Only the 37 settings; a typo or a build-only name is refused | `UNKNOWN_SETTING` |
| Values are text, numbers or true/false, at most 2,000 characters | `NOT_TEXT`, `TOO_LONG` |
| Server addresses are `https://`, with no user name or password in them. Plain `http://` is allowed only to this computer, and only in a development build. This is the rule the services apply when they use the address (`resolveServiceEndpoint`), so nothing passes here and fails there | `INVALID_URL`, `NOT_HTTPS` |
| Proxies (AI, CPT, ICD-10) may also be a path on this site; a path that leads elsewhere (`//host`, `/\host`) is refused | `NOT_THIS_SITE` |
| A **server build** must name its API server | `API_SERVER_REQUIRED` |
| A **server build** signs in through the identity provider only: `VITE_AUTH_MODE` must be `sso`. A site that leaves it out never falls back to passwords | `SSO_REQUIRED` |
| A **demo build** never has an API server | `API_SERVER_IN_DEMO_BUILD` |
| A **demo build** never has a hub, renderer, interface receiver or `VITE_SERVER_JOBS`, and is never `production`. Its demonstration accounts and data can never reach a real system | `NOT_IN_DEMO_BUILD` |

An empty value means "use the build's own value".

## 4. Demo and server builds

- **`npm run build`** is the demo build (`__DEMO_TOOLS__` true): the demo accounts, the mock interface engine, the mock EMR and the demo reset are included.
- **`npm run build:server`** is `vite build --mode server` (`__DEMO_TOOLS__` false). None of those is in it.
  - The demo accounts are now only ever loaded behind `__DEMO_TOOLS__` (`authSessionInstance.ts`, `mockStaffPasswordService.ts`).
  - `scripts/check-production-bundle.mjs` fails a server build that contains them.
  - A build made with `VITE_API_BASE_URL` set is still a server build, as before.
- **Correction:** before Batch 547, the demo accounts were left out only of a build made with `VITE_AUTH_MODE=sso`. Now the sign-in mode is read at start-up, so the build itself decides, and a server build never has them.
- **`--mode server` loads `.env.server`**, not `.env.production`. Nothing needs either, since the site's settings are in config.json.

## 5. Serving config.json

- **Never cached.** Serve it with `Cache-Control: no-store`, so a change takes effect on the next load and no CDN keeps an old copy. `deploy/runtime-config/README.md` has a snippet per host.
- **Its addresses are allowed by the security policy.** `node scripts/generate-security-headers.mjs <origins.json> <outDir> --runtime-config config.json` adds every address it sets to the Content-Security-Policy: `connect-src`, the hub's `wss://` and the identity providers' `form-action` (`originsWithRuntimeConfig`). The guard checks that every address setting is covered.
- **No extra wait for the code.** Since Batch 549 a build plugin (`scripts/vite/preloadAppStart.ts`) adds `<link rel="modulepreload">` tags for the app's code (`startApp.tsx` and what it imports) to `index.html`. The browser downloads that code while config.json is read; it still runs only after config.json is checked.

## 5a. The API server's /api/config (Batch 557)

Readiness review §9 items 1 and 7. With an API server, the app reads `GET {VITE_API_BASE_URL}/api/config` after config.json, before any service is created:

```json
{ "settings": { "VITE_AI_MODEL": "…", "VITE_AI_HOSTING_REGION": "UK South" },
  "hosting":  { "databaseRegion": "UK South", "blobRegion": "UK South" } }
```

- **Public and secret-free.** It is read with no credentials and never cached (`Cache-Control: no-store`), like config.json. Where the API is on another host from the app, it allows the app's origin (CORS).
- **A few settings only**, those marked `fromServer` in `RUNTIME_SETTINGS`: the AI model, its managed deployment, token limit and region, and voice.
  - Everything that decides security or behaviour stays with the site. That covers sign-in (mode, client ids, scopes, linking by email), the instance role (`VITE_APP_ENV`), the AI provider, the breached-password check and the enhancement address. It also covers `VITE_SERVER_JOBS`: if /api/config were missed, the browser would run those jobs too.
  - The server setting one of these is refused (`NOT_FROM_SERVER`).
  - An address (the API itself, the hub, the renderer, sign-in authorities, proxies) stays in config.json, because the site's Content-Security-Policy is made from config.json's addresses (§5). The server setting one is refused (`ADDRESS_NOT_FROM_SERVER`).
- **Which value wins:** config.json, then /api/config, then the build's own value. A site can still override any setting locally.
- **The build rules are checked on the merged settings.** A server build needs an API server and sign-in by SSO, from config.json or the build.
- **The API address** is config.json's, else the build's. Either way it is checked as an address (https) before it is asked. It is the server's root: `VITE_API_BASE_URL` has no `/api` on the end, because the app adds it (`/api/config`, `/api/me`, `/api/exports`).
- **No /api/config yet (404), or no complete answer within 5 s (body included).** config.json alone is used, as before, with a warning in the browser console. A /api/config that breaks a rule stops the app, like config.json. The error screen says the problem is in the server's /api/config.
- **`hosting`** gives the database and file (blob) storage regions, as short text (up to 100 characters; anything else in it is ignored, since it is only shown). Administrators see them in Configuration → AI provider settings, under "Where PathScribe keeps data", beside the AI service's region (Batch 536).
- **Demo builds never ask a server.**
- Source: `loadRuntimeConfig.ts` (`withServerConfig`), `runtimeSettings.ts` (`parseServerSettings`, `parseServerHosting`).

## 6. Status

| Part | Status |
|---|---|
| config.json at start-up, `appEnv()`, the rules, the error screen | **Done, Batch 547** |
| One server build (`build:server`); no demo accounts in it | **Done, Batch 547** |
| CSP from config.json (generator `--runtime-config`) | **Done, Batch 547** |
| `/api/config` from the API server, read after config.json (§5a) | **Done, Batch 557** (browser side; the endpoint is phase 2e) |
| The database and blob storage region shown to administrators (readiness review §9 item 7) | **Done, Batch 557** (browser side, from `/api/config` `hosting`) |
| Preloading the app's code while config.json is read | **Done, Batch 549** |
