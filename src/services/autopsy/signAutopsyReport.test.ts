import { describe, it, expect, vi, beforeEach } from 'vitest';

// Batch 534: no release delay in this test (releaseReport is tested on its own).
vi.mock('@/services/reportRelease/releaseThroughDelay', () => ({
  releaseThroughDelay: vi.fn(async (event: any) => {
    const m = await import('@/services/reports/publishReportReleasedEvent');
    return { published: await m.publishReportReleasedEvent(event) };
  }),
}));

const { getCase, updateCase } = vi.hoisted(() => ({
  getCase: vi.fn(), updateCase: vi.fn(),
}));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));

// Batch 478: resolveAutopsyGrossExaminationGate.ts's override
// (autopsy:gross-exam-gate:override) and the audit entry it writes.
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn().mockResolvedValue({ allowed: false }) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

const { releaseMock, countersignMock, getForCaseMock, getActiveAssignmentForUser } = vi.hoisted(() => ({
  releaseMock: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  countersignMock: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  getForCaseMock: vi.fn().mockResolvedValue({ ok: true, data: null }),
  getActiveAssignmentForUser: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));
// Batch 331 (PS-327): signing authority. The signer's staff record (for a
// forensic appointment) and the session are controlled per test.
const { getStaffById, session } = vi.hoisted(() => ({
  getStaffById: vi.fn(),
  session: { current: { id: 'user-attending', role: 'superadmin' } as { id: string; role?: string } | null },
}));
vi.mock('@/services', () => ({
  countersignService: { release: releaseMock, countersign: countersignMock, getForCase: getForCaseMock },
  qaSupervisionAssignmentService: { getActiveAssignmentForUser },
  userService: { getById: getStaffById },
  facilityService: { getById: vi.fn().mockResolvedValue({ ok: false, error: 'not found' }) },
}));
vi.mock('@/services/auth/caseAccessControl', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/auth/caseAccessControl')>()),
  getSessionUser: () => session.current,
}));
const US_APPOINTMENT = { type: 'MEDICOLEGAL_APPOINTMENT', issuingBody: 'OCME', jurisdiction: 'US', effectiveDate: '2020-01-01' };
vi.mock('@/services/quality/mockQaSupervisionAssignmentService', () => ({ FPPE_ACTIVITY_TYPE_ID: 'fppe-activity' }));

const { publishReportReleasedEventMock } = vi.hoisted(() => ({
  publishReportReleasedEventMock: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/services/reports/publishReportReleasedEvent', () => ({
  publishReportReleasedEvent: publishReportReleasedEventMock,
}));

import { signAutopsyReport } from './signAutopsyReport';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';

const signedPad = {
  tier: 'PAD' as const,
  frozenPayload: {},
  signedBy: { name: 'Dr. E. Reed', isPathologist: true },
  signedAt: '2026-09-05T14:00:00Z',
};

// Batch 649: no role bypass; by default the signing user (user-attending) is an active attending participant.
const ATTENDING_PARTICIPANT = { staffId: 'user-attending', status: 'active', participationTypeIds: ['attending'] };
function baseCase(overrides: Partial<Case> = {}, participants: any[] = [ATTENDING_PARTICIPANT]): Case {
  return {
    id: 'case-1',
    accession: { accessionNumber: 'A-2026-1' },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-DEFAULT',
    patient: { id: 'pt-1', firstName: 'John', lastName: 'Doe' },
    specimens: [{ id: 'sp-1', label: 'A', description: 'Body' }],
    order: { priority: 'Routine' },
    status: 'in-progress',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    participants,
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full',
      addenda: [], ancillaryHold: { active: false },
      // Batch 478: resolveAutopsyGrossExaminationGate.ts is now a real
      // hard stop in signAutopsyReport.ts itself, so every test case
      // that expects a sign to succeed needs a real, gate-passing
      // forensicAuthorization by default; tests of the gate/override
      // behavior itself override this back out.
      forensicAuthorization: { authorityType: 'MEDICAL_EXAMINER', orderReference: 'ME-2026-0042', orderDate: '2026-09-01' },
    },
    ...overrides,
  } as Case;
}

