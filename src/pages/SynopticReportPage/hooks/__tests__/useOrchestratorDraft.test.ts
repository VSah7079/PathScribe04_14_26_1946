// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/hooks/__tests__/useOrchestratorDraft.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// See useLisIntegration.test.ts's header for the unit/integration split
// rationale and the @vitest-environment override rationale.
//
// writeCaseDraft is tested directly as a standalone async function — it's
// exported specifically so the main file's handleConcurrencyForceSave can
// call it without going through the hook, so it deserves its own direct
// coverage independent of renderHook.
//
// localStorage is real here (happy-dom provides a genuine implementation,
// confirmed before writing this file), not mocked — the restore-on-load
// effect's whole job is reading/writing it correctly, so faking it would
// test the mock instead of the hook.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
// Initializes the real i18next instance so t() resolves to actual English
// text at test time — this hook's "Draft saved" toast is now i18n-driven,
// and several assertions below require exact-text equality.
import i18n from '@/i18n/config';
import { useOrchestratorDraft, writeCaseDraft } from '../useOrchestratorDraft';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';
import type { OrchestratorSection } from '../../components/OrchestratorSectionEditor';

vi.mock('@/services/cases/CaseRouter', () => ({
  caseRouter: { updateCase: vi.fn().mockResolvedValue(undefined), getCase: vi.fn() },
}));
vi.mock('@/services/cases/reportingModeRouting', () => ({
  isOrchCaseId: (id: string | undefined) => !!id?.startsWith('ORCH-'),
}));

function makeTestCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'ORCH-TEST-CASE',
    status: 'in-progress',
    synopticReports: [{ instanceId: 'SR-1', answers: {} }],
    // Real fix, per direct follow-up: "the case prefix can't
    // determine assist vs. orchestration case, we need to use a real
    // flag." writeCaseDraft() now reads caseData.reportingMode, not
    // the id string — this default matches this file's own real
    // intent (its own test names call this "an Orchestration-mode
    // case"), individual tests override it explicitly for the
    // CoPilot-mode case.
    reportingMode: 'orchestrator',
    ...overrides,
  } as unknown as Case;
}

function makeSection(overrides: Partial<OrchestratorSection> = {}): OrchestratorSection {
  return { id: 'sec-1', label: 'Gross Description', type: 'narrative', text: '', aiGenerated: '', userEdited: false, ...overrides } as OrchestratorSection;
}

function baseParams(overrides: Partial<Parameters<typeof useOrchestratorDraft>[0]> = {}) {
  return {
    caseData: makeTestCase(),
    setCaseData: vi.fn(),
    caseId: 'ORCH-TEST-CASE',
    orchSections: [] as OrchestratorSection[],
    setOrchSections: vi.fn(),
    activeSectionId: null,
    setActiveSectionId: vi.fn(),
    isOrchestrationMode: true,
    leftTab: 'draft',
    knownVersionRef: { current: 1 },
    setConcurrencyConflict: vi.fn(),
    clearDirty: vi.fn(),
    discardDraft: vi.fn(),
    showToast: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('writeCaseDraft — standalone function', () => {
  it('writes orchSections + synopticReports + grossingReports, plus a localStorage backup, for an Orchestration-mode case ID', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    const caseData = makeTestCase();
    const sections = [makeSection({ text: 'Real content' })];

    await writeCaseDraft(caseData, 'ORCH-TEST-CASE', sections, 5);

    // Real fix, per direct report ("attached synoptic report... why is
    // it not displaying"): synopticReports and grossingReports are
    // both genuinely, actively edited for Orchestration-mode cases
    // too — omitting them here meant caseRouter.updateCase's shallow
    // merge silently discarded any edit to either field on every
    // single Save Draft, not just orchSections' own real content.
    expect(caseRouter.updateCase).toHaveBeenCalledWith(
      'ORCH-TEST-CASE',
      { orchSections: sections, synopticReports: caseData.synopticReports, grossingReports: caseData.grossingReports },
      5,
    );
    // Batch 431: no browser copy; the case record is the only copy.
    expect(localStorage.getItem('ps_orch_sections_ORCH-TEST-CASE')).toBeNull();
  });

  it('writes synopticReports instead, for a CoPilot (Assist-mode) case — the real fix this consolidation exists for', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    // Real fix, per direct follow-up: "the case prefix can't
    // determine assist vs. orchestration case, we need to use a real
    // flag." Explicitly 'assist' here, not just a differently-shaped
    // id string — writeCaseDraft() no longer reads the id at all.
    const caseData = makeTestCase({ id: 'LIS-COPILOT-CASE', reportingMode: 'assist', synopticReports: [{ instanceId: 'SR-9', answers: { a: 'b' } }] as any });

    await writeCaseDraft(caseData, 'LIS-COPILOT-CASE', [makeSection()], 3);

    expect(caseRouter.updateCase).toHaveBeenCalledWith('LIS-COPILOT-CASE', { synopticReports: caseData.synopticReports }, 3);
    expect(localStorage.getItem('ps_orch_sections_LIS-COPILOT-CASE')).toBeNull();
  });

  it('PS-71 (Batch 458): the draft fields by mode, shared with the Edit Conflict overwrite', async () => {
    const { caseDraftUpdates } = await import('../useOrchestratorDraft');
    const orch = { ...makeTestCase(), reportingMode: 'orchestrator' } as any;
    expect(Object.keys(caseDraftUpdates(orch, [makeSection()])).sort()).toEqual(['grossingReports', 'orchSections', 'synopticReports']);
    expect(Object.keys(caseDraftUpdates({ ...orch, reportingMode: 'assist' }, [makeSection()]))).toEqual(['synopticReports']);
  });
});

