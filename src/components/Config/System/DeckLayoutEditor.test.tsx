// @vitest-environment happy-dom
// Batch 406: an analyser's deck layout in the equipment editor.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../../../services', () => ({ DECK_RACK_TYPES: ['sample_tube_rack', 'extraction_plate', 'reagent_cartridge'] }));

import DeckLayoutEditor from './DeckLayoutEditor';

afterEach(cleanup);

describe('DeckLayoutEditor', () => {
  it('adds a slot taking a sample rack, upper-cases its id, and toggles what it takes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DeckLayoutEditor slots={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('equipmentSection.deck.add'));
    expect(onChange).toHaveBeenLastCalledWith([{ id: '', rackTypes: ['sample_tube_rack'] }]);
    rerender(<DeckLayoutEditor slots={[{ id: '', rackTypes: ['sample_tube_rack'] }]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('equipmentSection.deck.slotId'), { target: { value: 'slot_a1' } });
    expect(onChange).toHaveBeenLastCalledWith([{ id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }]);
    fireEvent.click(screen.getByLabelText('equipmentSection.deck.rackType.extraction_plate', { exact: false }));
    expect(onChange).toHaveBeenLastCalledWith([{ id: '', rackTypes: ['sample_tube_rack', 'extraction_plate'] }]);
    fireEvent.click(screen.getByText('equipmentSection.deck.remove'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('shows the layout error it is given', () => {
    render(<DeckLayoutEditor slots={[]} onChange={() => {}} error="bad layout" />);
    expect(screen.getByText('bad layout')).not.toBeNull();
  });
});
