// src/services/stainQc/mockStainQcService.ts
// Batch 763: the demo's wiring of stainQcService.ts. Records are kept through mockStorage (this browser in the demo,
// memory with an API server; CLAUDE.md rule 4); results are written onto the cases.
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import { equipmentService } from '../equipment/equipmentServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import { caseRouter } from '../cases/CaseRouter';
import { createStainQcService, type StainQcStore } from './stainQcService';
import { writeImageOutcome, writeSlideStatuses } from './stainQcCaseWrites';
import type { ImageQcItem, StainQcSettings, StainRunQc } from './stainQcTypes';

const KEYS = { settings: 'stain_qc_settings', runs: 'stain_qc_runs', images: 'stain_qc_images' };
const store: StainQcStore = {
  settings: async () => storageGet<StainQcSettings | null>(KEYS.settings, null),
  saveSettings: async s => storageSet(KEYS.settings, s),
  runs: async () => storageGet<StainRunQc[]>(KEYS.runs, []),
  saveRuns: async r => storageSet(KEYS.runs, r),
  images: async () => storageGet<ImageQcItem[]>(KEYS.images, []),
  saveImages: async i => storageSet(KEYS.images, i),
};
const caseWrites = {
  getCase: (id: string) => caseRouter.getCase(id).catch(() => undefined),
  updateCase: (id: string, u: Parameters<typeof caseRouter.updateCase>[1], v: number) => caseRouter.updateCase(id, u, v),
  caseIdFor: async (accession: string) => (await caseRouter.getCase(accession).catch(() => undefined))?.id ?? null,
};

export const mockStainQcService = createStainQcService({
  authorization: authorizationService,
  store,
  equipment: async idOrCode => {
    const r = await equipmentService.getAll();
    const key = idOrCode.trim().toUpperCase();
    const e = r.ok ? r.data.find(x => x.id.toUpperCase() === key || x.code.toUpperCase() === key) : undefined;
    return e ? { id: e.id, code: e.code, kind: e.kind, qcMode: e.qcMode } : null;
  },
  setSlideStatuses: updates => writeSlideStatuses(updates, caseWrites),
  setImageOutcome: u => writeImageOutcome(u, caseWrites),
  // Loaded when used: the batch service opens runs here, so a static import would go round in a circle.
  recordVisualRead: async (batchId, a) => (await import('../batches/batchServiceInstance')).batchService.confirmQcVisualRead(batchId, a.userId, a.userName),
  now: () => new Date(),
  actor: () => { const p = readSessionProfile(); return { userId: p?.id ?? 'unknown', userName: p?.name ?? p?.id ?? 'unknown' }; },
  audit: e => auditService.logEvent({ type: e.type ?? 'user', event: e.event, detail: e.detail, user: e.user, caseId: e.caseId, confidence: null }),
});
