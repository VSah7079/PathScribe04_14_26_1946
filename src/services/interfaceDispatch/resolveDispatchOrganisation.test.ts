// Batch 633/634: a result that cannot be queued leaves an audit entry; the lookup uses the live patient index.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../patients/patientServicesInstance', () => ({ patientIndexService: { getById: vi.fn() } }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn().mockResolvedValue({ ok: true }) } }));

import { patientIndexService } from '../patients/patientServicesInstance';
import { mockAuditService } from '../auditlog/mockAuditService';
import { dispatchSkipAuditDetail, dispatchSkipEventName, dispatchSkipReason, resolveDispatchOrganisation } from './resolveDispatchOrganisation';

beforeEach(() => { vi.mocked(patientIndexService.getById).mockReset(); vi.mocked(mockAuditService.logEvent).mockClear(); });

describe('resolveDispatchOrganisation', () => {
  it('returns the organisation of an indexed patient and records nothing', async () => {
    vi.mocked(patientIndexService.getById).mockResolvedValue({ organisationId: 'ORG-1' } as never);
    expect(await resolveDispatchOrganisation({ id: 'C1', patient: { id: 'P1' } }, 'Cytology', 'final')).toBe('ORG-1');
    expect(mockAuditService.logEvent).not.toHaveBeenCalled();
  });
  it('a patient not in the index: no organisation, and an audit entry naming the case and the reason', async () => {
    vi.mocked(patientIndexService.getById).mockResolvedValue(null);
    expect(await resolveDispatchOrganisation({ id: 'C1', patient: { id: 'P1' } }, 'Cytology', 'amended')).toBeNull();
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'CYTOLOGY_DISPATCH_SKIPPED', caseId: 'C1', type: 'system' }));
    expect(vi.mocked(mockAuditService.logEvent).mock.calls[0][0].detail).toContain('not in the patient index');
  });
  it('a failing lookup is treated as not found (and recorded), never thrown into sign-out', async () => {
    vi.mocked(patientIndexService.getById).mockRejectedValue(new Error('down'));
    expect(await resolveDispatchOrganisation({ id: 'C2', patient: { id: 'P2' } }, 'Cytology', 'preliminary')).toBeNull();
    expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
  });
  it('the surgical pathway has its own event name and wording', async () => {
    vi.mocked(patientIndexService.getById).mockResolvedValue(null);
    expect(await resolveDispatchOrganisation({ id: 'C4', patient: { id: 'P4' } }, 'Surgical', 'final')).toBeNull();
    expect(vi.mocked(mockAuditService.logEvent).mock.calls[0][0]).toMatchObject({ event: 'SURGICAL_DISPATCH_SKIPPED', caseId: 'C4' });
    expect(dispatchSkipEventName('Surgical')).toBe('SURGICAL_DISPATCH_SKIPPED');
    expect(vi.mocked(mockAuditService.logEvent).mock.calls[0][0].detail).toMatch(/^Surgical final/);
  });
  it('a case with no patient id says so', async () => {
    expect(await resolveDispatchOrganisation({ id: 'C3' }, 'Cytology', 'final')).toBeNull();
    expect(dispatchSkipReason(undefined)).toBe('no-patient-id');
    expect(dispatchSkipAuditDetail('Cytology', 'final', 'no-patient-id')).toContain('no patient id');
    expect(patientIndexService.getById).not.toHaveBeenCalled();
  });
});
