// Batch 715: letters or numbers for specimens, blocks and slides (src/utils/specimenLabeling.ts).
import { describe, it, expect } from 'vitest';
import {
  designationLabel, designationIndex, getSpecimenLabel, getBlockLabel, nextBlockLabel, slideLevelText, exampleLabels, toLabelStyle,
} from './specimenLabeling';
import type { LabelStyle } from '@/services/labeling/labelStyle';

const combos: Array<[string, LabelStyle, { specimen: string[]; block: string[]; cassette: string }]> = [
  ['letters / numbers (today\'s default)', { specimen: 'letters', block: 'numbers', slide: 'numbers' }, { specimen: ['A', 'B', 'C'], block: ['1', '2', '3'], cassette: 'A1' }],
  ['numbers / letters', { specimen: 'numbers', block: 'letters', slide: 'numbers' }, { specimen: ['1', '2', '3'], block: ['A', 'B', 'C'], cassette: '1A' }],
  ['letters / letters', { specimen: 'letters', block: 'letters', slide: 'letters' }, { specimen: ['A', 'B', 'C'], block: ['A', 'B', 'C'], cassette: 'AA' }],
  ['numbers / numbers', { specimen: 'numbers', block: 'numbers', slide: 'letters' }, { specimen: ['1', '2', '3'], block: ['1', '2', '3'], cassette: '11' }],
];

describe('label generators, every specimen/block combination', () => {
  it.each(combos)('%s', (_name, style, want) => {
    expect([0, 1, 2].map(i => getSpecimenLabel(i, style))).toEqual(want.specimen);
    expect([0, 1, 2].map(i => getBlockLabel(i, style))).toEqual(want.block);
    expect(exampleLabels(style).cassette).toBe(want.cassette);
  });

  it('runs past Z as AA, AB for letters and keeps counting for numbers', () => {
    expect(designationLabel(25, 'letters')).toBe('Z');
    expect(designationLabel(26, 'letters')).toBe('AA');
    expect(designationLabel(27, 'letters')).toBe('AB');
    expect(designationLabel(51, 'letters')).toBe('AZ');
    expect(designationLabel(26, 'numbers')).toBe('27');
  });

  it('designationIndex is the inverse of designationLabel', () => {
    for (const d of ['letters', 'numbers'] as const) {
      for (const i of [0, 1, 25, 26, 27, 51, 52]) expect(designationIndex(designationLabel(i, d), d)).toBe(i);
    }
    expect(designationIndex('A', 'numbers')).toBe(-1);
    expect(designationIndex('3', 'letters')).toBe(-1);
  });
});

describe('the old preset still works wherever a style is accepted', () => {
  it('alpha-specimen is specimen letters, block numbers (A1, A2)', () => {
    expect(getSpecimenLabel(1, 'alpha-specimen')).toBe('B');
    expect(getBlockLabel(1, 'alpha-specimen')).toBe('2');
  });
  it('numeric-specimen is specimen numbers, block letters (1A, 1B)', () => {
    expect(getSpecimenLabel(1, 'numeric-specimen')).toBe('2');
    expect(getBlockLabel(1, 'numeric-specimen')).toBe('B');
  });
  it('nothing given is today\'s labels', () => {
    expect(getSpecimenLabel(0)).toBe('A');
    expect(getBlockLabel(0)).toBe('1');
    expect(toLabelStyle(undefined)).toEqual({ specimen: 'letters', block: 'numbers', slide: 'numbers' });
  });
  it('a partial style takes the default for the missing parts', () => {
    expect(toLabelStyle({ block: 'letters' })).toEqual({ specimen: 'letters', block: 'letters', slide: 'numbers' });
  });
});

describe('nextBlockLabel', () => {
  it('starts at the first label for a specimen with no blocks', () => {
    expect(nextBlockLabel([], { block: 'numbers' })).toBe('1');
    expect(nextBlockLabel([], { block: 'letters' })).toBe('A');
  });
  it('is the next one in the block style', () => {
    expect(nextBlockLabel(['A', 'B'], { block: 'letters' })).toBe('C');
    expect(nextBlockLabel(['1', '2', '3'], { block: 'numbers' })).toBe('4');
  });
  it('never repeats a label after a block was removed (was: blocks.length + 1)', () => {
    expect(nextBlockLabel(['2', '3'], { block: 'numbers' })).toBe('4');
    expect(nextBlockLabel(['1', '3'], { block: 'numbers' })).toBe('4');
    expect(nextBlockLabel(['A', 'C'], { block: 'letters' })).toBe('D');
  });
  it('ignores labels made under another style when counting, and never collides', () => {
    expect(nextBlockLabel(['1', '2'], { block: 'letters' })).toBe('A');
    expect(nextBlockLabel(['A', 'B'], { block: 'numbers' })).toBe('1');
    expect(nextBlockLabel(['A', '1'], { block: 'letters' })).toBe('B');
  });
});

describe('slide level text', () => {
  it('numbers print the level as it always has: L1, L2', () => {
    expect(slideLevelText('L1')).toBe('L1');
    expect(slideLevelText('L12', 'numbers')).toBe('L12');
  });
  it('letters print La, Lb (the stored level code is untouched)', () => {
    expect(slideLevelText('L1', 'letters')).toBe('La');
    expect(slideLevelText('L2', 'letters')).toBe('Lb');
    expect(slideLevelText('L27', 'letters')).toBe('Laa');
  });
  it('leaves a level it cannot read alone', () => {
    expect(slideLevelText('X', 'letters')).toBe('X');
  });
});

describe('example for the configuration screen', () => {
  it('shows each level in its style', () => {
    expect(exampleLabels({ specimen: 'letters', block: 'numbers', slide: 'numbers' })).toEqual({ specimen: 'A', block: '1', slide: 'L1', cassette: 'A1' });
    expect(exampleLabels({ specimen: 'numbers', block: 'letters', slide: 'letters' })).toEqual({ specimen: '1', block: 'A', slide: 'La', cassette: '1A' });
  });
});
