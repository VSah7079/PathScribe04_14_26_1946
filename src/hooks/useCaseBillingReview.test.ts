// @vitest-environment happy-dom
// Batch 460: the shared billing review changes (Cytology Workspace, Microtomy).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const m = vi.hoisted(() => ({
  allowed: true,
  signedOut: false,
  enforceBillingReview: vi.fn(),
  recordCaseCharge: vi.fn(async () => 'charged'),
  recordCaseCredit: vi.fn(async () => 'credited'),
  recordCaseCodeCorrection: vi.fn(async () => 'corrected'),
  auditBillingSuggestionDeclined: vi.fn(async () => undefined),
  enforceAppliedCodeCorrection: vi.fn(async () => true),
}));
vi.mock('@/services', async () => {
  const coding = await import('@/services/billing/caseBillingCoding');
  return {
    ...coding,
    enforceBillingReview: async (...a: unknown[]) => { m.enforceBillingReview(...a); return m.allowed; },
    recordCaseCharge: m.recordCaseCharge,
    recordCaseCredit: m.recordCaseCredit,
    recordCaseCodeCorrection: m.recordCaseCodeCorrection,
    auditBillingSuggestionDeclined: m.auditBillingSuggestionDeclined,
    enforceAppliedCodeCorrection: m.enforceAppliedCodeCorrection,
    isCaseSignedOutForBilling: () => m.signedOut,
  };
});

import { useCaseBillingReview, type CaseBillingWriter } from './useCaseBillingReview';

const caseData = { id: 'C1', status: 'in-progress', specimens: [{ id: 'A', label: 'A', blocks: [{ id: 'b1', label: '1', coding: { cpt: [], rejectedCpt: [] } }] }] } as any;

function setup(over: Partial<{ chargesEnabled: boolean; writer: CaseBillingWriter; onLedgerChanged: () => void }> = {}) {
  const saved: any[] = [];
  const writer: CaseBillingWriter = over.writer ?? {
    saveUnitCoding: vi.fn(async (_s, _u, change) => { saved.push(change({ cpt: [], rejectedCpt: [] })); return caseData.specimens; }),
    saveSpecimens: vi.fn(async change => change(caseData.specimens)),
  };
  const warnings: string[] = []; const failures: unknown[] = []; const specimens: any[] = [];
  const hook = renderHook(() => useCaseBillingReview({
    caseData, user: { id: 'u1', name: 'Dr U' }, writer,
    onSpecimens: s => specimens.push(s), chargesEnabled: over.chargesEnabled ?? true,
    onWarning: k => warnings.push(k), onSaveFailed: e => failures.push(e), onLedgerChanged: over.onLedgerChanged,
  }));
  return { hook, writer, saved, warnings, failures, specimens };
}

beforeEach(() => { m.allowed = true; m.signedOut = false; vi.clearAllMocks(); });

