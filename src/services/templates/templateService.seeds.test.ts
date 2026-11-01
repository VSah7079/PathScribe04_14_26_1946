// Batch 505 (PS-475): seed templates load on demand, not at start-up.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(join(process.cwd(), 'src/services/templates/templateService.ts'), 'utf8')
  // Batch 754: the demonstration checklists' loaders moved to their own file.
  + readFileSync(join(process.cwd(), 'src/services/templates/demoChecklistLoaders.ts'), 'utf8');

beforeAll(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
  // A saved edit of a seed, from an earlier session.
  store['ps_editor_store_v1'] = JSON.stringify({
    neck_dissection: { id: 'neck_dissection', name: 'Edited neck dissection', source: 'PathScribe', version: '1.0.1', category: 'HEAD_NECK', sections: [] },
  });
});

describe('templateService — seed templates load on demand (PS-475)', () => {
  it('imports no template JSON statically (that put ~420 KB into every first load)', () => {
    expect(SOURCE).not.toMatch(/^import\s[^;]*\.json['"]/m);
  });

  it('every seed loader points at a file that exists', () => {
    const paths = [...SOURCE.matchAll(/import\('\.\.\/\.\.\/(data\/templates\/[^']+\.json)'\)/g)].map(m => m[1]);
    expect(paths.length).toBeGreaterThanOrEqual(31);
    for (const p of paths) expect(existsSync(join(process.cwd(), 'src', p)), p).toBe(true);
  });

  it('getTemplate fetches a seed the first time and returns its real fields', async () => {
    const svc = await import('./templateService');
    expect(svc.SEED_TEMPLATE_IDS).toContain('neck_dissection');
    expect(svc.SEED_TEMPLATE_IDS).toContain('skin_invasive_melanoma_biopsy');
    const detail = await svc.getTemplate('skin_invasive_melanoma_biopsy');
    expect(detail.template.sections.length).toBeGreaterThan(0);
    expect(detail.template.sections.some(sec => sec.fields.length > 0)).toBe(true);
  });

  it('a saved edit wins over the seed', async () => {
    const svc = await import('./templateService');
    const detail = await svc.getTemplate('neck_dissection');
    expect(detail.template.name).toBe('Edited neck dissection');
    expect(detail.template.sections).toHaveLength(0);
  });
});
