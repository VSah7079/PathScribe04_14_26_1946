// @vitest-environment happy-dom
// src/components/OrganMap/MohsStagesInput.test.tsx
// Batch 463: the Mohs stage question — the canvas and the parallel checklist
// dispatch the same answer patches (default histology; since Batch 463b the
// block is chosen, not auto-lettered);
// a voice command arriving as an event changes the answers like a click.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o?.name ? `${k}:${o.name}` : k) }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { MohsStagesInput } from './MohsStagesInput';
import { BUILT_IN_ORGAN_MAP_SCHEME } from '@/services/organMapping/organMapScheme';
import { offerVoiceCommandToScreen } from '@/services/voice/voiceCommandEvents';
import { applyAnswerPatch, type AnswerPatchOrUpdate } from '@/services/templates/mohsStages';

/** What the last patch would change, applied to the answers it was given (patches may be functions). */
const changeOf = (onPatch: ReturnType<typeof vi.fn>, answers: Record<string, string | string[]>, call = -1) => {
  const calls = onPatch.mock.calls; const p = calls[call < 0 ? calls.length + call : call][0] as AnswerPatchOrUpdate;
  return typeof p === 'function' ? p(answers) : p;
};


const F = 'psmap_mohs_stages';
const oneStage = { [`${F}__stages`]: '1', [`${F}__s1__time`]: '09:05' };
const props = { fieldId: F, scheme: BUILT_IN_ORGAN_MAP_SCHEME, defaultHistology: 'BCC' };

afterEach(cleanup);

