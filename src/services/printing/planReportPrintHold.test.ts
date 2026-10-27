// Batch 654: planReportPrint applies the Release Hold Print Policy and checks the override capability.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const enforce = vi.fn();
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (...a: unknown[]) => enforce(...a) } }));

const caseRecord = { originHospitalId: null, order: { facilityId: 'F1' } };

describe('planReportPrint under the Release Hold Print Policy', () => {
  beforeEach(() => enforce.mockReset());

  it('supervisor policy: a person with the override is asked for a reason; the capability is checked for the case and facility', async () => {
    enforce.mockResolvedValue({ allowed: true });
    const { planReportPrint } = await import('./recordDocumentOutput');
    const plan = await planReportPrint({ document: 'report', caseId: 'C1', caseRecord, releaseHoldPolicy: 'supervisor' });
    expect(enforce).toHaveBeenCalledWith('print:release-hold:override', { caseId: 'C1', facilityId: 'F1' });
    expect(plan).toMatchObject({ blocked: false, askOverrideReason: true, warnPendingRelease: true });
  });
  it('supervisor policy: refused without the override', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const { planReportPrint } = await import('./recordDocumentOutput');
    expect(await planReportPrint({ document: 'report', caseId: 'C1', caseRecord, releaseHoldPolicy: 'supervisor' })).toMatchObject({ blocked: true, askOverrideReason: false });
  });
  it('supervisor policy: a failed capability check refuses', async () => {
    const { planReportPrint } = await import('./recordDocumentOutput');   // loaded first: other modules may call the mock while loading
    enforce.mockImplementation((key: string) => { if (key === 'print:release-hold:override') throw new Error('down'); return Promise.resolve({ allowed: true }); });   // other services' own checks still pass
    expect((await planReportPrint({ document: 'report', caseId: 'C1', caseRecord, releaseHoldPolicy: 'supervisor' })).blocked).toBe(true);
  });
  it('other policies never ask the capability; block refuses; warn warns; no hold prints', async () => {
    const { planReportPrint } = await import('./recordDocumentOutput');
    expect((await planReportPrint({ document: 'report', caseId: 'C2', caseRecord, releaseHoldPolicy: 'block' })).blocked).toBe(true);
    expect((await planReportPrint({ document: 'report', caseId: 'C3', caseRecord, releaseHoldPolicy: 'warn' })).warnPendingRelease).toBe(true);
    expect(await planReportPrint({ document: 'report', caseId: 'C4', caseRecord, releaseHoldPolicy: null })).toMatchObject({ blocked: false, warnPendingRelease: false, askOverrideReason: false });
    expect(enforce).not.toHaveBeenCalled();
  });
});
