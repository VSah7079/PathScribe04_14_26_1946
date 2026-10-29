# deploy/security-headers/

Batch 503 (PS-474): the browser security headers PathScribe's front end must be served with, for every hosting option. The policy is defined once in `securityHeaders.mjs`. Each hosting option's config is generated from it, so they can't drift. `src/services/security/securityHeaders.guard.test.ts` fails if a generated file no longer matches the policy.

## Setting it up for a deployment

1. Copy `origins.example.json` to `origins.json` and fill in this deployment's addresses:
   - **`connect`** — what the browser calls:
     - the PathScribe API server;
     - the identity provider (OIDC authority, e.g. `https://login.microsoftonline.com`);
     - the AI / terminology proxy;
     - the report rendering service.
   - **`hub`** — the SignalR live-updates hub. It gets both its `https://` and `wss://` origin.
   - **`formAction`** — the identity provider, if it posts a form back.
   - **`frame` / `img`** — anything embedded from another origin (a slide viewer, an image server). Empty today.
   - **`https`** — `false` only for an internal plain-http deployment. That drops HSTS and `upgrade-insecure-requests`.
   - **`workstationBridges`** — `false` only if no workstation uses the PathScribe workstation agent or QZ Tray. By default their loopback origins are allowed (Batch 546, finding F4). A workstation agent moved off its standard ports needs its `wss://127.0.0.1:<port>` and `https://127.0.0.1:<port>` added under `connect`.
   - Full URLs are fine; paths are ignored.
2. Run `node scripts/generate-security-headers.mjs deploy/security-headers/origins.json <outDir>`.
3. Use the file for your host:

| Host | File | Where it goes |
|---|---|---|
| nginx | `nginx.conf` | `include` it in the `server { }` block that serves the app |
| IIS; Azure App Service (Windows) | `web.config` | merge `<customHeaders>` into the site's web.config |
| Azure Static Web Apps | `staticwebapp.config.json` | the app root (also sets the SPA fallback) |
| Azure Front Door (Standard/Premium) | `azure-front-door-rules.json` | a rule set whose actions overwrite these response headers; attach it to the PathScribe route |
| Anything else | `headers.txt` | the plain list |
| Vercel (the demo site) | root `vercel.json` | generated from `origins.demo.json`; the generator writes it |

`generated/` holds the output for the example origins (a template to read); `generated-demo/` holds the demo site's.

The headers must be real HTTP headers. `frame-ancestors`, HSTS and `Referrer-Policy` are ignored in a `<meta>` tag. A nonce isn't used: a static Vite app has no server to issue one per request.

## What each header is, and why

**Content-Security-Policy**
- **`default-src 'self'`**: nothing from another origin unless listed below.
- **`script-src 'self' 'wasm-unsafe-eval'`**: no inline script and no `eval`. `index.html` has one external module script and no inline scripts. `'wasm-unsafe-eval'` only lets WebAssembly compile (the Hunspell spell checker); it does not allow `eval()`.
- **`style-src 'self' 'unsafe-inline'`**: inline styles only, which can't run script. They're needed because:
  - sanitised report HTML keeps `text-align` style attributes;
  - the rich-text editor sets style attributes;
  - the print windows write a `<style>` block.

  No stylesheet comes from another origin. The Inter font was loaded from Google Fonts until this batch; it is now bundled (`@fontsource/inter`).
