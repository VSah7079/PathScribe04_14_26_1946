// Batch 728 (Lab Workflow & Batch spec, Decision 4): nothing about a research case leaves PathScribe as a clinical
// result, a delivered report or a charge, and its charges are never queued.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const researchCase = { id: 'c-res', accession: { accessionNumber: 'RES26-0001', fullAccession: 'RES26-0001' }, patient: { id: 'p-res', mrn: 'MRN-1' } };
const clinicalCase = { id: 'c-clin', accession: { accessionNumber: 'S26-0001', fullAccession: 'S26-0001' }, patient: { id: 'p-clin', mrn: 'MRN-2' } };

vi.mock('../cases/CaseRouter', () => ({
  caseRouter: { getCase: vi.fn(async (id: string) => (id === 'c-res' ? researchCase : id === 'c-clin' ? clinicalCase : null)) },
}));

import { resolveDispatchOrganisation, dispatchSkipAuditDetail } from '../interfaceDispatch/resolveDispatchOrganisation';
import { auditService } from '../auditlog/auditServiceInstance';
import { deliverReport, type ReportDeliveryDeps } from '../delivery/deliverReport';
import { mockOutboundChargeQueueService, RESEARCH_NO_CHARGE } from '../billing/mockOutboundChargeQueueService';
import { saveLabSetting } from '../labSettings/labSettingsStore';
import { RESEARCH_CASE_SETTINGS_KEY } from './researchCaseSettings';
import { DEFAULT_RESEARCH_CASE_SETTINGS } from './researchCaseRules';

describe('research cases leave nothing clinical behind (Decision 4)', () => {
  beforeEach(() => saveLabSetting(RESEARCH_CASE_SETTINGS_KEY, DEFAULT_RESEARCH_CASE_SETTINGS));

  it('no result message: nothing to queue against, and the audit log says why', async () => {
    const spy = vi.spyOn(auditService, 'logEvent');
    expect(await resolveDispatchOrganisation(researchCase, 'Surgical', 'final')).toBeNull();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ event: 'SURGICAL_DISPATCH_SKIPPED', caseId: 'c-res', detail: dispatchSkipAuditDetail('Surgical', 'final', 'research-case') }));
    expect(dispatchSkipAuditDetail('Cytology', 'amended', 'research-case')).toContain('research case');
    spy.mockRestore();
  });

  it('no report by fax or file drop', async () => {
    const enqueue = vi.fn();
    const deps = { getCase: async () => researchCase, queue: { enqueue } } as unknown as ReportDeliveryDeps;
    expect(await deliverReport({ caseId: 'c-res', reportType: 'FINAL', source: 'SURGPATH', releasedAt: '2026-10-29T00:00:00Z', channel: 'FAX', role: 'primary' } as never, deps)).toBe('not_configured');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('no charge is queued for billing; a clinical case\'s still is', async () => {
    const entry = { serviceChargeRecordId: 'sc-1', specimenId: 'sp', billingType: 'Global' as const, triggerEvent: 'CASE_SIGNED_OUT' as const };
    const refused = await mockOutboundChargeQueueService.enqueue({ ...entry, caseId: 'c-res' });
    expect(refused).toEqual({ ok: false, error: RESEARCH_NO_CHARGE });
    const queued = await mockOutboundChargeQueueService.enqueue({ ...entry, caseId: 'c-clin' });
    expect(queued.ok).toBe(true);
  });

  it('switched off, the same case is treated as clinical', async () => {
    saveLabSetting(RESEARCH_CASE_SETTINGS_KEY, { ...DEFAULT_RESEARCH_CASE_SETTINGS, enabled: false });
    const queued = await mockOutboundChargeQueueService.enqueue({ serviceChargeRecordId: 'sc-2', caseId: 'c-res', billingType: 'Global', triggerEvent: 'CASE_SIGNED_OUT' } as never);
    expect(queued.ok).toBe(true);
  });
});
