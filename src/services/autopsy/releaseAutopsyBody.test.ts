import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({
  getCase: vi.fn(), updateCase: vi.fn(),
}));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
// Batch 383: releasing a body needs autopsy:body:release; the default is "allowed" here.
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { releaseAutopsyBody } from './releaseAutopsyBody';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';

const signedPad = {
  tier: 'PAD' as const,
  frozenPayload: {},
  signedBy: { name: 'Dr. E. Reed', isPathologist: true },
  signedAt: '2026-09-05T14:00:00Z',
};

function baseCase(overrides: Partial<Case>): Case {
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
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full',
      addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad,
    },
    ...overrides,
  } as Case;
}

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  logEvent.mockClear();
});

describe('releaseAutopsyBody', () => {
  it('a person without autopsy:body:release cannot release the body, and nothing is fetched or saved (Batch 383)', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
    expect(result).toMatchObject({ ok: false, notPermitted: true });
    expect(enforce).toHaveBeenCalledWith('autopsy:body:release', { caseId: 'case-1' });
    expect(getCase).not.toHaveBeenCalled();
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a real case that fails the real gate is never persisted \u2014 updateCase is never called', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: true } } as any }));
    const result = await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
    expect(result.ok).toBe(false);
    // Batch 495: reason codes, not English sentences.
    expect(result.blockedReasons).toEqual(['pad_not_signed', 'ancillary_hold_active']);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a real, allowed release appends the real event onto the real, target specimen\u2019s own locationHistory and persists via the real caseRouter', async () => {
    getCase.mockResolvedValue(baseCase({}));
    const result = await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis', releasedAt: '2026-09-10T09:00:00Z' });
    expect(result.ok).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
    const [caseId, updates] = updateCase.mock.calls[0];
    expect(caseId).toBe('case-1');
    expect(updates.specimens[0].locationHistory).toEqual([
      { location: 'Smith Funeral Home', action: 'Released', at: '2026-09-10T09:00:00Z', source: 'PathScribe', performedByName: 'Tech: M. Davis' },
    ]);
  });

  it('a real, prior locationHistory on the specimen is preserved, with the real release event appended, never replacing it', async () => {
    const priorEvent = { location: 'Cold Storage Unit 3', at: '2026-09-01T02:00:00Z', source: 'PathScribe' };
    getCase.mockResolvedValue(baseCase({ specimens: [{ id: 'sp-1', label: 'A', description: 'Body', locationHistory: [priorEvent] }] }));
    const result = await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis', releasedAt: '2026-09-10T09:00:00Z' });
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.specimens[0].locationHistory).toHaveLength(2);
    expect(updates.specimens[0].locationHistory[0]).toEqual(priorEvent);
  });

  it('a real, non-target specimen on the same case is left completely untouched', async () => {
    getCase.mockResolvedValue(baseCase({ specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }, { id: 'sp-2', label: 'B', description: 'Heart' }] }));
    await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis', releasedAt: '2026-09-10T09:00:00Z' });
    const updates = updateCase.mock.calls[0][1];
    expect(updates.specimens[1]).toEqual({ id: 'sp-2', label: 'B', description: 'Heart' });
  });

  it('a real, unknown caseId returns a real, honest error, never a silent no-op', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await releaseAutopsyBody('case-unknown', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.reasonCode).toBe('caseNotFound');
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a real, unknown specimenId on an otherwise real, valid case returns a real, honest error', async () => {
    getCase.mockResolvedValue(baseCase({}));
    const result = await releaseAutopsyBody('case-1', 'sp-unknown', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
    expect(result.ok).toBe(false);
    expect(result.reasonCode).toBe('specimenNotFound');
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a real release writes the audit log once (Batch 469 — releaseAutopsyBody was previously missing this)', async () => {
    getCase.mockResolvedValue(baseCase({}));
    await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_BODY_RELEASED', caseId: 'case-1', user: 'Tech: M. Davis' }));
  });

  it('Batch 469: a forensic case’s release also appends a final custodyLog entry, in the same write', async () => {
    getCase.mockResolvedValue(baseCase({}));
    const result = await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis', releasedAt: '2026-09-10T09:00:00Z', toCustodianType: 'funeral_home' });
    expect(result.ok).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.custodyLog).toEqual([
      expect.objectContaining({ itemDescription: 'Body', fromCustodianType: 'pathology_department', toCustodianType: 'funeral_home', toCustodianName: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis', occurredAt: '2026-09-10T09:00:00Z' }),
    ]);
  });

  it('Batch 469: a forensic case’s custody entry starts FROM wherever a prior custody transfer left it', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad,
      custodyLog: [{ id: 'c1', occurredAt: '2026-09-09T00:00:00Z', itemDescription: 'Blood', fromCustodianType: 'pathology_department', fromCustodianName: 'Pathology Department', toCustodianType: 'medical_examiner', toCustodianName: 'County ME Lab', releasedByName: 'Pete' }],
    } as any }));
    await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.custodyLog[1].fromCustodianType).toBe('medical_examiner');
    expect(updates.autopsy.custodyLog[1].fromCustodianName).toBe('County ME Lab');
  });

  it('Batch 469: a hospital-consented case’s release never touches custodyLog', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: {
      jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad,
    } as any }));
    await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy).toBeUndefined();
  });

  it('Batch 469: toCustodianType defaults to funeral_home when not given', async () => {
    getCase.mockResolvedValue(baseCase({}));
    await releaseAutopsyBody('case-1', 'sp-1', { releasedTo: 'Family (Jane Doe)', releasedByName: 'Tech: M. Davis' });
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.custodyLog[0].toCustodianType).toBe('funeral_home');
  });
});

describe('releaseAutopsyBody — PS-71 (Batch 458) versioned save', () => {
  const details = { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis', releasedAt: '2026-09-10T09:00:00Z' };

  it('on a conflict, the release is appended to the newer case so a specimen added meanwhile survives', async () => {
    const stale = baseCase({ version: 1 } as any);
    const newer = baseCase({ version: 2, specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }, { id: 'sp-2', label: 'B', description: 'Heart' }] } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2)).mockResolvedValue(undefined);
    expect((await releaseAutopsyBody('case-1', 'sp-1', details)).ok).toBe(true);
    expect(updateCase.mock.calls.map(c => c[2])).toEqual([1, 2]);
    const updates = updateCase.mock.calls[1][1];
    expect(updates.specimens.map((s: any) => s.id)).toEqual(['sp-1', 'sp-2']);
    expect(updates.specimens[0].locationHistory).toHaveLength(1);
  });

  it('a hold placed in between closes the gate: nothing is saved', async () => {
    const stale = baseCase({ version: 1 } as any);
    const held = baseCase({ version: 2, autopsy: { ...stale.autopsy!, ancillaryHold: { active: true } } } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(held);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 1, 2));
    const result = await releaseAutopsyBody('case-1', 'sp-1', details);
    expect(result.ok).toBe(false);
    expect(result.blockedReasons?.length).toBeGreaterThan(0);
    expect(updateCase).toHaveBeenCalledTimes(1);
  });
});
