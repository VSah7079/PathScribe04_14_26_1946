import { describe, expect, it } from 'vitest';
import { collectMarginInk, inkForMarginLabel, swatchColor } from './marginInkLabels';
import type { Specimen } from '@/types/case/Specimen';

const ink = (colorName: string, colorCode: string) => ({ id: colorName, colorCode, colorName, appliedAt: '2026-10-01T00:00:00Z', appliedByName: 'A' });
const specimens = [{
  id: 's1', label: 'A',
  margins: [
    { id: 'm1', name: 'Superior', examinationStatus: 'pending', inkApplications: [ink('Blue', '#00AEEF'), ink('Green', '#00A651')] },
    { id: 'm2', name: 'Deep', examinationStatus: 'pending', inkApplications: [] },
  ],
  blocks: [{ id: 'b1', label: 'A', margins: [{ id: 'm3', name: 'Deep lateral', examinationStatus: 'examined', inkApplications: [ink('Black', 'black')] }] }],
}] as unknown as Specimen[];

describe('collectMarginInk', () => {
  it('lists margins that have an ink, with the latest colour and the earlier ones', () => {
    const e = collectMarginInk(specimens);
    expect(e.map(x => x.name)).toEqual(['Superior', 'Deep lateral']);
    expect(e[0]).toMatchObject({ colorName: 'Green', colorCode: '#00A651', earlier: [{ colorName: 'Blue', colorCode: '#00AEEF' }] });
  });
  it('lists nothing for no specimens or no ink', () => {
    expect(collectMarginInk(undefined)).toEqual([]);
    expect(collectMarginInk([{ id: 's', label: 'A', margins: [{ id: 'x', name: 'Deep', examinationStatus: 'pending', inkApplications: [] }] }] as unknown as Specimen[])).toEqual([]);
  });
});

describe('inkForMarginLabel', () => {
  const e = collectMarginInk(specimens);
  it('matches a label that names the margin', () => {
    expect(inkForMarginLabel(e, 'Superior margin')?.colorName).toBe('Green');
    expect(inkForMarginLabel(e, 'Margin status: Superior')?.colorName).toBe('Green');
    expect(inkForMarginLabel(e, 'Superior')?.colorName).toBe('Green');
  });
  it('prefers the longest margin name', () => {
    expect(inkForMarginLabel(e, 'Deep lateral margin')?.colorName).toBe('Black');
  });
  it('does not match a margin with no ink, an unrelated label, or a part of a word', () => {
    expect(inkForMarginLabel(e, 'Deep margin')).toBeUndefined();
    expect(inkForMarginLabel(e, 'Tumour size')).toBeUndefined();
    expect(inkForMarginLabel(e, 'Superiority margin')).toBeUndefined();
    expect(inkForMarginLabel(e, 'Superior pole')).toBeUndefined();
  });
});

describe('swatchColor', () => {
  it('draws only hex colours', () => {
    expect(swatchColor('#00AEEF')).toBe('#00AEEF');
    expect(swatchColor('#0AE')).toBe('#0AE');
    expect(swatchColor('black')).toBeNull();
    expect(swatchColor('url(x)')).toBeNull();
  });
});
