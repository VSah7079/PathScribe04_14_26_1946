// @vitest-environment happy-dom
//
// src/components/ExternalConsult/ExternalConsultAccessModal.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, closing a noted gap from the PS-290 build: only the service layer
// underneath this modal (mockConsultTokenService.test.ts,
// computeDefaultConsultTokenExpiry.test.ts) had test coverage — the modal
// itself, the pathologist-facing half of External Consult Access, had none.
//
// Same real mocking conventions as OrSuiteDashboardPage.test.tsx: mocks
// every service the component imports and drives it with fireEvent.
//
// Real update alongside the component's i18n sweep conversion: it now
// calls useTranslation(), so the real i18next instance needs to be
// initialized before render — same side-effect import main.tsx itself
// uses (`import '@/i18n/config'`) — otherwise t() has nothing to
// resolve keys against and every assertion below would see the raw
// key string instead of its English text.
// ─────────────────────────────────────────────────────────────────────────────

import '@/i18n/config';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { Case } from '@/types/case/Case';
import type { ConsultToken } from '@/services/consultAccess/IConsultTokenService';

const { getByCaseId, issue, revoke, getOpinionsByCaseId, assessOpinion } = vi.hoisted(() => ({
  getByCaseId: vi.fn(), issue: vi.fn(), revoke: vi.fn(),
  getOpinionsByCaseId: vi.fn(async () => ({ ok: true, data: [] })), assessOpinion: vi.fn(async () => ({ ok: true, data: {} })),
}));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/consultAccess/outsideConsultRules')>('@/services/consultAccess/outsideConsultRules');
  return {
    consultTokenService: { getByCaseId, issue, revoke, getOpinionsByCaseId, assessOpinion },
    outsideConsultAssessmentProblem: rules.assessmentProblem,
    OUTSIDE_CONSULT_ASSESSMENTS: rules.OUTSIDE_CONSULT_ASSESSMENTS,
  };
});
// Batch 439: the assess button is a CapabilityButton; its permission check is tested on its own.
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className: string }) => <button className={className} onClick={onClick}>{children}</button>,
}));

const CASE = {
  id: 'case-1',
  accession: { accessionNumber: 'S26-1234' },
  patient: { firstName: 'Jane', lastName: 'Roe' },
  specimens: [{
    id: 'sp-1', label: 'A',
    blocks: [{ id: 'block-1', label: '1', stains: [{ id: 'stain-1', stainName: 'H&E' }] }],
  }],
} as unknown as Case;

