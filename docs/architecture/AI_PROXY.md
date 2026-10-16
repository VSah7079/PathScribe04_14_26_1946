# AI and research proxy: the API server holds every key

Batch 444. The browser never holds an AI, Gemini, UMLS or vendor key, in any build. It calls the routes below on its own origin, and the server adds the key and forwards the request to the vendor.

- **In development**, `vite.config.ts` (`server.proxy`) does this, reading keys from `.env` names **without** the `VITE_` prefix (see `.env.example`).
- **In production**, the PathScribe API server (ASP.NET Core) must serve the same routes. The Vite proxy does not exist in a production build.

`src/services/security/envExposure.guard.test.ts` enforces the browser side:
- no `VITE_` variable named like a key, secret, password or token (no exceptions since Batch 499);
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

The AI Provider screen (Configuration → AI Behavior; the tab was called AI here until the Batch 496 README audit) still saves the organisation's provider, model, managed endpoint and deployment name, and custom endpoint (`config:ai-provider:manage`).

In production the server reads those saved settings to choose the upstream. The **keys** are never part of that setting: they live in the server's secret store (for example Azure Key Vault). In development the dev proxy uses `.env` values instead.

## What the server should also do

- **Audit** each AI call (who, case if any, provider, model, tokens), not the prompt text, which can contain PHI.
- **Rate-limit** per user and per organisation.
- **PHI**: the data-handling warning on the AI Provider screen applies. The server is the place to enforce a Business Associate Agreement / data-processing check on the chosen provider before forwarding.

## Not covered here

`VITE_NCBI_API_KEY` (PubMed) was removed in Batch 499 (PS-476): the browser calls PubMed without a key. If the shared 3-requests-a-second limit becomes a problem, a server-side fetch through this proxy (PS-488) can carry a key.

## AI vendor policy per jurisdiction (Batch 536, PS-558; with PS-539)

Pete, Oct 11, 2026: "PathScribe needs to be AI agnostic because certain jurisdictions specify available, or unavailable AI vendor." The browser checks every AI call before sending it (`services/aiIntegration/aiCallPolicy.ts`), but a browser check can be bypassed, so **the server's AI proxy must make the same check on every route above and is the one that counts.**

**The policy** (`services/aiIntegration/aiVendorPolicy.ts`), one rule per jurisdiction, optionally one per facility:

```
{ scope: { jurisdiction, facilityId? },
  allowedServices: [ 'structured_messages' | 'chat_completions' | 'chat_completions_managed'
                     | 'model_gateway' | 'structured_content' | 'custom' ] | null,   // null = every service
  allowedRegions: { <service>: [ 'eu-west-1', … ] } }                              // absent or empty = any region
```

- No rule for a jurisdiction: every service is allowed (current sites keep working).
- A facility rule narrows its jurisdiction's rule: the call must pass both.
- Where a rule limits a service's regions, a call whose region isn't recorded is refused.
- The services are named by request shape, as in the code: `structured_messages` Anthropic, `chat_completions` OpenAI, `chat_completions_managed` Azure OpenAI, `model_gateway` AWS Bedrock, `structured_content` Google Gemini, `custom` a self-hosted model. The hosting region is `gatewayRegion` for Bedrock and `hostingRegion` (new) for the others, saved with the AI Provider setting.

**Endpoints:** `GET /api/config/ai-vendor-policy` (anyone who can open Configuration); `PUT /api/config/ai-vendor-policy` `{ scope, allowedServices, allowedRegions }` and `DELETE /api/config/ai-vendor-policy?jurisdiction=&facilityId=` need `config:ai-vendor-policy:manage` (Admin and Lab Director by default); refusals `CONFIG_NOT_PERMITTED`, `unknownService`, `noServices`, `regionForDisallowedService`, `blankRegion`. Each change writes `AI_VENDOR_POLICY_CHANGED` with before and after.

**The check in the proxy**, before forwarding:
1. Where the work belongs: the request's case → its ordering facility → the facility's jurisdiction; else the facility named; else the organisation's own jurisdiction. The browser sends `X-PathScribe-Case-Id` / `X-PathScribe-Facility-Id` for this once PS-539 defines the headers (today it passes them only to its own check, and never to the AI).
2. The service and region the proxy is about to call (from the saved setting, never from the request body).
3. Refused: answer `403` with `{ "code": "AI_VENDOR_NOT_ALLOWED", "refusal": "serviceNotAllowed" | "regionNotAllowed" | "regionUnknown", "jurisdiction": "…" }`, call nothing, and audit `AI_CALL_REFUSED`. **Never forward to another service instead.** The browser treats this like its own refusal: the feature carries on without AI and says "AI is not available for this jurisdiction" where it can.

**Audit of every call** (replaces "Audit each AI call" above): who, the case if any, the facility and jurisdiction checked, the service, model and hosting region, the feature, tokens, latency and outcome (`completed`, `error`, `refused`); never the prompt text. The browser records the same fields in its AI audit log (`services/ai/AIAuditLog.ts`) until the server does.

**Disclosed:** in the browser, a provider setting of `mock` (or an unknown value) makes `callAi()` send the request to `structured_messages` (Anthropic) through the proxy; this predates Batch 536. The policy now checks the service the request actually goes to, so a jurisdiction that doesn't allow Anthropic refuses it, but a demonstration site set to `mock` still calls the proxy.
