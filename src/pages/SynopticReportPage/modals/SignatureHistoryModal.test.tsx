// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/modals/SignatureHistoryModal.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 483 (PS-359 tracker follow-up — "signature-record viewing screen"):
// services/signatures/ (Batch 345) has recorded every signature applied to
// a case since then, with no screen anywhere reading it back. HeaderBar's
// new "recorded signatures" chip opens this modal, wired the same way
// ChangeHistoryModal/VersionHistoryModal are (see ChangeHistoryModal.test.tsx).
// Real English locale.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Case } from '@/types/case/Case';
import type { SignatureRecord } from '@/services/signatures/ISignatureRecordService';

vi.mock('react-router', async importOriginal => ({ ...(await importOriginal<typeof import('react-router')>()), useNavigate: () => vi.fn() }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => vi.fn() }));
vi.mock('@/contexts/MessagingContext', () => ({ useMessaging: () => ({ setPortalOpen: vi.fn() }) }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, can: () => false, decide: () => ({ allowed: false }) }) }));

import HeaderBar from '../components/HeaderBar';
import { SignatureHistoryModal } from './SignatureHistoryModal';

beforeAll(async () => { await i18n.changeLanguage('en'); });
afterEach(() => cleanup());

const evidence = (over: Partial<SignatureRecord['evidence']> = {}): SignatureRecord['evidence'] => ({
  confirmationId: 'conf-1', signerId: 'u1', signerName: 'Dr Early', action: 'case-sign-out',
  caseRef: 'C1', method: 'password', confirmedAt: '2026-10-01T09:00:00Z', verifiedAt: '2026-10-01T09:00:01Z',
  sso: null, verifiedBy: 'browser', ...over,
});

// As the service returns them: insertion order, not newest-first.
const records: SignatureRecord[] = [
  { id: 'sig-1', caseId: 'C1', outcome: 'signed', recordedAt: '2026-10-01T09:00:01Z', link: null, evidence: evidence({ action: 'case-sign-out', signerName: 'Dr Early' }) },
  { id: 'sig-2', caseId: 'C1', outcome: 'released_for_countersign', recordedAt: '2026-10-03T09:00:01Z', link: null, evidence: evidence({ action: 'cytology-sign-out', signerName: 'Dr Latest', method: 'sso', sso: { issuer: 'https://idp.example', subject: 'sub-1', authTime: 1, tokenSha256: 'abc' } }) },
  { id: 'sig-3', caseId: 'C1', outcome: 'finalized', recordedAt: '2026-10-02T09:00:01Z', link: { kind: 'autopsy-snapshot', tier: 'FAD' }, evidence: evidence({ action: 'autopsy-fad', signerName: 'Dr Middle', verifiedBy: 'server' }) },
];
const caseData = { id: 'C1', status: 'in-progress', accession: { fullAccession: 'S26-483' }, specimens: [] } as unknown as Case;

/** HeaderBar's chip and the modal, wired as SynopticReportPage wires them. */
const ReportHeaderWithHistory: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <HeaderBar caseData={caseData} onSignOut={vi.fn()} onNavigate={vi.fn()} signatureCount={records.length} onOpenSignatureHistory={() => setOpen(true)} />
      {open && <SignatureHistoryModal records={records} onClose={() => setOpen(false)} />}
    </>
  );
};

const shownSigners = () => Array.from(document.querySelectorAll('.ps-verhist-item')).map(e => e.querySelector('.ps-verhist-row')?.textContent);

describe('Batch 483 — the report page\'s recorded-signatures chip and Signature history', () => {
  it('the chip counts the recorded signatures and opens Signature history', () => {
    render(<ReportHeaderWithHistory />);
    expect(screen.queryByText('Signature History')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /3 signatures recorded — click to view history/ }));
    expect(screen.getByText(/Signature History/)).toBeTruthy();
    expect(screen.getByText(/3 signatures recorded for this case/)).toBeTruthy();
  });

  it('no chip when nothing has been recorded', () => {
    render(<HeaderBar caseData={caseData} onSignOut={vi.fn()} onNavigate={vi.fn()} signatureCount={0} onOpenSignatureHistory={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /recorded — click to view history/ })).toBeNull();
  });

  it('lists signatures newest first, with action, outcome and signer', () => {
    render(<ReportHeaderWithHistory />);
    fireEvent.click(screen.getByRole('button', { name: /recorded/ }));
    expect(shownSigners()?.map(s => s?.includes('Dr Latest') ? 'Dr Latest' : s?.includes('Dr Middle') ? 'Dr Middle' : 'Dr Early'))
      .toEqual(['Dr Latest', 'Dr Middle', 'Dr Early']);
    expect(screen.getByText('Cytology sign-out')).toBeTruthy();
    expect(screen.getByText('Released for countersign')).toBeTruthy();
    expect(screen.getByText(/Autopsy FAD signature \(FAD\)/)).toBeTruthy();
    expect(screen.getByText('Finalized')).toBeTruthy();
  });

  it('shows the SSO identity provider only when the signature was confirmed by SSO', () => {
    render(<ReportHeaderWithHistory />);
    fireEvent.click(screen.getByRole('button', { name: /recorded/ }));
    expect(screen.getByText('https://idp.example')).toBeTruthy();
    // Dr Early's and Dr Middle's records used password/no-SSO — only one issuer line shown.
    expect(screen.getAllByText('Identity provider:')).toHaveLength(1);
  });

  it('distinguishes browser-only verification from server verification', () => {
    render(<ReportHeaderWithHistory />);
    fireEvent.click(screen.getByRole('button', { name: /recorded/ }));
    expect(screen.getAllByText(/verified in-browser/)).toHaveLength(2);
    expect(screen.getAllByText('verified by the server')).toHaveLength(1);
  });

  it('empty state when there are no records', () => {
    render(<SignatureHistoryModal records={[]} onClose={vi.fn()} />);
    expect(screen.getByText('No signatures recorded for this case yet.')).toBeTruthy();
  });
});
