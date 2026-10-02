// @vitest-environment happy-dom
// Batch 399 (Pete): the structured verbal report. A dictionary match suggests
// a critical result; a critical result going to anyone but the operating
// surgeon brings up the big "Surgeon unavailable" button and its reasons, and
// nothing can be logged until one is chosen.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts && !('defaultValue' in opts) ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { recordVerbalReport, listeners } = vi.hoisted(() => ({ recordVerbalReport: vi.fn(), listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<any>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<any>('@/services/fieldRequirements/intraopChecks');
  const vr = await vi.importActual<any>('@/services/intraop/verbalReport');
  const match = await vi.importActual<any>('@/services/intraop/matchIntraopCriticalResults');
  const seeds = await vi.importActual<any>('@/services/intraop/intraopCriticalResultSeeds');
  const dictation = await vi.importActual<any>('@/services/intraop/parseVerbalReportDictation');
  return {
    ...rules, ...checks, ...vr, ...match,
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
    intraoperativeService: { recordVerbalReport },
    intraopCriticalResultService: { getAll: async () => ({ ok: true, data: seeds.SEED_INTRAOP_CRITICAL_RESULTS }) },
    reasonDictionaryService: { getAll: async () => ({ ok: true, data: [
      { id: 'SU_SCRUBBED', category: 'SURGEON_UNAVAILABLE', name: 'Surgeon scrubbed in a critical step', description: '', status: 'Active' },
      { id: 'SU_OTHER', category: 'SURGEON_UNAVAILABLE', name: 'Other', description: '', status: 'Active' },
    ] }) },
    physicianService: { getAll: async () => ({ ok: true, data: [] }) },
    // Batch 400: the AI is replaced by the rules here (no model in tests).
    parseVerbalReportDictationDefault: (text: string, ctx: any) => dictation.parseVerbalReportDictation(text, ctx),
    applyDictationProposal: dictation.applyDictationProposal,
  };
});
vi.mock('@/contexts/VoiceProvider', () => ({ useVoice: () => ({ startDictation: vi.fn(), phase: 'standby', dictationTarget: null }) }));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({ SpellCheckedTextarea: (props: any) => <textarea {...props} /> }));
vi.mock('@/hooks/useFieldRequirements', async () => {
  const rules = await vi.importActual<any>('@/services/fieldRequirements/fieldRequirementRules');
  return { useFieldRequirements: (page: any) => rules.resolveFieldRequirements(page) };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'PATH-001', name: 'Pete Nimmo' } }) }));

import { VerbalReportForm } from './VerbalReportForm';

afterEach(() => { cleanup(); listeners.length = 0; recordVerbalReport.mockReset(); });

const entry = (frozenSectionDiagnosis: string) => ({
  id: 'intraop-9', surgeon: 'Dr. Faulkner', performedBy: { userId: 'u', userName: 'U' },
  specimens: [{ id: 'sp-a', specimenLabel: 'A', milestones: [], frozenSectionDiagnosis }],
}) as any;
const logBtn = () => screen.getByText('intraopQueue.entryCard.logNow').closest('button') as HTMLButtonElement;

