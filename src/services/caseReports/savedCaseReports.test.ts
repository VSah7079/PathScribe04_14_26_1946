import { describe, it, expect } from 'vitest';
import type { ISavedSearchService, SavedSearch } from '../savedSearches/ISavedSearchService';
import { createSavedCaseReports } from './savedCaseReports';
import { emptyCaseReportDefinition, normalizeCaseReportDefinition } from './caseReportDefinition';

function memoryStore(): ISavedSearchService & { all: SavedSearch[] } {
  const all: SavedSearch[] = [];
  return {
    all,
    async getForUser(userId) { return { ok: true, data: all.filter(s => s.userId === userId) }; },
    async getForUserByContext(userId, context) { return { ok: true, data: all.filter(s => s.userId === userId && s.context === context) }; },
    async save(s) { const x = { ...s, id: `s${all.length + 1}`, createdAt: '2026-09-27', useCount: 0 } as SavedSearch; all.push(x); return { ok: true, data: x }; },
    async rename(id, name) { const x = all.find(s => s.id === id)!; x.name = name; return { ok: true, data: x }; },
    async delete(id) { all.splice(all.findIndex(s => s.id === id), 1); return { ok: true, data: undefined }; },
    async recordUse(id) { const x = all.find(s => s.id === id)!; x.useCount += 1; return { ok: true, data: x }; },
  };
}

describe('saved case report definitions (Batch 613)', () => {
  it('saves a search with its grouping and columns, private to the user and kept apart from saved searches', async () => {
    const store = memoryStore();
    const mine = createSavedCaseReports(store, () => 'u1');
    const other = createSavedCaseReports(store, () => 'u2');
    const def = { ...emptyCaseReportDefinition('2026-09-01', '2026-09-27'), groupBy: 'month' as const, columns: ['accession' as const, 'synoptic:breast:grade' as const] };
    def.draft.synopticValues = [{ templateId: 'breast', fieldId: 'grade', operator: 'is', value: 'g3' }];
    const saved = await mine.save('  Grade 3 by month ', def);
    expect(saved.ok && saved.data.name).toBe('Grade 3 by month');
    expect(store.all[0].context).toBe('caseReport');
    const listed = await mine.list();
    expect(listed.ok && listed.data[0].definition).toMatchObject({ groupBy: 'month', columns: ['accession', 'synoptic:breast:grade'] });
    expect(listed.ok && listed.data[0].definition.draft.synopticValues).toHaveLength(1);
    expect(await other.list()).toEqual({ ok: true, data: [] });
    store.all.push({ id: 'x', userId: 'u1', name: 'A search', context: 'caseSearch', filters: def.draft, createdAt: '', useCount: 0 });
    expect((await mine.list() as { data: unknown[] }).data).toHaveLength(1);
  });

  it('needs a name and a signed-in user', async () => {
    const store = memoryStore();
    expect(await createSavedCaseReports(store, () => 'u1').save('  ', emptyCaseReportDefinition())).toEqual({ ok: false, error: 'NAME_REQUIRED' });
    expect(await createSavedCaseReports(store, () => undefined).save('x', emptyCaseReportDefinition())).toEqual({ ok: false, error: 'NOT_SIGNED_IN' });
    expect(store.all).toHaveLength(0);
  });

  it('renames, counts a use and deletes', async () => {
    const store = memoryStore();
    const svc = createSavedCaseReports(store, () => 'u1');
    const saved = await svc.save('One', emptyCaseReportDefinition());
    const id = saved.ok ? saved.data.id : '';
    expect((await svc.rename(id, 'Two') as { data: { name: string } }).data.name).toBe('Two');
    expect((await svc.recordUse(id) as { data: { useCount: number } }).data.useCount).toBe(1);
    await svc.delete(id);
    expect(store.all).toHaveLength(0);
  });

  it('reads a damaged or older definition back safely', () => {
    const d = normalizeCaseReportDefinition({ kind: 'caseReport', groupBy: 'nonsense', columns: ['bogus'], draft: 'x' }, '2026-09-01', '2026-09-27');
    expect(d.groupBy).toBe('pathologist');
    expect(d.columns.length).toBeGreaterThan(0);
    expect(d.draft.synopticValues).toEqual([]);
    expect(normalizeCaseReportDefinition(undefined).kind).toBe('caseReport');
  });
});
