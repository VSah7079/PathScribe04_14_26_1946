// Batch 467b: the sign-out warning for answers that differ from their molecular result.
import { describe, it, expect } from 'vitest';
import { findMolecularResultDifferences, molecularDifferencesMessage } from './molecularSignOutCheck';
import type { Case } from '@/types/case/Case';
import { plateWellTitle } from '../molecular/plateBuilderWells';

const template = { name: 'Lung', sections: [{ fields: [{ id: 'egfr', type: 'dropdown', label: 'EGFR status', options: [{ id: 'det', label: 'Detected' }, { id: 'not', label: 'Not detected' }], molecularResult: { assayCodes: ['st-egfr'], values: { POSITIVE: 'det', NEGATIVE: 'not' } } }] }] };
const source = { egfr: { orderId: 'MO-1', assayName: 'EGFR PCR', call: 'POSITIVE' } };
const caseWith = (answers: Record<string, string>, extra: Record<string, unknown> = {}) =>
  ({ synopticReports: [{ instanceId: 'i1', templateId: 'lung', templateName: 'Lung', status: 'draft', answers, resultSources: source, ...extra }] } as unknown as Case);
const deps = { getTemplate: async () => template };

describe('findMolecularResultDifferences', () => {
  it('lists an answer that differs from its result, with the result\'s label', async () => {
    expect(await findMolecularResultDifferences(caseWith({ egfr: 'not' }), deps)).toEqual([
      { instanceId: 'i1', templateName: 'Lung', fieldId: 'egfr', fieldLabel: 'EGFR status', assayName: 'EGFR PCR', orderId: 'MO-1', resultLabel: 'Detected' },
    ]);
  });
  it('skips synoptics already signed out (only those still being reported)', async () => {
    expect(await findMolecularResultDifferences(caseWith({ egfr: 'not' }, { status: 'finalized' }), deps)).toEqual([]);
  });
  it('is empty when the answer matches, when there are no results, or for a deleted synoptic', async () => {
    expect(await findMolecularResultDifferences(caseWith({ egfr: 'det' }), deps)).toEqual([]);
    expect(await findMolecularResultDifferences({ synopticReports: [{ instanceId: 'i', templateId: 'lung', answers: { egfr: 'not' } }] } as unknown as Case, deps)).toEqual([]);
    expect(await findMolecularResultDifferences(caseWith({ egfr: 'not' }, { deletedAt: '2026-10-01' }), deps)).toEqual([]);
    expect(await findMolecularResultDifferences(null, deps)).toEqual([]);
  });
  it('a template that can\'t be loaded is skipped', async () => {
    expect(await findMolecularResultDifferences(caseWith({ egfr: 'not' }), { getTemplate: async () => { throw new Error('gone'); } })).toEqual([]);
  });
});

describe('molecularDifferencesMessage', () => {
  it('one line per difference, then the question', () => {
    const t = (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k);
    const msg = molecularDifferencesMessage(t, [{ instanceId: 'i1', templateName: 'Lung', fieldId: 'egfr', fieldLabel: 'EGFR status', assayName: 'EGFR PCR', orderId: 'MO-1', resultLabel: 'Detected' }]);
    expect(msg.split('\n')).toEqual([
      'molecularOrders.signOut.difference:{"synoptic":"Lung","question":"EGFR status","assay":"EGFR PCR","order":"MO-1","result":"Detected"}',
      'molecularOrders.signOut.prompt',
    ]);
  });
});

describe('plateWellTitle (Batch 467b)', () => {
  it('chooses the tooltip by what the well holds', () => {
    expect(plateWellTitle({ wellPosition: 'A01' })).toEqual({ key: 'empty', values: { well: 'A01' } });
    expect(plateWellTitle({ wellPosition: 'A01', sampleType: 'CONTROL_NTC' })).toEqual({ key: 'sample', values: { well: 'A01' } });
    expect(plateWellTitle({ wellPosition: 'A02', sampleType: 'PATIENT_SPECIMEN' })).toEqual({ key: 'sample', values: { well: 'A02' } });
    expect(plateWellTitle({ wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', orderId: 'MO-1' })).toEqual({ key: 'order', values: { well: 'A03', order: 'MO-1' } });
  });
});