- **`img-src 'self' data: blob:`**: barcodes, logos, generated images and PDFs.
- **`font-src 'self' data:`**: Inter and Pretendard (Korean) are both bundled.
- **`connect-src`**: `'self'` plus the deployment's origins, and two public reference services:
  - `eutils.ncbi.nlm.nih.gov` (the PubMed feed);
  - `clinicaltables.nlm.nih.gov` (terminology look-ups), **only for the demonstration**. A deployment with the PathScribe API server sets `"terminologyViaServer": true` in its origins file: the server makes those calls (`docs/architecture/TERMINOLOGY_PROXY_API.md`, Batch 617, PS-488) and the policy no longer names the host.

  It also allows the workstation print bridges, on the user's own computer only (Batch 546, `WORKSTATION_BRIDGE_ORIGINS`):
  - the workstation agent: `wss://127.0.0.1:9100-9102`, and `https://` on the same ports for the scale;
  - QZ Tray: `wss://localhost` and `wss://localhost.qz.io` on ports 8181, 8282, 8383 and 8484. A plain-http deployment also gets its `ws://` ports.

  Loopback origins let the page talk only to that computer, so nothing can be sent elsewhere through them. Chrome and Edge also ask the user's permission for local addresses; hospital IT can pre-approve PathScribe with the `LocalNetworkAccessAllowedForUrls` policy.
- **`worker-src 'self' blob:`**: the spell checker and the cytology PDF worker.
- **`frame-src 'self' blob:`**: the in-app PDF preview.
- **`frame-ancestors 'none'`**: PathScribe can't be framed (clickjacking). `X-Frame-Options: DENY` does the same for older browsers.
- **`form-action 'self'`** (plus the identity provider), **`base-uri 'self'`**, **`object-src 'none'`**, **`manifest-src 'self'`**.
- **`upgrade-insecure-requests`**: on https deployments.

**The other headers**
- **Strict-Transport-Security** `max-age=31536000; includeSubDomains`: https deployments only. Add `preload` only once the hospital's whole domain is https.
- **X-Content-Type-Options** `nosniff`.
- **Referrer-Policy** `no-referrer`: addresses can carry case ids and search text, so none is sent to other sites.
- **Permissions-Policy**: allows `camera`, `microphone` and `display-capture` for PathScribe itself (grossing photos, dictation, enhancement-request screenshots). Everything else is off.
- **Cross-Origin-Resource-Policy** `same-origin`.
- **Cross-Origin-Opener-Policy: deliberately not set.** The sign-in and signature-confirmation popups (oidc-client-ts) hand their result back to the opener after visiting the identity provider. A COOP header can break that. Revisit it with a tested setup.

## How it was checked (Batch 503)

- **Built and served with these headers:** the production build was served with the demo policy (`https: false`, local http) and walked in Chromium:
  - sign-in;
  - Worklist, Search, Configuration, Configuration → Organ maps, Audit Log and the Cytology QC queue;
  - opening a case on the report page, with the organ map drawn and typing in the editor.

  Each screen was checked for `securitypolicyviolation` events and "Refused to…" console messages.
- **Violations found and fixed:** the first pass found two: the Inter font from Google Fonts, and the urgent-message alert sound from `actions.google.com`. Both now come from PathScribe itself. The final pass had **no violations**.
- **Not exercised in that walk:** the spell checker's WebAssembly, the PDF preview and the print windows. QA should check them on each hosting option with devtools and a CSP evaluator (e.g. csp-evaluator.withgoogle.com), as the ticket asks.

## Batch 511 (PS-478): full strict type-checking

`securityHeaders.d.mts` declares the types of `securityHeaders.mjs`, so the guard test that imports it type-checks under strict mode. No change to the headers.

## Batch 547

`node scripts/generate-security-headers.mjs <origins.json> <outDir> --runtime-config config.json` adds every address the deployment's `config.json` sets (`originsWithRuntimeConfig`):
- the API server, renderer, interface receiver, AI and terminology endpoints, and identity providers go to `connect-src`;
- the hub goes to `connect-src` with its `wss://` origin;
- the identity providers also go to `form-action`.

A path on this site needs nothing. See `docs/architecture/RUNTIME_CONFIG.md`.

## Batch 590

`VITE_ERROR_MONITORING_DSN` is one of the config.json addresses added to `connect-src` (only its origin; the key is dropped).

`VITE_ENHANCEMENT_REQUEST_URL` is another config.json address added to `connect-src` (Oct 28, 2026).
