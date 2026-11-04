import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordAutopsyOrganRetentionTier, organRetentionTierRefusal } from './recordAutopsyOrganRetentionTier';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';

const autopsy = (extra: Record<string, unknown> = {}) => ({
  jurisdiction: 'GB_EW', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, ...extra,
});

function baseCase(a: Record<string, unknown> = autopsy(), extra: Partial<Case> = {}): Case {
  return {
    id: 'case-1', accession: { accessionNumber: 'A-2026-1' }, originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
    patient: { id: 'pt-1', firstName: 'John', lastName: 'Doe' }, specimens: [], order: { priority: 'Routine' },
    status: 'draft', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    autopsy: a, ...extra,
  } as unknown as Case;
}

beforeEach(() => {
  getCase.mockReset(); updateCase.mockReset(); enforce.mockReset(); logEvent.mockClear();
  enforce.mockResolvedValue({ allowed: true });
});

describe('recordAutopsyOrganRetentionTier (Batch 499)', () => {
  it('without autopsy:retention-tier:record nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const r = await recordAutopsyOrganRetentionTier('case-1', 'tier_1_diagnostic_tissue_only', undefined, 'Dr. Reed');
    expect(r).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(enforce).toHaveBeenCalledWith('autopsy:retention-tier:record', { caseId: 'case-1' });
    expect(getCase).not.toHaveBeenCalled();
  });

  it('refuses outside an HTA jurisdiction', async () => {
    getCase.mockResolvedValue(baseCase(autopsy({ jurisdiction: 'US' })));
    const r = await recordAutopsyOrganRetentionTier('case-1', 'tier_1_diagnostic_tissue_only', undefined, 'Dr. Reed');
    expect(r.reasonCode).toBe('notApplicable');
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a hospital-consented case cannot retain beyond its consent', async () => {
    getCase.mockResolvedValue(baseCase(autopsy({ hospitalConsent: { status: 'active', retentionPermitted: false, excludedOrgans: [] } })));
    const r = await recordAutopsyOrganRetentionTier('case-1', 'tier_2_full_organ_retention', undefined, 'Dr. Reed');
    expect(r.reasonCode).toBe('retentionNotPermitted');
    getCase.mockResolvedValue(baseCase(autopsy({ hospitalConsent: { status: 'revoked', retentionPermitted: true, excludedOrgans: [] } })));
    const r2 = await recordAutopsyOrganRetentionTier('case-1', 'tier_1_diagnostic_tissue_only', undefined, 'Dr. Reed');
    expect(r2.reasonCode).toBe('consentRevoked');
    expect(updateCase).not.toHaveBeenCalled();
    // No retention is always allowed.
    expect(organRetentionTierRefusal(autopsy({ hospitalConsent: { status: 'revoked' } }) as never, 'tier_0_no_retention')).toBeNull();
  });

  it('saves the tier, keeps the reason on file unless one is given, and audits', async () => {
    getCase.mockResolvedValue(baseCase(autopsy({ organRetentionTierReason: 'Neuropath consult' })));
    const r = await recordAutopsyOrganRetentionTier('case-1', 'tier_1_diagnostic_tissue_only', undefined, 'Dr. Reed');
    expect(r.ok).toBe(true);
    expect(updateCase.mock.calls[0][1].autopsy).toMatchObject({ organRetentionTier: 'tier_1_diagnostic_tissue_only', organRetentionTierReason: 'Neuropath consult' });
    expect(r.autopsy?.organRetentionTier).toBe('tier_1_diagnostic_tissue_only');
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_ORGAN_RETENTION_TIER_RECORDED', caseId: 'case-1', user: 'Dr. Reed' }));

    updateCase.mockClear();
    await recordAutopsyOrganRetentionTier('case-1', 'tier_1_diagnostic_tissue_only', '', 'Dr. Reed');
    expect(updateCase.mock.calls[0][1].autopsy.organRetentionTierReason).toBeUndefined();
  });

  it('on a conflict it re-applies to the newer case', async () => {
    const stale = baseCase(autopsy(), { version: 1 } as never);
    const newer = baseCase(autopsy(), { version: 2 } as never);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const r = await recordAutopsyOrganRetentionTier('case-1', 'tier_1_diagnostic_tissue_only', 'x', 'Dr. Reed');
    expect(r.ok).toBe(true);
    expect(updateCase.mock.calls[1][1].autopsy.organRetentionTier).toBe('tier_1_diagnostic_tissue_only');
  });
});
