// Batch 651: the live-case synoptic suggestions enforce the minimum confidence and the listed options in code.
import { describe, it, expect, vi } from 'vitest';
vi.mock('./aiProviderService', () => ({ callAi: vi.fn() }));
vi.mock('../../components/Config/AI/resolveClientAiModel', () => ({ resolveAiConfigOverrideForClient: vi.fn().mockResolvedValue(undefined) }));
import { callAi } from './aiProviderService';
import { PathScribeAIService } from './PathScribeAIService';

describe('suggestSynopticFields enforcement', () => {
  it('drops low-confidence and off-list answers', async () => {
    vi.mocked(callAi).mockResolvedValue({ text: JSON.stringify({
      type: { value: 'idc', confidence: 80, source: 'ductal' },
      grade: { value: 'grade two', confidence: 90, source: 'g' },
      size: { value: '2 cm', confidence: 20, source: 's' },
    }), provider: 'x' as never, model: 'm' });
    const res = await new PathScribeAIService().suggestSynopticFields(
      { gross: '', microscopic: '', ancillary: '' },
      [{ id: 'type', label: 'Type', options: [{ id: 'idc', label: 'Ductal' }] }, { id: 'grade', label: 'Grade', options: [{ id: 'g2', label: 'Grade 2' }] }, { id: 'size', label: 'Size' }],
    );
    expect(res).toEqual({ ok: true, data: { type: { value: 'idc', confidence: 80, source: 'ductal' } } });
  });
});
