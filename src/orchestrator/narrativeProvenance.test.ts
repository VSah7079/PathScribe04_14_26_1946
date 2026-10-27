// Batch 651: narrative sections carry a confidence and a source quote, checked against the source text.
import { describe, it, expect } from 'vitest';
import { parseNarrativeProvenance, requestNarrativeProvenance, narrativeSourceText } from './narrativeProvenance';
import type { StructuredContext } from './contextBuilder';

const SOURCE = 'Gross: a 2.3 cm firm white mass in the upper outer quadrant.\nMicroscopic: invasive ductal carcinoma, grade 2.';
const ctx = {
  order: { clinicalIndication: 'breast lump' },
  diagnostic: { grossDescription: 'a 2.3 cm firm white mass in the upper outer quadrant', microscopicDescription: 'invasive ductal carcinoma, grade 2', ancillaryStudies: '' },
  synoptics: [{ answers: [{ fieldLabel: 'Histologic type', displayValue: 'Invasive ductal carcinoma' }] }],
} as unknown as StructuredContext;

describe('parseNarrativeProvenance', () => {
  it('verifies a quote found in the source text, on the 0-100 scale', () => {
    expect(parseNarrativeProvenance('{"confidence":0.9,"quote":"invasive ductal carcinoma, grade 2"}', SOURCE)).toEqual({ status: 'verified', confidence: 90, quote: 'invasive ductal carcinoma, grade 2' });
  });
  it('marks a quote that cannot be found as unverified', () => {
    expect(parseNarrativeProvenance('{"confidence":90,"quote":"lobular carcinoma with necrosis"}', SOURCE)).toMatchObject({ status: 'unverified', confidence: 90 });
  });
  it('is unavailable for anything outside the closed schema', () => {
    for (const raw of ['not json', '[]', '{"confidence":90}', '{"confidence":90,"quote":"x y z","extra":1}', '{"confidence":"high","quote":"invasive ductal carcinoma"}', '{"confidence":90,"quote":" "}'])
      expect(parseNarrativeProvenance(raw, SOURCE)).toEqual({ status: 'unavailable' });
  });
});

describe('requestNarrativeProvenance', () => {
  it('uses the case text and synoptic answers as the source, and asks once', async () => {
    expect(narrativeSourceText(ctx)).toContain('Histologic type: Invasive ductal carcinoma');
    const calls: string[] = [];
    const out = await requestNarrativeProvenance('Diagnosis', 'Invasive ductal carcinoma.', ctx, async c => { calls.push(c.prompt); return '{"confidence":85,"quote":"firm white mass in the upper"}'; });
    expect(out.status).toBe('verified');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('SOURCE TEXT');
  });
  it('never throws: a failed call is unavailable, and empty text is not asked', async () => {
    expect(await requestNarrativeProvenance('D', 'text', ctx, async () => { throw new Error('down'); })).toEqual({ status: 'unavailable' });
    expect(await requestNarrativeProvenance('D', '  ', ctx, async () => { throw new Error('never'); })).toEqual({ status: 'unavailable' });
  });
});
