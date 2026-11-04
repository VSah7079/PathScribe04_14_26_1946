// @vitest-environment happy-dom
// Batch 458 (PS-71): a save made in another tab of the browser is seen here,
// so this tab's next save is checked against it instead of overwriting it.
import { describe, it, expect } from 'vitest';
import { mockCaseService } from './mockCaseService';
import { ConcurrencyConflictError } from './ConcurrencyConflictError';

describe('mock case store across tabs', () => {
  it('takes up the saved copy from another tab; a save from the older copy is then refused', async () => {
    const before = await mockCaseService.getCase('S26-4601');
    expect(before).toBeTruthy();
    const v = before!.version ?? 0;
    // The other tab saved S26-4601 (its copy of the whole store, one version on).
    const all = JSON.parse(localStorage.getItem('pathscribe_mock_cases')!);
    const other = all.map((c: any) => (c.id === 'S26-4601' ? { ...c, version: v + 1, caseComments: [{ id: 'other-tab' }] } : c));
    window.dispatchEvent(new StorageEvent('storage', { key: 'pathscribe_mock_cases', newValue: JSON.stringify(other) }));
    const after = await mockCaseService.getCase('S26-4601');
    expect(after!.version).toBe(v + 1);
    expect((after as any).caseComments).toEqual([{ id: 'other-tab' }]);
    await expect(mockCaseService.updateCase('S26-4601', { status: 'in-progress' } as any, v)).rejects.toBeInstanceOf(ConcurrencyConflictError);
  });
});
