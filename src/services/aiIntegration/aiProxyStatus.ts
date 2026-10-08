// src/services/aiIntegration/aiProxyStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 444: the top bar's System Info check. It used to call
// api.anthropic.com straight from the browser with VITE_AI_API_KEY in the
// request (so the key had to be in the browser bundle), and judged Gemini
// "configured" from VITE_GEMINI_API_KEY. Both now ask the proxy, which holds
// the keys server-side: vite.config.ts in development, the PathScribe API
// server in production (docs/architecture/AI_PROXY.md).
//
//   GET /api/ai/anthropic/v1/models   → the Claude route answers
//   GET /api/ai/gemini/models         → the Gemini route answers
//
// A route answers "ok" only when the proxy has a key and the vendor accepts
// it, so "not configured" and "key refused" both show as not available.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_PROXY_STATUS_ROUTES = {
  structuredMessages: '/api/ai/anthropic/v1/models',
  structuredContent: '/api/ai/gemini/models',
} as const;

export interface AiProxyStatus {
  /** The Claude (structured messages) route answered. */
  structuredMessages: boolean;
  /** The Gemini (structured content) route answered. */
  structuredContent: boolean;
}

type FetchLike = (url: string, init?: { method?: string }) => Promise<{ ok: boolean }>;

const answers = (fetchFn: FetchLike, url: string): Promise<boolean> =>
  fetchFn(url, { method: 'GET' }).then(r => r.ok).catch(() => false);

/** Asks each proxy route whether it answers. Never sends a key. */
export async function checkAiProxyStatus(fetchFn: FetchLike = (u, i) => fetch(u, i)): Promise<AiProxyStatus> {
  const [structuredMessages, structuredContent] = await Promise.all([
    answers(fetchFn, AI_PROXY_STATUS_ROUTES.structuredMessages),
    answers(fetchFn, AI_PROXY_STATUS_ROUTES.structuredContent),
  ]);
  return { structuredMessages, structuredContent };
}
