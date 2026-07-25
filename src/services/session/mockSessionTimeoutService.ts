// src/services/session/mockSessionTimeoutService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mock implementation of ISessionTimeoutService. localStorage-backed,
// matching every other mock service in this codebase's ok/err/delay
// convention.
//
// Phase 1 of the Inactivity Timeout & Draft Recovery spec (see
// PRIORITY_FIXES.md #13).
// ─────────────────────────────────────────────────────────────────────────────

import type { ISessionTimeoutService } from './ISessionTimeoutService';
import type { ServiceResult } from '../types';
import { clientService } from '../index';
import { resolvePerformingLabClientId } from '../clients/IClientService';

const ORG_IDLE_TIMEOUT_KEY = 'pathscribe_idle_timeout_minutes';
const FALLBACK_DEFAULT_MINUTES = 15; // matches the original spec's suggested default

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

function readOrgDefault(): number {
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

export const mockSessionTimeoutService: ISessionTimeoutService = {

  async getOrgDefault() {
    return ok(readOrgDefault());
  },

  async setOrgDefault(minutes: number) {
    try {
      localStorage.setItem(ORG_IDLE_TIMEOUT_KEY, String(minutes));
    } catch {
      // ignore write failures
    }
    return ok(undefined);
  },

  async resolveEffectiveMinutes(orderingClientId?: string) {
    const orgDefault = readOrgDefault();
    if (!orderingClientId) return ok(orgDefault);

    const orderingRes = await clientService.getById(orderingClientId);
    if (!orderingRes.ok) return ok(orgDefault);

    const labId = resolvePerformingLabClientId(orderingRes.data);
    if (!labId) return ok(orgDefault);

    if (labId === orderingClientId) {
      return ok(orderingRes.data.idleTimeoutMinutesOverride ?? orgDefault);
    }
    const labRes = await clientService.getById(labId);
    if (!labRes.ok) return ok(orgDefault);
    return ok(labRes.data.idleTimeoutMinutesOverride ?? orgDefault);
  },
};
