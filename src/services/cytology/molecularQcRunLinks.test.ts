// Batch 406: the molecular QC Batch Management page's decisions.
import { describe, it, expect } from 'vitest';
import { qcRunsNewestFirst, specimensByMolecularRun } from './molecularQcRunLinks';
import type { MolecularQcRunRecord } from './IMolecularQcRunRecordService';

describe('molecularQcRunLinks', () => {
  it('runs newest first', () => {
    const runs = [{ id: 'a', runDate: '2026-09-01' }, { id: 'b', runDate: '2026-09-05' }] as MolecularQcRunRecord[];
    expect(qcRunsNewestFirst(runs).map(r => r.id)).toEqual(['b', 'a']);
  });

  it('groups specimens by the run the inbound event set, skipping specimens with none', () => {
    const cases = [
      { id: 'c1', accession: { accessionNumber: 'S1' }, patient: { mrn: 'M1' }, specimens: [
        { id: 's1', label: 'A', cytologyScreening: { molecularRunId: 'r1' } }, { id: 's2', label: 'B' },
      ] },
      { id: 'c2', specimens: [{ id: 's3', label: 'A', cytologyScreening: { molecularRunId: 'r1' } }] },
    ];
    expect(specimensByMolecularRun(cases)).toEqual({ r1: [
      { caseId: 'c1', accessionNumber: 'S1', specimenId: 's1', specimenLabel: 'A', patientMrn: 'M1' },
      { caseId: 'c2', accessionNumber: undefined, specimenId: 's3', specimenLabel: 'A', patientMrn: undefined },
    ] });
  });
});
