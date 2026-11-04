// @vitest-environment happy-dom
// src/components/Config/Protocols/FieldCardNarrative.test.tsx
// Batch 519 (PS-273): a cytology protocol's narrative settings are editable in the Synoptic Editor — the question's
// narrative sentence and clinical tier, and each answer's narrative phrase. Surgical protocols don't show them.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }), Trans: () => null, initReactI18next: { type: '3rdParty', init: () => {} } }));

import { FieldCard, type EditorField, type EditorTemplate } from './SynopticEditor';

afterEach(cleanup);
const N = 'synopticEditor.narrative';
const field: EditorField = {
  id: 'adequacy', label: 'Adequacy', type: 'dropdown', required: true, snomed: '', icd: '',
  narrativeSentenceTemplate: 'The specimen is {value}.', clinicalTier: 'tier_2_descriptive',
  options: [{ id: 'sat', label: 'Satisfactory', snomed: '', icd: '', narrativePhrase: 'satisfactory for evaluation' }],
};
const tpl = (category: string, f: EditorField = field): EditorTemplate =>
  ({ id: 't', name: 'T', source: 'PathScribe', version: '1.0.0', category, sections: [{ id: 's', title: 'S', collapsed: false, fields: [f] }] });

const renderCard = (template: EditorTemplate, f: EditorField = field) => {
  const onChange = vi.fn();
  render(<FieldCard field={f} index={0} total={1} template={template} onChange={onChange} onRemove={() => {}} onMove={() => {}} />);
  return onChange;
};

describe('FieldCard narrative settings (Batch 519, PS-273)', () => {
  it('a cytology protocol shows the sentence and tier, and editing them patches the question', () => {
    const onChange = renderCard(tpl('CYTOLOGY_NONGYN'));
    const sentence = screen.getByPlaceholderText(`${N}.sentencePlaceholder`) as HTMLInputElement;
    expect(sentence.value).toBe('The specimen is {value}.');
    fireEvent.change(sentence, { target: { value: 'Adequacy: {value}.' } });
    // PathScribe's translated wording (the key) goes with it, so the lab's sentence is the one used.
    expect(onChange).toHaveBeenCalledWith({ narrativeSentenceTemplate: 'Adequacy: {value}.', narrativeSentenceTemplateKey: undefined });
    // Blank removes the sentence (the question then adds none).
    fireEvent.change(sentence, { target: { value: '  ' } });
    expect(onChange).toHaveBeenCalledWith({ narrativeSentenceTemplate: undefined, narrativeSentenceTemplateKey: undefined });
    const tier = screen.getByDisplayValue(`${N}.tiers.tier_2_descriptive`) as HTMLSelectElement;
    fireEvent.change(tier, { target: { value: 'tier_1_diagnostic_category' } });
    expect(onChange).toHaveBeenCalledWith({ clinicalTier: 'tier_1_diagnostic_category' });
    fireEvent.change(tier, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ clinicalTier: undefined });
  });

  it('an answer’s narrative phrase is edited in its expanded row', () => {
    const onChange = renderCard(tpl('CYTOLOGY_NONGYN'));
    fireEvent.click(screen.getByTitle('synopticEditor.option.editCodingTooltip'));
    const phrase = screen.getByPlaceholderText(`${N}.phrasePlaceholder`) as HTMLInputElement;
    expect(phrase.value).toBe('satisfactory for evaluation');
    fireEvent.change(phrase, { target: { value: 'adequate' } });
    expect(onChange).toHaveBeenCalledWith({ options: [{ ...field.options[0], narrativePhrase: 'adequate' }] });
  });

  it('a sentence without {value} warns', () => {
    renderCard(tpl('CYTOLOGY_NONGYN'), { ...field, narrativeSentenceTemplate: 'Adequate.' });
    expect(screen.getByText(`${N}.noValueWarning`)).toBeTruthy();
  });

  it('a surgical protocol without narrative sentences shows none of it', () => {
    renderCard(tpl('BREAST', { ...field, narrativeSentenceTemplate: undefined, clinicalTier: undefined }), { ...field, narrativeSentenceTemplate: undefined });
    expect(screen.queryByPlaceholderText(`${N}.sentencePlaceholder`)).toBeNull();
    fireEvent.click(screen.getByTitle('synopticEditor.option.editCodingTooltip'));
    expect(screen.queryByPlaceholderText(`${N}.phrasePlaceholder`)).toBeNull();
  });
});
