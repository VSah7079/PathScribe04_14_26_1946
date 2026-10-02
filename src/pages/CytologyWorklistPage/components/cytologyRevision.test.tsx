// @vitest-environment happy-dom
// Batch 390 (PS-340): correcting or adding to a signed-out cytology report.
// The actions (each behind its own permission), the correction/addendum form
// (what it still needs, the mandatory reason), and the hook that releases it
// (signature confirmation, the release service, the corrected review becoming
// the Final Diagnosis, the refusals).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, renderHook, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({
  SpellCheckedTextarea: (p: any) => <textarea value={p.value} onChange={p.onChange} rows={p.rows} className={p.className} placeholder={p.placeholder} />,
}));
const { allowed, toast, gate, release, registry } = vi.hoisted(() => ({
  registry: { submit: vi.fn().mockResolvedValue({ outcome: 'sent' }) },
  allowed: { correct: true, addend: true },
  toast: { error: vi.fn(), success: vi.fn() },
  gate: { accept: vi.fn(), commit: vi.fn(), release: vi.fn() },
  release: { correction: vi.fn(), addendum: vi.fn() },
}));
vi.mock('react-toastify', () => ({ toast }));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ loading: false, has: () => true, decide: (k: string) => ({ allowed: k === 'cytology:report:correct' ? allowed.correct : allowed.addend }) }),
}));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/cytologyChecks')>('@/services/fieldRequirements/cytologyChecks');
  const authz = await vi.importActual<typeof import('@/services/authorization/capabilityCatalog')>('@/services/authorization/capabilityCatalog');
  return { ...rules, ...checks, ...authz, signatureGate: gate };
});
vi.mock('@/services/cytology/releaseCytologyCorrection', () => ({ releaseCytologyCorrection: release.correction }));
vi.mock('@/services/cytology/releaseCytologyAddendum', () => ({ releaseCytologyAddendum: release.addendum }));
vi.mock('@/services/screeningRegistry/submitCytologyRevisionToRegistry', () => ({ submitCytologyRevisionToRegistry: registry.submit }));
vi.mock('@/services/screeningRegistry/submitCytologyRevisionToRegistryDeps', () => ({ submitCytologyRevisionToRegistryDeps: {} }));

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import { EMPTY_CORRECTION_DRAFT } from '@/services/cytology/resolveCytologyRevisionInputs';
import { CytologyRevisionActions } from './CytologyRevisionActions';
import { CytologyRevisionPanel } from './CytologyRevisionPanel';
import { useCytologyRevision } from '../hooks/useCytologyRevision';

beforeEach(() => { allowed.correct = true; allowed.addend = true; vi.clearAllMocks(); });
afterEach(cleanup);
const noop = () => {};
const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('cytology', over);
const option = (id: string) => ({ id, label: id, section: 'x', abbreviation: '' } as any);

const rec = (over: any) => ({ id: 'r', caseId: 'C', specimenId: 'S', reviewRecordId: 'rv', reportContent: {}, signedBy: { userId: 'u', userName: 'Dr. Reed', isPathologist: true }, signedAt: '2026-09-01T00:00:00Z', ...over });

