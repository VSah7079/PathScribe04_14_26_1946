import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { withAddOnOrderDemo, ADD_ON_DEMO_CASE_ID } from './addOnOrderDemo';
import { computeAddOnTrackingStage, resolveSendOutLabChoices } from '@/utils/addOnOrderOperations';
import { REFERENCE_LAB_SEEDS, REFERENCE_LAB_IDS } from '../facilities/referenceLabSeeds';
import { activeReferenceLabs } from '../stains/referenceLabLink';
import { mockStainTypeService } from '../stains/mockStainTypeService';

const seedCase = { id: ADD_ON_DEMO_CASE_ID, specimens: [{ id: 'sp', label: 'A', blocks: [
  { id: 'blk-4401-a1', label: '1', status: 'Embedded', stains: [{ id: 'he', stainName: 'H&E', status: 'Ready for Review' }] },
  { id: 'blk-4401-a2', label: '2', status: 'Embedded', stains: [] },
] }] } as unknown as Case;

describe('add-on order demo data (Batch 403)', () => {
  const [c] = withAddOnOrderDemo([seedCase], Date.parse('2026-09-30T12:00:00Z'));
  const orders = c.specimens!.flatMap(s => s.blocks!.flatMap(b => b.stains)).filter(o => o.orderedByPathologistId);
  it('puts one order at each stage, including an exception waiting for the pathologist', () => {
    expect(orders.map(o => computeAddOnTrackingStage(o)).sort()).toEqual(['Block Retrieved', 'Cut / Pending Stain', 'Exception', 'Requested'].sort());
  });
  it('the send-out names a seeded reference lab, and is idempotent', () => {
    expect(orders.find(o => o.stainName === 'HER2 FISH')!.sendOutReferenceLabFacilityId).toBe(REFERENCE_LAB_IDS.summit);
    const again = withAddOnOrderDemo([c]);
    expect(again[0].specimens![0].blocks![0].stains).toHaveLength(c.specimens![0].blocks![0].stains.length);
  });
  it('leaves other cases alone', () => {
    const other = { ...seedCase, id: 'S26-0001' } as Case;
    expect(withAddOnOrderDemo([other])[0]).toBe(other);
  });
});

describe('reference lab seeds and test links (Batch 403)', () => {
  it('three active reference labs, and each linked test points only at them', async () => {
    const labs = activeReferenceLabs(REFERENCE_LAB_SEEDS);
    expect(labs).toHaveLength(3);
    const res = await mockStainTypeService.getAll();
    const byId = Object.fromEntries((res.ok ? res.data : []).map(s => [s.id, s]));
    expect(resolveSendOutLabChoices(byId['st-her2-fish'], labs)).toMatchObject({ defaultId: REFERENCE_LAB_IDS.summit, limited: true });
    expect(resolveSendOutLabChoices(byId['st-lymphoma-fish-panel'], labs).defaultId).toBe(REFERENCE_LAB_IDS.greatLakes);
    expect(resolveSendOutLabChoices(byId['st-ngs-solid-tumor'], labs)).toMatchObject({ defaultId: undefined, limited: true });
    expect(resolveSendOutLabChoices(byId['st-msi-pcr'], labs).limited).toBe(false);
  });
});
