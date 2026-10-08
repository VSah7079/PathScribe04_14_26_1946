# AI and research proxy: the API server holds every key

Batch 444. The browser never holds an AI, Gemini, UMLS or vendor key, in any build. It calls the routes below on its own origin, and the server adds the key and forwards the request to the vendor.

- **In development**, `vite.config.ts` (`server.proxy`) does this, reading keys from `.env` names **without** the `VITE_` prefix (see `.env.example`).
- **In production**, the PathScribe API server (ASP.NET Core) must serve the same routes. The Vite proxy does not exist in a production build.

`src/services/security/envExposure.guard.test.ts` enforces the browser side:
- no `VITE_` variable named like a key, secret, password or token, except `VITE_NCBI_API_KEY`, which is low-consequence;
- no request straight to a vendor host;
- no key header set in the browser;
- every `import.meta.env` read names its variable.

## Why the last rule matters

Reading `import.meta.env` as a whole object makes Vite copy **every** `VITE_` variable in `.env` into the bundle. Before Batch 444 a production build carried the demo passwords this way.

## Routes the server must provide

All routes require a signed-in user (bearer token, as for the rest of the API). They must not be reachable anonymously, or anyone could spend the organisation's AI budget.

| Client calls | Server forwards to | Key the server adds |
|---|---|---|
| `POST /api/ai/anthropic/v1/messages` | `https://api.anthropic.com/v1/messages` (streaming SSE passes through) | `x-api-key`, plus `anthropic-version: 2023-06-01` |
| `GET /api/ai/anthropic/v1/models` | `https://api.anthropic.com/v1/models` (System Info status) | same |
| `POST /api/ai/gemini/generate?model=<m>` | `…/v1beta/models/<m>:generateContent` | `x-goog-api-key` |
| `POST /api/ai/gemini/stream?model=<m>` | `…/v1beta/models/<m>:streamGenerateContent?alt=sse` | `x-goog-api-key` |
| `GET /api/ai/gemini/models` | `…/v1beta/models` (System Info status) | `x-goog-api-key` |
| `POST /api/ai/openai/v1/chat/completions` | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer …` |
| `POST /api/ai/azure/chat/completions` | `<endpoint>/openai/deployments/<deployment>/chat/completions?api-version=…` | `api-key` |
| `POST /api/ai/custom/chat/completions` | `<custom endpoint>/chat/completions` | `Authorization: Bearer …` |
| `POST /api/ai/bedrock/invoke`, `/invoke-stream` | AWS Bedrock `InvokeModel` / `InvokeModelWithResponseStream` (body has `modelId`, `region`) | AWS SigV4 (server role); no dev proxy |
| `GET /api/terminology/umls/…` | `https://uts-ws.nlm.nih.gov/rest/…` | `apiKey` query parameter |

For the Gemini routes, the model name comes from the browser. Accept only `[A-Za-z0-9._-]+` before putting it into the upstream path; the dev proxy does the same.

## Where endpoints and deployments come from

The AI Provider screen (Configuration → AI) still saves the organisation's provider, model, managed endpoint and deployment name, and custom endpoint (`config:ai-provider:manage`).

In production the server reads those saved settings to choose the upstream. The **keys** are never part of that setting: they live in the server's secret store (for example Azure Key Vault). In development the dev proxy uses `.env` values instead.

## What the server should also do

- **Audit** each AI call (who, case if any, provider, model, tokens), not the prompt text, which can contain PHI.
- **Rate-limit** per user and per organisation.
- **PHI**: the data-handling warning on the AI Provider screen applies. The server is the place to enforce a Business Associate Agreement / data-processing check on the chosen provider before forwarding.

## Not covered here

`VITE_NCBI_API_KEY` (PubMed) stays a browser setting by design. It only raises a public rate limit (see `src/services/research/README.md`). A server-side daily fetch would remove it and also fix the rate-limit concern described there.
