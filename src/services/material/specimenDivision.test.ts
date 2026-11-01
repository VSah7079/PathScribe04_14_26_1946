// Batch 741 (Pete, fluid decisions 2 and 3): Divide specimen with the volume accounted for; aliquot destination and
// forward-only status, with the receiving accession required at Result back.
import { describe, it, expect, vi } from 'vitest';
import { divisionProblem, divisionTotals, prefillRows, defaultDestinationFor, divideSpecimen, changeAliquotStatus, statusChangeProblem, type DivisionDeps, type DivisionRow } from './specimenDivision';

const row = (purpose: DivisionRow['purpose'], volumeMl: number, name = 'Flow Cytometry'): DivisionRow => ({ purpose, volumeMl, destination: { kind: 'department', name } });

function store(specimens: any[]) {
  const box = { specimens };
  const deps: DivisionDeps = {
    enforce: vi.fn(async () => ({ allowed: true })),
    updateSpecimens: async (_id, change) => { const next = change(box.specimens); if (!next) return false; box.specimens = next as any[]; return true; },
    audit: vi.fn(),
    now: () => new Date('2026-10-30T12:00:00Z'),
  };
  return { box, deps };
}

describe('Divide specimen (Batch 741)', () => {
  it('accounts for the volume and refuses a split larger than the start', () => {
    expect(divisionTotals(30, [row('flow_cytometry', 5), row('microbiology', 3.5)])).toEqual({ splitMl: 8.5, remainingMl: 21.5 });
    expect(divisionProblem(undefined, [row('molecular', 1)])).toBe('noStartingVolume');
    expect(divisionProblem(10, [])).toBe('noRows');
    expect(divisionProblem(10, [row('molecular', 0)])).toBe('rowVolume');
    expect(divisionProblem(10, [row('molecular', 2, ' ')])).toBe('rowDestination');
    expect(divisionProblem(10, [row('molecular', 6), row('flow_cytometry', 5)])).toBe('overStartingVolume');
    expect(divisionProblem(10, [row('molecular', 6)], true)).toBe('alreadyDivided');
    expect(divisionProblem(10, [row('molecular', 10)])).toBeNull();
  });
  it('pre-fills a row per suggested purpose, to its default department', () => {
    expect(prefillRows(['flow_cytometry', 'microbiology'], defaultDestinationFor).map(r => [r.purpose, r.destination.name])).toEqual([['flow_cytometry', 'Flow Cytometry'], ['microbiology', 'Microbiology']]);
  });
  it('makes the aliquots, records the division and audits it, once', async () => {
    const { box, deps } = store([{ id: 'sp', label: 'A', decants: [{ id: 'd1', label: 'D1', decantType: 'residual_fluid', stains: [] }] }]);
    const r = await divideSpecimen({ caseId: 'c', accession: 'S26-9', specimenId: 'sp', startingVolumeMl: 30, rows: [row('flow_cytometry', 5), row('microbiology', 3, 'Microbiology')], actor: { name: 'Priya' } }, deps);
    expect(r).toEqual({ ok: true, aliquotLabels: ['D2', 'D3'], remainingMl: 22 });
    const sp = box.specimens[0];
    expect(sp.decants.slice(1).map((d: any) => [d.decantType, d.aliquotPurpose, d.volumeMl, d.destination.name, d.aliquotStatus, d.displayId])).toEqual([
      ['aliquot', 'flow_cytometry', 5, 'Flow Cytometry', 'not_sent', 'S26-9-AD2'], ['aliquot', 'microbiology', 3, 'Microbiology', 'not_sent', 'S26-9-AD3']]);
    expect(sp.division).toMatchObject({ startingVolumeMl: 30, splitMl: 8, remainingMl: 22, dividedByName: 'Priya' });
    expect((deps.audit as any).mock.calls[0][0]).toMatchObject({ event: 'Specimen Divided', caseId: 'S26-9' });
    expect(await divideSpecimen({ caseId: 'c', accession: 'S26-9', specimenId: 'sp', startingVolumeMl: 30, rows: [row('molecular', 1)], actor: { name: 'Priya' } }, deps)).toEqual({ ok: false, problem: 'alreadyDivided' });
    expect(deps.enforce).toHaveBeenCalledWith('material:specimen:divide', { caseId: 'c' });
  });
});

describe('aliquot status (Batch 741)', () => {
  it('moves forward only, and needs the receiving accession at Result back', async () => {
    expect(statusChangeProblem({ decantType: 'cell_block' }, 'sent')).toBe('notAliquot');
    expect(statusChangeProblem({ decantType: 'aliquot', aliquotStatus: 'received' }, 'sent')).toBe('notForward');
    expect(statusChangeProblem({ decantType: 'aliquot', aliquotStatus: 'received' }, 'result_back')).toBe('receivingAccessionRequired');
    const { box, deps } = store([{ id: 'sp', label: 'A', decants: [{ id: 'a1', label: 'D2', decantType: 'aliquot', aliquotStatus: 'not_sent', stains: [] }] }]);
    expect(await changeAliquotStatus({ caseId: 'c', accession: 'S26-9', aliquotId: 'a1', next: 'sent', actor: { name: 'Priya' } }, deps)).toEqual({ ok: true });
    expect(await changeAliquotStatus({ caseId: 'c', accession: 'S26-9', aliquotId: 'a1', next: 'result_back', actor: { name: 'Priya' } }, deps)).toEqual({ ok: false, problem: 'receivingAccessionRequired' });
    expect(await changeAliquotStatus({ caseId: 'c', accession: 'S26-9', aliquotId: 'a1', next: 'result_back', receivingAccession: ' FC26-1234 ', actor: { name: 'Priya' } }, deps)).toEqual({ ok: true });
    const d = box.specimens[0].decants[0];
    expect([d.aliquotStatus, d.receivingAccession, d.aliquotStatusHistory.map((h: any) => h.status)]).toEqual(['result_back', 'FC26-1234', ['sent', 'result_back']]);
    expect(deps.enforce).toHaveBeenCalledWith('material:aliquot-status:update', { caseId: 'c' });
  });
});
