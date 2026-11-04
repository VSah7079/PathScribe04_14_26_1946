// Batch 460: a scanned slide barcode resolves to the slide that label was
// printed for, even after Microtome reordered the slides or removed one.
import { describe, it, expect, vi } from 'vitest';

const caseData = {
  id: 'S26-7001', accession: { fullAccession: 'S26-7001' },
  specimens: [{ id: 'sp', label: 'A', blocks: [{ id: 'b1', label: '1', stains: [
    // Reordered: L3 first, then L1 (L2 was removed before printing).
    { id: 'ki67', stainName: 'Ki-67', displayId: 'S26-7001-A1-L3' },
    { id: 'he', stainName: 'H&E', displayId: 'S26-7001-A1-L1' },
  ] }] }],
  matrixBlocks: [{ id: 'mb', label: 'M1', participants: [], slides: [
    { id: 'm2', stainName: 'PAS', displayId: 'S26-7001-M1-L2' },
    { id: 'm1', stainName: 'H&E', displayId: 'S26-7001-M1-L1' },
  ] }],
};
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase: async (id: string) => (id === 'S26-7001' ? caseData : null), getAll: async () => [caseData] } }));

import { resolveMaterialFromScan } from './resolveMaterialFromScan';

describe('resolveMaterialFromScan: slide levels', () => {
  it('a block slide resolves by its printed level', async () => {
    const r = await resolveMaterialFromScan('S26-7001-A1-L3');
    expect(r?.target).toEqual({ level: 'slide', blockNumber: '1', slideLevel: 'L3' });
    expect(await resolveMaterialFromScan('S26-7001-A1-L2')).toBeNull();
  });
  it('a matrix slide resolves by its printed level', async () => {
    const r = await resolveMaterialFromScan('S26-7001-M1-L1');
    expect(r?.target).toEqual({ level: 'matrix_slide', matrixBlockId: 'mb', slideLevel: 'L1' });
  });
});
