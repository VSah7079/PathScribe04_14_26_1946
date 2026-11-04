// Batch 609 (#173): the AI path reads a model's overrides.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getDefault = vi.fn();
const getById = vi.fn();
const facilityGetById = vi.fn();
vi.mock('@/services', () => ({
  modelService: { getDefault: () => getDefault(), getById: (id: string) => getById(id) },
  facilityService: { getById: (id: string) => facilityGetById(id) },
  validationStudyService: { getAll: async () => ({ ok: true, data: [] }) },
}));

import { resolveAiConfigOverrideForClient, resolveConfidenceThresholdForClient } from './resolveClientAiModel';

const model = (extra = {}) => ({ id: 'psv32', requestFormat: 'structured_messages', apiModelId: 'api-1', ...extra });

describe('resolveAiConfigOverrideForClient', () => {
  beforeEach(() => { getDefault.mockReset(); getById.mockReset(); facilityGetById.mockReset(); getDefault.mockResolvedValue({ ok: true, data: model() }); });

  it('passes the model’s maxTokens override to the call', async () => {
    getById.mockResolvedValue({ ok: true, data: model({ configOverrides: { maxTokens: 320 } }) });
    expect(await resolveAiConfigOverrideForClient()).toEqual({ providerId: 'structured_messages', modelId: 'api-1', maxTokens: 320 });
  });
  it('adds nothing when the model has no override', async () => {
    getById.mockResolvedValue({ ok: true, data: model() });
    expect(await resolveAiConfigOverrideForClient()).toEqual({ providerId: 'structured_messages', modelId: 'api-1' });
  });
});

describe('resolveConfidenceThresholdForClient', () => {
  beforeEach(() => { getDefault.mockReset(); getById.mockReset(); getDefault.mockResolvedValue({ ok: true, data: model() }); });

  it('uses the model’s own threshold when it has one', async () => {
    getById.mockResolvedValue({ ok: true, data: model({ thresholdOverrides: { confidenceThreshold: 92 } }) });
    expect(await resolveConfidenceThresholdForClient(undefined, 75)).toBe(92);
  });
  it('uses the organisation threshold otherwise, and when the model can’t be found or the lookup fails', async () => {
    getById.mockResolvedValue({ ok: true, data: model() });
    expect(await resolveConfidenceThresholdForClient(undefined, 75)).toBe(75);
    getById.mockResolvedValue({ ok: false, error: 'MODEL_NOT_FOUND' });
    expect(await resolveConfidenceThresholdForClient(undefined, 75)).toBe(75);
    getDefault.mockRejectedValue(new Error('down'));
    expect(await resolveConfidenceThresholdForClient(undefined, 75)).toBe(75);
  });
});
