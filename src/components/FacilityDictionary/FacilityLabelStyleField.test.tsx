// @vitest-environment happy-dom
// Batch 715: the letters-or-numbers selectors (enterprise default, performing-lab override, live example).
import '@/i18n/config';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FacilityLabelStyleField } from './FacilityLabelStyleField';
import type { LabelStyleCarrier } from '@/services/labeling/labelStyle';

afterEach(cleanup);

const select = (level: 'specimen' | 'block' | 'slide' | 'preset') => screen.getByTestId(`label-style-${level}`) as HTMLSelectElement;

describe('FacilityLabelStyleField on the enterprise (sets the default)', () => {
  it('offers Letters and Numbers only, for each of specimens, blocks and slides, showing today\'s labels when nothing is set', () => {
    render(<FacilityLabelStyleField record={{ isEnterprise: true }} onChange={() => {}} />);
    for (const level of ['specimen', 'block', 'slide'] as const) {
      expect(Array.from(select(level).options).map(o => o.value)).toEqual(['letters', 'numbers']);
    }
    expect([select('specimen').value, select('block').value, select('slide').value]).toEqual(['letters', 'numbers', 'numbers']);
    expect(select('preset').value).toBe('alpha-specimen');
    expect(screen.getByTestId('label-style-example').textContent).toBe('Specimen A · Block 1 · Slide L1');
    expect(screen.getByTestId('label-style-example-cassette').textContent).toBe('Cassette A1 · slide label A1 L1');
  });

  it('changing a selector reports the new setting, and the example follows the record', () => {
    const onChange = vi.fn();
    const { rerender } = render(<FacilityLabelStyleField record={{ isEnterprise: true }} onChange={onChange} />);
    fireEvent.change(select('block'), { target: { value: 'letters' } });
    expect(onChange).toHaveBeenLastCalledWith({ block: 'letters' });
    fireEvent.change(select('slide'), { target: { value: 'letters' } });
    expect(onChange).toHaveBeenLastCalledWith({ slide: 'letters' });
    rerender(<FacilityLabelStyleField record={{ isEnterprise: true, labelStyle: { specimen: 'numbers', block: 'letters', slide: 'letters' } }} onChange={onChange} />);
    expect(screen.getByTestId('label-style-example').textContent).toBe('Specimen 1 · Block A · Slide La');
    expect(screen.getByTestId('label-style-example-cassette').textContent).toBe('Cassette 1A · slide label 1A La');
  });
});

describe('FacilityLabelStyleField on a performing lab (override with inherit)', () => {
  const enterprise: LabelStyleCarrier = { labelStyle: { specimen: 'numbers', block: 'letters', slide: 'letters' } };

  it('offers "Same as enterprise (value)" first, defaulting to it, and the example is the enterprise\'s', () => {
    render(<FacilityLabelStyleField record={{}} enterprise={enterprise} onChange={() => {}} />);
    expect(Array.from(select('block').options).map(o => o.value)).toEqual(['inherit', 'letters', 'numbers']);
    expect(select('block').value).toBe('inherit');
    expect(select('block').options[0].textContent).toBe('Same as enterprise (Letters)');
    expect(select('specimen').options[0].textContent).toBe('Same as enterprise (Numbers)');
    expect(screen.getByTestId('label-style-example').textContent).toBe('Specimen 1 · Block A · Slide La');
  });

  it('one override changes only that part of the example', () => {
    render(<FacilityLabelStyleField record={{ labelStyle: { block: 'numbers' } }} enterprise={enterprise} onChange={() => {}} />);
    expect(select('block').value).toBe('numbers');
    expect(select('specimen').value).toBe('inherit');
    expect(screen.getByTestId('label-style-example').textContent).toBe('Specimen 1 · Block 1 · Slide La');
  });

  it('choosing "Same as enterprise" removes the override', () => {
    const onChange = vi.fn();
    render(<FacilityLabelStyleField record={{ labelStyle: { block: 'numbers', slide: 'letters' } }} enterprise={enterprise} onChange={onChange} />);
    fireEvent.change(select('block'), { target: { value: 'inherit' } });
    expect(onChange).toHaveBeenLastCalledWith({ slide: 'letters' });
  });

  it('a facility that still has the old preset shows it as its own choice, so its labels do not change', () => {
    render(<FacilityLabelStyleField record={{ specimenLabelStyle: 'numeric-specimen' }} enterprise={{ labelStyle: { specimen: 'letters', block: 'numbers' } }} onChange={() => {}} />);
    expect(select('specimen').value).toBe('numbers');
    expect(select('block').value).toBe('letters');
    expect(select('preset').value).toBe('numeric-specimen');
    expect(screen.getByTestId('label-style-example').textContent).toBe('Specimen 1 · Block A · Slide L1');
  });
});

describe('presets', () => {
  it('picking the old combined option sets specimen and block together', () => {
    const onChange = vi.fn();
    render(<FacilityLabelStyleField record={{ isEnterprise: true, labelStyle: { slide: 'letters' } }} onChange={onChange} />);
    fireEvent.change(select('preset'), { target: { value: 'numeric-specimen' } });
    expect(onChange).toHaveBeenLastCalledWith({ specimen: 'numbers', block: 'letters', slide: 'letters' });
  });
});

describe('same-kind warning', () => {
  it('warns when specimens and blocks both use letters, or both use numbers; not otherwise', () => {
    const { rerender } = render(<FacilityLabelStyleField record={{ isEnterprise: true, labelStyle: { specimen: 'letters', block: 'letters' } }} onChange={() => {}} />);
    expect(screen.getByTestId('label-style-warning').textContent).toContain('AA');
    rerender(<FacilityLabelStyleField record={{ isEnterprise: true, labelStyle: { specimen: 'numbers', block: 'numbers' } }} onChange={() => {}} />);
    expect(screen.getByTestId('label-style-warning').textContent).toContain('11');
    rerender(<FacilityLabelStyleField record={{ isEnterprise: true }} onChange={() => {}} />);
    expect(screen.queryByTestId('label-style-warning')).toBeNull();
  });
});
