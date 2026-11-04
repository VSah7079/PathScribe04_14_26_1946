// src/services/aiIntegration/PathScribeAIService.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 450 (PS-274, PS-275): the two AI sync calls behind "Suggest
// Synoptic from Narrative" and "Generate Narrative from Synoptic".
// The provider call (callAi) and the per-client model override are
// replaced; what is under test is what this service sends and how it
// turns the reply into a result.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./aiProviderService', () => ({ callAi: vi.fn() }));
vi.mock('../../components/Config/AI/resolveClientAiModel', () => ({
  resolveAiConfigOverrideForClient: vi.fn().mockResolvedValue(undefined),
}));

import { callAi } from './aiProviderService';
import { PathScribeAIService } from './PathScribeAIService';
import { buildSynopticNarrativePrompt } from '../../pages/SynopticReportPage/hooks/buildSynopticNarrativePrompt';
import type { EditorTemplate } from '../../components/Config/Protocols/SynopticEditor';

const reply = (text: string) => ({ text, provider: 'structured_messages' as any, model: 'test-model' });

const TEMPLATE = {
  sections: [
    {
      id: 'sec-tumour', title: 'Tumour',
      fields: [
        { id: 'histologic_type', label: 'Histologic Type', options: [{ id: 'idc', label: 'Invasive ductal carcinoma' }] },
        { id: 'tumour_size', label: 'Tumour Size', options: [] },
      ],
    },
  ],
} as unknown as EditorTemplate;

beforeEach(() => {
  vi.mocked(callAi).mockReset();
});

describe('PathScribeAIService.suggestSynopticFields (PS-274)', () => {
  const caseText = {
    gross: 'Received a 3.2 cm firm mass.',
    microscopic: 'Invasive ductal carcinoma identified.',
    ancillary: 'ER positive.',
  };
  const fields = [
    { id: 'histologic_type', label: 'Histologic Type', options: [{ id: 'idc', label: 'Invasive ductal carcinoma' }] },
    { id: 'tumour_size', label: 'Tumour Size' },
  ];

  it('sends all three narrative sections and every field (option ids for coded fields, free text otherwise) to the AI', async () => {
    vi.mocked(callAi).mockResolvedValueOnce(reply('{}'));
    await new PathScribeAIService().suggestSynopticFields(caseText, fields);

    expect(callAi).toHaveBeenCalledTimes(1);
    const { prompt, system } = vi.mocked(callAi).mock.calls[0][0];
    expect(system).toContain('Return only valid JSON');
    expect(prompt).toContain('GROSS: Received a 3.2 cm firm mass.');
    expect(prompt).toContain('MICROSCOPIC: Invasive ductal carcinoma identified.');
    expect(prompt).toContain('ANCILLARY: ER positive.');
    expect(prompt).toContain('- histologic_type | Histologic Type | options: [idc (Invasive ductal carcinoma)]');
    expect(prompt).toContain('- tumour_size | Tumour Size | free text');
  });

  it('turns the AI reply (with or without markdown fences) into field suggestions', async () => {
    const suggestions = { histologic_type: { value: 'idc', confidence: 88, source: 'Invasive ductal carcinoma identified' } };
    vi.mocked(callAi).mockResolvedValueOnce(reply('```json\n' + JSON.stringify(suggestions) + '\n```'));
    const res = await new PathScribeAIService().suggestSynopticFields(caseText, fields);
    expect(res).toEqual({ ok: true, data: suggestions });
  });

  it('returns a clean error (not a throw) when the reply is not JSON or the provider fails', async () => {
    vi.mocked(callAi).mockResolvedValueOnce(reply('sorry, I cannot help'));
    const bad = await new PathScribeAIService().suggestSynopticFields(caseText, fields);
    expect(bad.ok).toBe(false);

    vi.mocked(callAi).mockRejectedValueOnce(new Error('Provider unavailable'));
    const down = await new PathScribeAIService().suggestSynopticFields(caseText, fields);
    expect(down).toEqual({ ok: false, error: 'Provider unavailable' });
  });
});

describe('PathScribeAIService.generateNarrativeFromSynopticAnswers (PS-275)', () => {
  const answers = { histologic_type: 'idc', tumour_size: '32 mm' };

  it('sends the prompt built from the synoptic answers through generateNarrative and returns the generated text', async () => {
    vi.mocked(callAi).mockResolvedValueOnce(reply('Sections show invasive ductal carcinoma measuring 32 mm.'));
    const service = new PathScribeAIService();
    const generateSpy = vi.spyOn(service, 'generateNarrative');

    const res = await service.generateNarrativeFromSynopticAnswers(TEMPLATE, answers);

    const expected = buildSynopticNarrativePrompt(TEMPLATE, answers);
    expect(generateSpy).toHaveBeenCalledWith(expected.system, expected.prompt, undefined);
    const sent = vi.mocked(callAi).mock.calls[0][0];
    expect(sent.system).toBe(expected.system);
    expect(sent.prompt).toBe(expected.prompt);
    expect(sent.prompt).toContain('Histologic Type: Invasive ductal carcinoma');
    expect(res).toEqual({ ok: true, data: 'Sections show invasive ductal carcinoma measuring 32 mm.' });
  });

  it('returns a clean error (not a throw) when the provider fails', async () => {
    vi.mocked(callAi).mockRejectedValueOnce(new Error('Provider unavailable'));
    const res = await new PathScribeAIService().generateNarrativeFromSynopticAnswers(TEMPLATE, answers);
    expect(res).toEqual({ ok: false, error: 'Provider unavailable' });
  });
});