const attendingUser = { id: 'user-attending', name: 'Dr. E. Reed', isPathologist: true };
const residentUser = { id: 'user-resident', name: 'Dr. J. Park', isPathologist: true };

beforeEach(() => {
  getCase.mockReset();
  updateCase.mockReset();
  releaseMock.mockClear();
  countersignMock.mockClear();
  getForCaseMock.mockReset();
  getForCaseMock.mockResolvedValue({ ok: true, data: null });
  getActiveAssignmentForUser.mockReset();
  getActiveAssignmentForUser.mockResolvedValue({ ok: true, data: null });
  publishReportReleasedEventMock.mockClear();
  session.current = { id: 'user-attending', role: 'superadmin' };
  getStaffById.mockReset();
  getStaffById.mockResolvedValue({ ok: true, data: { providerCredentials: [US_APPOINTMENT] } });
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: false });
  logEvent.mockClear();
});

describe('signAutopsyReport', () => {
  it('a real, unknown caseId returns a real, honest error, never a silent no-op', async () => {
    getCase.mockResolvedValue(undefined);
    const result = await signAutopsyReport('case-unknown', 'PAD', attendingUser);
    expect(result.ok).toBe(false);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a real case with no autopsy record returns a real, honest error', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: undefined } as any));
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result.ok).toBe(false);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('signing the FAD before a real, signed PAD exists is blocked, never persisted', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await signAutopsyReport('case-1', 'FAD', attendingUser);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PAD must be signed/i);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('an attending (no resident participant) signing the PAD writes a real padSnapshot and does not change CaseStatus', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe('signed');
    expect(updateCase).toHaveBeenCalledTimes(1);
    const [caseId, updates] = updateCase.mock.calls[0];
    expect(caseId).toBe('case-1');
    expect(updates.autopsy.padSnapshot.tier).toBe('PAD');
    expect(updates.autopsy.padSnapshot.signedBy).toEqual({ name: 'Dr. E. Reed', isPathologist: true });
    expect(updates.status).toBeUndefined();
    expect(releaseMock).not.toHaveBeenCalled();
  });

  it('an attending signing the FAD (with a real, prior signed PAD) writes a real fadSnapshot and transitions CaseStatus to finalized', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad, forensicAuthorization: { authorityType: 'MEDICAL_EXAMINER', orderReference: 'ME-2026-0042', orderDate: '2026-09-01' } } as any }));
    const result = await signAutopsyReport('case-1', 'FAD', attendingUser);
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.fadSnapshot.tier).toBe('FAD');
    expect(updates.status).toBe('finalized');
  });

  it('signing the FAD never touches an already-real, existing padSnapshot', async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad, forensicAuthorization: { authorityType: 'MEDICAL_EXAMINER', orderReference: 'ME-2026-0042', orderDate: '2026-09-01' } } as any }));
    await signAutopsyReport('case-1', 'FAD', attendingUser);
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.padSnapshot).toEqual(signedPad);
  });

  it('a real, active resident participant (no attending role) signing the PAD is intercepted \u2014 released for countersign, no padSnapshot written', async () => {
    getCase.mockResolvedValue(baseCase({}, [
      { status: 'active', staffId: 'user-resident', participationTypeIds: ['resident'] },
    ]));
    const result = await signAutopsyReport('case-1', 'PAD', residentUser);
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe('released_for_countersign');
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(releaseMock.mock.calls[0][0]).toMatchObject({ caseId: 'case-1', residentId: 'user-resident', autopsyReportTier: 'PAD' });
    const updates = updateCase.mock.calls[0][1];
    expect(updates.status).toBe('pending-countersign');
    expect(updates.autopsy).toBeUndefined();
  });

  it('a real, active FPPE provisional hire with an active assignment signing the FAD is intercepted with the correct tier', async () => {
    getActiveAssignmentForUser.mockResolvedValue({ ok: true, data: { supervisorUserId: 'user-attending' } });
    getCase.mockResolvedValue(baseCase(
      { autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad, forensicAuthorization: { authorityType: 'MEDICAL_EXAMINER', orderReference: 'ME-2026-0042', orderDate: '2026-09-01' } } as any },
      [{ status: 'active', staffId: 'user-resident', participationTypeIds: ['provisional_hire'] }],
    ));
    const result = await signAutopsyReport('case-1', 'FAD', residentUser);
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe('released_for_countersign');
    expect(releaseMock.mock.calls[0][0]).toMatchObject({ autopsyReportTier: 'FAD' });
  });

  it('a dual-role signer (resident participant AND active attending participant on the same case) is never intercepted', async () => {
    getCase.mockResolvedValue(baseCase({}, [
      { status: 'active', staffId: 'user-resident', participationTypeIds: ['resident', 'attending'] },
    ]));
    session.current = { id: 'user-resident', role: 'pathologist' }; // Batch 649: the signer is the session user, and must be the eligible participant
    const result = await signAutopsyReport('case-1', 'PAD', residentUser);
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe('signed');
    expect(releaseMock).not.toHaveBeenCalled();
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.padSnapshot).toBeDefined();
  });

  it('an attending signing a tier with a real, pending CountersignRecord for that same tier completes it alongside writing the real snapshot', async () => {
    getForCaseMock.mockResolvedValue({ ok: true, data: { status: 'pending', autopsyReportTier: 'PAD', caseId: 'case-1' } });
    getCase.mockResolvedValue(baseCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result.ok).toBe(true);
    expect(countersignMock).toHaveBeenCalledTimes(1);
    expect(countersignMock.mock.calls[0][0]).toMatchObject({ caseId: 'case-1', attendingId: 'user-attending' });
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.padSnapshot).toBeDefined();
  });

  it('an attending signing with no real, pending CountersignRecord at all never calls countersign(), but still writes the real snapshot', async () => {
    getForCaseMock.mockResolvedValue({ ok: true, data: null });
    getCase.mockResolvedValue(baseCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result.ok).toBe(true);
    expect(countersignMock).not.toHaveBeenCalled();
    expect(updateCase.mock.calls[0][1].autopsy.padSnapshot).toBeDefined();
  });

  it('an attending signing the PAD captures the real, existing report text (orchSections) in the snapshot \u2014 the same generic diagnosis data every specialty already writes, not an invented field', async () => {
    getCase.mockResolvedValue(baseCase({
      orchSections: [
        { id: 'gross', label: 'Gross Description', text: 'Heart weighs 420g...', aiGenerated: '', userEdited: true, isStreaming: false },
        { id: 'diagnosis', label: 'Diagnosis', text: 'Acute myocardial infarction, anterior wall.', aiGenerated: '', userEdited: true, isStreaming: false },
      ],
    } as any));
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result.ok).toBe(true);
    const updates = updateCase.mock.calls[0][1];
    const capturedSections = updates.autopsy.padSnapshot.frozenPayload.sections;
    expect(capturedSections).toEqual([
      { id: 'gross', label: 'Gross Description', text: 'Heart weighs 420g...' },
      { id: 'diagnosis', label: 'Diagnosis', text: 'Acute myocardial infarction, anterior wall.' },
    ]);
  });

  it('a resident releasing the PAD for countersign captures the real report text in the comparison snapshot the attending\u2019s eventual delta is computed against', async () => {
    getCase.mockResolvedValue(baseCase({
      orchSections: [{ id: 'diagnosis', label: 'Diagnosis', text: 'Preliminary: cardiac tamponade.', aiGenerated: '', userEdited: true, isStreaming: false }],
    } as any, [{ status: 'active', staffId: 'user-resident', participationTypeIds: ['resident'] }]));
    await signAutopsyReport('case-1', 'PAD', residentUser);
    const snapshot = releaseMock.mock.calls[0][0].releasedAnswersSnapshot['case-1'];
    expect(snapshot['section_diagnosis']).toBe('Preliminary: cardiac tamponade.');
  });

  it('an attending signing the FAD never completes a real, pending PAD-tier CountersignRecord \u2014 tiers must match exactly', async () => {
    getForCaseMock.mockResolvedValue({ ok: true, data: { status: 'pending', autopsyReportTier: 'PAD', caseId: 'case-1' } });
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad, forensicAuthorization: { authorityType: 'MEDICAL_EXAMINER', orderReference: 'ME-2026-0042', orderDate: '2026-09-01' } } as any }));
    const result = await signAutopsyReport('case-1', 'FAD', attendingUser);
    expect(result.ok).toBe(true);
    expect(countersignMock).not.toHaveBeenCalled();
    expect(updateCase.mock.calls[0][1].autopsy.fadSnapshot).toBeDefined();
  });
});

