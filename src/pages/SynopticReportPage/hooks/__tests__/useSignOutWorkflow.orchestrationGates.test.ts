// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/hooks/__tests__/useSignOutWorkflow.orchestrationGates.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649 (sign-out audit): Orchestration Sign Out Case now runs the checks
// Assist Finalize runs (active hold, microscopic documentation, critical
// findings, required fields, unverified AI answers), writes status before
// version and signature, links the signature to the version, surfaces a
// countersign failure and sends the cancer registry only at release. Same
// mocks as useSignOutWorkflow.test.ts (copied, so that file doesn't grow).
// ─────────────────────────────────────────────────────────────────────────────
import '@/i18n/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook as rtlRenderHook, act } from '@testing-library/react';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import { dispatchCancerRegistryReportIfApplicable } from '@/services/cancerRegistry/dispatchCancerRegistryReportIfApplicable';
import { SystemConfigProvider } from '@/contexts/SystemConfigContext';
import { useSignOutWorkflow } from '../useSignOutWorkflow';
import { caseRouter } from '@/services/cases/CaseRouter';
import { detectCriticalFindings } from '@/services/clinical/detectCriticalFindings';
import { mockCriticalResultNotificationService } from '@/services/clinical/mockCriticalResultNotificationService';
import * as qaSupervisionMod from '@/services/quality/mockQaSupervisionAssignmentService';
import * as qaActivityTypeMod from '@/services/quality/mockQaActivityTypeService';
import * as reportReleaseMod from '@/services/reportRelease/mockReportReleaseService';
import * as serviceChargeMod from '@/services/billing/mockServiceChargeService';
import * as ncciEditMod from '@/services/billing/mockNcciEditService';
import * as billingDeficiencyMod from '@/services/billing/mockBillingDeficiencyService';
import * as outboundChargeQueueMod from '@/services/billing/mockOutboundChargeQueueService';
import * as codeReviewPoolMod from '@/services/billing/mockCodeReviewPoolService';
import * as codePolicyMod from '@/services/coding/mockCodeSystemPolicyService';
import * as billingTypeTriggerMod from '@/services/billing/mockBillingTypeTriggerConfigService';
import * as validationStudyMod from '@/services/validationStudies/mockValidationStudyService';
import * as narrativeSignalMod from '@/services/narrativeSignals/mockNarrativeSignalService';
import * as batchMod from '@/services/batches/mockBatchService';
import * as scanStationMod from '@/services/scanStations/mockScanStationService';
import * as workstationGroupMod from '@/services/workstationGroups/mockWorkstationGroupService';
import * as auditMod from '@/services/auditlog/mockAuditService';
import type { Case } from '@/types/case/Case';
import { getTemplate } from '@/services/templates/templateService';

