// @vitest-environment happy-dom
// Batch 533 (Pete, Oct 12, 2026): the urgent preliminary on the Cytology
// screening page: the inline panel, and the hook that sends it (with the
// signature window only when the laboratory requires it).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, renderHook, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { toast, svc } = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn() },
  svc: { release: vi.fn(), signatureRequired: vi.fn(), content: vi.fn() },
}));
vi.mock('react-toastify', () => ({ toast }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }) }));
vi.mock('@/services', async () => {
  const real = await vi.importActual<typeof import('@/services/cytology/releaseCytologyPreliminary')>('@/services/cytology/releaseCytologyPreliminary');
  const reasons = await vi.importActual<typeof import('@/services/cytology/cytologyPreliminaryReasons')>('@/services/cytology/cytologyPreliminaryReasons');
  return {
    ...reasons, cytologyPreliminaryBlock: real.cytologyPreliminaryBlock, cytologyPreliminariesFor: real.cytologyPreliminariesFor,
    releaseCytologyPreliminary: svc.release, preliminarySignatureRequired: svc.signatureRequired, cytologyPreliminaryDeps: {},
  };
});
vi.mock('@/services/cytology/cytologyCaseActions', () => ({ cytologyReviewReportContent: svc.content }));
vi.mock('@/services/cytology/cytologyWorkspaceDeps', () => ({ cytologyWorkspaceDeps: {} }));

import { CytologyPreliminaryPanel } from './CytologyPreliminaryPanel';
import { useCytologyPreliminary } from '../hooks/useCytologyPreliminary';

beforeEach(() => {
  vi.clearAllMocks();
  svc.signatureRequired.mockResolvedValue(true);
  svc.content.mockResolvedValue({ primaryInterpretation: 'HSIL' });
  svc.release.mockResolvedValue({ ok: true, release: { id: 'P1' } });
});
afterEach(cleanup);
const noop = () => {};

describe('CytologyPreliminaryPanel', () => {
  const props = { caseId: 'C1', available: true, sent: [], open: false, reason: null, note: '', signatureNeeded: true, sending: false,
    onStart: noop, onReason: noop, onNote: noop, onSend: noop, onCancel: noop };
  it('offers the button; nothing at all when it can\'t be sent and none was', () => {
    const onStart = vi.fn();
    const { rerender, container } = render(<CytologyPreliminaryPanel {...props} onStart={onStart} />);
    fireEvent.click(screen.getByText('cytologyPreliminary.startBtn'));
    expect(onStart).toHaveBeenCalled();
    rerender(<CytologyPreliminaryPanel {...props} available={false} />);
    expect(container.innerHTML).toBe('');
  });
  it('inline: one click on a reason, Send stays off until one is chosen, and says "Sign and send" when a signature is needed', () => {
    const onReason = vi.fn(); const onSend = vi.fn();
    const { rerender } = render(<CytologyPreliminaryPanel {...props} open onReason={onReason} onSend={onSend} />);
    expect((screen.getByText('cytologyPreliminary.signAndSend') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('cytologyPreliminary.reasons.criticalFinding'));
    expect(onReason).toHaveBeenCalledWith('criticalFinding');
    rerender(<CytologyPreliminaryPanel {...props} open reason="criticalFinding" signatureNeeded={false} onSend={onSend} />);
    expect(screen.getByRole('radio', { name: 'cytologyPreliminary.reasons.criticalFinding' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByText('cytologyPreliminary.send'));
    expect(onSend).toHaveBeenCalled();
  });
  it('lists the preliminaries already sent', () => {
    render(<CytologyPreliminaryPanel {...props} available={false} sent={[{ id: 'P1', specimenId: 'SP1', releasedAt: '2026-10-12T15:00:00Z', releasedBy: { userId: 'U', userName: 'Dr Path' }, reason: 'clinicianRequest', note: 'Call' } as any]} />);
    expect(screen.getByText(/cytologyPreliminary.history/).textContent).toContain('Dr Path');
    expect(screen.getByText(/cytologyPreliminary.history/).textContent).toContain('cytologyPreliminary.historyNote');
  });
});

describe('useCytologyPreliminary', () => {
  const caseData = { id: 'C1', status: 'in-progress', cytologyPreliminaryReleases: [] } as any;
  const args = (over: Record<string, unknown> = {}) => ({
    caseData, specimen: {}, specimenId: 'SP1', reviews: [{ id: 'rv-1' } as any], categories: [], finalDiagnosisReviewId: 'rv-1',
    signedOut: false, isPathologist: true, user: { id: 'U', name: 'Dr Path' }, reload: vi.fn(async () => {}), ...over,
  });
  it('available only with a final diagnosis, before sign-out', () => {
    expect(renderHook(() => useCytologyPreliminary(args() as any)).result.current.available).toBe(true);
    expect(renderHook(() => useCytologyPreliminary(args({ signedOut: true }) as any)).result.current.available).toBe(false);
    expect(renderHook(() => useCytologyPreliminary(args({ finalDiagnosisReviewId: undefined }) as any)).result.current.available).toBe(false);
  });
  it('with a signature required, Send opens the signature window; the confirmation goes to the service', async () => {
    const a = args();
    const { result } = renderHook(() => useCytologyPreliminary(a as any));
    await act(async () => { await result.current.start(); });
    act(() => { result.current.setReason('criticalFinding'); });
    act(() => { result.current.requestSend(); });
    expect(result.current.confirming).toBe(true);
    expect(svc.release).not.toHaveBeenCalled();
    await act(async () => { await result.current.send({ confirmationId: 'c1' } as any); });
    expect(svc.release.mock.calls[0][0]).toMatchObject({ specimenId: 'SP1', reviewRecordId: 'rv-1', reason: 'criticalFinding', confirmation: { confirmationId: 'c1' }, content: { primaryInterpretation: 'HSIL' } });
    expect(toast.success).toHaveBeenCalledWith('cytologyPreliminary.sent');
    expect(a.reload).toHaveBeenCalled();
  });
  it('with the signature off, Send goes at once; a refusal says why', async () => {
    svc.signatureRequired.mockResolvedValue(false);
    svc.release.mockResolvedValue({ ok: false, error: 'notPermitted' });
    const { result } = renderHook(() => useCytologyPreliminary(args() as any));
    await act(async () => { await result.current.start(); });
    act(() => { result.current.setReason('urgentManagement'); });
    await act(async () => { result.current.requestSend(); await Promise.resolve(); await Promise.resolve(); });
    expect(svc.release).toHaveBeenCalled();
    expect(svc.release.mock.calls[0][0].confirmation).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith('cytologyPreliminary.errors.notPermitted');
  });
});
