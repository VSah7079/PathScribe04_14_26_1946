// Batch 737 (Lab Workflow & Batch spec §10.6, §11.1): what Batch Management does when it is scanned an exhausted block
// (added, with a warning) or a large-format slide (refused by a staining carrier that does not take large-format slides).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed: true }) } }));
const caseData = {
  id: 'S26-7', specimens: [{ id: 'sp', label: 'A', blocks: [
    { id: 'b1', label: '1', status: 'Exhausted', stains: [] },
    { id: 'b2', label: '2', status: 'Embedded', blockType: 'megablock', stains: [{ id: 's1', stainName: 'H&E', displayId: 'S26-7-A2-L1' }] },
  ] }],
};
vi.mock('@/utils/resolveMaterialFromScan', () => ({
  resolveMaterialFromScan: vi.fn(async (raw: string) => {
    const id = raw.trim();
    if (id === 'S26-7-A1') return { caseData, fullAccession: 'S26-7', specimenLetter: 'A', target: { level: 'block', blockNumber: '1' }, displayId: id };
    if (id === 'S26-7-A2-L1') return { caseData, fullAccession: 'S26-7', specimenLetter: 'A', target: { level: 'slide', blockNumber: '2' }, displayId: id };
    return null;
  }),
}));

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null, length: 0,
  });
});

async function batch(node: 'Processing' | 'Staining', largeFormat?: boolean) {
  const { mockBatchService: svc } = await import('./mockBatchService');
  const created = await svc.create({ processingNode: node, protocol: 'Routine', priority: 'Routine', createdByUserId: 'u1', createdByUserName: 'Tech A', largeFormat } as never);
  if (created.ok !== true) throw new Error('setup');
  return { svc, id: created.data.id, barcode: created.data.masterBarcode };
}

describe('Batch Management scan checks (Batch 737)', () => {
  it('adds an exhausted block, with a warning', async () => {
    const { svc, id } = await batch('Processing');
    const r = await svc.addItemByScan(id, 'S26-7-A1', 'u1', 'Tech A');
    expect(r.outcome).toBe('added');
    expect(r.outcome === 'added' && r.warning).toBe('blockExhausted');
  });

  it('refuses a large-format slide on a staining carrier that does not take it, and accepts it on one that does', async () => {
    const plain = await batch('Staining');
    expect((await plain.svc.addItemByScan(plain.id, 'S26-7-A2-L1', 'u1', 'Tech A')).outcome).toBe('slide-too-large');
    const large = await batch('Staining', true);
    const r = await large.svc.addItemByScan(large.id, 'S26-7-A2-L1', 'u1', 'Tech A');
    expect(r.outcome).toBe('added');
    expect(r.outcome === 'added' && r.warning).toBeUndefined();
  });
});
