// src/services/caseSearch/pathologistRoleLabels.test.ts — Batch 658: the Search "role on the case" labels name the role they filter on.
import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en.json';

describe('Search role-on-the-case labels (English)', () => {
  it('each key is labelled with its own role (they were rotated by one before Batch 658)', () => {
    const r = en.searchPage.pathologistRole;
    expect(r.signedOut).toBe('Signed out');
    expect(r.countersigner).toBe('Countersigner');
    expect(r.resident).toBe('Resident');
    expect(r.delegatedTo).toBe('Delegated to');
  });
});
