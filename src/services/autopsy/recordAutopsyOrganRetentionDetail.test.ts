import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordAutopsyOrganRetentionDetail } from './recordAutopsyOrganRetentionDetail';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';

function baseCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'case-1',
    accession: { accessionNumber: 'A-2026-1' },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-DEFAULT',
    patient: { id: 'pt-1', firstName: 'John', lastName: 'Doe' },
    specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }],
    order: { priority: 'Routine' },
    status: 'draft',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    autopsy: {
      jurisdiction: 'GB_EW', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
      organRetentionTier: 'tier_2_full_organ_retention',
    },
    ...overrides,
  } as Case;
}

const input = { recipientName: 'Metro General Pathology Archive', location: 'Building B, Specimen Storage Room 2', reason: 'Pending neuropathology consult' };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('recordAutopsyOrganRetentionDetail', () => {
  it('a person without autopsy:retention-detail:record cannot record it, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await recordAutopsyOrganRetentionDetail('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(getCase).not.toHaveBeenCalled();
  });

  it('refuses a non-HTA jurisdiction', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, organRetentionTier: 'tier_2_full_organ_retention' } as any }));
    const result = await recordAutopsyOrganRetentionDetail('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'notApplicable' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('refuses when no retention tier (or tier_0) is on record', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'GB_EW', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false } } as any }));
    const result = await recordAutopsyOrganRetentionDetail('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'noRetention' });
    expect(updateCase).not.toHaveBeenCalled();

    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'GB_EW', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, organRetentionTier: 'tier_0_no_retention' } as any }));
    const result2 = await recordAutopsyOrganRetentionDetail('case-1', input, 'Dr. Reed');
    expect(result2).toMatchObject({ ok: false, reasonCode: 'noRetention' });
  });

  it('a real retention detail persists the record (with who recorded it) and audits it', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordAutopsyOrganRetentionDetail('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.organRetentionDetail).toEqual(expect.objectContaining({
      recipientName: input.recipientName, location: input.location, reason: input.reason, recordedByName: 'Dr. Reed',
    }));
    expect(updates.autopsy.organRetentionDetail.recordedAt).toBeDefined();
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_ORGAN_RETENTION_DETAIL_RECORDED', caseId: 'case-1' }));
  });

  it('a second call overwrites the previous record (a single current record, not a log)', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: {
      jurisdiction: 'GB_EW', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
      organRetentionTier: 'tier_2_full_organ_retention',
      organRetentionDetail: { recipientName: 'Old Recipient', location: 'Old Location', recordedAt: '2026-09-01T00:00:00Z', recordedByName: 'Dr. Prior' },
    } as any }));
    await recordAutopsyOrganRetentionDetail('case-1', input, 'Dr. Reed');
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.organRetentionDetail.recipientName).toBe(input.recipientName);
  });

  it('on a conflict, the retention detail is re-applied to the newer case', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2 } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await recordAutopsyOrganRetentionDetail('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase.mock.calls[1][1].autopsy.organRetentionDetail.recipientName).toBe(input.recipientName);
  });
});
