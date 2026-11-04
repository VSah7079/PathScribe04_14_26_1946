import { beforeEach, describe, expect, it } from 'vitest';
import { _resetDispatchedSlideLabelsForTests, dispatchSlideLabel, getDispatchedSlideLabels, markSlideLabelOutput, wasSlideLabelOutput } from './dispatchSlideLabel';
import { resetSimulatedPrintForTests, listSimulatedPrints } from '@/services/printing/simulatedPrint';
import { setDataMayPersistInBrowserForTests } from '@/services/browserData/browserDataPolicy';

const req = (slideId: string) => ({ fullAccession: 'PS26-1', specimenLabel: 'A', blockLabel: '1', level: 'L1', stainName: 'H&E', slideId });

describe('a slide label is produced once (Batch 606, PS-14)', () => {
  beforeEach(() => { _resetDispatchedSlideLabelsForTests(); resetSimulatedPrintForTests(); setDataMayPersistInBrowserForTests(true); });

  it('the scan dispatch marks the slide, and a second scan does not engrave it again', async () => {
    expect((await dispatchSlideLabel(req('S1'))).dispatched).toBe(true);
    expect(wasSlideLabelOutput('S1')).toBe(true);
    expect((await dispatchSlideLabel(req('S1'))).dispatched).toBe(false);
    expect(getDispatchedSlideLabels()).toHaveLength(1);
    expect(listSimulatedPrints()).toHaveLength(1);
  });

  it('a slide already printed at the workstation is not engraved by the scan', async () => {
    markSlideLabelOutput('S2');
    expect((await dispatchSlideLabel(req('S2'))).dispatched).toBe(false);
    expect(listSimulatedPrints()).toHaveLength(0);
  });

  it('different slides are independent', async () => {
    await dispatchSlideLabel(req('S3'));
    expect((await dispatchSlideLabel(req('S4'))).dispatched).toBe(true);
  });
});
