// Batch 621: the extraction runner: template choice, field filling, the vendor policy, caching and failures.
import { describe, it, expect, vi } from 'vitest';
import { cleanFields, extractHistoricalSynoptic, type ExtractionDeps } from './extractHistoricalSynoptic';
import { hashSourceText, type HistoryExtraction } from './historyExtraction';

const text = { diagnosis: 'Invasive ductal carcinoma', microscopic: 'Grade 2. Margins negative.' };
const templates = [{ id: 'breast', name: 'Breast invasive', version: '2.1.0', category: 'Breast' }, { id: 'colon', name: 'Colon', version: '1.0.0', category: 'GI' }];
const fields = [
  { id: 'grade', label: 'Grade', options: [{ id: 'g1', label: 'Grade 1' }, { id: 'g2', label: 'Grade 2' }] },
  { id: 'margins', label: 'Margins', options: [{ id: 'neg', label: 'Negative' }, { id: 'pos', label: 'Positive' }] },
  { id: 'note', label: 'Note' },
];

function deps(answers: string[], over: Partial<ExtractionDeps> = {}) {
  const calls: Array<{ prompt: string; context: unknown; system: string }> = [];
  const d: ExtractionDeps = {
    callAi: vi.fn(async c => { calls.push({ prompt: c.prompt, context: c.context, system: c.system }); return { text: answers.shift() ?? '{}', provider: 'anthropic', model: 'claude-x' }; }),
    listTemplates: async () => templates,
    getTemplateFields: async () => fields,
    now: () => '2026-10-19T10:00:00Z',
    ...over,
  };
  return { d, calls };
}
const input = { sourceCaseId: 'S26-1', facilityId: 'fac-a', text };

