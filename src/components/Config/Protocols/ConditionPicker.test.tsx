// @vitest-environment happy-dom
// src/components/Config/Protocols/ConditionPicker.test.tsx
// Batch 519 (PS-493): the Synoptic Editor's condition picker — several answers per question, and "unless" on an
// alternative; only nested alternatives stay read-only.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }), Trans: () => null, initReactI18next: { type: '3rdParty', init: () => {} } }));

import { ConditionPicker } from './SynopticEditor';
import type { VisibilityCondition } from '@/services/templates/fieldVisibility';

afterEach(cleanup);
const K = 'synopticEditor.condition';
const template = { sections: [{ id: 's', title: 'S', fields: [
  { id: 'proc', label: 'Procedure', type: 'radio', required: false, options: [{ id: 'radical', label: 'Radical' }, { id: 'partial', label: 'Partial' }] },
  { id: 'extra', label: 'Extension', type: 'checkboxes', required: false, options: [{ id: 'vein', label: 'Vein' }, { id: 'fat', label: 'Fat' }] },
] }] } as never;

const renderWith = (condition: VisibilityCondition | undefined) => {
  const onChange = vi.fn();
  render(<ConditionPicker condition={condition} template={template} onChange={onChange} />);
  return onChange;
};

describe('ConditionPicker (Batch 519, PS-493)', () => {
  it('ticking a second answer builds "is any of"', () => {
    const onChange = renderWith({ fieldId: 'proc', answerId: 'radical' });
    expect((screen.getByLabelText('Radical') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('Partial'));
    expect(onChange).toHaveBeenCalledWith({ fieldId: 'proc', answerId: '', answerIds: ['radical', 'partial'] });
  });

  it('an alternative has its own "unless" mode and answers', () => {
    const onChange = renderWith({ fieldId: 'proc', answerId: 'radical', or: [{ fieldId: 'extra', answerId: 'vein' }] });
    const modes = screen.getAllByLabelText(`${K}.modeLabel`);
    expect(modes).toHaveLength(2);
    fireEvent.change(modes[1], { target: { value: 'isNot' } });
    expect(onChange).toHaveBeenCalledWith({ fieldId: 'proc', answerId: 'radical', or: [{ fieldId: 'extra', answerId: '', notAnswerIds: ['vein'] }] });
  });

  it('several answers and an "unless" alternative are shown in the picker, not as a custom condition', () => {
    renderWith({ fieldId: 'proc', answerId: '', answerIds: ['radical', 'partial'], or: [{ fieldId: 'extra', answerId: '', notAnswerIds: ['vein', 'fat'] }] });
    expect(screen.queryByText(`${K}.custom`)).toBeNull();
    expect(screen.getAllByText(`${K}.answersAnyLabel`)).toHaveLength(2);
  });

  it('a nested alternative stays read-only', () => {
    renderWith({ fieldId: 'proc', answerId: 'radical', or: [{ fieldId: 'extra', answerId: 'vein', or: [{ fieldId: 'proc', answerId: 'partial' }] }] });
    expect(screen.getByText(`${K}.custom`)).toBeTruthy();
  });
});