describe('useOrchestratorDraft — saveDraftInternal', () => {
  it('short-circuits cleanly when there is no caseData.id — never calls writeCaseDraft, still clears dirty state and confirms save', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    const clearDirty = vi.fn();
    const showToast = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ caseData: null, clearDirty, showToast })));

    const saved = await act(async () => result.current.saveDraftInternal());

    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(clearDirty).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Draft saved');
    expect(saved).toBe(true);
  });

  it('on a real save, persists via writeCaseDraft, increments the version ref, and clears BOTH the local draft cache and dirty state', async () => {
    const discardDraft = vi.fn();
    const clearDirty = vi.fn();
    const knownVersionRef = { current: 4 };
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ knownVersionRef, discardDraft, clearDirty })));

    const saved = await act(async () => result.current.saveDraftInternal());

    expect(knownVersionRef.current).toBe(5);
    expect(discardDraft).toHaveBeenCalled();
    expect(clearDirty).toHaveBeenCalled();
    expect(saved).toBe(true);
  });

  it('Batch 465b (Pete): a grid count above its limit (nodes positive > examined) stops the save, saying why', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    const showToast = vi.fn(); const clearDirty = vi.fn();
    const caseData = makeTestCase({ synopticReports: [{ instanceId: 'SR-N', templateId: 'neck_dissection', answers: { psmap_nd_levels__R_IIa__positive: '3', psmap_nd_levels__R_IIa__examined: '2' } }] } as never);
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ caseData, showToast, clearDirty })));
    expect(await act(async () => result.current.saveDraftInternal())).toBe(false);
    expect(caseRouter.updateCase).not.toHaveBeenCalled();
    expect(clearDirty).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Right level IIa'), 'error');
  });

  it('Batch 465b: a total that differs from its grid asks first; going back stops the save, continuing saves', async () => {
    const answers = { psmap_nd_levels__R_IIa__positive: '1', psmap_nd_levels__R_IIa__examined: '6', nd_total_examined: '9' };
    const caseData = makeTestCase({ synopticReports: [{ instanceId: 'SR-N', templateId: 'neck_dissection', answers }] } as never);
    const no = vi.fn().mockResolvedValue(false);
    const r1 = renderHook(() => useOrchestratorDraft(baseParams({ caseData, confirmWarnings: no })));
    expect(await act(async () => r1.result.current.saveDraftInternal())).toBe(false);
    expect(no.mock.calls[0][0]).toContain('Total nodes examined');
    const yes = vi.fn().mockResolvedValue(true);
    const r2 = renderHook(() => useOrchestratorDraft(baseParams({ caseData, confirmWarnings: yes })));
    expect(await act(async () => r2.result.current.saveDraftInternal())).toBe(true);
  });

  it('on a real ConcurrencyConflictError, surfaces the conflict modal, returns false, and does NOT clear dirty state or discard the local draft', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockRejectedValueOnce(new ConcurrencyConflictError('ORCH-TEST-CASE', 1, 9));
    // Batch 458: the dialog opens only when the other person changed the same section.
    const loaded = makeTestCase();
    vi.mocked((caseRouter as any).getCase).mockResolvedValue({ ...loaded, version: 9, orchSections: [{ ...makeSection(), text: 'THEIRS' }] });
    const setConcurrencyConflict = vi.fn();
    const clearDirty = vi.fn();
    const discardDraft = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ caseData: { ...loaded, orchSections: [makeSection()] } as any, orchSections: [{ ...makeSection(), text: 'MINE' }], setConcurrencyConflict, clearDirty, discardDraft })));

    const saved = await act(async () => result.current.saveDraftInternal());

    expect(setConcurrencyConflict).toHaveBeenCalledWith({ actualVersion: 9, blockOverride: undefined });
    expect(saved).toBe(false);
    expect(clearDirty).not.toHaveBeenCalled();
    expect(discardDraft).not.toHaveBeenCalled();
  });

  it('Batch 458: someone else saved a different part: the draft is merged onto theirs and saved, no dialog', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockRejectedValueOnce(new ConcurrencyConflictError('ORCH-TEST-CASE', 1, 9)).mockResolvedValue(undefined);
    const loaded = makeTestCase();
    vi.mocked((caseRouter as any).getCase).mockResolvedValue({ ...loaded, version: 9, orchSections: [makeSection()], participants: [{ staffId: 'TECH' }] });
    const setConcurrencyConflict = vi.fn();
    const showToast = vi.fn();
    const setCaseData = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ caseData: { ...loaded, orchSections: [makeSection()] } as any, orchSections: [{ ...makeSection(), text: 'MINE' }], setConcurrencyConflict, showToast, setCaseData })));
    expect(await act(async () => result.current.saveDraftInternal())).toBe(true);
    expect(setConcurrencyConflict).not.toHaveBeenCalled();
    const second = vi.mocked(caseRouter.updateCase).mock.calls[1];
    expect(second[2]).toBe(9);
    expect((second[1] as any).orchSections[0].text).toBe('MINE');
    // The message names what the other person changed (Pete: is the user shown the update?).
    expect(showToast).toHaveBeenCalledWith(i18n.t('useOrchestratorDraft.toast.draftSavedMergedParts', { parts: i18n.t('synopticReportPage.concurrency.parts.participants') }));
    expect(setCaseData).toHaveBeenCalled();
  });

  it('Batch 458 (Pete: "an option to abort or accept"): with review on, someone else\'s save elsewhere stops for the person; nothing saved', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockReset().mockRejectedValueOnce(new ConcurrencyConflictError('ORCH-TEST-CASE', 1, 9)).mockResolvedValue(undefined);
    const loaded = makeTestCase();
    vi.mocked((caseRouter as any).getCase).mockResolvedValue({ ...loaded, version: 9, orchSections: [makeSection()], participants: [{ staffId: 'TECH' }] });
    const onMergeReview = vi.fn(); const clearDirty = vi.fn(); const setConcurrencyConflict = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ caseData: { ...loaded, orchSections: [makeSection()] } as any, orchSections: [{ ...makeSection(), text: 'MINE' }], onMergeReview, clearDirty, setConcurrencyConflict })));
    expect(await act(async () => result.current.saveDraftInternal())).toBe(false);
    expect(vi.mocked(caseRouter.updateCase)).toHaveBeenCalledTimes(1);
    expect(onMergeReview).toHaveBeenCalledWith(expect.objectContaining({ version: 9, theirsChanged: expect.arrayContaining(['participants']), mineChanged: ['orchSections'] }));
    expect(clearDirty).not.toHaveBeenCalled();
    expect(setConcurrencyConflict).not.toHaveBeenCalled();
  });

  it('on any OTHER failure, deliberately still clears dirty state and shows "Draft saved" — documented pre-existing behavior, not silently changed by this consolidation', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    vi.mocked(caseRouter.updateCase).mockRejectedValueOnce(new Error('network blip'));
    const clearDirty = vi.fn();
    const showToast = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ clearDirty, showToast })));

    const saved = await act(async () => result.current.saveDraftInternal());

    expect(clearDirty).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Draft saved');
    expect(saved).toBe(true);
  });
});

