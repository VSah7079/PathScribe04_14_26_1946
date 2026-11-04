// src/services/supportReferences/caseSupportReference.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 573 (review): a case's support reference for the live hub (the
// `caseReport` topic and presence, LIVE_UPDATES_SIGNALR.md §14 and §15).
// Everyone with the case open must use the same reference, so with the API
// server it comes from the server (`GET /api/cases/{caseId}/support-reference`,
// CASE_API.md §8), which issues references and keeps the table. Without one
// (the demo) the browser's own reference service stands in. A reference is
// fixed once issued, so each case's is asked for once per page load.
// ─────────────────────────────────────────────────────────────────────────────
import { normaliseSupportReference } from './supportReferenceRules';

export interface CaseSupportReferenceDeps {
  /** The API server's address, or null with no API server (the demo). */
  baseUrl: string | null;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  accessToken: () => Promise<string | null | undefined>;
  /** The demo's stand-in: the browser's own reference service. */
  fallback: (caseId: string) => Promise<string | null>;
}

export function createCaseSupportReferenceLookup(deps: CaseSupportReferenceDeps): (caseId: string) => Promise<string | null> {
  const known = new Map<string, Promise<string | null>>();
  const fromServer = async (caseId: string): Promise<string | null> => {
    const root = deps.baseUrl!.replace(/\/+$/, '');
    try {
      const token = await deps.accessToken();
      const res = await deps.fetch(`${root}/api/cases/${encodeURIComponent(caseId)}/support-reference`, {
        method: 'GET',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return null;
      const body: unknown = await res.json().catch(() => null);
      const ref = body && typeof body === 'object' ? (body as { ref?: unknown }).ref : null;
      return typeof ref === 'string' ? normaliseSupportReference(ref) : null;
    } catch {
      return null;
    }
  };
  return caseId => {
    const cached = known.get(caseId);
    if (cached) return cached;
    const p = (deps.baseUrl ? fromServer(caseId) : deps.fallback(caseId).catch(() => null));
    known.set(caseId, p);
    // A failure isn't kept: the next open asks again.
    void p.then(ref => { if (!ref) known.delete(caseId); });
    return p;
  };
}