describe('MohsStagesInput', () => {
  it('a click on the canvas marks the sector positive with the default histology and no block yet', () => {
    const onPatch = vi.fn();
    const { container } = render(<MohsStagesInput {...props} answers={oneStage} onPatch={onPatch} />);
    const sectors = container.querySelectorAll('.ps-ma-sector, .ps-organmap-sector');
    expect(sectors).toHaveLength(13);
    expect(container.querySelector('.ps-mohs')!.getAttribute('style')).toContain('--organmap-residualTumour');
    fireEvent.click(sectors[0]);
    expect(changeOf(onPatch, oneStage)).toEqual({ [`${F}__s1__positive`]: ['c12'], [`${F}__s1__c12__histology`]: 'BCC' });
  });

  it('the checklist has a labelled checkbox per sector; a positive row shows block, histology and perineural invasion', () => {
    const onPatch = vi.fn();
    const answers = { ...oneStage, [`${F}__s1__positive`]: ['deep'], [`${F}__s1__deep__block`]: 'A', [`${F}__s1__deep__histology`]: 'BCC' };
    const { container } = render(<MohsStagesInput {...props} answers={answers} onPatch={onPatch} />);
    expect(container.querySelectorAll('.ps-mohs-checklist tbody tr')).toHaveLength(13);
    const deep = screen.getByLabelText('organMap.mohs.input.positiveFor:organMap.mohs.deepName') as HTMLInputElement;
    expect(deep.checked).toBe(true);
    const block = screen.getByLabelText('organMap.mohs.input.blockFor:organMap.mohs.deepName') as HTMLSelectElement;
    expect(block.value).toBe('A');
    // The block is chosen from the stage's blocks (A–Z while Blocks cut isn't recorded), or left unassigned.
    expect(Array.from(block.options).map(o => o.value).slice(0, 3)).toEqual(['', 'A', 'B']);
    fireEvent.change(block, { target: { value: 'B' } });
    expect(changeOf(onPatch, answers)).toEqual({ [`${F}__s1__deep__block`]: 'B' });
    fireEvent.click(screen.getByLabelText('organMap.mohs.input.perineuralFor:organMap.mohs.deepName'));
    expect(changeOf(onPatch, answers)).toEqual({ [`${F}__s1__deep__pni`]: 'yes' });
    // The next sector checked has no block until one is chosen.
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(changeOf(onPatch, answers)).toEqual({ [`${F}__s1__positive`]: ['c12', 'deep'], [`${F}__s1__c12__histology`]: 'BCC' });
    fireEvent.click(screen.getByText('organMap.mohs.input.markClear'));
    expect(changeOf(onPatch, answers)).toEqual({ [`${F}__s1__positive`]: undefined, [`${F}__s1__deep__block`]: undefined, [`${F}__s1__deep__histology`]: undefined, [`${F}__s1__deep__pni`]: undefined });
  });

  it('a positive sector without a block, or beyond Blocks cut, is flagged on its row and for the stage', () => {
    const answers = { ...oneStage, [`${F}__s1__blocks`]: '1', [`${F}__s1__positive`]: ['c3', 'deep'], [`${F}__s1__deep__block`]: 'A' };
    const { container, rerender } = render(<MohsStagesInput {...props} answers={answers} onPatch={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toBe('organMap.mohs.input.blockProblem.unassigned');
    expect(container.querySelectorAll('.ps-mohs-row--problem')).toHaveLength(1);
    expect((screen.getByLabelText('organMap.mohs.input.blockFor:organMap.mohs.deepName') as HTMLSelectElement).options).toHaveLength(2);
    rerender(<MohsStagesInput {...props} answers={{ ...answers, [`${F}__s1__c3__block`]: 'B' }} onPatch={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toBe('organMap.mohs.input.blockProblem.notCut');
    rerender(<MohsStagesInput {...props} answers={{ ...answers, [`${F}__s1__c3__block`]: 'A' }} onPatch={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('add and remove stages; read-only shows the maps without actions', () => {
    const onPatch = vi.fn();
    render(<MohsStagesInput {...props} answers={oneStage} onPatch={onPatch} />);
    fireEvent.click(screen.getByText('organMap.mohs.input.addStage'));
    expect(changeOf(onPatch, oneStage)[`${F}__stages`]).toBe('2');
    fireEvent.click(screen.getByText('organMap.mohs.input.removeStage'));
    expect(changeOf(onPatch, oneStage)).toEqual({ [`${F}__stages`]: undefined, [`${F}__s1__time`]: undefined });
    cleanup();
    render(<MohsStagesInput {...props} answers={oneStage} onPatch={onPatch} readOnly />);
    expect(screen.queryByText('organMap.mohs.input.addStage')).toBeNull();
    expect(screen.queryByText('organMap.mohs.input.markClear')).toBeNull();
  });

  it('a voice command is taken by the screen and changes the answers; one it can’t apply says why', () => {
    const onPatch = vi.fn();
    render(<MohsStagesInput {...props} answers={oneStage} onPatch={onPatch} />);
    expect(offerVoiceCommandToScreen('Stufe 1 positiv bei 3 Uhr Block A', 'de')).toBe('applied');
    expect(changeOf(onPatch, oneStage)).toEqual({ [`${F}__s1__positive`]: ['c3'], [`${F}__s1__c3__block`]: 'A', [`${F}__s1__c3__histology`]: 'BCC' });
    expect(offerVoiceCommandToScreen('stage 3 clear', 'en')).toBe('noStage');
    expect(offerVoiceCommandToScreen('stage 1 clear', 'en')).toBe('noChange');
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(offerVoiceCommandToScreen('open the next case', 'en')).toBeNull();
  });

  it('two changes in quick succession each build on the other (patches are applied to the answers of the moment)', () => {
    let answers: Record<string, string | string[]> = oneStage;
    const onPatch = vi.fn((p: AnswerPatchOrUpdate) => { answers = applyAnswerPatch(answers, p); });
    render(<MohsStagesInput {...props} answers={oneStage} onPatch={onPatch} />);
    offerVoiceCommandToScreen('stage 1 positive at 3 o\'clock block a', 'en');
    offerVoiceCommandToScreen('stage 1 positive at 6 o\'clock block b', 'en');
    expect(answers[`${F}__s1__positive`]).toEqual(['c3', 'c6']);
    expect([answers[`${F}__s1__c3__block`], answers[`${F}__s1__c6__block`]]).toEqual(['A', 'B']);
  });
});
