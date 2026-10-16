

# services/security

## Batch 444: nothing secret in the browser bundle

`envExposure.guard.test.ts` keeps keys and passwords out of the JavaScript every visitor downloads. On code, outside tests:
- every `import.meta.env` read names its variable (`import.meta.env.VITE_X`). Reading it as a whole object (`(import.meta as any).env?.X`, `import.meta.env[name]`, passing `import.meta.env` to a function) makes Vite copy **every** `VITE_` variable in `.env` into the bundle;
- no `VITE_` variable named like a key, secret, password or token (since Batch 499 there are no exceptions: `VITE_NCBI_API_KEY` was the last);
- no request straight to an AI vendor host;
- no key header set in the browser;
- the stored AI settings type has no key field.

The production proxy contract is `docs/architecture/AI_PROXY.md`.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-48)

`xlsxRemoved.guard.test.ts`: fails if the vulnerable `xlsx` package returns to any `package.json` section, `package-lock.json`, or an import in `src/` or `scripts/`.

## Batch 499 (PS-476)

The guard's allow-list is empty: `VITE_NCBI_API_KEY` is no longer read (the PubMed feed runs without a key). A new check fails on that name or on any `api_key` query parameter in browser code.

## Batch 500 (PS-473): HTML sanitising

`sanitizeHtml.ts` (DOMPurify, now a direct dependency) is the one place HTML from data is made safe:
- `sanitizeRichHtml` — report sections, report paragraphs, comments. Keeps formatting, `class`, `data-*` (so `data-phi` redaction still works), safe links (`target="_blank"` gets `rel="noopener noreferrer"`), and inline style limited to alignment, weight, emphasis and decoration.
- `sanitizeSvgMarkup` — barcode SVGs (and the label designer's error box); no `foreignObject`, `use`, `image` or animation elements.
- `escapeHtml` / `cssString` — text placed in HTML or a CSS string the app builds (print-window titles and headers).

Sanitising happens when content is displayed; the server must also sanitise on save (`docs/architecture/CASE_API.md` §7). Without a DOM, the sanitisers escape everything (safe failure).

`htmlSanitising.guard.test.ts` fails on any `dangerouslySetInnerHTML` that doesn't render one of the sanitisers (a ternary is allowed when each branch is sanitised or escaped), and on any `<title>` built from an unescaped value. `sanitizeHtml.test.ts` runs a standard XSS payload list (28 payloads, both sanitisers) under **jsdom**: DOMPurify doesn't work under happy-dom (it keeps event handlers and drops ordinary markup there), so tests that check sanitised output use jsdom (now a dev dependency).

## Batch 503 (PS-474): security headers

`securityHeaders.guard.test.ts` keeps the policy in `deploy/security-headers/securityHeaders.mjs` strict (no inline script, no eval, no framing, no plugins), checks that every generated hosting config and `vercel.json` match it, that `index.html` has no inline script or outside origin, and that nothing in `src/` loads a stylesheet, font or sound from another origin.

## Batch 546 (finding F4)

`securityHeaders.guard.test.ts` checks that the policy allows the workstation print bridges, on loopback only:
- the workstation agent on `AGENT_PORTS`, with `wss://` and `https://`;
- QZ Tray's secure ports, plus its `ws://` ports on plain http.

It also checks that `workstationBridges: false` leaves them out, and that nothing but the hub and the bridges gets a WebSocket origin.
