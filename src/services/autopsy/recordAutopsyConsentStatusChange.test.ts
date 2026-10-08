import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordAutopsyConsentStatusChange } from './recordAutopsyConsentStatusChange';
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
      jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
      hospitalConsent: {
        consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse',
        consentGivenAt: '2026-09-01T00:00:00Z', status: 'active', consentScope: ['Complete autopsy'],
        excludedOrgans: [], retentionPermitted: true,
      },
    },
    ...overrides,
  } as Case;
}

const input = { status: 'revoked' as const, excludedOrgans: [], retentionPermitted: false, revocationNote: 'Withdrew by phone' };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('recordAutopsyConsentStatusChange', () => {
  it('a person without autopsy:consent:manage cannot change it, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await recordAutopsyConsentStatusChange('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(enforce).toHaveBeenCalledWith('autopsy:consent:manage', { caseId: 'case-1' });
    expect(getCase).not.toHaveBeenCalled();
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('refuses a forensic case', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false } } as any }));
    const result = await recordAutopsyConsentStatusChange('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'notHospitalConsented' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('an unknown caseId returns an honest error', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await recordAutopsyConsentStatusChange('case-unknown', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'caseNotFound' });
  });

  it('a real change persists the new status and audits it', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordAutopsyConsentStatusChange('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.hospitalConsent).toEqual(expect.objectContaining({ status: 'revoked', retentionPermitted: false, revocationNote: 'Withdrew by phone' }));
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_CONSENT_STATUS_CHANGED', caseId: 'case-1', user: 'Dr. Reed' }));
  });

  it('on a conflict, the change is re-applied to the newer case', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2, specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }, { id: 'sp-2', label: 'B', description: 'Heart' }] } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await recordAutopsyConsentStatusChange('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[1][1];
    expect(updates.autopsy.hospitalConsent.status).toBe('revoked');
  });
});
