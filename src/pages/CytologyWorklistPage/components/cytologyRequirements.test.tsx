// @vitest-environment happy-dom
// Batch 386 (PS-359): the five Cytology screening forms take what they need
// from the organisation's Field Requirements (page "cytology"): the review
// form, the CISOE-A form, the 5-year retrospective banner and the
// cyto-histologic correlation banner. Each shows "Still required: …", stars
// the required labels, keeps its button off until they are filled, and its
// voice command does exactly what the button does.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({
  SpellCheckedTextarea: (p: any) => <textarea value={p.value} onChange={p.onChange} rows={p.rows} className={p.className} />,
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/cytologyChecks')>('@/services/fieldRequirements/cytologyChecks');
  return {
    ...rules, ...checks,
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import { EMPTY_DRAFT } from '../cytologyDrafts';
import { EMPTY_CISOEA_DRAFT } from '@/services/cytology/cisoeADraft';
import { CytologyReviewForm } from './CytologyReviewForm';
import { CytologyCisoeAForm } from './CytologyCisoeAForm';
import { CytologyRetrospectiveBanner } from './CytologyRetrospectiveBanner';
import { CytologyHistologyCandidateBanner } from './CytologyHistologyCandidateBanner';

afterEach(() => { cleanup(); listeners.length = 0; });
const say = (id: string) => listeners.forEach(cb => cb(id));
const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('cytology', over);
const noop = () => {};

const option = (id: string) => ({ id, label: id, section: 'x', abbreviation: '' } as any);
function reviewForm(over: Partial<React.ComponentProps<typeof CytologyReviewForm>> = {}) {
  return render(<CytologyReviewForm
    draft={{ ...EMPTY_DRAFT, primaryInterpretationId: 'nilm' }} onDraftChange={noop} editing={false} saving={false} roleLabel="Primary Screener"
    isGynCytology lastMenstrualPeriod="" requirements={reqs()}
    generalCategorizationOptions={[option('g1')]} adequacyOptions={[option('a1')]} primaryOptions={[option('nilm')]}
    additionalOptions={[]} recommendationOptions={[]} categoryLabel={id => id}
    onSave={noop} onRequestPeerReview={noop} {...over}
  />);
}
const saveBtn = () => screen.getByText(/reviewForm\.saveAsRole/).closest('button') as HTMLButtonElement;

describe('CytologyReviewForm', () => {
  it('saves with only the primary interpretation while everything else is optional', () => {
    reviewForm();
    expect(saveBtn().disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('without a primary interpretation Save is off and says so', () => {
    reviewForm({ draft: EMPTY_DRAFT });
    expect(saveBtn().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.cytology.reviewPrimaryInterpretation');
  });
  it('a field the organisation requires holds Save off until it is filled, and is starred', () => {
    reviewForm({ requirements: reqs({ reviewNotes: true }) });
    expect(saveBtn().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('reviewNotes');
    expect(document.querySelectorAll('.ps-conf-required').length).toBeGreaterThan(0);
  });
  it('the last menstrual period is only asked for on gynaecologic specimens', () => {
    const r = reqs({ reviewLmp: true });
    const { unmount } = reviewForm({ requirements: r, isGynCytology: true });
    expect(saveBtn().disabled).toBe(true);
    unmount();
    reviewForm({ requirements: r, isGynCytology: false });
    expect(saveBtn().disabled).toBe(false);
  });
  it('"save review" by voice saves when ready, and does nothing when it is not', () => {
    const onSave = vi.fn();
    const { unmount } = reviewForm({ onSave });
    say('CYTOLOGY_SAVE_REVIEW');
    expect(onSave).toHaveBeenCalledTimes(1);
    say('CYTOLOGY_SAVE_CISOEA');
    expect(onSave).toHaveBeenCalledTimes(1);
    unmount();
    const blocked = vi.fn();
    reviewForm({ draft: EMPTY_DRAFT, onSave: blocked });
    say('CYTOLOGY_SAVE_REVIEW');
    expect(blocked).not.toHaveBeenCalled();
  });
  it('an existing review is edited with "Update Review"', () => {
    reviewForm({ editing: true });
    expect(screen.getByText('cytologyScreening.reviewForm.updateBtn')).toBeTruthy();
  });
});

const fullCisoea = { ...EMPTY_CISOEA_DRAFT, composition: '1', inflammation: '1', squamous: '1', otherEndometrium: '1', endocervical: '1', adequacy: 'satisfactory' as const };
function cisoeaForm(over: Partial<React.ComponentProps<typeof CytologyCisoeAForm>> = {}) {
  return render(<CytologyCisoeAForm draft={fullCisoea} onDraftChange={noop} editing={false} saving={false} roleLabel="Primary Screener"
    requirements={reqs()} errors={[]} warnings={[]} onSave={noop} onRequestPeerReview={noop} {...over} />);
}

describe('CytologyCisoeAForm', () => {
  it('an empty matrix keeps Save off and lists the six components', () => {
    cisoeaForm({ draft: EMPTY_CISOEA_DRAFT });
    expect((screen.getByText(/reviewForm\.saveAsRole/).closest('button') as HTMLButtonElement).disabled).toBe(true);
    const line = screen.getByRole('status').textContent ?? '';
    for (const f of ['cisoeaComposition', 'cisoeaInflammation', 'cisoeaSquamous', 'cisoeaOtherEndometrium', 'cisoeaEndocervical', 'cisoeaAdequacy']) expect(line).toContain(f);
  });
  it('a filled matrix saves', () => {
    cisoeaForm();
    expect((screen.getByText(/reviewForm\.saveAsRole/).closest('button') as HTMLButtonElement).disabled).toBe(false);
  });
  it('"comments on every axis" holds Save off until each axis has one', () => {
    cisoeaForm({ requirements: reqs({ cisoeaComments: true }) });
    expect(screen.getByRole('status').textContent).toContain('cisoeaComments');
  });
  it('shows validation messages and the colposcopy suggestion', () => {
    cisoeaForm({ errors: ['bad range'], warnings: ['odd mix'], reflexSuggestion: 'cyto-rec-colposcopy' });
    expect(screen.getByText('bad range')).toBeTruthy();
    expect(screen.getByText('odd mix')).toBeTruthy();
    expect(screen.getByText('cytologyScreening.cisoea.suggestColposcopy')).toBeTruthy();
  });
  it('"save CISOE-A review" by voice saves only when the matrix is complete', () => {
    const onSave = vi.fn();
    const { unmount } = cisoeaForm({ onSave });
    say('CYTOLOGY_SAVE_CISOEA');
    expect(onSave).toHaveBeenCalledTimes(1);
    unmount();
    const blocked = vi.fn();
    cisoeaForm({ draft: EMPTY_CISOEA_DRAFT, onSave: blocked });
    say('CYTOLOGY_SAVE_CISOEA');
    expect(blocked).not.toHaveBeenCalled();
  });
});

function retro(over: Partial<React.ComponentProps<typeof CytologyRetrospectiveBanner>> = {}) {
  return render(<CytologyRetrospectiveBanner triggeredByCaseId="A26-9" outcome="" correctiveAction="" onOutcomeChange={noop}
    onCorrectiveActionChange={noop} saving={false} requirements={reqs()} onComplete={noop} {...over} />);
}
const completeBtn = () => screen.getByText('cytologyScreening.retrospective.completeBtn').closest('button') as HTMLButtonElement;

describe('CytologyRetrospectiveBanner', () => {
  it('needs an outcome, and says so', () => {
    retro();
    expect(completeBtn().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('retroOutcome');
  });
  it('completes once an outcome is chosen', () => {
    retro({ outcome: 'confirmed_negative' });
    expect(completeBtn().disabled).toBe(false);
  });
  it('a required corrective action is asked for on a non-negative outcome only', () => {
    const r = reqs({ retroCorrectiveAction: true });
    const { unmount } = retro({ outcome: 'confirmed_negative', requirements: r });
    expect(completeBtn().disabled).toBe(false);
    unmount();
    retro({ outcome: 'screening_error', requirements: r });
    expect(completeBtn().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('retroCorrectiveAction');
  });
  it('"complete retrospective review" by voice acts as the button', () => {
    const onComplete = vi.fn();
    const { unmount } = retro({ outcome: 'screening_error', correctiveAction: 'retrain', onComplete });
    say('CYTOLOGY_COMPLETE_RETROSPECTIVE');
    expect(onComplete).toHaveBeenCalledTimes(1);
    unmount();
    const blocked = vi.fn();
    retro({ onComplete: blocked });
    say('CYTOLOGY_COMPLETE_RETROSPECTIVE');
    expect(blocked).not.toHaveBeenCalled();
  });
});

const resolved = { cytologyDxLabel: 'HSIL', histologyDxDescription: 'CIN III', outcome: 'concordant' as const, cytologyRank: 4, histologyRank: 4 };
function histo(over: Partial<React.ComponentProps<typeof CytologyHistologyCandidateBanner>> = {}) {
  return render(<CytologyHistologyCandidateBanner candidateCaseId="H26-3" resolution={resolved} isRecording={false}
    manualDiagnosis="" manualOutcome="" onManualDiagnosisChange={noop} onManualOutcomeChange={noop} requirements={reqs()}
    listenForVoice onConfirmResolved={noop} onRecordManual={noop} onDismiss={noop} {...over} />);
}
const manual = { ...resolved, outcome: 'unresolvable' as const };

describe('CytologyHistologyCandidateBanner', () => {
  it('a diagnosis resolved from SNOMED coding is confirmed with one click', () => {
    const onConfirmResolved = vi.fn();
    histo({ onConfirmResolved });
    fireEvent.click(screen.getByText('cytologyScreening.histologyCorrelation.confirmBtn'));
    expect(onConfirmResolved).toHaveBeenCalledTimes(1);
  });
  it('a manual entry needs both the diagnosis and the outcome', () => {
    histo({ resolution: manual });
    const btn = screen.getByText('cytologyScreening.histologyCorrelation.recordBtn').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const line = screen.getByRole('status').textContent ?? '';
    expect(line).toContain('histologyDiagnosis');
    expect(line).toContain('histologyOutcome');
  });
  it('a completed manual entry records, trimmed', () => {
    const onRecordManual = vi.fn();
    histo({ resolution: manual, manualDiagnosis: '  CIN III ', manualOutcome: 'discordant', onRecordManual });
    fireEvent.click(screen.getByText('cytologyScreening.histologyCorrelation.recordBtn'));
    expect(onRecordManual).toHaveBeenCalledWith('CIN III', 'discordant');
  });
  it('"record correlation" by voice is answered by the first banner only', () => {
    const first = vi.fn(), second = vi.fn();
    render(<>
      <CytologyHistologyCandidateBanner candidateCaseId="H1" resolution={resolved} isRecording={false} manualDiagnosis="" manualOutcome=""
        onManualDiagnosisChange={noop} onManualOutcomeChange={noop} requirements={reqs()} listenForVoice onConfirmResolved={first} onRecordManual={noop} onDismiss={noop} />
      <CytologyHistologyCandidateBanner candidateCaseId="H2" resolution={resolved} isRecording={false} manualDiagnosis="" manualOutcome=""
        onManualDiagnosisChange={noop} onManualOutcomeChange={noop} requirements={reqs()} listenForVoice={false} onConfirmResolved={second} onRecordManual={noop} onDismiss={noop} />
    </>);
    say('CYTOLOGY_RECORD_CORRELATION');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