describe('extractHistoricalSynoptic', () => {
  it('chooses a template, fills its fields, and records the AI service, version and the unverified flag', async () => {
    const { d, calls } = deps(['{"templateId":"breast","confidence":88}', '```json\n{"grade":{"value":"g2","confidence":90,"source":"Grade 2"},"margins":{"value":"neg","confidence":80,"source":"Margins negative"}}\n```']);
    const r = await extractHistoricalSynoptic(input, d);
    expect(r).toMatchObject({
      sourceCaseId: 'S26-1', status: 'extracted', templateId: 'breast', templateName: 'Breast invasive', templateVersion: '2.1.0', templateConfidence: 88,
      extractedAt: '2026-10-19T10:00:00Z', aiService: { provider: 'anthropic', model: 'claude-x' }, verification: 'ai-unverified', sourceTextHash: hashSourceText(text),
    });
    expect(r.fields.map(f => [f.fieldId, f.value, f.display, f.confidence])).toEqual([['grade', 'g2', 'Grade 2', 90], ['margins', 'neg', 'Negative', 80]]);
    expect(calls).toHaveLength(2);
  });
  it('every AI call names the feature, the case and the facility, so the vendor policy applies', async () => {
    const { d, calls } = deps(['{"templateId":"breast","confidence":88}', '{}']);
    await extractHistoricalSynoptic(input, d);
    expect(calls.map(c => c.context)).toEqual([
      { feature: 'history-extraction', caseId: 'S26-1', facilityId: 'fac-a' }, { feature: 'history-extraction', caseId: 'S26-1', facilityId: 'fac-a' },
    ]);
    expect(calls[1].prompt).toContain('FINAL DIAGNOSIS: Invasive ductal carcinoma');
    expect(calls[1].prompt).toContain('MICROSCOPIC: Grade 2. Margins negative.');
    expect(calls[0].prompt).toContain('- breast | Breast invasive | Breast');
  });
  it('returns the stored extraction for the same text without calling the AI', async () => {
    const stored: HistoryExtraction = { sourceCaseId: 'S26-1', sourceTextHash: hashSourceText(text), status: 'extracted', fields: [], extractedAt: 'earlier', verification: 'ai-unverified' };
    const { d } = deps([]);
    expect(await extractHistoricalSynoptic({ ...input, existing: stored }, d)).toBe(stored);
    expect(d.callAi).not.toHaveBeenCalled();
  });
  it('runs again when the text changed, and when the last try failed', async () => {
    const old: HistoryExtraction = { sourceCaseId: 'S26-1', sourceTextHash: 'old', status: 'extracted', fields: [], extractedAt: 'earlier', verification: 'ai-unverified' };
    const a = deps(['{"templateId":null}']);
    expect((await extractHistoricalSynoptic({ ...input, existing: old }, a.d)).status).toBe('noTemplate');
    const failed: HistoryExtraction = { ...old, sourceTextHash: hashSourceText(text), status: 'failed', failure: 'aiError' };
    const b = deps(['{"templateId":null}']);
    await extractHistoricalSynoptic({ ...input, existing: failed }, b.d);
    expect(b.d.callAi).toHaveBeenCalledTimes(1);
  });
  it('makes no call for a report with no text', async () => {
    const { d } = deps([]);
    const r = await extractHistoricalSynoptic({ ...input, text: { diagnosis: ' ', microscopic: '' } }, d);
    expect(r.status).toBe('noText');
    expect(d.callAi).not.toHaveBeenCalled();
  });
  it('a template the AI invented is no template', async () => {
    const { d } = deps(['{"templateId":"made-up","confidence":99}']);
    const r = await extractHistoricalSynoptic(input, d);
    expect(r.status).toBe('noTemplate');
    expect(r.aiService).toEqual({ provider: 'anthropic', model: 'claude-x' });
  });
  it('records the vendor policy refusal as a fixed code and does not throw', async () => {
    const refusal = Object.assign(new Error('AI not available for this jurisdiction (de, facility fac-a): vendor.'), { code: 'AI_VENDOR_NOT_ALLOWED' });
    const { d } = deps([], { callAi: async () => { throw refusal; } });
    const r = await extractHistoricalSynoptic(input, d);
    expect(r).toMatchObject({ status: 'failed', failure: 'vendorNotAllowed', fields: [] });
    expect(JSON.stringify(r)).not.toContain('jurisdiction');
  });
  it('records a bad answer, another AI error and no templates, each with its own code', async () => {
    expect((await extractHistoricalSynoptic(input, deps(['not json']).d)).failure).toBe('badResponse');
    expect((await extractHistoricalSynoptic(input, deps([], { callAi: async () => { throw new Error('Smith J 12345 timed out'); } }).d)).failure).toBe('aiError');
    const none = await extractHistoricalSynoptic(input, deps([], { listTemplates: async () => [] }).d);
    expect(none.failure).toBe('noTemplates');
  });
  it('a failure stores no message that could echo patient text', async () => {
    const r = await extractHistoricalSynoptic(input, deps([], { callAi: async () => { throw new Error('Smith, John MRN 12345'); } }).d);
    expect(JSON.stringify(r)).not.toMatch(/Smith|12345/);
  });
});

describe('cleanFields', () => {
  it('keeps only the template\'s fields, option ids that exist, and confidence of 30 or more', () => {
    const out = cleanFields({
      grade: { value: 'g9', confidence: 90 }, margins: { value: 'neg', confidence: 20 }, note: { value: 'free text', confidence: 150 },
      other: { value: 'x', confidence: 90 },
    }, fields);
    expect(out).toEqual([{ fieldId: 'note', label: 'Note', value: 'free text', display: 'free text', confidence: 100 }]);
  });
  it('accepts several option ids for a multi-select, and no confidence at all', () => {
    const out = cleanFields({ grade: { value: ['g1', 'g2'] } }, fields);
    expect(out).toEqual([{ fieldId: 'grade', label: 'Grade', value: 'g1, g2', display: 'Grade 1, Grade 2' }]);
  });
  it('returns nothing for an answer that is not an object', () => {
    expect(cleanFields(null, fields)).toEqual([]);
    expect(cleanFields([1], fields)).toEqual([]);
    expect(cleanFields('x', fields)).toEqual([]);
  });
});
