// Batch 728 (Lab Workflow & Batch spec, Decision 4a): the configurable batch purpose.
import { describe, it, expect } from 'vitest';
import { mockBatchService } from './mockBatchService';
import {
  normaliseBatchPurposes, batchPurposeProblems, newBatchPurposeId, batchPurposeLabelKey,
  effectiveBatchPurposeId, batchMatchesPurposeFilter, BUILT_IN_BATCH_PURPOSE_IDS,
} from './batchPurposes';

describe('batch purposes (Decision 4a)', () => {
  it('six built-in purposes always present, in order, then the lab\'s own', () => {
    const list = normaliseBatchPurposes([{ id: 'lab-pilot', name: ' Pilot study ', active: true }, { id: 'teaching', active: false }]);
    expect(list.map(p => p.id)).toEqual([...BUILT_IN_BATCH_PURPOSE_IDS, 'lab-pilot']);
    expect(list.find(p => p.id === 'teaching')!.active).toBe(false);
    expect(list.find(p => p.id === 'lab-pilot')).toEqual({ id: 'lab-pilot', name: 'Pilot study', builtIn: false, active: true });
  });

  it('Routine cannot be switched off; a lab purpose needs a unique name', () => {
    expect(normaliseBatchPurposes([{ id: 'routine', active: false }])[0].active).toBe(true);
    const base = normaliseBatchPurposes(null);
    expect(batchPurposeProblems(base)).toEqual([]);
    expect(batchPurposeProblems(base.map(p => (p.id === 'routine' ? { ...p, active: false } : p)))).toEqual(['routineRequired']);
    expect(batchPurposeProblems([...base, { id: 'a', name: ' ', builtIn: false, active: true }])).toEqual(['nameRequired']);
    expect(batchPurposeProblems([...base, { id: 'a', name: 'X', builtIn: false, active: true }, { id: 'b', name: 'x ', builtIn: false, active: true }])).toEqual(['duplicateName']);
  });

  it('new ids are unique; built-ins are named from the locale, the lab\'s own as entered', () => {
    const base = normaliseBatchPurposes([{ id: 'lab-pilot', name: 'Pilot', active: true }]);
    expect(newBatchPurposeId('Pilot', base)).toBe('lab-pilot-2');
    expect(newBatchPurposeId('Vet / Animal', base)).toBe('lab-vet-animal');
    expect(batchPurposeLabelKey('clinical-trial')).toBe('batchPurposes.builtIn.clinical-trial');
    expect(batchPurposeLabelKey('lab-pilot')).toBeUndefined();
  });

  it('a new carrier keeps the purpose chosen, or Routine when none is', async () => {
    const draft = { processingNode: 'Processing', protocol: 'Overnight', priority: 'Routine', createdByUserId: 'u1', createdByUserName: 'Tech A' } as const;
    const routine = await mockBatchService.create(draft as never);
    const research = await mockBatchService.create({ ...draft, purposeId: 'research' } as never);
    expect(routine.ok && routine.data.purposeId).toBe('routine');
    expect(research.ok && research.data.purposeId).toBe('research');
  });

  it('a carrier without a purpose counts as Routine; a profile filter with none chosen shows all', () => {
    expect(effectiveBatchPurposeId({})).toBe('routine');
    expect(batchMatchesPurposeFilter({}, undefined)).toBe(true);
    expect(batchMatchesPurposeFilter({}, ['routine'])).toBe(true);
    expect(batchMatchesPurposeFilter({ purposeId: 'research' }, ['routine'])).toBe(false);
    expect(batchMatchesPurposeFilter({ purposeId: 'research' }, [])).toBe(true);
  });
});
