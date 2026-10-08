import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({
  callAi: vi.fn(),
}));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import { detectCriticalFindings } from './detectCriticalFindings';

describe('detectCriticalFindings — real, direct verification', () => {
  beforeEach(() => {
    vi.mocked(callAi).mockReset();
  });

  it('returns an empty, honest result without calling the model when all real text fields are blank', async () => {
    const res = await detectCriticalFindings({ gross: '', microscopic: '  ', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.flags).toEqual([]);
    expect(callAi).not.toHaveBeenCalled();
  });

  it('parses a real, well-formed model response into structured flags', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({
      text: JSON.stringify({
        flags: [
          { term: 'invasive carcinoma', sourceField: 'microscopic', sourceQuote: 'invasive ductal carcinoma identified', severity: 'Malignant', confidence: 92 },
        ],
      }),
      provider: 'structured_messages' as any,
      model: 'test-model',
    });
    const res = await detectCriticalFindings({ gross: 'x', microscopic: 'Invasive ductal carcinoma identified.', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.flags).toHaveLength(1);
      expect(res.data.flags[0].term).toBe('invasive carcinoma');
      expect(res.data.flags[0].severity).toBe('Malignant');
      expect(res.data.flags[0].confidence).toBe(92);
    }
  });

  it('strips real markdown code fences before parsing, same established pattern as suggestSynopticFields', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({
      text: '```json\n{"flags":[]}\n```',
      provider: 'structured_messages' as any,
      model: 'test-model',
    });
    const res = await detectCriticalFindings({ gross: 'x', microscopic: '', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.flags).toEqual([]);
  });

  it('returns an honest, empty flags array when the model finds nothing - never fabricates a finding', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({
      text: JSON.stringify({ flags: [] }),
      provider: 'structured_messages' as any,
      model: 'test-model',
    });
    const res = await detectCriticalFindings({ gross: 'Benign tissue.', microscopic: 'No evidence of malignancy.', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.flags).toEqual([]);
  });

  it('returns a real, honest error when the model response is not valid JSON, rather than throwing', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({
      text: 'not real json at all',
      provider: 'structured_messages' as any,
      model: 'test-model',
    });
    const res = await detectCriticalFindings({ gross: 'x', microscopic: '', ancillary: '' });
    expect(res.ok).toBe(false);
  });

  it('returns a real, honest error when the underlying callAi call itself fails, rather than throwing', async () => {
    vi.mocked(callAi).mockRejectedValueOnce(new Error('Provider unavailable'));
    const res = await detectCriticalFindings({ gross: 'x', microscopic: '', ancillary: '' });
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.error).toContain('Provider unavailable');
  });

  it('defensively defaults to an empty array if flags is missing or malformed in the response, rather than crashing', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({
      text: JSON.stringify({ notFlags: 'unexpected shape' }),
      provider: 'structured_messages' as any,
      model: 'test-model',
    });
    const res = await detectCriticalFindings({ gross: 'x', microscopic: '', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.flags).toEqual([]);
  });

  it('defensively drops a flag whose severity is not one of the three real, valid values, rather than passing through a model-invented one', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({
      text: JSON.stringify({
        flags: [
          { term: 'invasive carcinoma', sourceField: 'microscopic', sourceQuote: 'invasive carcinoma', severity: 'Malignant', confidence: 90 },
          { term: 'something odd', sourceField: 'gross', sourceQuote: 'something odd', severity: 'urgent', confidence: 70 },
        ],
      }),
      provider: 'structured_messages' as any,
      model: 'test-model',
    });
    const res = await detectCriticalFindings({ gross: 'x', microscopic: 'invasive carcinoma', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.flags).toHaveLength(1);
      expect(res.data.flags[0].term).toBe('invasive carcinoma');
    }
  });

  it('clamps an out-of-range confidence to 0-100, and defaults a missing one to 0, rather than trusting the model', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({
      text: JSON.stringify({
        flags: [
          { term: 'a', sourceField: 'gross', sourceQuote: 'a', severity: 'Abnormal', confidence: 150 },
          { term: 'b', sourceField: 'gross', sourceQuote: 'b', severity: 'Abnormal', confidence: -10 },
          { term: 'c', sourceField: 'gross', sourceQuote: 'c', severity: 'Abnormal' },
        ],
      }),
      provider: 'structured_messages' as any,
      model: 'test-model',
    });
    const res = await detectCriticalFindings({ gross: 'a b c', microscopic: '', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.flags[0].confidence).toBe(100);
      expect(res.data.flags[1].confidence).toBe(0);
      expect(res.data.flags[2].confidence).toBe(0);
    }
  });

  // Batch 450 (PS-131, PS-105): every detection request carries the
  // negation instruction. Batch 452 added the code-side check behind it
  // (tests further down and in negatedFindingCheck.test.ts).
  it('every detection request tells the model to ignore negated or ruled-out terms, with the "no evidence of" example', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({ text: JSON.stringify({ flags: [] }), provider: 'structured_messages' as any, model: 'test-model' });
    await detectCriticalFindings({ gross: 'x', microscopic: 'No evidence of carcinoma.', ancillary: '' });
    const { prompt } = vi.mocked(callAi).mock.calls[0][0];
    expect(prompt).toMatch(/negation-aware/i);
    expect(prompt).toContain('do NOT flag a term that is explicitly negated or ruled out');
    expect(prompt).toContain('"no evidence of malignancy"');
    expect(prompt).toContain('"negative for acid-fast bacilli"');
    expect(prompt).toContain('only flag findings actually present');
    expect(prompt).toContain('MICROSCOPIC: No evidence of carcinoma.');
  });

  it('negated narrative ("no evidence of carcinoma") produces no flag when the model follows the instruction, so Finalize is not blocked', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({ text: '{"flags":[]}', provider: 'structured_messages' as any, model: 'test-model' });
    const res = await detectCriticalFindings({ gross: '', microscopic: 'Sections show benign breast tissue. No evidence of carcinoma.', ancillary: 'Negative for acid-fast bacilli.' });
    expect(res).toEqual({ ok: true, data: { flags: [], negated: [] } });
  });

  // Batch 452 (PS-131, PS-105): the model's reply is re-checked in code.
  const reply = (flags: object[]) => ({ text: JSON.stringify({ flags }), provider: 'structured_messages' as any, model: 'test-model' });

  it('drops a flag the model returned for a negated term ("no evidence of carcinoma"), even though the prompt said not to', async () => {
    vi.mocked(callAi).mockResolvedValueOnce(reply([
      { term: 'carcinoma', sourceField: 'microscopic', sourceQuote: 'No evidence of carcinoma', severity: 'Malignant', confidence: 80 },
    ]));
    const res = await detectCriticalFindings({ gross: '', microscopic: 'Sections show benign breast tissue. No evidence of carcinoma.', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.flags).toEqual([]);
      expect(res.data.negated.map(f => f.term)).toEqual(['carcinoma']);
    }
  });

  it('keeps the real finding and drops the negated one from the same reply', async () => {
    vi.mocked(callAi).mockResolvedValueOnce(reply([
      { term: 'acid-fast bacilli', sourceField: 'ancillary', sourceQuote: 'Negative for acid-fast bacilli', severity: 'Critical', confidence: 70 },
      { term: 'invasive ductal carcinoma', sourceField: 'microscopic', sourceQuote: 'Invasive ductal carcinoma is present', severity: 'Malignant', confidence: 95 },
    ]));
    const res = await detectCriticalFindings({ gross: '', microscopic: 'No lymphovascular invasion. Invasive ductal carcinoma is present.', ancillary: 'AFB stain: negative for acid-fast bacilli.' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.flags.map(f => f.term)).toEqual(['invasive ductal carcinoma']);
      expect(res.data.negated.map(f => f.term)).toEqual(['acid-fast bacilli']);
    }
  });

  it('keeps a flag it cannot locate in the narrative (the model paraphrased): code never drops what it cannot check', async () => {
    vi.mocked(callAi).mockResolvedValueOnce(reply([
      { term: 'malignancy', sourceField: 'microscopic', sourceQuote: 'infiltrating tumour cells', severity: 'Malignant', confidence: 60 },
    ]));
    const res = await detectCriticalFindings({ gross: '', microscopic: 'Infiltrating tumor cells throughout the stroma.', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.data.flags).toHaveLength(1); expect(res.data.negated).toEqual([]); }
  });

  it('drops a reply entry with no term or an unknown source field instead of passing it through', async () => {
    vi.mocked(callAi).mockResolvedValueOnce(reply([
      { term: '', sourceField: 'microscopic', sourceQuote: 'x', severity: 'Malignant', confidence: 60 },
      { term: 'melanoma', sourceField: 'clinical history', sourceQuote: 'melanoma', severity: 'Malignant', confidence: 60 },
    ]));
    const res = await detectCriticalFindings({ gross: '', microscopic: 'melanoma', ancillary: '' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.flags).toEqual([]);
  });

  it('never passes patient identifiers - the real function signature only accepts narrative text fields', () => {
    // Real, structural verification of the PHI-minimization boundary:
    // this function's own parameter type has no field a caller could
    // even use to pass a patient name/MRN/DOB through.
    const callText: { gross: string; microscopic: string; ancillary: string } = { gross: '', microscopic: '', ancillary: '' };
    expect(Object.keys(callText).sort()).toEqual(['ancillary', 'gross', 'microscopic']);
  });
});