function makeToken(overrides: Partial<ConsultToken & { token: string }> = {}): ConsultToken & { token: string } {
  return {
    id: 'ctok-1', token: 'ct_abc123', tokenHash: 'h',
    scope: { caseId: 'case-1', caseAccessionNumber: 'S26-1234' },
    issuedByUserId: 'u1', issuedByName: 'Dr. Attending',
    // Real, deliberately far-future expiresAt — resolveConsultTokenStatus()
    // derives Active/Expired live off Date.now(), so a near-term fixed date
    // would go stale (and this test would start failing) the moment real
    // wall-clock time passes it, regardless of when this suite is re-run.
    issuedAt: '2026-09-17T00:00:00.000Z', expiresAt: '2099-01-01T00:00:00.000Z',
    isActive: true, consultantIdentifier: 'Dr. Jane Reviewer', accessCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  getByCaseId.mockResolvedValue({ ok: true, data: [] });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderModal(onClose = vi.fn()) {
  const { default: ExternalConsultAccessModal } = await import('./ExternalConsultAccessModal');
  const utils = render(
    <ExternalConsultAccessModal isOpen caseData={CASE} currentUserId="u1" currentUserName="Dr. Attending" onClose={onClose} />
  );
  await act(async () => {});
  return utils;
}

describe('ExternalConsultAccessModal — real render/behavior coverage', () => {
  it('shows the load-bearing disclosure banner and the case label on open', async () => {
    await renderModal();
    expect(screen.getByText(/Demo only — no PathScribe server serves this link yet\./)).not.toBeNull();
    expect(screen.getByText('S26-1234 · Roe, Jane')).not.toBeNull();
  });

  it('blocks issuing without a consultant identifier, with a real inline error', async () => {
    await renderModal();
    fireEvent.click(screen.getByText('+ Issue New Consult Link'));
    fireEvent.click(screen.getByText('Issue Link'));
    await act(async () => {});

    expect(screen.getByText('A consultant name or identifier is required.')).not.toBeNull();
    expect(issue).not.toHaveBeenCalled();
  });

  it('issues a Full Case link with the real scope, then shows the copyable created link', async () => {
    issue.mockResolvedValue({ ok: true, data: makeToken() });
    await renderModal();

    fireEvent.click(screen.getByText('+ Issue New Consult Link'));
    fireEvent.change(screen.getByPlaceholderText(/Dr\. Jane Reviewer/), { target: { value: 'Dr. Jane Reviewer' } });
    fireEvent.click(screen.getByText('Issue Link'));
    await act(async () => {});

    expect(issue).toHaveBeenCalledWith(expect.objectContaining({
      scope: { caseId: 'case-1', caseAccessionNumber: 'S26-1234', slideIds: undefined },
      issuedByUserId: 'u1', issuedByName: 'Dr. Attending', consultantIdentifier: 'Dr. Jane Reviewer',
    }));
    expect(screen.getByText('Link Created')).not.toBeNull();
    // Batch 522: the token goes after `#`, out of server logs.
    const linkInput = screen.getByDisplayValue(/\/consult#ct_abc123$/) as HTMLInputElement;
    expect(linkInput.value.endsWith('/consult#ct_abc123')).toBe(true);
  });

  it('a Specific Slides scope requires at least one slide, then issues with the real selected slide id', async () => {
    issue.mockResolvedValue({ ok: true, data: makeToken({ scope: { caseId: 'case-1', caseAccessionNumber: 'S26-1234', slideIds: ['stain-1'] } }) });
    await renderModal();

    fireEvent.click(screen.getByText('+ Issue New Consult Link'));
    fireEvent.change(screen.getByPlaceholderText(/Dr\. Jane Reviewer/), { target: { value: 'Dr. Jane Reviewer' } });
    fireEvent.click(screen.getByText('Specific Slides'));
    fireEvent.click(screen.getByText('Issue Link'));
    await act(async () => {});

    expect(screen.getByText('Select at least one slide, or switch to Full Case access.')).not.toBeNull();
    expect(issue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('A-1 · H&E'));
    fireEvent.click(screen.getByText('Issue Link'));
    await act(async () => {});

    expect(issue).toHaveBeenCalledWith(expect.objectContaining({
      scope: { caseId: 'case-1', caseAccessionNumber: 'S26-1234', slideIds: ['stain-1'] },
    }));
  });

  it('revoking an Active token calls the real service and reloads the list', async () => {
    getByCaseId.mockResolvedValue({ ok: true, data: [makeToken()] });
    revoke.mockResolvedValue({ ok: true, data: makeToken({ isActive: false }) });
    await renderModal();

    expect(screen.getByText('Dr. Jane Reviewer')).not.toBeNull();
    expect(screen.getByText('Active')).not.toBeNull();

    fireEvent.click(screen.getByText('Revoke'));
    await act(async () => {});

    // Batch 522: the service takes the revoker from the session.
    expect(revoke).toHaveBeenCalledWith('ctok-1');
    expect(getByCaseId).toHaveBeenCalledTimes(2);
  });

  it('a refused issue shows the translated reason, not a code (Batch 522)', async () => {
    issue.mockResolvedValue({ ok: false, error: 'CONSULT_LINK_NOT_PERMITTED' });
    await renderModal();
    fireEvent.click(screen.getByText('+ Issue New Consult Link'));
    fireEvent.change(screen.getByPlaceholderText(/Dr\. Jane Reviewer/), { target: { value: 'Dr. Jane Reviewer' } });
    fireEvent.click(screen.getByText('Issue Link'));
    await act(async () => {});
    expect(screen.getByText(/You don't have permission to issue consult links/)).not.toBeNull();
    expect(screen.queryByText('CONSULT_LINK_NOT_PERMITTED')).toBeNull();
  });

  // Batch 439 (PS-148): opinions sent back, and assessing one.
  it('lists a signed opinion and records the assessment; a major discordance needs a note', async () => {
    getByCaseId.mockResolvedValue({ ok: true, data: [] });
    getOpinionsByCaseId.mockResolvedValueOnce({ ok: true, data: [{ id: 'op-1', tokenId: 't', caseId: 'case-1', consultantIdentifier: 'Dr Outside', signedStatus: 'Signed', opinionText: 'Favour partial mole.', submittedAt: '2026-10-02T10:00:00Z' }] } as never);
    await renderModal();
    expect(screen.getByText('Favour partial mole.')).toBeTruthy();
    fireEvent.click(screen.getByText('Major discordance'));
    await act(async () => { fireEvent.click(screen.getByText('Record assessment')); });
    expect(screen.getByText('Say what differs.')).toBeTruthy();
    expect(assessOpinion).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('What differs'), { target: { value: 'We reported no molar change.' } });
    await act(async () => { fireEvent.click(screen.getByText('Record assessment')); });
    expect(assessOpinion).toHaveBeenCalledWith('op-1', { assessment: 'major-discordance', note: 'We reported no molar change.' });
  });
});
