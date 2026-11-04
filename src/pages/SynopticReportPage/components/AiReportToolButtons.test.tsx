// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/components/AiReportToolButtons.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-274, PS-275): the report page's AI report tool buttons.
//   • "Suggest Synoptic from Narrative" runs the suggest handler (PS-274);
//     offered in orchestrator and assist mode.
//   • "Generate Narrative from Synoptic" runs the generate handler and is
//     offered in orchestrator mode only (PS-275).
//   • Each is disabled, with a tooltip saying why, until there is narrative
//     text / there are synoptic answers.
// The handlers themselves (AI call, review modal) are tested in
// hooks/__tests__/useSignOutWorkflow.test.ts. The last block checks, at
// source level, that SynopticReportPage hands this component those hooks'
// handlers (the 5,600-line page itself is not rendered in unit tests).
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AiReportToolButtons } from './AiReportToolButtons';
import { resolveBuildReportAvailability } from '../hooks/resolveBuildReportDirection';
import { aiReportToolsInputs, aiReportToolsVisibility } from '@/services/aiIntegration/aiReportTools';

beforeAll(async () => { await i18n.changeLanguage('en'); });
afterEach(() => cleanup());

const SUGGEST = /Suggest Synoptic from Narrative/;
const GENERATE = /Generate Narrative from Synoptic/;
const both = { canSuggestSynopticFromNarrative: true, canGenerateNarrativeFromSynoptic: true };

function renderButtons(reportingMode: string | undefined, availability = both, busy = { s: false, g: false }) {
  const onSuggest = vi.fn();
  const onGenerate = vi.fn();
  render(
    <AiReportToolButtons
      reportingMode={reportingMode} availability={availability}
      isSuggestingSynoptic={busy.s} isGeneratingNarrative={busy.g}
      onSuggestSynopticFromNarrative={onSuggest} onGenerateNarrativeFromSynoptic={onGenerate}
    />,
  );
  return { onSuggest, onGenerate };
}

describe('PS-274 Suggest Synoptic from Narrative toolbar button', () => {
  it.each(['orchestrator', 'assist'])('in %s mode, clicking it runs the suggest handler (and only that)', mode => {
    const { onSuggest, onGenerate } = renderButtons(mode);
    fireEvent.click(screen.getByRole('button', { name: SUGGEST }));
    expect(onSuggest).toHaveBeenCalledTimes(1);
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('is disabled, saying a narrative is needed, when there is no narrative text; and while a suggestion is running', () => {
    const { onSuggest } = renderButtons('orchestrator', { ...both, canSuggestSynopticFromNarrative: false });
    const btn = screen.getByRole('button', { name: SUGGEST }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBe('Enter a gross, microscopic or ancillary narrative first');
    fireEvent.click(btn);
    expect(onSuggest).not.toHaveBeenCalled();
    cleanup();
    renderButtons('orchestrator', both, { s: true, g: false });
    expect((screen.getByRole('button', { name: 'Suggesting…' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('PS-275 Generate Narrative from Synoptic toolbar button', () => {
  it('in orchestrator mode, clicking it runs the generate handler (and only that)', () => {
    const { onSuggest, onGenerate } = renderButtons('orchestrator');
    fireEvent.click(screen.getByRole('button', { name: GENERATE }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onSuggest).not.toHaveBeenCalled();
  });

  it('is not offered in assist (LIS) mode, where the LIS owns the narrative', () => {
    renderButtons('assist');
    expect(screen.queryByRole('button', { name: GENERATE })).toBeNull();
    expect(screen.getByRole('button', { name: SUGGEST })).toBeTruthy();
  });

  it('neither tool is offered outside orchestrator/assist mode', () => {
    renderButtons(undefined);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('is disabled, saying synoptic answers are needed, until some exist (judged on the report being viewed)', () => {
    const caseData = {
      diagnostic: { grossDescription: 'Received in formalin…' },
      synopticReports: [
        { instanceId: 'r1', answers: {} },
        { instanceId: 'r2', answers: { tumourSize: '14' } },
      ],
    };
    const { onGenerate } = renderButtons('orchestrator', resolveBuildReportAvailability(aiReportToolsInputs(caseData, 'r1')));
    const btn = screen.getByRole('button', { name: GENERATE }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBe('Answer some synoptic fields first');
    fireEvent.click(btn);
    expect(onGenerate).not.toHaveBeenCalled();
    cleanup();
    renderButtons('orchestrator', resolveBuildReportAvailability(aiReportToolsInputs(caseData, 'r2')));
    expect((screen.getByRole('button', { name: GENERATE }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('PS-274 / PS-275 which tools are offered, and on what content', () => {
  it('orchestrator: both; assist: Suggest only; anything else: neither', () => {
    expect(aiReportToolsVisibility('orchestrator')).toEqual({ suggestSynoptic: true, generateNarrative: true });
    expect(aiReportToolsVisibility('assist')).toEqual({ suggestSynoptic: true, generateNarrative: false });
    expect(aiReportToolsVisibility(undefined)).toEqual({ suggestSynoptic: false, generateNarrative: false });
  });

  it('judges on the case narrative and the viewed report\'s answers (first report when none chosen, then the case\'s older answers)', () => {
    const c = { diagnostic: { microscopicDescription: 'Sections show…' }, synopticReports: [{ instanceId: 'r1', answers: { a: '1' } }, { instanceId: 'r2', answers: { b: '2' } }], synopticAnswers: { old: 'x' } };
    expect(aiReportToolsInputs(c, 'r2')).toEqual({ caseText: { gross: '', microscopic: 'Sections show…', ancillary: '' }, synopticAnswers: { b: '2' } });
    expect(aiReportToolsInputs(c, undefined).synopticAnswers).toEqual({ a: '1' });
    expect(aiReportToolsInputs({ synopticAnswers: { old: 'x' } }, undefined).synopticAnswers).toEqual({ old: 'x' });
    expect(aiReportToolsInputs(null, undefined)).toEqual({ caseText: { gross: '', microscopic: '', ancillary: '' }, synopticAnswers: {} });
  });
});

describe('PS-274 / PS-275 SynopticReportPage wires the buttons to the sign-out workflow handlers (source check)', () => {
  const page = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../SynopticReportPage.tsx'), 'utf8');
  it('passes handleSuggestSynopticFromNarrative and handleGenerateNarrativeFromSynoptic from useSignOutWorkflow', () => {
    const usage = page.match(/<AiReportToolButtons[\s\S]*?\/>/)?.[0] ?? '';
    expect(usage).toContain('onSuggestSynopticFromNarrative={handleSuggestSynopticFromNarrative}');
    expect(usage).toContain('onGenerateNarrativeFromSynoptic={handleGenerateNarrativeFromSynoptic}');
    expect(usage).toContain('reportingMode={caseData?.reportingMode}');
    const workflow = page.match(/const \{[^}]*\}\s*=\s*useSignOutWorkflow\(/)?.[0] ?? '';
    expect(workflow).toContain('handleSuggestSynopticFromNarrative');
    expect(workflow).toContain('handleGenerateNarrativeFromSynoptic');
  });
});