describe('CytologyRevisionActions', () => {
  it('offers both actions and starts the one clicked', () => {
    const onStart = vi.fn();
    render(<CytologyRevisionActions records={[rec({})]} activeMode={null} onStart={onStart} />);
    fireEvent.click(screen.getByText('cytologyRevision.correctBtn'));
    fireEvent.click(screen.getByText('cytologyRevision.addendumBtn'));
    expect(onStart.mock.calls).toEqual([['correction'], ['addendum']]);
  });
  it('a user without a permission cannot start that action', () => {
    allowed.correct = false;
    const onStart = vi.fn();
    render(<CytologyRevisionActions records={[rec({})]} activeMode={null} onStart={onStart} />);
    fireEvent.click(screen.getByText('cytologyRevision.correctBtn'));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText('cytologyRevision.correctBtn').closest('button')!.getAttribute('data-capability')).toBe('cytology:report:correct');
    fireEvent.click(screen.getByText('cytologyRevision.addendumBtn'));
    expect(onStart).toHaveBeenCalledWith('addendum');
  });
  it('both are off while a form is open', () => {
    render(<CytologyRevisionActions records={[rec({})]} activeMode="correction" onStart={noop} />);
    expect((screen.getByText('cytologyRevision.correctBtn').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('cytologyRevision.addendumBtn').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
  it('lists each correction and addendum, oldest first, with its reason as stored', () => {
    render(<CytologyRevisionActions activeMode={null} onStart={noop} records={[
      rec({ id: 'c', signedAt: '2026-09-03T00:00:00Z', amendsRecordId: 'o', revisionReason: 'Wrong category.' }),
      rec({ id: 'o', signedAt: '2026-09-01T00:00:00Z' }),
      rec({ id: 'a', signedAt: '2026-09-02T00:00:00Z', addsToRecordId: 'o', revisionReason: 'HPV result.' }),
    ]} />);
    const items = Array.from(document.querySelectorAll('li')).map(li => li.textContent ?? '');
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('history.addendum');
    expect(items[0]).toContain('HPV result.');
    expect(items[1]).toContain('history.correction');
    expect(items[1]).toContain('Wrong category.');
  });
  it('shows no history for a report that was never changed', () => {
    render(<CytologyRevisionActions records={[rec({})]} activeMode={null} onStart={noop} />);
    expect(screen.queryByText('cytologyRevision.history.title')).toBeNull();
  });
});

function panel(over: Partial<React.ComponentProps<typeof CytologyRevisionPanel>> = {}) {
  return render(<CytologyRevisionPanel
    mode="correction" currentDiagnosis="ASC-US" draft={{ ...EMPTY_CORRECTION_DRAFT, primaryInterpretationId: 'nilm' }} onDraftChange={noop}
    addendumText="" onAddendumTextChange={noop} reason="" onReasonChange={noop} saving={false} requirements={reqs()}
    generalCategorizationOptions={[option('g1')]} adequacyOptions={[option('a1')]} primaryOptions={[option('nilm')]}
    additionalOptions={[]} recommendationOptions={[]} categoryLabel={id => id} onRelease={noop} onCancel={noop} {...over}
  />);
}
const releaseBtn = (kind: 'correction' | 'addendum') => screen.getByText(`cytologyRevision.${kind}.releaseBtn`).closest('button') as HTMLButtonElement;

describe('CytologyRevisionPanel', () => {
  it('a correction cannot be released without a reason, and says what is missing', () => {
    panel();
    expect(releaseBtn('correction').disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.cytology.revisionReason');
    expect(screen.getByText(/currentlyReported/).textContent).toContain('ASC-US');
  });
  it('a correction with a reason can be released', () => {
    const onRelease = vi.fn();
    panel({ reason: 'Wrong category selected.', onRelease });
    expect(releaseBtn('correction').disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(releaseBtn('correction'));
    expect(onRelease).toHaveBeenCalledTimes(1);
  });
  it('a correction without a primary interpretation is held too', () => {
    panel({ draft: EMPTY_CORRECTION_DRAFT, reason: 'why' });
    expect(releaseBtn('correction').disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('reviewPrimaryInterpretation');
  });
  it('a correction follows what the organisation requires of a review', () => {
    panel({ reason: 'why', requirements: reqs({ reviewAdequacy: true }) });
    expect(releaseBtn('correction').disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('reviewAdequacy');
  });
  it('an addendum needs its text and its reason, and never shows the diagnosis fields', () => {
    const { rerender } = panel({ mode: 'addendum' });
    expect(releaseBtn('addendum').disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('revisionAddendumText');
    expect(screen.queryByText('cytologyScreening.reviewForm.primary')).toBeNull();
    rerender(<CytologyRevisionPanel mode="addendum" currentDiagnosis="x" draft={EMPTY_CORRECTION_DRAFT} onDraftChange={noop} addendumText="HPV 16 positive." onAddendumTextChange={noop}
      reason="" onReasonChange={noop} saving={false} requirements={reqs()} generalCategorizationOptions={[]} adequacyOptions={[]} primaryOptions={[]} additionalOptions={[]}
      recommendationOptions={[]} categoryLabel={id => id} onRelease={noop} onCancel={noop} />);
    expect(screen.getByRole('status').textContent).not.toContain('revisionAddendumText');
    expect(releaseBtn('addendum').disabled).toBe(true);
  });
  it('typing reports the change, and Cancel is offered', () => {
    const onReasonChange = vi.fn(); const onCancel = vi.fn();
    panel({ onReasonChange, onCancel });
    fireEvent.change(screen.getAllByPlaceholderText('cytologyRevision.reasonPlaceholder')[0], { target: { value: 'because' } });
    expect(onReasonChange).toHaveBeenCalledWith('because');
    fireEvent.click(screen.getByText('common.cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
  it('stars the reason and, for an addendum, its text', () => {
    panel({ mode: 'addendum' });
    expect(document.querySelectorAll('.ps-conf-required').length).toBe(2);
  });
});

describe('useCytologyRevision', () => {
  const signedReview: any = { id: 'rv1', primaryInterpretationId: 'hsil', primaryInterpretationComment: 'slide 2', additionalInterpretations: [], recommendations: [], adequacySelections: [] };
  const caseData = { id: 'CASE-1', accession: { fullAccession: 'S26-1-CYT' }, patient: { firstName: 'Ann', lastName: 'Lee' }, order: { facilityId: 'F1' } };
  const confirmation: any = { confirmationId: 'x' };
  function setup() {
    const updateSpecimen = vi.fn().mockResolvedValue(undefined);
    const reload = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(() => useCytologyRevision({
      caseData, specimen: { description: 'Pap' }, specimenId: 'SP-1', signedReview, categories: [{ id: 'hsil', requiresPathologistReview: true } as any],
      user: { id: 'PATH-1', name: 'Dr. Reed' }, isPathologist: true, isGynCytology: true, updateSpecimen, reload,
    }));
    return { ...hook, updateSpecimen, reload };
  }
  beforeEach(() => {
    gate.accept.mockResolvedValue({ ok: true }); gate.commit.mockResolvedValue({});
    release.correction.mockResolvedValue({ ok: true, signOutRecordId: 'so2', review: { id: 'rv2', primaryInterpretationId: 'nilm', specimenId: 'SP-1', caseId: 'CASE-1' } });
    release.addendum.mockResolvedValue({ ok: true, signOutRecordId: 'so3' });
  });

  it('starting a correction fills the form from the signed review and clears the last reason', () => {
    const { result } = setup();
    act(() => result.current.start('correction'));
    expect(result.current.mode).toBe('correction');
    expect(result.current.draft).toMatchObject({ primaryInterpretationId: 'hsil', primaryInterpretationComment: 'slide 2' });
    expect(result.current.reason).toBe('');
  });

  it('a correction: confirms the signature, releases with the reason, makes the corrected review the Final Diagnosis, commits, reloads', async () => {
    const { result, updateSpecimen, reload } = setup();
    act(() => result.current.start('correction'));
    act(() => result.current.setReason('Wrong category.'));
    await act(async () => { await result.current.release(confirmation); });

    expect(gate.accept).toHaveBeenCalledWith(confirmation, { caseId: 'CASE-1', caseRef: 'S26-1-CYT', actions: ['cytology-sign-out'] });
    const args = release.correction.mock.calls[0];
    expect(args[0]).toBe('CASE-1'); expect(args[1]).toBe('SP-1');
    expect(args[2]).toMatchObject({ primaryInterpretationId: 'hsil', requiresPathologistReview: true });
    expect(args[5]).toMatchObject({ accessionNumber: 'S26-1-CYT', facilityId: 'F1' });
    expect(args[7]).toEqual({ id: 'PATH-1', name: 'Dr. Reed', isPathologist: true });
    expect(args[8]).toBe('Wrong category.');
    expect(updateSpecimen).toHaveBeenCalledWith({ finalDiagnosis: expect.objectContaining({ reviewRecordId: 'rv2', selectedBy: 'PATH-1' }) });
    expect(gate.commit).toHaveBeenCalledWith('CASE-1', 'signed', { kind: 'cytology-sign-out', id: 'so2' });
    expect(toast.success).toHaveBeenCalledWith('cytologyRevision.toasts.correctionReleased');
    // Batch 419: the registry gets the corrected version.
    expect(registry.submit).toHaveBeenCalledWith(expect.objectContaining({ signOutRecordId: 'so2', kind: 'correction', isGynCytology: true }), {});
    expect(reload).toHaveBeenCalled();
    expect(result.current.mode).toBeNull();
  });

  it('an addendum: releases the text with the reason and does not touch the Final Diagnosis', async () => {
    const { result, updateSpecimen } = setup();
    act(() => result.current.start('addendum'));
    act(() => { result.current.setAddendumText('HPV 16 positive.'); result.current.setReason('Result received later.'); });
    await act(async () => { await result.current.release(confirmation); });
    expect(release.addendum).toHaveBeenCalledWith('CASE-1', 'SP-1', 'HPV 16 positive.', { id: 'PATH-1', name: 'Dr. Reed', isPathologist: true }, 'Result received later.', 'F1');
    expect(release.correction).not.toHaveBeenCalled();
    expect(updateSpecimen).not.toHaveBeenCalled();
    expect(gate.commit).toHaveBeenCalledWith('CASE-1', 'signed', { kind: 'cytology-sign-out', id: 'so3' });
    expect(toast.success).toHaveBeenCalledWith('cytologyRevision.toasts.addendumReleased');
  });

  it('a refused signature releases nothing', async () => {
    gate.accept.mockResolvedValue({ ok: false, reason: 'wrong_credentials' });
    const { result } = setup();
    act(() => result.current.start('correction'));
    await act(async () => { await result.current.release(confirmation); });
    expect(toast.error).toHaveBeenCalledWith('signatureEvidence.refused.wrong_credentials');
    expect(release.correction).not.toHaveBeenCalled();
    expect(gate.commit).not.toHaveBeenCalled();
  });

  it('a refused release (no permission) frees the signature, says so, changes nothing and keeps the form open', async () => {
    release.correction.mockResolvedValue({ ok: false, notPermitted: true, error: 'x' });
    const { result, updateSpecimen, reload } = setup();
    act(() => result.current.start('correction'));
    await act(async () => { await result.current.release(confirmation); });
    expect(gate.release).toHaveBeenCalledWith('CASE-1');
    expect(toast.error).toHaveBeenCalledWith('cytologyRevision.toasts.notPermitted');
    expect(updateSpecimen).not.toHaveBeenCalled();
    expect(gate.commit).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(result.current.mode).toBe('correction');
  });

  it('any other failure says the report could not be released', async () => {
    release.addendum.mockResolvedValue({ ok: false, error: 'boom' });
    const { result } = setup();
    act(() => result.current.start('addendum'));
    await act(async () => { await result.current.release(confirmation); });
    expect(toast.error).toHaveBeenCalledWith('cytologyRevision.toasts.failed');
  });

  it('cancel closes the form', () => {
    const { result } = setup();
    act(() => result.current.start('addendum'));
    act(() => result.current.cancel());
    expect(result.current.mode).toBeNull();
  });
});