describe('signAutopsyReport — Report_Released_Event wiring, per direct follow-up ("wire in Autopsy")', () => {
  it("a real, direct PAD sign publishes a real PRELIMINARY event — an interim milestone, matching its own real, established CaseStatus-unchanged posture", async () => {
    getCase.mockResolvedValue(baseCase());
    await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(publishReportReleasedEventMock).toHaveBeenCalledWith(expect.objectContaining({
      caseId: 'case-1', reportType: 'PRELIMINARY', releasedBy: { id: 'user-attending', name: 'Dr. E. Reed' },
    }));
  });

  it("a real, direct FAD sign publishes a real FINAL event — the case's own real terminal event", async () => {
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad, forensicAuthorization: { authorityType: 'MEDICAL_EXAMINER', orderReference: 'ME-2026-0042', orderDate: '2026-09-01' } } as any }));
    await signAutopsyReport('case-1', 'FAD', attendingUser);
    expect(publishReportReleasedEventMock).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', reportType: 'FINAL' }));
  });

  it('a real, thin generatePdf callback is forwarded through to the published event untouched', async () => {
    getCase.mockResolvedValue(baseCase());
    const generatePdf = vi.fn();
    await signAutopsyReport('case-1', 'PAD', attendingUser, generatePdf);
    expect(publishReportReleasedEventMock).toHaveBeenCalledWith(expect.objectContaining({ generatePdf }));
  });

  it('a real, provisional-hire sign genuinely intercepted for countersign never publishes any event at all — no real snapshot exists yet to report', async () => {
    getCase.mockResolvedValue(baseCase({} as any, [{ status: 'active', staffId: 'user-resident', participationTypeIds: ['resident'] }]));
    await signAutopsyReport('case-1', 'PAD', residentUser);
    expect(publishReportReleasedEventMock).not.toHaveBeenCalled();
  });
});

