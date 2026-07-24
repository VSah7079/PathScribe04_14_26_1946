// src/services/session/sessionTimeoutConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real source of truth for "how many minutes of inactivity before warning/
// logout." Phase 1 of the Inactivity Timeout & Draft Recovery spec (see
// PRIORITY_FIXES.md).
//
// Structurally mirrors components/Config/AI/orchestratorModeConfig.ts —
// same "null/unset = inherit" two-layer convention already used for
// Client.tatFirstTouchHours / Client.jurisdiction / Client.pediatricAgeThreshold
// / Client.internalAiOrchestratorEnabled:
//   1. ORG DEFAULT      — org-wide, admin-editable, persisted to localStorage.
//   2. PER-LAB OVERRIDE — Client.idleTimeoutMinutesOverride on the internal
//      client that actually performs the work on the currently-open case
//      (resolved via resolvePerformingLabClientId(), same as every other
//      lab-scoped setting). Wins over the org default when set.
//
// Deliberately resolved per CURRENTLY-OPEN CASE, not per-user or per-session-
// wide "all institutions this user has permissions for" — PathScribe's real
// UI is single-case-focused (one case fully open at a time), so there's no
// need for Model 1's full "strictest among several simultaneously-open
// cases" complexity. When no case is open (Worklist, Home, Configuration),
// resolution falls back to the org default.
// ─────────────────────────────────────────────────────────────────────────────

import { clientService } from '../index';
import { resolvePerformingLabClientId } from '../clients/IClientService';

export const ORG_IDLE_TIMEOUT_KEY = 'pathscribe_idle_timeout_minutes';
const FALLBACK_DEFAULT_MINUTES = 15; // matches the original spec's suggested default

// ── Org-level default (sync — safe to call from render) ────────────────────

export function getOrgIdleTimeoutDefault(): number {
  try {
    const stored = localStorage.getItem(ORG_IDLE_TIMEOUT_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // localStorage unavailable (SSR / sandboxed env) — ignore
  }
  return FALLBACK_DEFAULT_MINUTES;
}

export function setOrgIdleTimeoutDefault(minutes: number): void {
  try {
    localStorage.setItem(ORG_IDLE_TIMEOUT_KEY, String(minutes));
  } catch {
    // ignore write failures
  }
}

// ── Effective, per-case resolution (async — needs a Client lookup) ─────────
//
// Pass the currently-open case's ordering client id (caseData?.order?.clientId),
// or undefined if no case is currently open. Resolves through to whichever
// internal client's lab actually performs the work, same as jurisdiction/
// Orchestrator Mode resolution elsewhere in this codebase. Falls back to the
// org default whenever no client can be resolved (no case open, missing id,
// lookup failure, or no override set on the performing lab) — same fail-safe
// posture used everywhere else, not a guess. On lookup failure, fails safe
// toward the STRICTER value (org default) rather than an unbounded session.
export async function resolveIdleTimeoutMinutes(orderingClientId?: string): Promise<number> {
  const orgDefault = getOrgIdleTimeoutDefault();
  if (!orderingClientId) return orgDefault;

  const orderingRes = await clientService.getById(orderingClientId);
  if (!orderingRes.ok) return orgDefault;

  const labId = resolvePerformingLabClientId(orderingRes.data);
  if (!labId) return orgDefault;

  if (labId === orderingClientId) {
    return orderingRes.data.idleTimeoutMinutesOverride ?? orgDefault;
  }
  const labRes = await clientService.getById(labId);
  if (!labRes.ok) return orgDefault;
  return labRes.data.idleTimeoutMinutesOverride ?? orgDefault;
}

// ── Extract a case id from the current URL ──────────────────────────────────
// ProtectedRoute.tsx wraps every authenticated route equally and has no
// built-in awareness of "is there a specific case open right now" — this
// keeps that detection self-contained rather than threading case context
// through every page that renders a case.
export function extractCaseIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/case\/([^/]+)/);
  return match ? match[1] : null;
}
