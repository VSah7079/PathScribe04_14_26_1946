import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCOPE_REFERENCE, SETTING_SCOPES, entriesByScope } from './scopeReference';
import { SECTIONS } from '@/components/Config/System/systemSections';

const root = resolve(__dirname, '../../..');
const en = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf8')) as { scopeReference?: { entries?: Record<string, { name?: string; note?: string }>; scopes?: Record<string, unknown> } };

describe('scope reference', () => {
  it('lists each area once', () => {
    const ids = SCOPE_REFERENCE.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('points every area at a file that exists', () => {
    for (const e of SCOPE_REFERENCE) expect(existsSync(resolve(root, e.source)), e.source).toBe(true);
  });
  it('points every area with a section at a real System section', () => {
    const ids = new Set(SECTIONS.map(s => s.id as string));
    for (const e of SCOPE_REFERENCE) if (e.sectionId) expect(ids.has(e.sectionId), e.sectionId).toBe(true);
  });
  it('has a name and a note for every area, and a name for every scope', () => {
    for (const e of SCOPE_REFERENCE) {
      expect(en.scopeReference?.entries?.[e.id]?.name, e.id).toBeTruthy();
      expect(en.scopeReference?.entries?.[e.id]?.note, e.id).toBeTruthy();
    }
    for (const s of SETTING_SCOPES) expect(en.scopeReference?.scopes?.[s], s).toBeTruthy();
  });
  it('groups by scope without losing any', () => {
    const total = SETTING_SCOPES.reduce((n, s) => n + entriesByScope(s).length, 0);
    expect(total).toBe(SCOPE_REFERENCE.length);
  });
});
