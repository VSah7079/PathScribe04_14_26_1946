import { describe, expect, it } from 'vitest';
import { addColumn, draftFromProfile, layoutPreview, moveColumn, removeColumn, sampleRecord, unusedFields } from './batchRegistryFeedForm';
import { BATCH_FIELDS, exampleProfile } from '@/services/batchRegistryFeed/batchRegistryFeed';

// Batch 620 part S (PS-800): the editor's draft logic, without the screen.
describe('batchRegistryFeedForm', () => {
  it('a new draft starts with three required columns and nothing enabled', () => {
    const d = draftFromProfile(null, 'screening:x');
    expect(d.registryKey).toBe('screening:x');
    expect(d.enabled).toBe(false);
    expect(d.columns.map(c => c.field)).toEqual(['patientIdentifier', 'accessionNumber', 'primaryInterpretation']);
  });
  it('a draft of a profile is a copy', () => {
    const p = exampleProfile('');
    const d = draftFromProfile(p, '');
    d.columns[0].header = 'Changed';
    expect(p.columns[0].header).not.toBe('Changed');
    expect(d.id).toBe(p.id);
  });
  it('adds the next unused field, moves, removes, and stops at the ends', () => {
    const d = draftFromProfile(null, '');
    const added = addColumn(d.columns);
    expect(added).toHaveLength(4);
    expect(unusedFields(added)).toHaveLength(BATCH_FIELDS.length - 4);
    expect(moveColumn(added, 0, -1)).toEqual(added);
    expect(moveColumn(added, 3, 1)).toEqual(added);
    expect(moveColumn(added, 0, 1)[0].field).toBe(added[1].field);
    expect(removeColumn(added, 1)).toHaveLength(3);
    let all = d.columns;
    for (let i = 0; i < 30; i++) all = addColumn(all);
    expect(all).toHaveLength(BATCH_FIELDS.length);
  });
  it('previews the layout with made-up values only', () => {
    const d = draftFromProfile(null, '');
    expect(layoutPreview(d)).toBe('PatientId,Accession,Result\r\nEXAMPLE-0001,EX-26-0001,NILM\r\n');
    expect(layoutPreview({ ...d, format: 'xml' })).toContain('<Result>');
    expect(layoutPreview({ ...d, format: 'naaccr_xml' })).toBe('');
    expect(JSON.stringify(sampleRecord())).toContain('EXAMPLE');
  });
});
