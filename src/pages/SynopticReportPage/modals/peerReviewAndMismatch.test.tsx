// @vitest-environment happy-dom
// Batch 439 (PS-144, PS-145): the sign-out gate modal, the mismatch modal and
// the report page's peer review banner. Rules are the real ones; services are fakes.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts && !('defaultValue' in opts) ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, className, disabled }: { children: React.ReactNode; onClick: () => void; className: string; disabled?: boolean }) => <button className={className} onClick={onClick} disabled={disabled}>{children}</button>,
}));
const fakes = vi.hoisted(() => ({
  override: vi.fn(async () => ({ ok: true, data: {} })),
  request: vi.fn(async () => ({ ok: true, data: {} })),
  recordRead: vi.fn(async () => ({ ok: true, data: {} })),
  record: vi.fn(async () => ({ ok: true, data: {} })),
}));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/quality/peerReviewRules')>('@/services/quality/peerReviewRules');
  const decision = await vi.importActual<typeof import('@/services/clinical/clinicalMismatchDecision')>('@/services/clinical/clinicalMismatchDecision');
  return {
    peerReviewService: { override: fakes.override, request: fakes.request, recordRead: fakes.recordRead, resolve: vi.fn(), withdraw: vi.fn() },
    clinicalMismatchService: { record: fakes.record },
    peerReviewOverrideProblem: rules.overrideProblem, PEER_REVIEW_OVERRIDE_REASONS: rules.OVERRIDE_REASONS,
    peerReviewReadProblem: rules.readProblem, peerReviewResolutionProblem: rules.resolutionProblem,
    peerReviewWithdrawProblem: rules.withdrawProblem, peerReviewRequestProblem: rules.requestProblem,
    caseSignedOut: rules.caseSignedOut,
    clinicalMismatchProblem: decision.clinicalMismatchProblem, CLINICAL_MISMATCH_QUICK_REASONS: decision.CLINICAL_MISMATCH_QUICK_REASONS,
  };
});

import { PeerReviewGateModal } from './PeerReviewGateModal';
import { ClinicalMismatchModal } from '@/components/ClinicalMismatch/ClinicalMismatchModal';
import { ClinicalMismatchAlert } from '@/components/ClinicalMismatch/ClinicalMismatchAlert';
import { PeerReviewBanner } from '../components/PeerReviewBanner';
import type { PeerReviewStatus } from '@/services';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const A = { userId: 'u-a', userName: 'Dr A' };
const B = { userId: 'u-b', userName: 'Dr B' };
const status = (over: Partial<PeerReviewStatus> = {}): PeerReviewStatus => ({
  state: 'needs-request', gateOn: true, blocksSignOut: true, firstTime: true, reason: 'first-time', overrides: [], ...over,
});

describe('PeerReviewGateModal', () => {
  it('needs a request: offers the request form and the urgent-care override; the override needs a reason', async () => {
    const onContinue = vi.fn();
    render(<PeerReviewGateModal caseId="c1" status={status()} reviewers={[B]} currentUserId="u-a" onRequested={vi.fn()} onContinue={onContinue} onCancel={vi.fn()} />);
    expect(screen.getByText('peerReview.gate.requestHeading')).toBeTruthy();
    fireEvent.click(screen.getByText('peerReview.gate.overrideButton'));
    expect(await screen.findByText('peerReview.errors.OVERRIDE_REASON_REQUIRED')).toBeTruthy();
    expect(fakes.override).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/peerReview.gate.overrideReason/), { target: { value: 'immediate-surgery' } });
    fireEvent.click(screen.getByText('peerReview.gate.overrideButton'));
    await waitFor(() => expect(onContinue).toHaveBeenCalled());
    expect(fakes.override).toHaveBeenCalledWith('c1', { reason: 'immediate-surgery', note: '' });
  });
  it('asking for the review never lists the signer and closes the gate', async () => {
    const onRequested = vi.fn();
    render(<PeerReviewGateModal caseId="c1" status={status()} reviewers={[B]} currentUserId="u-a" onRequested={onRequested} onContinue={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/peerReview.reviewerLabel/), { target: { value: 'u-b' } });
    fireEvent.click(screen.getByText('peerReview.requestButton'));
    await waitFor(() => expect(onRequested).toHaveBeenCalled());
    expect(fakes.request).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'c1', trigger: 'first-time-malignancy', reviewer: B }));
  });
  it('waiting on the reviewer: no request form', () => {
    render(<PeerReviewGateModal caseId="c1" status={status({ state: 'pending', request: { id: 'r', caseId: 'c1', trigger: 'requested', primaryPathologist: A, reviewer: B, status: 'pending', requestedAt: '' } })} reviewers={[B]} currentUserId="u-a" onRequested={vi.fn()} onContinue={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('peerReview.gate.requestHeading')).toBeNull();
  });
});

// Batch 530 (PS-554): the window opens for a high-risk mismatch only.
const assessment = (over: Record<string, unknown> = {}) => ({
  suggestion: { kind: 'unexpected-malignancy' as const, confidence: 82, source: 'ai' as const, explanation: 'Polyp, carcinoma found.', ...over },
  outcome: { risk: 'high' as const, display: true, holdsSignOut: true, logToQa: true, action: 'block' as const,
    rule: { id: 'all:unexpected-malignancy', specimenTypeId: null, category: 'unexpected-malignancy' as const, minimumDisplayThreshold: 60, actionThreshold: 70, actionType: 'block' as const } },
});

