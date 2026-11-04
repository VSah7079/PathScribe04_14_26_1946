# deploy/runtime-config/

Batch 547 (PS-539 phase 2d, readiness review §9 item 1). One PathScribe build serves every deployment. Each site's settings are in a `config.json` file. It sits next to `index.html` on the web server and is read when the app starts. Full description: `docs/architecture/RUNTIME_CONFIG.md`.

## Setting it up

1. **Build once.** Run `npm run build:server`, which is `vite build --mode server`. This build has no demo accounts or demo tools, and needs no site address at build time.
2. **Write the site's file.** Copy `config.example.json` to `config.json` and fill in the site's settings. The names are the same as the `VITE_*` build variables, and each is described in `src/services/runtimeConfig/runtimeSettings.ts`.
3. **Put it on the server.** Place `config.json` beside `index.html`.
   - Serve it with `Cache-Control: no-store`, so a change takes effect on the next page load and no CDN keeps an old copy.
   - nginx: `location = /config.json { add_header Cache-Control "no-store" always; }`
   - IIS / Azure App Service: a `<location path="config.json">` with `<clientCache cacheControlMode="DisableCache" />` and a custom `Cache-Control: no-store` header.
   - Azure Static Web Apps: a route for `/config.json` with that header.
   - Azure Front Door, Cloudflare: a rule that bypasses the cache for `/config.json`.
4. **Allow its addresses in the security headers.** Run `node scripts/generate-security-headers.mjs <origins.json> <outDir> --runtime-config config.json`. Every address config.json sets is then added to the Content-Security-Policy, so none is blocked.
5. **Change it later** by editing `config.json`, re-running the headers generator if an address changed, and reloading the page. Nothing needs rebuilding.

## Rules

PathScribe refuses to start, and shows which settings are wrong, when any of these is broken:
- **Known settings only:** a name that isn't a setting is refused, so a typo can't go unnoticed.
- **Server addresses** (the API server, identity providers, hub, renderer, interface receiver, AI endpoints, NLM) must be `https://`. Plain `http://` is allowed only to this computer, and only in a development build. Proxies (AI, CPT, ICD-10) may also be a path on this site starting with `/`.
- **A server build** needs `VITE_API_BASE_URL`. It signs in through the identity provider only, so `VITE_AUTH_MODE` must be `sso`.
- **A demo build** refuses `VITE_API_BASE_URL`, the hub, the renderer and the interface receiver, and refuses `VITE_APP_ENV` = `production`. Its demonstration accounts can therefore never reach real data or real systems.
- **An empty value** means "use the build's own value".
- **No secrets:** config.json is sent to every browser, as the app's own code is. It never holds a key, password or client secret. Sign-in uses public client ids only.

With no `config.json` at all, the build's own `VITE_*` values are used, as before. That is how the demo runs.

## Which jobs the API server runs (Batch 555)

`VITE_SERVER_JOBS` lists the recurring jobs the deployment's API server runs, by name and separated by commas (`docs/architecture/MESSAGE_BUS_API.md` §5), for example `"delivery.retrySweep, release.dueSweep"`.
- **Leave it empty until the server runs a job.** While it is empty, the browser keeps running each job while someone is signed in.
- **Add a job's name when the server starts running it.** The browser then stops, so the job is never done twice.
- **Wrong name:** a name the browser doesn't know is reported in its console, and the browser keeps running that job.

See `docs/architecture/RUNTIME_CONFIG.md`.

## The API server's /api/config (Batch 557)

With an API server, PathScribe also reads `{VITE_API_BASE_URL}/api/config` when it starts. The server can give:
- **a few settings**, under `settings`: the AI model, its deployment, token limit and region, and voice. Sign-in, the instance role, `VITE_SERVER_JOBS` and every address must stay in config.json;
- **where it keeps data**, under `hosting`: `databaseRegion` and `blobRegion`.

How it is read:
- **config.json wins** for any setting both give.
- **Serve it like config.json:** public, `Cache-Control: no-store`, and allowed for the app's origin if the API is on another host.
- **If it isn't there yet,** the app uses config.json alone.

See `docs/architecture/RUNTIME_CONFIG.md` §5a.

**Correction (Batch 557):** `config.example.json` gave `VITE_API_BASE_URL` with `/api` on the end. The app adds `/api/...` itself, so the address is the server's root, for example `https://pathscribe.hospital.example`.

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: the API server's `/api/config` (what it may set); `config.example.json`'s `VITE_API_BASE_URL` corrected to the server's root.

## Batch 590 (PS-469): error monitoring

`VITE_ERROR_MONITORING_DSN` and `VITE_ERROR_MONITORING_ENV` turn on sending scrubbed crash reports to Sentry or the hospital's own collector. Leave both out for no monitoring (the default). Not in `config.example.json`, so a site opts in on purpose. Re-run the headers generator after setting the address.

`VITE_ENHANCEMENT_REQUEST_URL` pre-seeds where Enhancement Requests are delivered (an https address on the ForMedrixAI website). An administrator can override it in Configuration > System > Feedback. Not in `config.example.json`; re-run the headers generator after setting it so the browser may send there (`docs/architecture/FEEDBACK_DESTINATION.md`).
