// src/services/requisitions/mockRequisitionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762: the demo's wiring of requisitionService.ts. The records (sources, links, the Unmatched queue, runs) are
// kept through mockStorage, which holds them in this browser in the demo and in memory with an API server (CLAUDE.md
// rule 4). No PDF is stored: a link points at the file where it lives (in the demo, public/demo-requisitions/).
// ─────────────────────────────────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import { attachmentStorageService } from '../caseAttachments/attachmentStorageServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import { caseRouter } from '../cases/CaseRouter';
import { specimenDeficiencyService } from '../deficiencies/specimenDeficiencyServiceInstance';
import { DEFAULT_SEPARATOR_BARCODE, requisitionOriginOf } from './requisitionRules';
import { createRequisitionService, type RequisitionStore } from './requisitionService';
import type { IngestionRun, MissingRequisition, RequisitionExpectation, RequisitionLink, RequisitionSource, UnmatchedRequisition } from './requisitionTypes';
import type { IRequisitionService } from './IRequisitionService';

/** The demo's source: the drop folder the in-browser engine reads (public/demo-requisitions/), the scanner of Desert
 *  Valley Medical Center's laboratory (the fictional hospital on the demo requisitions). */
export const DEMO_REQUISITION_SOURCE_ID = 'rqsrc-demo-drop';
const DEMO_FACILITY_ID = 'c-ent-dvmc';
const SEED_SOURCES: RequisitionSource[] = [{
  id: DEMO_REQUISITION_SOURCE_ID, name: 'Requisition scanner drop folder', facilityId: DEMO_FACILITY_ID, kind: 'fileShare', location: '\\\\lab-scan01\\requisitions\\inbox',
  scheduleMinutes: 15, separatorBarcode: DEFAULT_SEPARATOR_BARCODE, enabled: true, updatedAt: '2026-11-02T08:00:00.000Z', updatedBy: 'System',
}];

const KEYS = { sources: 'requisition_sources', links: 'requisition_links', unmatched: 'requisition_unmatched', runs: 'requisition_runs', expectations: 'requisition_expectations', missing: 'requisition_missing' };
const store: RequisitionStore = {
  sources: async () => storageGet<RequisitionSource[]>(KEYS.sources, SEED_SOURCES),
  saveSources: async s => storageSet(KEYS.sources, s),
  links: async () => storageGet<RequisitionLink[]>(KEYS.links, []),
  saveLinks: async l => storageSet(KEYS.links, l),
  unmatched: async () => storageGet<UnmatchedRequisition[]>(KEYS.unmatched, []),
  saveUnmatched: async u => storageSet(KEYS.unmatched, u),
  runs: async () => storageGet<IngestionRun[]>(KEYS.runs, []),
  saveRuns: async r => storageSet(KEYS.runs, r),
  expectations: async () => storageGet<RequisitionExpectation[]>(KEYS.expectations, []),
  saveExpectations: async e => storageSet(KEYS.expectations, e),
  missing: async () => storageGet<MissingRequisition[]>(KEYS.missing, []),
  saveMissing: async m => storageSet(KEYS.missing, m),
};

/** The Missing Requisition case deficiency type and the resolution recorded when the scan arrives or is waived. */
const MISSING_REQUISITION_DEFICIENCY = 'def-missing-requisition';
const REQUISITION_RECEIVED_RESOLUTION = 'res-requisition-received';

let seq = 0;
export const mockRequisitionService: IRequisitionService = createRequisitionService({
  authorization: authorizationService,
  store,
  findCase: async key => {
    const c = await caseRouter.getCase(key).catch(() => undefined);
    return c ? { caseId: c.id, accession: c.accession?.fullAccession ?? key } : null;
  },
  readLink: async pointer => {
    if (pointer.kind === 'url') return pointer.url;
    const r = await attachmentStorageService.getReadLink(pointer, 'view');
    return r.ok ? r.data.url : null;
  },
  now: () => new Date(),
  actor: () => { const p = readSessionProfile(); return { userId: p?.id ?? 'unknown', userName: p?.name ?? p?.id ?? 'unknown' }; },
  newId: prefix => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`,
  audit: e => auditService.logEvent({ type: e.type ?? 'user', event: e.event, detail: e.detail, user: e.user, caseId: e.caseId, confidence: null }),
  searchCases: async query => {
    const r = await caseRouter.getAll({ search: query }, { includeOrchestration: true });
    return (r.ok ? r.data : []).map(c => ({
      caseId: c.id, accession: c.accession?.fullAccession ?? c.id,
      patientName: [c.patient?.lastName, c.patient?.firstName].filter(Boolean).join(', '), accessionedAt: c.order?.receivedDate ?? null,
    }));
  },
  // Every case, including those made on Accession (Orchestration): the job decides, nothing is shown from this list.
  cases: async () => {
    const r = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true });
    return (r.ok ? r.data : []).map(c => ({
      caseId: c.id, accession: c.accession?.fullAccession ?? c.id,
      facilityId: c.order?.technicalComponentFacilityId ?? c.order?.facilityId ?? null,
      origin: requisitionOriginOf(c), accessionedAt: c.order?.receivedDate ?? null,
    }));
  },
  deficiencies: {
    raise: async ({ caseId, comment }) => {
      const r = await specimenDeficiencyService.raise({ caseId, deficiencyTypeId: MISSING_REQUISITION_DEFICIENCY, comment, raisedBy: 'System' });
      return r.ok ? r.data.id : null;
    },
    close: async (id, comment) => specimenDeficiencyService.containImmediately(id, { resolutionTypeId: REQUISITION_RECEIVED_RESOLUTION, resolutionComment: comment, resolvedBy: 'System' }),
  },
});
