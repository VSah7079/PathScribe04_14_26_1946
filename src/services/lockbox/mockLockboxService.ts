// src/services/lockbox/mockLockboxService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the demo's Lockbox service: the logic of lockboxService.ts wired to the app's pending orders (order intake),
// the client and physician dictionaries, the audit service, the authorization service and the signed-in user. The
// receipts are kept like every mock's data (services/mockStorage.ts, so with an API server nothing is written to the
// browser). Dependencies load on first use, so importing this file pulls in none of those services.
//
// Demonstration only: the "server time" here is this browser's clock and the "token's user" is the signed-in session, so
// the stamping rules (server time, server user, append-only, 409 on a duplicate) are followed but not enforced by a
// server. The API server's version (httpLockboxService.ts) is where they are enforced.
// ─────────────────────────────────────────────────────────────────────────────
import { readSessionProfile } from '../auth/sessionProfile';
import { storageGet, storageSet } from '../mockStorage';
import { createLockboxService, type LockboxStore } from './lockboxService';
import { buildLockboxDemoSeed } from './lockboxDemoSeed';
import type { ILockboxService } from './ILockboxService';
import type { LockboxReceipt, LockboxResolution } from './lockboxTypes';

const RECEIPTS_KEY = 'lockbox_receipts_v1';
const RESOLUTIONS_KEY = 'lockbox_resolutions_v1';

/**
 * Append-only storage: there is no update or delete. Batch 648: the first read (or write) finds no stored data and writes
 * the demo's seed cases (lockboxDemoSeed.ts) first. Demo Reset removes both keys with the rest of the demo data, so the
 * next read starts again from a fresh seed.
 */
function seededReceipts(): LockboxReceipt[] {
  const stored = storageGet<LockboxReceipt[] | null>(RECEIPTS_KEY, null);
  if (stored !== null) return stored;
  const seed = buildLockboxDemoSeed(new Date());
  storageSet(RECEIPTS_KEY, seed.receipts);
  storageSet(RESOLUTIONS_KEY, seed.resolutions);
  return seed.receipts;
}

export const mockLockboxStore: LockboxStore = {
  receipts: async () => seededReceipts(),
  resolutions: async () => { seededReceipts(); return storageGet<LockboxResolution[]>(RESOLUTIONS_KEY, []); },
  appendReceipt: async r => { storageSet(RECEIPTS_KEY, [...seededReceipts(), r]); },
  appendResolution: async r => { seededReceipts(); storageSet(RESOLUTIONS_KEY, [...storageGet<LockboxResolution[]>(RESOLUTIONS_KEY, []), r]); },
};

let counter = 0;
const newId = (): string => `lbx-${Date.now().toString(36)}-${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const mockLockboxService: ILockboxService = createLockboxService({
  authorization: { enforce: async (capability, context) => (await import('../authorization/defaultAuthorizationService')).authorizationService.enforce(capability, context) },
  store: mockLockboxStore,
  pendingOrders: async () => {
    const { orderIntakeService } = await import('../orderIntake/orderIntakeInstance');
    const r = await orderIntakeService.listPendingOrders();
    return r.ok === true ? r.data : [];
  },
  facilityName: async id => {
    const { facilityService } = await import('../facilities/facilityServiceInstance');
    const r = await facilityService.getById(id);
    return r.ok === true ? r.data.name : undefined;
  },
  physicianName: async id => {
    const { physicianService } = await import('../physicians/physicianServiceInstance');
    const r = await physicianService.getById(id);
    return r.ok === true ? [r.data.givenNames, r.data.familyNames].filter(Boolean).join(' ') : undefined;
  },
  linkCase: async (caseId, receiptId) => {
    const [{ caseRouter }, { updateCaseWithRetry }] = await Promise.all([import('../cases/CaseRouter'), import('../cases/caseWrite')]);
    const w = await updateCaseWithRetry(caseId, c => (c.lockboxReceiptId === receiptId ? null : { lockboxReceiptId: receiptId }), caseRouter);
    return w.ok === true || w.reason === 'noChange';
  },
  now: () => new Date(),
  actor: () => { const p = readSessionProfile(); return { userId: p?.id ?? 'unknown', userName: p?.name ?? p?.id ?? 'unknown' }; },
  newId,
  audit: async entry => {
    const { auditService } = await import('../auditlog/auditServiceInstance');
    return auditService.logEvent({ type: 'user', event: entry.event, detail: entry.detail, user: entry.user, caseId: entry.caseId, confidence: null, facilityId: entry.facilityId });
  },
});
