import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { recordAutopsyConsentReinstatement } from './recordAutopsyConsentReinstatement';
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
        consentGivenAt: '2026-09-01T00:00:00Z', status: 'revoked', consentScope: ['Complete autopsy'],
        excludedOrgans: ['brain'], retentionPermitted: false, statusChangedAt: '2026-09-05T00:00:00Z',
      },
    },
    ...overrides,
  } as Case;
}

const input = { status: 'active' as const, excludedOrgans: [], retentionPermitted: true, reinstatementNote: 'Family confirmed consent restored in writing' };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('recordAutopsyConsentReinstatement', () => {
  it('a person without autopsy:consent:reinstate cannot reinstate it, and nothing is fetched or saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await recordAutopsyConsentReinstatement('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, notPermitted: true, reasonCode: 'notPermitted' });
    expect(enforce).toHaveBeenCalledWith('autopsy:consent:reinstate', { caseId: 'case-1' });
    expect(getCase).not.toHaveBeenCalled();
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('refuses a reinstatement with no note, before even fetching the case', async () => {
    const result = await recordAutopsyConsentReinstatement('case-1', { ...input, reinstatementNote: '  ' }, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'noteRequired' });
    expect(getCase).not.toHaveBeenCalled();
  });

  it('refuses a forensic case', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false } } as any }));
    const result = await recordAutopsyConsentReinstatement('case-1', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'notHospitalConsented' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('an unknown caseId returns an honest error', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await recordAutopsyConsentReinstatement('case-unknown', input, 'Dr. Reed');
    expect(result).toMatchObject({ ok: false, reasonCode: 'caseNotFound' });
  });

  it('a real reinstatement persists the restored status and audits it', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await recordAutopsyConsentReinstatement('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.hospitalConsent).toEqual(expect.objectContaining({ status: 'active', excludedOrgans: [], retentionPermitted: true, revocationNote: input.reinstatementNote }));
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_CONSENT_REINSTATED', caseId: 'case-1', user: 'Dr. Reed' }));
  });

  it('on a conflict, the reinstatement is re-applied to the newer case', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2, specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }, { id: 'sp-2', label: 'B', description: 'Heart' }] } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    const result = await recordAutopsyConsentReinstatement('case-1', input, 'Dr. Reed');
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[1][1];
    expect(updates.autopsy.hospitalConsent.status).toBe('active');
  });
});
