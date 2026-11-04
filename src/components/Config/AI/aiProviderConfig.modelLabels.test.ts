// src/components/Config/AI/aiProviderConfig.modelLabels.test.ts — Batch 513 (PS-269)
import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en.json';
import { PROVIDER_MODELS, modelOptionLabel } from './aiProviderConfig';

const lookup = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
const fakeT = (key: string, values: { model: string }) => String(lookup(key)).replace('{{model}}', values.model);

describe('AI model option labels', () => {
  it('keeps the model name literal and wraps it in the translated qualifier', () => {
    const sonnet = PROVIDER_MODELS.structured_messages[0];
    expect(modelOptionLabel(sonnet, fakeT)).toBe('Claude Sonnet 4 (recommended)');
    expect(modelOptionLabel(PROVIDER_MODELS.chat_completions[1], fakeT)).toBe('GPT-4 Turbo');
  });

  it('every qualifier key exists in the locale file', () => {
    for (const option of Object.values(PROVIDER_MODELS).flat()) {
      if (option.labelKey) expect(typeof lookup(option.labelKey), option.labelKey).toBe('string');
    }
  });
});