describe('VerbalReportForm (Batch 399)', () => {
  it('a positive margin is suggested as a critical result; a resident then needs a Surgeon unavailable reason', async () => {
    recordVerbalReport.mockResolvedValue({ ok: true, data: {} });
    const onLogged = vi.fn();
    render(<VerbalReportForm entry={entry('Tumor at the margin')} onLogged={onLogged} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByText('intraopQueue.verbalReport.criticalSuggested')).toBeTruthy());
    expect((screen.getByRole('checkbox', { name: /criticalCheckbox/ }) as HTMLInputElement).checked).toBe(true);

    fireEvent.change(screen.getByLabelText(/verbalReportRecipient/), { target: { value: 'Dr. Patel' } });
    fireEvent.click(screen.getByText('intraopQueue.verbalReport.roles.surgical_resident'));
    fireEvent.click(screen.getByRole('checkbox', { name: /readBackCheckbox/ }));
    expect(logBtn().disabled).toBe(true);
    expect(screen.getAllByRole('status').map(e => e.textContent).join(' ')).toContain('surgeonUnavailableReason');

    fireEvent.click(screen.getByText('intraopQueue.verbalReport.surgeonUnavailableButton'));
    fireEvent.click(await screen.findByText('intraopQueue.verbalReport.reasons.SU_SCRUBBED'));
    expect(logBtn().disabled).toBe(false);
    fireEvent.click(logBtn());
    await waitFor(() => expect(onLogged).toHaveBeenCalled());
    expect(recordVerbalReport).toHaveBeenCalledWith('intraop-9', expect.objectContaining({
      receivedBy: 'Dr. Patel', recipientRole: 'surgical_resident', readBackConfirmed: true, critical: true,
      suggestedCriticalIds: ['icr-positive-margin'], surgeonUnavailable: expect.objectContaining({ reasonId: 'SU_SCRUBBED' }),
    }));
  });

  it('picking Operating surgeon fills in the session surgeon and needs no reason', async () => {
    render(<VerbalReportForm entry={entry('Tumor at the margin')} onLogged={() => {}} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByText('intraopQueue.verbalReport.criticalSuggested')).toBeTruthy());
    fireEvent.click(screen.getByText('intraopQueue.verbalReport.roles.operating_surgeon'));
    expect((screen.getByLabelText(/verbalReportRecipient/) as HTMLInputElement).value).toBe('Dr. Faulkner');
    fireEvent.click(screen.getByRole('checkbox', { name: /readBackCheckbox/ }));
    expect(screen.queryByText('intraopQueue.verbalReport.surgeonUnavailableButton')).toBeNull();
    expect(logBtn().disabled).toBe(false);
  });

  it('a benign result isn\'t flagged, and the pathologist can still flag it', async () => {
    render(<VerbalReportForm entry={entry('Benign, negative for carcinoma')} onLogged={() => {}} onCancel={() => {}} />);
    await waitFor(() => expect(screen.queryByText('intraopQueue.verbalReport.criticalSuggested')).toBeNull());
    const box = screen.getByRole('checkbox', { name: /criticalCheckbox/ }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    fireEvent.click(screen.getByText('intraopQueue.verbalReport.roles.or_staff'));
    expect(screen.getByText('intraopQueue.verbalReport.surgeonUnavailableButton')).toBeTruthy();
  });

  it('"report logged" by voice does nothing until the form is complete', async () => {
    render(<VerbalReportForm entry={entry('')} onLogged={() => {}} onCancel={() => {}} />);
    listeners.forEach(cb => cb('INTRAOP_LOG_SURGEON_REPORT'));
    expect(recordVerbalReport).not.toHaveBeenCalled();
  });

  it('Batch 400: dictation fills in who, role and read-back, marked for checking; the pathologist still logs', async () => {
    recordVerbalReport.mockResolvedValue({ ok: true, data: {} });
    const onLogged = vi.fn();
    render(<VerbalReportForm entry={entry('Benign')} onLogged={onLogged} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('intraopQueue.verbalReport.dictationLabel'), { target: { value: 'Called results to Dr. Faulkner, operating surgeon. Read back confirmed.' } });
    fireEvent.click(screen.getByText('intraopQueue.verbalReport.fillFromDictation'));
    await waitFor(() => expect((screen.getByLabelText(/verbalReportRecipient/) as HTMLInputElement).value).toBe('Dr. Faulkner'));
    expect((screen.getByRole('checkbox', { name: /readBackCheckbox/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByText('intraopQueue.verbalReport.fromDictation')).toHaveLength(3);
    expect(recordVerbalReport).not.toHaveBeenCalled();
    fireEvent.click(logBtn());
    await waitFor(() => expect(onLogged).toHaveBeenCalled());
    expect(recordVerbalReport).toHaveBeenCalledWith('intraop-9', expect.objectContaining({
      recipientRole: 'operating_surgeon', note: 'Called results to Dr. Faulkner, operating surgeon. Read back confirmed.',
      dictation: { engine: 'rules', filledFields: ['verbalReportRecipient', 'verbalReportRole', 'verbalReportReadBack'] },
    }));
  });
});