vi.mock('@/services/cases/CaseRouter', () => ({
  caseRouter: { updateCase: vi.fn().mockResolvedValue(undefined) },
}));
// Batch 649: the sign-out capability check is tested on its own (services/auth/authorizeSurgicalSignOut.test.ts).
vi.mock('@/services/auth/authorizeSurgicalSignOut', () => ({ authorizeSurgicalSignOut: vi.fn(async (_caseId: unknown, participation: unknown) => participation) }));
vi.mock('@/services/auth/caseAccessControl', () => ({
  getSessionUser: vi.fn().mockReturnValue({ id: 'PATH-001', role: 'pathologist' }),
  canFinalizeCase: vi.fn().mockReturnValue({ granted: true, dimension: 'primary', reason: '' }),
  // PS-327: defaults to [] (no admin-configured participation type
  // resolves to a real countersign requirement) — matching this test
  // file's own pre-PS-327 behavior exactly, since nothing exercised this
  // path before it existed. Individual tests below override with
  // mockReturnValueOnce to exercise the new configured-type gate.
  resolveCountersignRequiredTypeIds: vi.fn().mockReturnValue([]),
}));
// Batch 439: the mismatch and peer-review checks are tested on their own
// (services/clinical, services/quality); here they never stop sign-out.
vi.mock('../checkPeerReviewAndMismatch', () => ({
  checkClinicalMismatch: vi.fn().mockResolvedValue(null),
  checkPeerReviewGate: vi.fn().mockResolvedValue(null),
}));
// Batch 506 (PS-477): the hook now takes from the index the services it used
// to import from their mock files. The test gives it exactly what it got
// before: the same modules (real, or mocked further down), nothing more.
// Getters, because those modules import the index themselves.
vi.mock('@/services', () => ({
  get FPPE_ACTIVITY_TYPE_ID() { return qaSupervisionMod.FPPE_ACTIVITY_TYPE_ID; },
  get ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID() { return qaActivityTypeMod.ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID; },
  get reportReleaseService() { return reportReleaseMod.mockReportReleaseService; },
  get criticalResultNotificationService() { return mockCriticalResultNotificationService; },
  get serviceChargeService() { return serviceChargeMod.mockServiceChargeService; },
  get ncciEditService() { return ncciEditMod.mockNcciEditService; },
  get billingDeficiencyService() { return billingDeficiencyMod.mockBillingDeficiencyService; },
  get outboundChargeQueueService() { return outboundChargeQueueMod.mockOutboundChargeQueueService; },
  get codeReviewPoolService() { return codeReviewPoolMod.mockCodeReviewPoolService; },
  get codeSystemPolicyService() { return codePolicyMod.mockCodeSystemPolicyService; },
  get billingTypeTriggerConfigService() { return billingTypeTriggerMod.mockBillingTypeTriggerConfigService; },
  get validationStudyService() { return validationStudyMod.mockValidationStudyService; },
  get narrativeSignalService() { return narrativeSignalMod.mockNarrativeSignalService; },
  get computeEditRatio() { return narrativeSignalMod.computeEditRatio; },
  // …and what checkStainQcGate.ts and sharedHookTypes.ts take from the index.
  get batchService() { return batchMod.mockBatchService; },
  get scanStationService() { return scanStationMod.mockScanStationService; },
  get workstationGroupService() { return workstationGroupMod.mockWorkstationGroupService; },
  get auditService() { return auditMod.mockAuditService; },
  countersignService: { release: vi.fn().mockResolvedValue({ ok: true }), countersign: vi.fn().mockResolvedValue({ ok: true }), reject: vi.fn().mockResolvedValue({ ok: true, data: { residentId: 'PATH-002', residentName: 'Dr. Resident' } }) },
  userService: { getById: vi.fn().mockResolvedValue({ ok: true, data: { email: 'attending@test.com' } }) },
  qaSupervisionAssignmentService: { getActiveAssignmentForUser: vi.fn().mockResolvedValue({ ok: true, data: null }), recordCaseReviewed: vi.fn().mockResolvedValue({ ok: true }) },
  intraoperativeService: { getAll: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
  amendmentService: { release: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
  reportVersionService: { create: vi.fn().mockResolvedValue({ ok: true, data: {} }), getByCaseId: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
  abnormalTriggerRuleService: { getAll: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
  abnormalDetectionSignalService: { recordSignal: vi.fn().mockResolvedValue({ ok: true, data: {} }), getByCaseId: vi.fn().mockResolvedValue({ ok: true, data: [] }), getStats: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
  qaActivityRecordService: { create: vi.fn().mockResolvedValue({ ok: true, data: {} }), getAll: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
  facilityService: { getById: vi.fn().mockResolvedValue({ ok: false, error: 'not mocked' }) },
  // Batch 484: checkInkingSignOutGate.ts's own palette read. Empty but
  // ok: true, same honest "not mocked further, but reachable" posture as
  // facilityService above — a clean case with no margins never reaches
  // the color-code check anyway.
  inkColorService: { getAll: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
  concordanceReviewSettingsService: { resolveEffectiveConfigForFacility: vi.fn().mockResolvedValue({ ok: true, data: { aiComparisonEnabled: true, reviewScreenEnabled: true } }) },
  // Batch 345: the signature check (services/auth/signatureEvidence.ts) is
  // tested on its own; here it accepts unless a test says otherwise.
  signatureGate: { accept: vi.fn().mockResolvedValue({ ok: true, evidence: {} }), commit: vi.fn().mockResolvedValue(null), release: vi.fn(), held: vi.fn() },
}));
vi.mock('@/services/cancerRegistry/dispatchCancerRegistryReportIfApplicable', () => ({ dispatchCancerRegistryReportIfApplicable: vi.fn().mockResolvedValue({ dispatched: true, reason: '' }) }));
vi.mock('@/services/communications/notificationService', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/reportRelease/mockReportReleaseService', () => ({
  mockReportReleaseService: { resolveBufferForCase: vi.fn().mockResolvedValue({ applies: true, durationMinutes: 5 }) },
}));
// Batch 535: a correction released at an Orchestration re-sign-out is sent (publishReleasedRevision).
vi.mock('@/services/reports/publishReleasedRevision', () => ({ publishReleasedRevision: vi.fn().mockResolvedValue({ held: {} }), releasedRevisionDeps: {} }));
vi.mock('@/services/reports/dispatchCaseInstances', () => ({
  dispatchCaseInstances: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/templates/templateService', () => ({
  getTemplate: vi.fn().mockResolvedValue({ template: { sections: [] } }),
}));
vi.mock('@/services/clinical/detectCriticalFindings', () => ({
  detectCriticalFindings: vi.fn().mockResolvedValue({ ok: true, data: { flags: [], negated: [] } }),
}));
vi.mock('@/services/clinical/mockCriticalResultNotificationService', () => ({
  mockCriticalResultNotificationService: { recordNotification: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
}));
// Batch 450 (PS-324): the post-sign-out QA step is tested on its own
// (services/quality); here we only check that sign-out calls it.
vi.mock('@/services/quality/applySurgicalPostSignOutQa', () => ({
  applySurgicalPostSignOutQa: vi.fn().mockResolvedValue(undefined),
}));
// Batch 450 (PS-274, PS-275): the AI service is replaced so the two AI
// sync actions can be driven without a provider. The service's own prompt
// building is tested in services/aiIntegration/PathScribeAIService.test.ts.
const aiServiceMocks = vi.hoisted(() => ({
  suggestSynopticFields: vi.fn(),
  generateNarrativeFromSynopticAnswers: vi.fn(),
}));
vi.mock('@/services/aiIntegration/PathScribeAIService', () => ({
  PathScribeAIService: class {
    suggestSynopticFields = aiServiceMocks.suggestSynopticFields;
    generateNarrativeFromSynopticAnswers = aiServiceMocks.generateNarrativeFromSynopticAnswers;
  },
}));

function makeTestCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'TEST-CASE-SIGNOUT',
    status: 'in-progress',
    reportingMode: 'orchestration',
    specimens: [],
    synopticReports: [{ instanceId: 'SR-1', specimenId: 'SP-1', templateName: 'T1', answers: { f1: 'x' }, status: 'draft' }],
    accession: { fullAccession: 'S26-TEST-001' },
    ...overrides,
  } as unknown as Case;
}

const testSigningUser = { id: 'PATH-001', name: 'Dr. Test' } as any;

function baseParams(overrides: Partial<Parameters<typeof useSignOutWorkflow>[0]> = {}) {
  return {
    caseData: makeTestCase(),
    setCaseData: vi.fn(),
    signingUser: testSigningUser,
    showToast: vi.fn(),
    activeReportInstanceId: 'SR-1',
    knownVersionRef: { current: 1 },
    setConcurrencyConflict: vi.fn(),
    sendSynopticReportToLis: vi.fn().mockResolvedValue({ ok: true }),
    generateReportPdfSnapshot: vi.fn().mockResolvedValue({ pdfBase64: 'abc' }),
    isOrchestrationMode: true,
    orchSections: [],
    setCaseSigned: vi.fn(),
    setShowSignOutModal: vi.fn(),
    setPendingReconciliation: vi.fn(),
    countersignFeedback: '',
    specimenDictionary: [],
    setFixativeGateSpecimens: vi.fn(),
    setStainQcGateBlocking: vi.fn(),
    setClinicalMismatch: vi.fn(),
    setPeerReviewGate: vi.fn(),
    setInkingGateBlocking: vi.fn(),
    setPreAnalyticDateGateSpecimens: vi.fn(),
    setPendingFinalizeArgs: vi.fn(),
    setPendingActionIsSignOut: vi.fn(),
    synopticPanelRef: { current: { validateRequired: vi.fn().mockReturnValue([]), getUncertainRequiredFields: vi.fn().mockReturnValue([]), getBlockingUnverifiedFields: vi.fn().mockReturnValue([]), sweepAndGetFinalState: vi.fn().mockReturnValue({ verificationSummary: {} }) } } as any,
    setAlertFieldId: vi.fn(),
    safeSetLeftTab: vi.fn(),
    setActiveSpecimenId: vi.fn(),
    setActiveReportType: vi.fn(),
    setAmendmentMode: vi.fn(),
    setShowAmendmentModal: vi.fn(),
    setShowFinalizeModal: vi.fn(),
    openAmendmentDraft: vi.fn().mockResolvedValue(undefined),
    releasePendingAmendmentOrAddendum: vi.fn().mockResolvedValue(undefined),
    log: vi.fn(),
    ...overrides,
  };
}

// Real, per direct guidance (PS-105): useSignOutWorkflow now calls
// useSystemConfig() (the enterprise-level abnormal detection kill
// switch), which throws without a <SystemConfigProvider> ancestor.
// Same shadowing pattern as useSpecimenBlockManagement.test.ts's own
// AuthProvider wrapper — every renderHook( call below is this one,
// not @testing-library/react's own, unwrapped version.
const renderHook: typeof rtlRenderHook = (callback, options) =>
  rtlRenderHook(callback, { ...options, wrapper: ({ children }) => React.createElement(SystemConfigProvider, null, children) });

beforeEach(() => {
  vi.clearAllMocks();
  // Real, per direct guidance (PS-105): guaranteed clean enterprise-
  // config state entering every test, even if an earlier test's own
  // governance-gate test failed before reaching its own cleanup line.
  localStorage.removeItem('pathscribe_enterprise_config_v2');
});

const attending = [{ status: 'active', staffId: 'PATH-001', participationTypeIds: ['attending'] }];

async function signOut(params: Partial<Parameters<typeof useSignOutWorkflow>[0]>) {
  const p = baseParams(params);
  const hook = renderHook(() => useSignOutWorkflow(p));
  await act(async () => { await hook.result.current.handleSignOutConfirm(); });
  return { p, result: hook.result };
}

async function expectNothingSigned() {
  const { signatureGate, reportVersionService } = await import('@/services');
  expect(signatureGate.accept).not.toHaveBeenCalled();
  expect(reportVersionService.create).not.toHaveBeenCalled();
  expect(signatureGate.commit).not.toHaveBeenCalled();
  expect(vi.mocked(caseRouter.updateCase)).not.toHaveBeenCalled();
}

describe('Batch 649: Orchestration Sign Out Case runs the Assist Finalize checks', () => {
  it('an active case hold stops it, naming the hold', async () => {
    const { p } = await signOut({ caseData: makeTestCase({ participants: attending, caseHolds: [{ id: 'h1', active: true, note: 'Await recut' }] } as any) });
    expect(p.showToast).toHaveBeenCalledWith(expect.stringContaining('Await recut'), 'warning');
    expect(p.setShowSignOutModal).toHaveBeenCalledWith(false);
    await expectNothingSigned();
  });

  it('microscopic documentation stops it and opens the blocking specimen', async () => {
    const caseData = makeTestCase({ participants: attending, specimens: [{ id: 'SP-1', label: 'A' }], microscopicReports: [{ specimenId: 'SP-1', status: 'draft', text: 'x' }] } as any);
    const { p } = await signOut({ caseData });
    expect(p.setActiveSpecimenId).toHaveBeenCalledWith('SP-1');
    expect(p.setActiveReportType).toHaveBeenCalledWith('microscopic');
    await expectNothingSigned();
  });

  it('a Critical finding stops it and opens the critical-findings review', async () => {
    vi.mocked(detectCriticalFindings).mockResolvedValueOnce({ ok: true, data: { flags: [{ term: 'carcinoma', severity: 'Critical', sourceField: 'microscopic', sourceQuote: 'carcinoma' }], negated: [] } } as any);
    const { result } = await signOut({ caseData: makeTestCase({ participants: attending, diagnostic: { microscopicDescription: 'Invasive carcinoma.' } } as any) });
    expect(result.current.showCriticalFindingsModal).toBe(true);
    await expectNothingSigned();
  });

  it('a missing required field stops it and shows the missing-fields warning', async () => {
    const synopticPanelRef = { current: { validateRequired: vi.fn().mockReturnValue([{ sectionId: 's', sectionTitle: 'Tumor', fieldId: 'f1', fieldLabel: 'Grade' }]), getBlockingUnverifiedFields: vi.fn().mockReturnValue([]) } } as any;
    const { result } = await signOut({ caseData: makeTestCase({ participants: attending } as any), synopticPanelRef });
    expect(result.current.showMissingWarning).toBe(true);
    await expectNothingSigned();
  });

  it('a required field holding an unverified AI answer stops it and goes to the field', async () => {
    const synopticPanelRef = { current: { validateRequired: vi.fn().mockReturnValue([]), getBlockingUnverifiedFields: vi.fn().mockReturnValue([{ sectionId: 's', sectionTitle: 'Tumor', fieldId: 'f1', fieldLabel: 'Grade' }]) } } as any;
    const { p } = await signOut({ caseData: makeTestCase({ participants: attending } as any), synopticPanelRef });
    expect(p.setAlertFieldId).toHaveBeenCalledWith('f1');
    expect(p.safeSetLeftTab).toHaveBeenCalledWith('draft');
    await expectNothingSigned();
  });

  it('with no synoptic panel open, a stored report on the case is still checked (another report with an unverified required AI answer)', async () => {
    vi.mocked(getTemplate).mockResolvedValue({ template: { sections: [{ id: 's', title: 'Tumor', fields: [{ id: 'grade', label: 'Grade', required: true, type: 'text' }] }] } } as any);
    const caseData = makeTestCase({ participants: attending, synopticReports: [{ instanceId: 'SR-2', specimenId: 'SP-1', templateId: 'T', templateName: 'T', answers: { grade: 'G2' }, status: 'draft', aiSuggestions: { grade: { value: 'G2', confidence: 90, source: '', verification: 'unverified' } } }] } as any);
    const { p } = await signOut({ caseData, synopticPanelRef: { current: null } as any });
    vi.mocked(getTemplate).mockResolvedValue({ template: { sections: [] } } as any);
    expect(p.setAlertFieldId).toHaveBeenCalledWith('grade');
    await expectNothingSigned();
  });
});

describe('Batch 649: Orchestration sign-out writes', () => {
  it('the signature is linked to the exact version saved and its PDF SHA-256', async () => {
    const { reportVersionService, signatureGate } = await import('@/services');
    vi.mocked(reportVersionService.create).mockResolvedValueOnce({ ok: true, data: { id: 'ver-2', versionNumber: 2, pdfSha256: 'f'.repeat(64) } } as any);
    const caseData = makeTestCase({ participants: attending } as any);
    await signOut({ caseData });
    expect(signatureGate.commit).toHaveBeenCalledWith(caseData.id, 'signed', { kind: 'report-version', id: 'ver-2', versionNumber: 2, pdfSha256: 'f'.repeat(64) });
    // Status first, then the version.
    expect(vi.mocked(caseRouter.updateCase).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(reportVersionService.create).mock.invocationCallOrder[0]);
  });

  it('a conflict at the status write leaves no version and no signature, and shows the conflict', async () => {
    const { reportVersionService, signatureGate } = await import('@/services');
    vi.mocked(caseRouter.updateCase).mockRejectedValueOnce(new ConcurrencyConflictError('TEST-CASE-SIGNOUT', 1, 4));
    const { p } = await signOut({ caseData: makeTestCase({ participants: attending } as any) });
    expect(p.setConcurrencyConflict).toHaveBeenCalledWith(expect.objectContaining({ blockOverride: true }));
    expect(reportVersionService.create).not.toHaveBeenCalled();
    expect(signatureGate.commit).not.toHaveBeenCalled();
    expect(p.setCaseSigned).not.toHaveBeenCalled();
  });

  it('a countersign failure is shown and stops the sign-out, with the status put back', async () => {
    const { countersignService, reportVersionService, signatureGate } = await import('@/services');
    vi.mocked(countersignService.countersign).mockResolvedValueOnce({ ok: false, error: 'No pending countersign record' } as any);
    const { p } = await signOut({ caseData: makeTestCase({ status: 'pending-countersign' } as any) });
    expect(p.showToast).toHaveBeenCalledWith(expect.stringContaining('No pending countersign record'), 'warning');
    expect(reportVersionService.create).not.toHaveBeenCalled();
    expect(signatureGate.commit).not.toHaveBeenCalled();
    expect(p.setCaseSigned).not.toHaveBeenCalled();
    const calls = vi.mocked(caseRouter.updateCase).mock.calls;
    expect(calls[calls.length - 1][1]).toMatchObject({ status: 'pending-countersign' });
  });

  it('the cancer registry is not sent at sign-out while the report is held for the release delay', async () => {
    await signOut({ caseData: makeTestCase({ participants: attending, order: { facilityId: 'F1', facilityName: 'Lab' } } as any) });
    await new Promise(r => setTimeout(r, 0));
    expect(dispatchCancerRegistryReportIfApplicable).not.toHaveBeenCalled();
  });

  it('with no release delay, the registry follows the release', async () => {
    const { mockReportReleaseService } = await import('@/services/reportRelease/mockReportReleaseService');
    vi.mocked(mockReportReleaseService.resolveBufferForCase).mockResolvedValueOnce({ applies: false, durationMinutes: 0 } as any);
    await signOut({ caseData: makeTestCase({ participants: attending, order: { facilityId: 'F1', facilityName: 'Lab' } } as any) });
    await vi.waitFor(() => expect(dispatchCancerRegistryReportIfApplicable).toHaveBeenCalledWith(expect.objectContaining({ id: 'TEST-CASE-SIGNOUT' }), 'F1', 'Lab'));
  });

  it('a resident release for countersign writes the status first and links the resident signature to the submitted version', async () => {
    const { reportVersionService, signatureGate } = await import('@/services');
    vi.mocked(reportVersionService.create).mockResolvedValueOnce({ ok: true, data: { id: 'ver-r', versionNumber: 1 } } as any);
    const caseData = makeTestCase({ participants: [{ status: 'active', staffId: 'PATH-001', participationTypeIds: ['resident'] }] } as any);
    await signOut({ caseData });
    expect(vi.mocked(caseRouter.updateCase).mock.calls[0][1]).toMatchObject({ status: 'pending-countersign' });
    expect(signatureGate.commit).toHaveBeenCalledWith(caseData.id, 'released_for_countersign', { kind: 'report-version', id: 'ver-r', versionNumber: 1 });
  });
});
