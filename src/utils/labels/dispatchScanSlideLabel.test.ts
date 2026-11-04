import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchScanSlideLabel, type ScanSlideLabelDeps } from './dispatchScanSlideLabel';
import { _resetDispatchedSlideLabelsForTests, markSlideLabelOutput, wasSlideLabelOutput } from './dispatchSlideLabel';

const req = (slideId = 'S1') => ({ fullAccession: 'PS26-1', specimenLabel: 'A', blockLabel: '1', level: 'L1', stainName: 'H&E', slideId });

function makeDeps(over: Partial<ScanSlideLabelDeps> = {}): ScanSlideLabelDeps & { print: ReturnType<typeof vi.fn>; engrave: ReturnType<typeof vi.fn> } {
  const print = vi.fn().mockResolvedValue({ ok: true });
  const engrave = vi.fn().mockResolvedValue({ dispatched: true, method: 'stub' });
  return {
    dispatchSlideLabel: engrave as any,
    printSlideLabel: print as any,
    getPrinterProfile: async () => ({ ok: true, data: { id: 'p1', bridgeType: 'qz_tray', dpi: 300 } as any }),
    getPrintSettings: async () => ({ ok: true, data: { gs1Gtin: '09506000134352', slideLabelLayout: undefined as any } }),
    ...over, print, engrave,
  };
}

describe('dispatchScanSlideLabel (Batch 652): the scan at microtome really prints', () => {
  beforeEach(() => _resetDispatchedSlideLabelsForTests());

  it('a printing station sends the slide to the print service with the printer profile and GTIN', async () => {
    const deps = makeDeps();
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: false, supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' }, deps);
    expect(r).toMatchObject({ produced: true, printed: true, engraved: false });
    expect(deps.print).toHaveBeenCalledTimes(1);
    expect(deps.print.mock.calls[0][1]).toMatchObject({ id: 'p1', bridgeType: 'qz_tray' });
    expect(deps.print.mock.calls[0][2]).toBe('09506000134352');
    expect(deps.engrave).not.toHaveBeenCalled();
    expect(wasSlideLabelOutput('S1')).toBe(true);
  });

  it('an engraving station uses the engraver dispatch only', async () => {
    const deps = makeDeps();
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: true, supportsPrinting: false }, deps);
    expect(r).toMatchObject({ produced: true, engraved: true, printed: false });
    expect(deps.print).not.toHaveBeenCalled();
  });

  it('a station with both does both', async () => {
    const deps = makeDeps();
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: true, supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' }, deps);
    expect(r).toMatchObject({ engraved: true, printed: true });
  });

  it('a print that fails is not produced, is not marked in the ledger, and says why', async () => {
    const deps = makeDeps({ printSlideLabel: (async () => ({ ok: false, message: 'QZ Tray is not running' })) as any });
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: false, supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' }, deps);
    expect(r.produced).toBe(false);
    expect(r.reason).toBe('QZ Tray is not running');
    expect(wasSlideLabelOutput('S1')).toBe(false);
  });

  it('a printing station without a printer profile produces nothing', async () => {
    const deps = makeDeps();
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: false, supportsPrinting: true }, deps);
    expect(r.produced).toBe(false);
    expect(deps.print).not.toHaveBeenCalled();
  });

  it('a missing printer profile produces nothing', async () => {
    const deps = makeDeps({ getPrinterProfile: async () => ({ ok: false }) });
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: false, supportsPrinting: true, cassetteSlidePrinterProfileId: 'gone' }, deps);
    expect(r.produced).toBe(false);
    expect(deps.print).not.toHaveBeenCalled();
  });

  it('a station that neither engraves nor prints produces nothing', async () => {
    const deps = makeDeps();
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: false, supportsPrinting: false }, deps);
    expect(r.produced).toBe(false);
    expect(deps.print).not.toHaveBeenCalled();
    expect(deps.engrave).not.toHaveBeenCalled();
  });

  it('a slide already labelled (for example at the workstation) is not printed twice', async () => {
    markSlideLabelOutput('S1');
    const deps = makeDeps();
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: false, supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' }, deps);
    expect(r.produced).toBe(true);
    expect(deps.print).not.toHaveBeenCalled();
  });

  it('never throws when the print service throws', async () => {
    const deps = makeDeps({ printSlideLabel: (async () => { throw new Error('boom'); }) as any });
    const r = await dispatchScanSlideLabel(req(), { supportsEngraving: false, supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' }, deps);
    expect(r.produced).toBe(false);
  });
});
