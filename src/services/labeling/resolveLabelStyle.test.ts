// Batch 715: which letters-or-numbers style applies (enterprise default, performing-lab override).
import { describe, it, expect } from 'vitest';
import { resolveLabelStyle, resolveLabelStyleChain, resolveLabelStyleForFacility, labelStyleSources, cleanLabelSetting } from './resolveLabelStyle';
import { DEFAULT_LABEL_STYLE, ownLabelStyle, matchingPreset, presetToSetting, isAmbiguousCombination } from './labelStyle';
import type { Facility } from '../facilities/IFacilityService';

const fac = (o: Partial<Facility> & { id: string }): Facility => ({ name: o.id, roles: [], ...o } as unknown as Facility);

describe('resolveLabelStyle(enterprise, facility)', () => {
  it('is today\'s labels when nothing is set: specimen letters, block numbers, slide numbers', () => {
    expect(resolveLabelStyle(undefined, undefined)).toEqual({ specimen: 'letters', block: 'numbers', slide: 'numbers' });
    expect(resolveLabelStyle({}, {})).toEqual(DEFAULT_LABEL_STYLE);
  });

  it('a facility with nothing of its own follows the enterprise', () => {
    const enterprise = { labelStyle: { specimen: 'numbers', block: 'letters', slide: 'letters' } } as const;
    expect(resolveLabelStyle(enterprise, {})).toEqual({ specimen: 'numbers', block: 'letters', slide: 'letters' });
  });

  it('a facility overrides one part and still follows the enterprise for the others', () => {
    const enterprise = { labelStyle: { specimen: 'numbers', block: 'letters', slide: 'letters' } } as const;
    expect(resolveLabelStyle(enterprise, { labelStyle: { block: 'numbers' } })).toEqual({ specimen: 'numbers', block: 'numbers', slide: 'letters' });
  });

  it('a part the enterprise leaves unset falls to the default', () => {
    expect(resolveLabelStyle({ labelStyle: { slide: 'letters' } }, {})).toEqual({ specimen: 'letters', block: 'numbers', slide: 'letters' });
  });

  it('the old preset still gives today\'s labels: alpha-specimen / numeric-specimen', () => {
    expect(resolveLabelStyle(undefined, { specimenLabelStyle: 'alpha-specimen' })).toEqual({ specimen: 'letters', block: 'numbers', slide: 'numbers' });
    expect(resolveLabelStyle(undefined, { specimenLabelStyle: 'numeric-specimen' })).toEqual({ specimen: 'numbers', block: 'letters', slide: 'numbers' });
  });

  it('a facility preset beats the enterprise for specimen and block but leaves the enterprise slide choice alone', () => {
    const enterprise = { labelStyle: { specimen: 'letters', block: 'letters', slide: 'letters' } } as const;
    expect(resolveLabelStyle(enterprise, { specimenLabelStyle: 'numeric-specimen' })).toEqual({ specimen: 'numbers', block: 'letters', slide: 'letters' });
  });

  it('per-level choices win over the preset on the same record', () => {
    expect(ownLabelStyle({ specimenLabelStyle: 'numeric-specimen', labelStyle: { block: 'numbers' } })).toEqual({ specimen: 'numbers', block: 'numbers' });
  });

  it('ignores a value that is not letters or numbers', () => {
    expect(resolveLabelStyle(undefined, { labelStyle: { specimen: 'roman' as never } })).toEqual(DEFAULT_LABEL_STYLE);
    expect(cleanLabelSetting({ specimen: 'letters', block: 'x' as never })).toEqual({ specimen: 'letters' });
  });

  it('chain: the most specific record that sets a part wins', () => {
    expect(resolveLabelStyleChain([{ labelStyle: { slide: 'letters' } }, { labelStyle: { slide: 'numbers', block: 'letters' } }, { labelStyle: { specimen: 'numbers' } }]))
      .toEqual({ specimen: 'numbers', block: 'letters', slide: 'letters' });
  });
});

describe('labelStyleSources (for the "inherited" notes)', () => {
  it('says where each part comes from', () => {
    expect(labelStyleSources({ labelStyle: { specimen: 'numbers', block: 'letters' } }, { labelStyle: { block: 'numbers' } }))
      .toEqual({ specimen: 'enterprise', block: 'facility', slide: 'default' });
  });
});

describe('resolveLabelStyleForFacility: ordering client -> performing lab -> enterprise', () => {
  const enterprise = fac({ id: 'ent', isEnterprise: true, roles: ['performing_lab'], labelStyle: { specimen: 'numbers', block: 'letters', slide: 'letters' } });
  const lab = fac({ id: 'lab', parentId: 'ent', roles: ['performing_lab'], labelStyle: { block: 'numbers' } });
  const client = fac({ id: 'client', roles: ['external_ordering_client'], performingLabFacilityId: 'lab' });
  const all = [enterprise, lab, client];

  it('a lab overrides the enterprise per part', () => {
    expect(resolveLabelStyleForFacility(lab, all)).toEqual({ specimen: 'numbers', block: 'numbers', slide: 'letters' });
  });
  it('an ordering client gets its performing lab\'s style', () => {
    expect(resolveLabelStyleForFacility(client, all)).toEqual({ specimen: 'numbers', block: 'numbers', slide: 'letters' });
  });
  it('an ordering client with a preset of its own keeps its labels (before this setting, the only place it lived)', () => {
    const rmc = fac({ id: 'rmc', roles: ['external_ordering_client'], performingLabFacilityId: 'lab', specimenLabelStyle: 'alpha-specimen' });
    expect(resolveLabelStyleForFacility(rmc, [...all, rmc])).toEqual({ specimen: 'letters', block: 'numbers', slide: 'letters' });
  });
  it('the enterprise itself uses its own default', () => {
    expect(resolveLabelStyleForFacility(enterprise, all)).toEqual({ specimen: 'numbers', block: 'letters', slide: 'letters' });
  });
  it('no facility is today\'s labels', () => {
    expect(resolveLabelStyleForFacility(undefined, all)).toEqual(DEFAULT_LABEL_STYLE);
  });
});

describe('presets and the same-kind warning', () => {
  it('maps the old combined options', () => {
    expect(presetToSetting('alpha-specimen')).toEqual({ specimen: 'letters', block: 'numbers' });
    expect(presetToSetting(undefined)).toEqual({});
    expect(matchingPreset({ specimen: 'numbers', block: 'letters' })).toBe('numeric-specimen');
    expect(matchingPreset({ specimen: 'numbers', block: 'numbers' })).toBeUndefined();
  });
  it('flags specimen and block of the same kind: AA and 11 read two ways', () => {
    expect(isAmbiguousCombination({ specimen: 'letters', block: 'letters' })).toBe(true);
    expect(isAmbiguousCombination({ specimen: 'numbers', block: 'numbers' })).toBe(true);
    expect(isAmbiguousCombination({ specimen: 'letters', block: 'numbers' })).toBe(false);
  });
});
