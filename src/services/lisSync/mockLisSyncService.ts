// src/services/lisSync/mockLisSyncService.ts
// ─────────────────────────────────────────────────────────────
// Mock for the CoPilot "Data as of / Check now" indicator — lets a
// tester exercise the discordance scenario (LIS has moved on since
// PathScribe's last check) without needing real LIS integration.
//
// Storage key uses the pathscribe_mock_ prefix specifically so it's
// automatically swept by DemoResetTab's existing full-reset sweep
// (Object.keys(localStorage).filter(k => k.startsWith(MOCK_PREFIX))) —
// no separate reset wiring needed; confirmed by reading that file
// directly rather than assuming.
//
// Two seeded scenarios, both against real case IDs from the seed data:
//   S26-4401-BX-001    — has a pending update (Ki-67 ordered in the LIS
//                        70 min after PathScribe's last check, not yet
//                        pulled in) — the "something changed" case.
//   S26-4402-COLON-RES — checked recently, nothing pending — the
//                        "already current" case, so testing isn't
//                        limited to only the interesting scenario.
//
// checkNow() only simulates the sync-timing side of a real LIS call —
// applying any returned flags onto the actual case record is the
// caller's job (via the real flag-adding mechanism), kept separate on
// purpose so this mock doesn't reach into case mutation itself.
// ─────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';

export interface LisSyncPendingFlag {
  id: string;
  name: string;
  lisCode: string;
  tagClass: 'COMPUTATIONAL' | 'ADMINISTRATIVE';
  severity: 1 | 2 | 3 | 4 | 5;
  specimenId?: string;
}

export interface LisSyncState {
  lastCheckedAt: string;
  pendingUpdate?: {
    availableSince: string;
    newFlags: LisSyncPendingFlag[];
    summary: string;
  };
}

const STORAGE_KEY = 'pathscribe_mock_lis_sync_state';

function seed(): Record<string, LisSyncState> {
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

  return {
    'S26-4401-BX-001': {
      lastCheckedAt: minutesAgo(120),
      pendingUpdate: {
        availableSince: minutesAgo(70),
        newFlags: [
          { id: 'comp-ki67-4401', name: 'Ki-67', lisCode: 'KI67', tagClass: 'COMPUTATIONAL', severity: 2, specimenId: 'S26-4401-SP-1' },
        ],
        summary: 'Ki-67 ordered in the LIS 70 minutes ago — not yet pulled into PathScribe',
      },
    },
    'S26-4402-COLON-RES': {
      lastCheckedAt: minutesAgo(45),
      // No pending update — the "already current" scenario, so a
      // tester isn't always shown the same "something's new" case.
    },
  };
}

function load(): Record<string, LisSyncState> {
  return storageGet<Record<string, LisSyncState>>(STORAGE_KEY, seed());
}

function persist(state: Record<string, LisSyncState>): void {
  storageSet(STORAGE_KEY, state);
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 250)); // simulated round-trip latency

export const mockLisSyncService = {
  async getSyncState(caseId: string): Promise<ServiceResult<LisSyncState | null>> {
    const state = load();
    return ok(state[caseId] ?? null);
  },

  /** Simulates a real LIS round-trip: returns any flags that were
   *  "waiting," clears the pending update, and advances lastCheckedAt
   *  to now. Caller applies newFlags onto the actual case record. */
  async checkNow(caseId: string): Promise<ServiceResult<{ lastCheckedAt: string; newFlags: LisSyncPendingFlag[] }>> {
    await delay();
    const state = load();
    const current = state[caseId];
    const newFlags = current?.pendingUpdate?.newFlags ?? [];
    const nowIso = new Date().toISOString();

    state[caseId] = { lastCheckedAt: nowIso };
    persist(state);

    return ok({ lastCheckedAt: nowIso, newFlags });
  },
};