describe('signAutopsyReport — signing authority (Batch 331, PS-327)', () => {
  const hospitalCase = (participants: any[] = [ATTENDING_PARTICIPANT]) => baseCase({
    autopsy: { jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, hospitalConsent: { consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse', consentGivenAt: '2026-09-01T00:00:00Z', status: 'active', consentScope: [], excludedOrgans: [], retentionPermitted: true } } as any,
  }, participants);

  it('refuses a signer who is neither an eligible participant nor an administrator', async () => {
    session.current = { id: 'user-other', role: 'pathologist' };
    getCase.mockResolvedValue(hospitalCase([{ staffId: 'user-attending', status: 'active', participationTypeIds: ['attending'] }]));
    const result = await signAutopsyReport('case-1', 'PAD', { id: 'user-other', name: 'Dr. Other', isPathologist: true });
    expect(result).toMatchObject({ ok: false, errorCode: 'NOT_AUTHORIZED' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('lets the assigned attending sign a hospital autopsy without any forensic appointment', async () => {
    session.current = { id: 'user-attending', role: 'pathologist' };
    getStaffById.mockResolvedValue({ ok: true, data: { providerCredentials: [] } });
    getCase.mockResolvedValue(hospitalCase([{ staffId: 'user-attending', status: 'active', participationTypeIds: ['attending'] }]));
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result).toMatchObject({ ok: true, outcome: 'signed' });
  });

  it('requires an active appointment for the case jurisdiction on a forensic case, even for an administrator', async () => {
    getStaffById.mockResolvedValue({ ok: true, data: { providerCredentials: [] } });
    getCase.mockResolvedValue(baseCase());
    expect(await signAutopsyReport('case-1', 'PAD', attendingUser)).toMatchObject({ ok: false, errorCode: 'NO_FORENSIC_APPOINTMENT' });

    getStaffById.mockResolvedValue({ ok: true, data: { providerCredentials: [{ ...US_APPOINTMENT, jurisdiction: 'CA' }] } });
    expect(await signAutopsyReport('case-1', 'PAD', attendingUser)).toMatchObject({ ok: false, errorCode: 'NO_FORENSIC_APPOINTMENT' });

    getStaffById.mockResolvedValue({ ok: true, data: { providerCredentials: [{ ...US_APPOINTMENT, expirationDate: '2021-01-01' }] } });
    expect(await signAutopsyReport('case-1', 'PAD', attendingUser)).toMatchObject({ ok: false, errorCode: 'NO_FORENSIC_APPOINTMENT' });
    expect(updateCase).not.toHaveBeenCalled();

    getStaffById.mockResolvedValue({ ok: true, data: { providerCredentials: [US_APPOINTMENT] } });
    expect(await signAutopsyReport('case-1', 'PAD', attendingUser)).toMatchObject({ ok: true, outcome: 'signed' });
  });

  it('still routes a resident on a forensic case for countersign rather than refusing', async () => {
    session.current = { id: 'user-resident', role: 'pathologist' };
    getStaffById.mockResolvedValue({ ok: true, data: { providerCredentials: [] } });
    getCase.mockResolvedValue(baseCase({}, [{ staffId: 'user-resident', status: 'active', participationTypeIds: ['resident'] }]));
    const result = await signAutopsyReport('case-1', 'PAD', residentUser);
    expect(result).toMatchObject({ ok: true, outcome: 'released_for_countersign' });
  });
});

describe('signAutopsyReport — the authorization gate, now a real hard stop (Batch 478)', () => {
  const noAuthCase = () => baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false } } as any });
  const revokedConsentCase = () => baseCase({ autopsy: {
    jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
    hospitalConsent: { consentingRelativeName: 'Jane Doe', consentingRelativeRelationship: 'spouse', consentGivenAt: '2026-09-01T00:00:00Z', status: 'revoked', consentScope: [], excludedOrgans: [], retentionPermitted: true, statusChangedAt: '2026-09-05T00:00:00Z' },
  } as any });

  it('refuses a sign outright when the gate is blocked and no override reason is supplied — never silently proceeding, as it did before this batch', async () => {
    getCase.mockResolvedValue(noAuthCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result).toMatchObject({ ok: false, errorCode: 'AUTHORIZATION_GATE_BLOCKED' });
    // Batch 479: the gate's blockedReasons are reason codes now, not
    // English prose (see resolveAutopsyGrossExaminationGate.ts) — this
    // internal `error` string just joins the codes, never shown to a
    // user (the sign-error toast is keyed by errorCode, Batch 478).
    expect(result.error).toMatch(/missing_judicial_authorization/);
    expect(updateCase).not.toHaveBeenCalled();
    expect(enforce).not.toHaveBeenCalled();
  });

  it('refuses a revoked-consent hospital case the same way', async () => {
    getCase.mockResolvedValue(revokedConsentCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result).toMatchObject({ ok: false, errorCode: 'AUTHORIZATION_GATE_BLOCKED' });
    expect(result.error).toMatch(/consent_revoked/);
  });

  it('a blank or whitespace-only override reason is treated as no reason at all', async () => {
    getCase.mockResolvedValue(noAuthCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser, undefined, '   ');
    expect(result).toMatchObject({ ok: false, errorCode: 'AUTHORIZATION_GATE_BLOCKED' });
    expect(enforce).not.toHaveBeenCalled();
  });

  it('refuses the override itself when the signer holds no autopsy:gross-exam-gate:override', async () => {
    enforce.mockResolvedValue({ allowed: false });
    getCase.mockResolvedValue(noAuthCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser, undefined, 'Family needs the body released before the formal order arrives.');
    expect(result).toMatchObject({ ok: false, errorCode: 'GATE_OVERRIDE_NOT_PERMITTED' });
    expect(enforce).toHaveBeenCalledWith('autopsy:gross-exam-gate:override', { caseId: 'case-1' });
    expect(updateCase).not.toHaveBeenCalled();
  });

  it('a held override capability lets the sign proceed, logs the override on the case (append-only) and to the audit trail, and never applies to an un-blocked gate', async () => {
    enforce.mockResolvedValue({ allowed: true });
    getCase.mockResolvedValue(noAuthCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser, undefined, 'Verbal order from the ME confirmed by phone; written order in transit.');
    expect(result).toMatchObject({ ok: true, outcome: 'signed' });
    const updates = updateCase.mock.calls[0][1];
    expect(updates.autopsy.padSnapshot).toBeDefined();
    expect(updates.autopsy.gateOverrides).toHaveLength(1);
    expect(updates.autopsy.gateOverrides[0]).toMatchObject({
      tier: 'PAD', reason: 'Verbal order from the ME confirmed by phone; written order in transit.', overriddenByName: 'Dr. E. Reed',
    });
    expect(updates.autopsy.gateOverrides[0].blockedReasons.length).toBeGreaterThan(0);
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'AUTOPSY_GATE_OVERRIDDEN', caseId: 'case-1', user: 'Dr. E. Reed' }));
  });

  it('an override reason is simply ignored when the gate already allows the sign — no capability check, no override record', async () => {
    getCase.mockResolvedValue(baseCase());
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser, undefined, 'not needed here');
    expect(result).toMatchObject({ ok: true, outcome: 'signed' });
    expect(enforce).not.toHaveBeenCalled();
    expect(updateCase.mock.calls[0][1].autopsy.gateOverrides).toBeUndefined();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('a prior override event on the case is kept (append-only) when a later sign on the same case needs none', async () => {
    const priorOverride = { id: 'gate-override-case-1-PAD-1', occurredAt: '2026-09-01T00:00:00Z', tier: 'PAD' as const, blockedReasons: ['x'], reason: 'earlier reason', overriddenByName: 'Dr. E. Reed' };
    getCase.mockResolvedValue(baseCase({ autopsy: { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false }, padSnapshot: signedPad, gateOverrides: [priorOverride], forensicAuthorization: { authorityType: 'MEDICAL_EXAMINER', orderReference: 'ME-2026-0042', orderDate: '2026-09-01' } } as any }));
    const result = await signAutopsyReport('case-1', 'FAD', attendingUser);
    expect(result).toMatchObject({ ok: true, outcome: 'signed' });
    expect(updateCase.mock.calls[0][1].autopsy.gateOverrides).toEqual([priorOverride]);
  });
});