describe('useCaseBillingReview', () => {
  it('approving saves the code, then charges it', async () => {
    const h = setup();
    await act(() => h.hook.result.current.panelHandlers.onApprove('A', 'b1', '88342', 's1'));
    expect(h.saved).toEqual([{ cpt: [{ code: '88342', stainOrderId: 's1' }], rejectedCpt: [] }]);
    expect(m.recordCaseCharge).toHaveBeenCalledWith(expect.objectContaining({ specimenId: 'A', blockId: 'b1', code: '88342' }));
  });
  it('without billing:applied-code:review nothing changes and the person is told', async () => {
    m.allowed = false;
    const h = setup();
    await act(() => h.hook.result.current.panelHandlers.onApprove('A', 'b1', '88342'));
    await act(() => h.hook.result.current.panelHandlers.onAddBaseCode('A', '88305'));
    expect(h.writer.saveUnitCoding).not.toHaveBeenCalled();
    expect(h.writer.saveSpecimens).not.toHaveBeenCalled();
    expect(m.recordCaseCharge).not.toHaveBeenCalled();
    expect(h.warnings).toEqual(['billingReview.toast.notPermitted', 'billingReview.toast.notPermitted']);
  });
  it('a save that fails charges nothing and is reported', async () => {
    const h = setup({ writer: { saveUnitCoding: async () => { throw new Error('conflict'); }, saveSpecimens: async () => [] } });
    await act(() => h.hook.result.current.panelHandlers.onApprove('A', 'b1', '88342'));
    expect(m.recordCaseCharge).not.toHaveBeenCalled();
    expect(h.failures).toHaveLength(1);
  });
  it('an Assist-mode case changes codes without charging', async () => {
    const h = setup({ chargesEnabled: false });
    await act(() => h.hook.result.current.panelHandlers.onAddBaseCode('A', '88305'));
    expect(h.writer.saveSpecimens).toHaveBeenCalled();
    expect(m.recordCaseCharge).not.toHaveBeenCalled();
  });
  it('declining audits the decision; deleting credits', async () => {
    const h = setup();
    await act(() => h.hook.result.current.panelHandlers.onRejectOnly('A', 'b1', '88342', 's1'));
    expect(m.auditBillingSuggestionDeclined).toHaveBeenCalled();
    await act(() => h.hook.result.current.panelHandlers.onDelete('A', 'b1', '88342', 's1'));
    expect(m.recordCaseCredit).toHaveBeenCalledWith(expect.objectContaining({ code: '88342', blockId: 'b1' }));
  });
  it('on a signed-out case the post-sign-out reason is asked first; cancelling changes nothing', async () => {
    m.signedOut = true;
    const h = setup();
    let done: Promise<void>;
    act(() => { done = h.hook.result.current.panelHandlers.onApprove('A', 'b1', '88342'); });
    await vi.waitFor(() => expect(h.hook.result.current.postSignoutPrompt).toEqual({ summary: '88342 approved.' }));
    act(() => h.hook.result.current.cancelPostSignout());
    await act(() => done!);
    expect(h.writer.saveUnitCoding).not.toHaveBeenCalled();
    // Confirmed: saved and charged with the reason.
    act(() => { done = h.hook.result.current.panelHandlers.onApprove('A', 'b1', '88342'); });
    await vi.waitFor(() => expect(h.hook.result.current.postSignoutPrompt).not.toBeNull());
    act(() => h.hook.result.current.confirmPostSignout({ reasonId: 'missed', comment: 'IHC added' }));
    await act(() => done!);
    expect(m.recordCaseCharge).toHaveBeenCalledWith(expect.objectContaining({ postSignoutContext: { reasonId: 'missed', comment: 'IHC added' } }));
  });
});

describe('useCaseBillingReview (verification fixes)', () => {
  it('a case that isn\'t billed here is never asked for the post-sign-out reason', async () => {
    m.signedOut = true;
    const h = setup({ chargesEnabled: false });
    await act(() => h.hook.result.current.panelHandlers.onApprove('A', 'b1', '88342'));
    expect(h.hook.result.current.postSignoutPrompt).toBeNull();
    expect(h.writer.saveUnitCoding).toHaveBeenCalled();
    expect(m.recordCaseCharge).not.toHaveBeenCalled();
  });
  it('a correction needs the review permission as well as the correction permission', async () => {
    m.allowed = false;
    const h = setup();
    act(() => h.hook.result.current.panelHandlers.onCorrect('A', 'b1', '88342'));
    await act(() => h.hook.result.current.confirmCorrection('88341'));
    expect(h.writer.saveUnitCoding).not.toHaveBeenCalled();
    expect(m.recordCaseCodeCorrection).not.toHaveBeenCalled();
  });
  it('the ledger view is refreshed once the charge is written', async () => {
    const changed = vi.fn();
    const h = setup({ onLedgerChanged: changed });
    await act(() => h.hook.result.current.panelHandlers.onApprove('A', 'b1', '88342'));
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
