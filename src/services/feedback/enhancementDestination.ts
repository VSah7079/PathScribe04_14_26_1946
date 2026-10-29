// src/services/feedback/enhancementDestination.ts
// ─────────────────────────────────────────────────────────────────────────────
// Where an enhancement request is delivered when it goes to a website instead of by email.
//   • The address is never written in code. It is the administrator's entry in Configuration →
//     System → Feedback (enhancementUrl), else the deployment's own default
//     (VITE_ENHANCEMENT_REQUEST_URL in config.json, runtimeConfig/). Either way it must be https
//     (feedbackSettingsRules.enhancementUrlProblem). An administrator entering it is the
//     approval; the policy that really limits where a browser may send is the Content-Security-
//     Policy connect-src, which the deployment's generator builds from config.json
//     (docs/architecture/FEEDBACK_DESTINATION.md).
//   • It is delivered with the shared HTTP client (apiServer/apiHttpClient.ts), pointed at that
//     address with NO access token: the signed-in user's PathScribe token never leaves for
//     another site. A failure is a fixed code; the website's own reply text is never shown.
//   • What is sent carries no patient data: the title and description have been through the
//     identifier check, a screenshot is only there when the person included it (and is PHI-redacted),
//     and the user id is left out.
// ─────────────────────────────────────────────────────────────────────────────
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { enhancementUrlProblem } from './feedbackSettingsRules';
import type { EnhancementRequestPayload } from '../enhancementRequestService';

/** The address to deliver to: the administrator's, else the deployment's default, else '' (email). */
export function effectiveEnhancementUrl(adminUrl: string | undefined, deploymentDefault: string | undefined = appEnv().VITE_ENHANCEMENT_REQUEST_URL): string {
  const admin = (adminUrl ?? '').trim();
  if (admin && !enhancementUrlProblem(admin)) return admin;
  const fallback = (deploymentDefault ?? '').trim();
  return fallback && !enhancementUrlProblem(fallback) ? fallback : '';
}

/** The host only, for messages and the audit trail. '' when it is not an address. */
export function destinationHost(url: string): string {
  try { return new URL(url).host; } catch { return ''; }
}

/** The JSON the website receives. No user id, no attachments (files), nothing unchecked. */
export function enhancementDeliveryBody(payload: EnhancementRequestPayload, sentAt: string): Record<string, unknown> {
  const m = payload.metadata;
  return {
    source: 'pathscribe',
    kind: 'enhancement-request',
    sentAt,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    ...(payload.priority ? { priority: payload.priority } : {}),
    ...(payload.screenshotDataUrl ? { screenshotDataUrl: payload.screenshotDataUrl } : {}),
    ...(m ? { system: { userName: m.userName, userRole: m.userRole, appVersion: m.appVersion, browser: m.browser, os: m.os, page: m.currentPage, ...(m.caseSupportReference ? { caseSupportReference: m.caseSupportReference } : {}) } } : {}),
  };
}

export type DeliveryResult = { ok: true; ticketUrl?: string } | { ok: false };

/** POSTs the request as JSON. The destination should answer 204 or a JSON object (the shared client treats anything else as a failure). */
export async function deliverToDestination(
  url: string,
  body: Record<string, unknown>,
  deps: { fetch: typeof fetch } = { fetch: (...a) => fetch(...a) },
): Promise<DeliveryResult> {
  if (enhancementUrlProblem(url) || !url) return { ok: false };
  const u = new URL(url);
  const client = createApiHttpClient({ baseUrl: u.origin, fetch: deps.fetch, accessToken: async () => '', timeoutMs: 15_000 });
  const res = await client.post<{ ticketUrl?: unknown } | undefined>(`${u.pathname}${u.search}`, body);
  if (res.ok === false) return { ok: false };
  const link = res.data && typeof res.data === 'object' ? res.data.ticketUrl : undefined;
  return { ok: true, ...(typeof link === 'string' && !enhancementUrlProblem(link) ? { ticketUrl: link } : {}) };
}