describe('useOrchestratorDraft — restore on load', () => {
  it('restores from the case record, ignoring an old browser copy left on this workstation (Batch 431)', () => {
    localStorage.setItem('ps_orch_sections_ORCH-TEST-CASE', JSON.stringify([makeSection({ id: 'stale-browser-copy' })]));
    const caseSections = [makeSection({ id: 'from-case', text: 'Newer save from another workstation' })];
    const caseData = makeTestCase({ orchSections: caseSections } as any);
    const setOrchSections = vi.fn();

    renderHook(() => useOrchestratorDraft(baseParams({ caseData, setOrchSections })));

    expect(setOrchSections).toHaveBeenCalledTimes(1);
    expect(setOrchSections).toHaveBeenCalledWith(caseSections);
  });

  it('does nothing at all when the case has no sections', () => {
    localStorage.setItem('ps_orch_sections_ORCH-TEST-CASE', JSON.stringify([makeSection()]));
    const setOrchSections = vi.fn();
    renderHook(() => useOrchestratorDraft(baseParams({ setOrchSections })));
    expect(setOrchSections).not.toHaveBeenCalled();
  });

  it('does nothing when there is no caseId at all', () => {
    localStorage.setItem('ps_orch_sections_undefined', JSON.stringify([makeSection()]));
    const setOrchSections = vi.fn();
    renderHook(() => useOrchestratorDraft(baseParams({ caseId: undefined, setOrchSections })));
    expect(setOrchSections).not.toHaveBeenCalled();
  });
});

