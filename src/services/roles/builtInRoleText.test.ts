// src/services/roles/builtInRoleText.test.ts — Batch 513 (PS-269)
import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en.json';
import { BUILT_IN_ROLE_DESCRIPTIONS, BUILT_IN_ROLE_DESCRIPTION_KEYS, builtInRoleDescriptionKey } from './builtInRoleText';

const lookup = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);

describe('builtInRoleDescriptionKey', () => {
  it('translates a built-in role that still carries its seeded description', () => {
    expect(builtInRoleDescriptionKey({ id: 'pathologist', builtIn: true, description: BUILT_IN_ROLE_DESCRIPTIONS.pathologist }))
      .toBe('roleDictionary.builtInDescriptions.pathologist');
    expect(builtInRoleDescriptionKey({ id: 'or-staff', builtIn: true, description: BUILT_IN_ROLE_DESCRIPTIONS['or-staff'] }))
      .toBe('roleDictionary.builtInDescriptions.orStaff');
  });

  it('shows an administrator-edited description as stored', () => {
    expect(builtInRoleDescriptionKey({ id: 'pathologist', builtIn: true, description: 'Our wording' })).toBeNull();
  });

  it('never translates a custom role, even one reusing a seeded id or text', () => {
    expect(builtInRoleDescriptionKey({ id: 'pathologist', builtIn: false, description: BUILT_IN_ROLE_DESCRIPTIONS.pathologist })).toBeNull();
    expect(builtInRoleDescriptionKey({ id: 'custom-1', builtIn: true, description: 'Anything' })).toBeNull();
  });

  it('has a key for every seeded description, and the English text matches the seed', () => {
    expect(BUILT_IN_ROLE_DESCRIPTION_KEYS).toHaveLength(Object.keys(BUILT_IN_ROLE_DESCRIPTIONS).length);
    for (const [id, text] of Object.entries(BUILT_IN_ROLE_DESCRIPTIONS)) {
      const key = builtInRoleDescriptionKey({ id, builtIn: true, description: text });
      expect(key, id).not.toBeNull();
      expect(lookup(key as string), id).toBe(text);
    }
  });
});
