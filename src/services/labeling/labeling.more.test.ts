// Batch 715: audit entry, editor decisions and the case-level lookup.
import { describe, it, expect } from 'vitest';
import { buildLabelStyleAuditEntry } from './labelStyleAudit';
import { labelChoices, labelChoiceOf, applyLabelChoice, applyLabelPreset, labelPresetOf, labelStyleFieldsToSave } from './labelStyleEditor';
import { resolveCaseLabelStyle, orderingFacilityOf } from './resolveCaseLabelStyle';
import type { Facility } from '../facilities/IFacilityService';

describe('buildLabelStyleAuditEntry', () => {
  it('records each level that changed, and says existing labels are untouched', () => {
    const e = buildLabelStyleAuditEntry({ name: 'Lab 1' }, { labelStyle: { block: 'numbers' } }, { labelStyle: { block: 'letters', slide: 'letters' } }, 'Pete');
    expect(e?.event).toBe('Facility label style changed');
    expect(e?.detail).toContain('block numbers -> letters');
    expect(e?.detail).toContain('slide not set -> letters');
    expect(e?.detail).toContain('existing labels unchanged');
    expect(e?.user).toBe('Pete');
  });
  it('names the enterprise default as such', () => {
    expect(buildLabelStyleAuditEntry({ name: 'Ent', isEnterprise: true }, {}, { labelStyle: { specimen: 'numbers' } }, 'x')?.event).toBe('Enterprise label style changed');
  });
  it('is null when nothing about labelling changed (including legacy preset -> same per-level choices)', () => {
    expect(buildLabelStyleAuditEntry({ name: 'L' }, { specimenLabelStyle: 'numeric-specimen' }, { labelStyle: { specimen: 'numbers', block: 'letters' } }, 'x')).toBeNull();
    expect(buildLabelStyleAuditEntry({ name: 'L' }, {}, {}, 'x')).toBeNull();
  });
});

describe('editor decisions', () => {
  it('an enterprise offers Letters/Numbers; a lab also offers inherit', () => {
    expect(labelChoices(true)).toEqual(['letters', 'numbers']);
    expect(labelChoices(false)).toEqual(['inherit', 'letters', 'numbers']);
  });
  it('shows inherit for an unset part on a lab, and the default on the enterprise', () => {
    expect(labelChoiceOf({}, 'block', false)).toBe('inherit');
    expect(labelChoiceOf({}, 'block', true)).toBe('numbers');
    expect(labelChoiceOf({ specimenLabelStyle: 'numeric-specimen' }, 'specimen', false)).toBe('numbers');
  });
  it('choosing folds the old preset in, and inherit removes the part', () => {
    expect(applyLabelChoice({ specimenLabelStyle: 'numeric-specimen' }, 'slide', 'letters')).toEqual({ specimen: 'numbers', block: 'letters', slide: 'letters' });
    expect(applyLabelChoice({ labelStyle: { block: 'letters' } }, 'block', 'inherit')).toEqual({});
  });
  it('a preset sets specimen and block together and leaves slide alone', () => {
    expect(applyLabelPreset({ labelStyle: { slide: 'letters' } }, 'numeric-specimen')).toEqual({ specimen: 'numbers', block: 'letters', slide: 'letters' });
    expect(labelPresetOf({ labelStyle: { specimen: 'letters', block: 'numbers' } })).toBe('alpha-specimen');
    expect(labelPresetOf({ labelStyle: { specimen: 'letters', block: 'letters' } })).toBe('');
  });
  it('saving stores labelStyle and clears the old field; nothing set stores nothing', () => {
    expect(labelStyleFieldsToSave({ labelStyle: { block: 'letters' }, specimenLabelStyle: 'alpha-specimen' })).toEqual({ labelStyle: { specimen: 'letters', block: 'letters' }, specimenLabelStyle: undefined });
    expect(labelStyleFieldsToSave({})).toEqual({ labelStyle: undefined, specimenLabelStyle: undefined });
  });
});

describe('resolveCaseLabelStyle', () => {
  const ent = { id: 'ent', isEnterprise: true, roles: ['performing_lab'], legacyTenantIds: ['HOSP-1'], labelStyle: { block: 'letters' } } as unknown as Facility;
  const deps = { getFacilities: async () => [ent] };
  it('the style recorded on the case wins, even if the facility changed since', async () => {
    const recorded = { specimen: 'numbers', block: 'numbers', slide: 'letters' } as const;
    expect(await resolveCaseLabelStyle({ labelStyle: recorded, order: { facilityId: 'ent' } }, deps)).toEqual(recorded);
  });
  it('an older case looks its facility up (by id or legacy tenant id)', async () => {
    expect(await resolveCaseLabelStyle({ order: { facilityId: 'ent' } }, deps)).toEqual({ specimen: 'letters', block: 'letters', slide: 'numbers' });
    expect(orderingFacilityOf({ originHospitalId: 'HOSP-1' }, [ent])?.id).toBe('ent');
  });
  it('falls back to today\'s labels when the facilities cannot be read', async () => {
    expect(await resolveCaseLabelStyle({ order: { facilityId: 'ent' } }, { getFacilities: async () => { throw new Error('down'); } })).toEqual({ specimen: 'letters', block: 'numbers', slide: 'numbers' });
  });
});
