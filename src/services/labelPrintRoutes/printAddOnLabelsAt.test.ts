// Batch 730 (Lab Workflow & Batch spec §5, §8): "print labels at".
import { describe, it, expect, vi } from 'vitest';
import { printAddOnLabelsAt, newSlideIds, type PrintAtDeps } from './printAddOnLabelsAt';

const before = { id: 'c1', accession: { fullAccession: 'S26-1' }, specimens: [{ label: 'A', blocks: [{ label: '1', stains: [{ id: 'old', stainName: 'H&E', displayId: 'S26-1-A1-L1' }] }] }] } as never;
const after = { id: 'c1', accession: { fullAccession: 'S26-1' }, specimens: [{ label: 'A', blocks: [{ label: '1', stains: [
  { id: 'old', stainName: 'H&E', displayId: 'S26-1-A1-L1' }, { id: 'n1', stainName: 'PAS', displayId: 'S26-1-A1-L2' }, { id: 'n2', stainName: 'Ki-67', displayId: 'S26-1-A1-L3' },
] }] }] } as never;

const deps = (over: Partial<PrintAtDeps> = {}): PrintAtDeps => ({
  enforce: vi.fn(async () => ({ allowed: true })),
  getStation: vi.fn(async () => ({ id: 'st1', name: 'Stain Bench', supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' })),
  getPrinter: vi.fn(async () => ({ id: 'p1' }) as never),
  getPrintSettings: vi.fn(async () => ({ gtin: '123' })),
  print: vi.fn(async () => ({ ok: true })),
  recordRoutes: vi.fn(async () => ({ ok: true })),
  recordScan: vi.fn(),
  levelOf: (_s, i) => `L${i + 1}`,
  ...over,
});

describe('print labels at another station', () => {
  it('only the slides the order made', () => {
    expect([...newSlideIds(before, after)]).toEqual(['n1', 'n2']);
  });
  it('prints them at the station, records each route and a printed scan there', async () => {
    const d = deps();
    const out = await printAddOnLabelsAt({ caseData: after, slideIds: new Set(['n1', 'n2']), stationId: 'st1', actor: { id: 'u', name: 'Dr A' } }, d);
    expect(out).toEqual({ status: 'printed', printed: 2, failed: 0 });
    expect(d.recordRoutes).toHaveBeenCalledWith([
      expect.objectContaining({ stainOrderId: 'n1', slideId: 'S26-1-A1-L2', stationId: 'st1' }),
      expect.objectContaining({ stainOrderId: 'n2', slideId: 'S26-1-A1-L3' }),
    ]);
    expect(d.recordScan).toHaveBeenCalledWith(expect.objectContaining({ stationId: 'st1', itemId: 'S26-1-A1-L2', action: 'printed' }));
  });
  it('needs print:job:redirect; prints nothing without it', async () => {
    const d = deps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await printAddOnLabelsAt({ caseData: after, slideIds: new Set(['n1']), stationId: 'st1', actor: { id: 'u', name: 'A' } }, d)).toEqual({ status: 'notPermitted' });
    expect(d.print).not.toHaveBeenCalled();
    expect(d.enforce).toHaveBeenCalledWith('print:job:redirect');
  });
  it('a station with no slide printer prints nothing; a failed label is left for the microtome', async () => {
    expect(await printAddOnLabelsAt({ caseData: after, slideIds: new Set(['n1']), stationId: 'st1', actor: { id: 'u', name: 'A' } }, deps({ getStation: async () => ({ id: 'st1', name: 'X', supportsPrinting: false }) }))).toEqual({ status: 'noPrinter' });
    let n = 0;
    const d = deps({ print: vi.fn(async () => ({ ok: ++n === 1 })) });
    expect(await printAddOnLabelsAt({ caseData: after, slideIds: new Set(['n1', 'n2']), stationId: 'st1', actor: { id: 'u', name: 'A' } }, d)).toEqual({ status: 'printed', printed: 1, failed: 1 });
    expect((d.recordRoutes as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(1);
  });
});