describe('ClinicalMismatchModal (Gate B, high risk)', () => {
  it('says which rule held sign-out; one click records UNRESOLVED with an optional quick reason, then sign-out continues', async () => {
    const onContinue = vi.fn();
    render(<ClinicalMismatchModal caseId="c1" caseType="Colon" clinicalIndication="Routine polyp" assessment={assessment()} onContinue={onContinue} onCancel={vi.fn()} />);
    expect(screen.getByText('Polyp, carcinoma found.')).toBeTruthy();
    expect(screen.getByText('clinicalMismatch.why.holds')).toBeTruthy();
    expect(screen.queryByText('clinicalMismatch.resolutions.DEFERRED')).toBeNull();
    fireEvent.click(screen.getByText('clinicalMismatch.reasons.clinical-context-reviewed'));
    fireEvent.click(screen.getByText('clinicalMismatch.resolutions.UNRESOLVED'));
    await waitFor(() => expect(onContinue).toHaveBeenCalled());
    expect(fakes.record).toHaveBeenCalledWith(expect.objectContaining({
      resolution: 'UNRESOLVED', risk: 'high', ruleId: 'all:unexpected-malignancy', quickReason: 'clinical-context-reviewed', kind: 'unexpected-malignancy', source: 'ai', confidence: 82,
    }));
  });
});

describe('ClinicalMismatchModal at cytology sign-out (Batch 523)', () => {
  it('records the discipline and the specimen with the decision; no note needed', async () => {
    const onContinue = vi.fn();
    render(<ClinicalMismatchModal caseId="c1" caseType="Thyroid FNA" assessment={assessment({ kind: 'site-or-organ', confidence: 64, explanation: undefined })} discipline="cytology" specimenId="sp-2" onContinue={onContinue} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('clinicalMismatch.resolutions.RESOLVED'));
    await waitFor(() => expect(onContinue).toHaveBeenCalled());
    expect(fakes.record).toHaveBeenLastCalledWith(expect.objectContaining({ resolution: 'RESOLVED', discipline: 'cytology', specimenId: 'sp-2' }));
  });
});

describe('ClinicalMismatchAlert (Gate A, inline on the report)', () => {
  const low = () => {
    const a = assessment({ kind: 'other', confidence: 62 });
    return { ...a, outcome: { ...a.outcome, risk: 'low' as const, holdsSignOut: false, action: null } };
  };
  it('one line with a badge; Review opens it in place; low risk offers Defer, and deferring records DEFERRED', async () => {
    const onRecorded = vi.fn();
    render(<ClinicalMismatchAlert assessment={low()} caseId="c1" caseType="Skin" onRecorded={onRecorded} />);
    expect(screen.getByText('clinicalMismatch.alert.badge')).toBeTruthy();
    expect(screen.queryByText('clinicalMismatch.resolutions.DEFERRED')).toBeNull();
    fireEvent.click(screen.getByText('clinicalMismatch.alert.review'));
    expect(screen.queryByText('clinicalMismatch.resolutions.UNRESOLVED')).toBeNull();
    fireEvent.click(screen.getByText('clinicalMismatch.resolutions.DEFERRED'));
    await waitFor(() => expect(onRecorded).toHaveBeenCalled());
    expect(fakes.record).toHaveBeenLastCalledWith(expect.objectContaining({ resolution: 'DEFERRED', risk: 'low' }));
  });
  it('Batch 609 (#31): on an amendment with the lab setting off, a high-risk mismatch says the release will not be held but still offers a decision', () => {
    render(<ClinicalMismatchAlert assessment={{ ...assessment(), releaseNotHeld: true }} caseId="c1" caseType="Colon" onRecorded={vi.fn()} />);
    expect(screen.getByText(/clinicalMismatch.alert.releaseNotHeld/)).toBeTruthy();
    expect(screen.queryByText(/clinicalMismatch.alert.holdsSignOut/)).toBeNull();
    fireEvent.click(screen.getByText('clinicalMismatch.alert.review'));
    expect(screen.getByText('clinicalMismatch.resolutions.UNRESOLVED')).toBeTruthy();
  });
  it('high risk: says sign-out will ask, and offers Resolved or Unresolved now', () => {
    render(<ClinicalMismatchAlert assessment={assessment()} caseId="c1" caseType="Colon" onRecorded={vi.fn()} />);
    expect(screen.getByText(/clinicalMismatch.alert.holdsSignOut/)).toBeTruthy();
    fireEvent.click(screen.getByText('clinicalMismatch.alert.review'));
    expect(screen.getByText('clinicalMismatch.resolutions.UNRESOLVED')).toBeTruthy();
    expect(screen.queryByText('clinicalMismatch.resolutions.DEFERRED')).toBeNull();
  });
});

describe('PeerReviewBanner', () => {
  const props = { caseId: 'c1', currentUser: { id: 'u-b', name: 'Dr B' }, reviewers: [B], onChanged: vi.fn() };
  it('first-time malignancy with the gate off: recommended, not required', () => {
    render(<PeerReviewBanner {...props} status={status({ gateOn: false, blocksSignOut: false })} />);
    expect(screen.getByText('peerReview.banner.firstTimeRecommended')).toBeTruthy();
  });
  it('the reviewer sees "Record your review" while it waits on them', () => {
    render(<PeerReviewBanner {...props} status={status({ state: 'pending', request: { id: 'r', caseId: 'c1', trigger: 'requested', primaryPathologist: A, reviewer: B, status: 'pending', requestedAt: '2026-10-02T10:00:00Z' } })} />);
    expect(screen.getByText('peerReview.banner.recordRead')).toBeTruthy();
    expect(screen.queryByText('peerReview.banner.withdraw')).toBeNull();
  });
  it('nothing required and already signed out: no banner', () => {
    const { container } = render(<PeerReviewBanner {...props} caseStatus="finalized" status={status({ state: 'not-required', firstTime: false })} />);
    expect(container.textContent).toBe('');
  });
});
