// src/services/workstationRegistry/workstationRegistryServices.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: the workstation registry wired to the browser demo's pieces:
// browser-held storage, the audit log, the signed-in person and the Web Crypto
// random source and SHA-256. With the API server this file is replaced by HTTP
// calls; the screens and the rules do not change.
// ─────────────────────────────────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { readSessionProfile } from '../auth/sessionProfile';
import { createWorkstationRegistryService, type WorkstationRegistryService } from './workstationRegistryService';
import { hashWorkstationToken } from './workstationRegistryRules';

const unchecked = createWorkstationRegistryService({
  load: storageGet,
  save: storageSet,
  audit: e => mockAuditService.logEvent(e),
  actor: () => ({ name: readSessionProfile()?.name ?? 'unknown' }),
  now: () => new Date().toISOString(),
  random: n => globalThis.crypto.getRandomValues(new Uint8Array(n)),
  hash: hashWorkstationToken,
});

/** Registering and changing need config:workstations:manage; tokens, revoking and the check-in need config:workstation-tokens:manage. */
export const mockWorkstationRegistryService: WorkstationRegistryService = guardConfigWrites(unchecked, [
  ['config:workstations:manage', ['register', 'update']],
  ['config:workstation-tokens:manage', ['rotateToken', 'revoke', 'checkIn']],
]);
