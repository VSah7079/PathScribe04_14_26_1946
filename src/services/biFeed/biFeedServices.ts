// src/services/biFeed/biFeedServices.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (PS-787): the reporting feed wired to the browser demo's pieces:
// browser-held storage, the audit log, the signed-in person and the Web Crypto
// random source and SHA-256. With the API server this file is replaced by HTTP
// calls; the screen and the rules do not change.
// ─────────────────────────────────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { readSessionProfile } from '../auth/sessionProfile';
import { createBiFeedService, type BiFeedService } from './biFeedService';
import { hashBiToken } from './biFeedRules';

const unchecked = createBiFeedService({
  load: storageGet,
  save: storageSet,
  audit: e => mockAuditService.logEvent(e),
  actor: () => ({ name: readSessionProfile()?.name ?? 'unknown' }),
  now: () => new Date().toISOString(),
  random: n => globalThis.crypto.getRandomValues(new Uint8Array(n)),
  hash: hashBiToken,
});

/** Settings need config:bi-feed:manage; tokens and the Simulated pull need config:bi-feed-tokens:manage; the approval needs config:bi-feed-identified:approve. */
export const mockBiFeedService: BiFeedService = guardConfigWrites(unchecked, [
  ['config:bi-feed:manage', ['saveSettings']],
  ['config:bi-feed-tokens:manage', ['createToken', 'rotateToken', 'revokeToken', 'pull']],
  ['config:bi-feed-identified:approve', ['approveIdentified', 'withdrawIdentified']],
]);
