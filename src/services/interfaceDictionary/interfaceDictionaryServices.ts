// src/services/interfaceDictionary/interfaceDictionaryServices.ts
// ─────────────────────────────────────────────────
// Batch 612: the Interface Dictionary service wired to the browser demo's pieces:
// browser-held storage, the audit log and the case router. Every change is checked
// against a platform-only capability, so only ForMedrixAI staff (Superadmin) can
// change a vendor profile; hospital roles cannot hold these capabilities at all.
// With the API server, this file is replaced by HTTP calls; the rules and screens
// do not change.
// ─────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { auditService } from '../auditlog/auditServiceInstance';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { readSessionProfile } from '../auth/sessionProfile';
import { caseRouter } from '../cases/CaseRouter';
import { createInterfaceDictionaryService, type InterfaceDictionaryDeps } from './interfaceDictionaryService';

const newId = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `vp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const deps: InterfaceDictionaryDeps = {
  load: storageGet,
  save: storageSet,
  audit: e => auditService.logEvent(e),
  actor: () => ({ name: readSessionProfile()?.name ?? 'unknown' }),
  now: () => new Date().toISOString(),
  newId,
  async caseExists(caseId) {
    const c = await caseRouter.getCase(caseId).catch(() => undefined);
    return !!c;
  },
};

const unchecked = createInterfaceDictionaryService(deps);

/** Reads are open (the Vendor fields panel shows with the case); every change needs its platform capability. */
export const mockInterfaceDictionaryService = guardConfigWrites(unchecked, [
  ['platform:interface-dictionary:manage', ['createProfile', 'startDraft', 'saveMappings', 'testProfile']],
  ['platform:interface-dictionary:publish', ['publish', 'rollback', 'retire']],
  ['platform:interface-dictionary:simulate', ['simulateReceive']],
]);