describe('useOrchestratorDraft — default activeSectionId', () => {
  it('defaults to the first section once sections load and none is active yet', () => {
    const setActiveSectionId = vi.fn();
    const sections = [makeSection({ id: 'sec-A' }), makeSection({ id: 'sec-B' })];
    renderHook(() => useOrchestratorDraft(baseParams({ orchSections: sections, activeSectionId: null, setActiveSectionId })));
    expect(setActiveSectionId).toHaveBeenCalledWith('sec-A');
  });

  it('does NOT override an already-active section', () => {
    const setActiveSectionId = vi.fn();
    const sections = [makeSection({ id: 'sec-A' })];
    renderHook(() => useOrchestratorDraft(baseParams({ orchSections: sections, activeSectionId: 'sec-A', setActiveSectionId })));
    expect(setActiveSectionId).not.toHaveBeenCalled();
  });
});

describe('useOrchestratorDraft — sync to diagnostic', () => {
  it('maps known section ids to diagnostic fields and builds the full narrative', () => {
    const setCaseData = vi.fn();
    const sections = [
      makeSection({ id: 'gross_description', label: 'Gross', text: 'Real gross text' }),
      makeSection({ id: 'microscopic', label: 'Microscopic', text: 'Real micro text' }),
    ];
    renderHook(() => useOrchestratorDraft(baseParams({ orchSections: sections, setCaseData, isOrchestrationMode: true })));

    const updater = setCaseData.mock.calls[0][0];
    const next = updater({ diagnostic: {} });
    expect(next.diagnostic.grossDescription).toBe('Real gross text');
    expect(next.diagnostic.microscopicDescription).toBe('Real micro text');
    expect(next.diagnostic.reportNarrative).toContain('Real gross text');
    expect(next.diagnostic.reportNarrative).toContain('Real micro text');
  });

  it('does nothing at all when not in Orchestration mode', () => {
    const setCaseData = vi.fn();
    renderHook(() => useOrchestratorDraft(baseParams({ orchSections: [makeSection()], setCaseData, isOrchestrationMode: false })));
    expect(setCaseData).not.toHaveBeenCalled();
  });

  it('does nothing when orchSections is empty', () => {
    const setCaseData = vi.fn();
    renderHook(() => useOrchestratorDraft(baseParams({ orchSections: [], setCaseData, isOrchestrationMode: true })));
    expect(setCaseData).not.toHaveBeenCalled();
  });

  it('preserves an existing diagnostic field when no matching section is found for it, rather than clearing it', () => {
    const setCaseData = vi.fn();
    const sections = [makeSection({ id: 'gross_description', text: 'New gross' })];
    renderHook(() => useOrchestratorDraft(baseParams({ orchSections: sections, setCaseData, isOrchestrationMode: true })));

    const updater = setCaseData.mock.calls[0][0];
    const next = updater({ diagnostic: { ancillaryStudies: 'Pre-existing ancillary text' } });
    expect(next.diagnostic.ancillaryStudies).toBe('Pre-existing ancillary text');
  });
});