describe('signAutopsyReport — PS-71 (Batch 458) versioned save', () => {
  const sections = (text: string) => [{ id: 'diagnosis', label: 'Diagnosis', text, aiGenerated: '', userEdited: true, isStreaming: false }];

  it('saves with the version it read; a change to another part of the record saved in between is kept', async () => {
    const stale = baseCase({ version: 3, orchSections: sections('MI') } as any);
    const newer = baseCase({ version: 4, orchSections: sections('MI'), autopsy: { ...stale.autopsy!, addenda: [{ id: 'ad-1' }] } } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 3, 4)).mockResolvedValue(undefined);
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result).toMatchObject({ ok: true, outcome: 'signed' });
    expect(updateCase.mock.calls.map(c => c[2])).toEqual([3, 4]);
    const updates = updateCase.mock.calls[1][1];
    expect(updates.autopsy.addenda).toEqual([{ id: 'ad-1' }]);
    expect(updates.autopsy.padSnapshot.frozenPayload.sections[0].text).toBe('MI');
  });

  it('never signs content the signer did not see: report text changed in between → not saved, SAVE_FAILED', async () => {
    const stale = baseCase({ version: 3, orchSections: sections('MI') } as any);
    const newer = baseCase({ version: 4, orchSections: sections('MI, revised by someone else') } as any);
    getCase.mockResolvedValueOnce(stale).mockResolvedValueOnce(stale).mockResolvedValue(newer);
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('case-1', 3, 4)).mockResolvedValue(undefined);
    const result = await signAutopsyReport('case-1', 'PAD', attendingUser);
    expect(result).toMatchObject({ ok: false, errorCode: 'SAVE_FAILED' });
    expect(updateCase).toHaveBeenCalledTimes(1);
    expect(publishReportReleasedEventMock).not.toHaveBeenCalled();
  });
});
