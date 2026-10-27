// Batch 651: AI code suggestions: one confidence scale, the real model recorded, OPCS-4 demonstration data labelled.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({ callAi: vi.fn() }));
vi.mock('@/components/Config/AI/resolveClientAiModel', () => ({ resolveAiConfigOverrideForClient: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../terminologySearch/codeSearchService', () => ({ verifyAndDescribeCodes: vi.fn(async (l: Array<{ display: string }>) => l.map(x => ({ ...x, aiWording: x.display, verifiedBy: 'dictionary' }))) }));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import { parseAiCodeSuggestions, aiDetailFor, suggestAiCodes } from './aiCodeSuggestions';

describe('parseAiCodeSuggestions', () => {
  it('puts every confidence on 0-100, whatever the vendor used', () => {
    const out = parseAiCodeSuggestions('noise [{"code":"C50.9","display":"Breast","system":"ICD10","confidence":0.92},{"code":"413448000","display":"IDC","system":"SNOMED","confidence":88}] trailing');
    expect(out.map(s => s.confidence)).toEqual([92, 88]);
  });
  it('drops a suggestion with no usable confidence or below the minimum', () => {
    const out = parseAiCodeSuggestions('[{"code":"A","display":"a","system":"ICD10"},{"code":"B","display":"b","system":"ICD10","confidence":10},{"code":"C","display":"c","system":"ICD10","confidence":60}]');
    expect(out.map(s => s.code)).toEqual(['C']);
  });
  it('throws when there is no list', () => {
    expect(() => parseAiCodeSuggestions('sorry')).toThrow();
  });
});

describe('aiDetailFor', () => {
  it('records the real model and service, never a label', () => {
    expect(aiDetailFor({ confidence: 90, model: 'claude-x', provider: 'structured_messages' })).toEqual({ model: 'claude-x', provider: 'structured_messages', confidence: 90 });
    expect(aiDetailFor({ confidence: 90 }).model).toBe('unknown');
  });
});

describe('suggestAiCodes', () => {
  beforeEach(() => vi.mocked(callAi).mockReset());
  it('stamps the model the call used, and marks OPCS-4 as simulated', async () => {
    vi.mocked(callAi).mockResolvedValue({ text: '[{"code":"J18","display":"Cholecystectomy","system":"OPCS4","confidence":90,"rationale":"r"},{"code":"C50.9","display":"Breast","system":"ICD10","confidence":0.8,"rationale":"r"}]', provider: 'chat_completions' as never, model: 'gpt-test' });
    const out = await suggestAiCodes({ caseText: { gross: 'g', microscopic: 'm', ancillary: 'a' }, isUK: true, siteCodingSystems: ['ICD10', 'OPCS4'], isOrchestrationMode: true });
    expect(out.map(s => [s.code, s.model, s.provider, s.confidence, !!s.simulated])).toEqual([
      ['J18', 'gpt-test', 'chat_completions', 90, true], ['C50.9', 'gpt-test', 'chat_completions', 80, false],
    ]);
  });
  it('drops systems the site does not allow', async () => {
    vi.mocked(callAi).mockResolvedValue({ text: '[{"code":"C50.9","display":"Breast","system":"ICD10","confidence":80,"rationale":"r"}]', provider: 'x' as never, model: 'm' });
    expect(await suggestAiCodes({ caseText: { gross: '', microscopic: '', ancillary: '' }, isUK: false, siteCodingSystems: ['SNOMED'], isOrchestrationMode: true })).toEqual([]);
  });
});

describe('Batch 696: origin and verification are carried with the suggestion', () => {
  const texts = { gross: 'A: mastectomy', microscopic: 'A: invasive carcinoma', ancillary: '', hasSynoptic: false };
  it('parse keeps a checked origin and drops an unchecked one', () => {
    const out = parseAiCodeSuggestions('[{"code":"C50.9","display":"Breast","system":"ICD10","confidence":90,"source":"microscopic","specimen":"A"},{"code":"X","display":"x","system":"ICD10","confidence":90,"source":"ancillary","specimen":"A"}]', texts);
    expect(out[0]).toMatchObject({ sourceSection: 'microscopic', specimenLabel: 'A' });
    expect(out[1].sourceSection).toBeUndefined();
  });
  it('aiDetailFor stores the check and the origin with the code', () => {
    expect(aiDetailFor({ confidence: 90, model: 'm', verifiedBy: 'dictionary', sourceSection: 'gross', specimenLabel: 'B' })).toEqual({ model: 'm', confidence: 90, verifiedBy: 'dictionary', sourceSection: 'gross', specimen: 'B' });
  });
  it('suggestAiCodes returns the verified suggestion with its verification', async () => {
    vi.mocked(callAi).mockResolvedValue({ text: '[{"code":"C50.9","display":"AI wording","system":"ICD10","confidence":80,"source":"microscopic","specimen":"A"}]', provider: 'x' as never, model: 'm' });
    const out = await suggestAiCodes({ caseText: texts, isUK: false, siteCodingSystems: ['ICD10'], isOrchestrationMode: true });
    expect(out[0]).toMatchObject({ verifiedBy: 'dictionary', sourceSection: 'microscopic', specimenLabel: 'A' });
  });
});