describe('useOrchestratorDraft — voice/keyboard event listener', () => {
  it('is registered when in Orchestration mode, and calling PATHSCRIBE_ORCH_SAVE_DRAFT actually triggers a real save', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    renderHook(() => useOrchestratorDraft(baseParams({ isOrchestrationMode: true })));

    await act(async () => {
      window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_SAVE_DRAFT'));
      await Promise.resolve(); // let the async handler's microtask flush
    });

    expect(caseRouter.updateCase).toHaveBeenCalled();
  });

  it('PATHSCRIBE_ORCH_GENERATE_REPORT dispatches PATHSCRIBE_ORCH_START_GENERATE, the real event the Generate Report button uses', () => {
    renderHook(() => useOrchestratorDraft(baseParams({ isOrchestrationMode: true })));
    const listener = vi.fn();
    window.addEventListener('PATHSCRIBE_ORCH_START_GENERATE', listener);

    act(() => { window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_GENERATE_REPORT')); });

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('PATHSCRIBE_ORCH_START_GENERATE', listener);
  });

  it('is NOT registered at all outside Orchestration mode — a dispatched save-draft event triggers no real save', async () => {
    const { caseRouter } = await import('@/services/cases/CaseRouter');
    renderHook(() => useOrchestratorDraft(baseParams({ isOrchestrationMode: false })));

    await act(async () => {
      window.dispatchEvent(new CustomEvent('PATHSCRIBE_ORCH_SAVE_DRAFT'));
      await Promise.resolve();
    });

    expect(caseRouter.updateCase).not.toHaveBeenCalled();
  });
});

describe('useOrchestratorDraft — section editing business logic', () => {
  it('handleSectionTextChange marks userEdited true only when the new text genuinely differs from the AI-generated version', () => {
    const setOrchSections = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ setOrchSections })));
    act(() => { result.current.handleSectionTextChange('sec-1', 'Edited by pathologist'); });

    const updater = setOrchSections.mock.calls[0][0];
    const next = updater([makeSection({ id: 'sec-1', aiGenerated: 'Original AI text' })]);
    expect(next[0]).toMatchObject({ text: 'Edited by pathologist', userEdited: true });
  });

  it('handleAcceptSection always commits userEdited true, without comparing text to aiGenerated', () => {
    const setOrchSections = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ setOrchSections })));
    act(() => { result.current.handleAcceptSection('sec-1', 'Same as AI text'); });

    const updater = setOrchSections.mock.calls[0][0];
    const next = updater([makeSection({ id: 'sec-1', aiGenerated: 'Same as AI text' })]);
    expect(next[0]).toMatchObject({ text: 'Same as AI text', userEdited: true });
  });

  it('handleAcceptDraft promotes pendingDraft into both text and aiGenerated, and resets userEdited', () => {
    const setOrchSections = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ setOrchSections })));
    act(() => { result.current.handleAcceptDraft('sec-1'); });

    const updater = setOrchSections.mock.calls[0][0];
    const next = updater([makeSection({ id: 'sec-1', text: 'old committed text', userEdited: true, pendingDraft: 'freshly regenerated text' } as any)]);
    expect(next[0]).toMatchObject({ text: 'freshly regenerated text', aiGenerated: 'freshly regenerated text', userEdited: false, pendingDraft: undefined });
  });

  it('handleAcceptDraft does nothing for a section with no real pendingDraft', () => {
    const setOrchSections = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ setOrchSections })));
    act(() => { result.current.handleAcceptDraft('sec-1'); });

    const updater = setOrchSections.mock.calls[0][0];
    const original = makeSection({ id: 'sec-1', text: 'unchanged' });
    const next = updater([original]);
    expect(next[0]).toEqual(original);
  });

  it('handleKeepVersion only clears pendingDraft, leaving the committed text and userEdited flag untouched', () => {
    const setOrchSections = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ setOrchSections })));
    act(() => { result.current.handleKeepVersion('sec-1'); });

    const updater = setOrchSections.mock.calls[0][0];
    const next = updater([makeSection({ id: 'sec-1', text: 'pathologist final wording', userEdited: true, pendingDraft: 'discarded regenerate' } as any)]);
    expect(next[0]).toMatchObject({ text: 'pathologist final wording', userEdited: true, pendingDraft: undefined });
  });

  it('handleAcceptAllSections only affects AI-generated, not-yet-edited, not-yet-committed sections — leaves already-edited ones alone', () => {
    const setOrchSections = vi.fn();
    const { result } = renderHook(() => useOrchestratorDraft(baseParams({ setOrchSections })));
    act(() => { result.current.handleAcceptAllSections(); });

    const updater = setOrchSections.mock.calls[0][0];
    const untouchedAlreadyEdited = makeSection({ id: 'sec-A', aiGenerated: 'x', userEdited: true });
    const shouldFlip = makeSection({ id: 'sec-B', aiGenerated: 'y', userEdited: false });
    const next = updater([untouchedAlreadyEdited, shouldFlip]);

    expect(next[0].userEdited).toBe(true); // unchanged, was already true
    expect(next[1].userEdited).toBe(true); // flipped by Accept All
  });
});
