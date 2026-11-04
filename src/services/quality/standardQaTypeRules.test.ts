// Batch 428: a standard QA type can't be switched off or made custom.
import { describe, expect, it } from 'vitest';
import { STANDARD_QA_TYPE_LOCKED, standardQaTypeChangeRefusal } from './standardQaTypeRules';

describe('standardQaTypeChangeRefusal', () => {
  it('refuses switching a standard type off or making it custom', () => {
    expect(standardQaTypeChangeRefusal({ tabScope: 'standard' }, { active: false })).toBe(STANDARD_QA_TYPE_LOCKED);
    expect(standardQaTypeChangeRefusal({ tabScope: 'standard' }, { tabScope: 'custom' })).toBe(STANDARD_QA_TYPE_LOCKED);
  });
  it('allows other changes, and anything on a custom type', () => {
    expect(standardQaTypeChangeRefusal({ tabScope: 'standard' }, { active: true })).toBeNull();
    expect(standardQaTypeChangeRefusal({ tabScope: 'standard' }, {})).toBeNull();
    expect(standardQaTypeChangeRefusal({ tabScope: 'custom' }, { active: false })).toBeNull();
  });
});
