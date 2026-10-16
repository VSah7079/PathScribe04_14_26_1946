// src/services/labels/batchLabelReprint.test.ts
// Batch 518 (PS-123): batch label reprint.
import { describe, it, expect, vi } from 'vitest';
import { casesForReprint, reprintItems, reprintLabels, retryFailedLabels, reprintSummary, REPRINT_THROTTLE_MS, type ReprintDeps, type LabelReprintRun } from './batchLabelReprint';
import type { Case } from '@/types/case/Case';

const mk = (id: string, acc: string, day: string, specimens: { label: string; blocks?: string[] }[] = [{ label: 'A', blocks: ['1'] }]) => ({
  id, createdAt: `${day}T08:00:00Z`,
  accession: { accessionNumber: acc, fullAccession: acc, accessionedAt: `${day}T09:00:00Z` },
  specimens: specimens.map(s => ({ label: s.label, blocks: (s.blocks ?? []).map(b => ({ label: b })) })),
}) as unknown as Case;

const CASES = [mk('c3', 'S26-0103', '2026-10-03'), mk('c1', 'S26-0101', '2026-10-01', [{ label: 'A', blocks: ['1', '2'] }, { label: 'B' }]), mk('c2', 'S26-0102', '2026-10-02')];

function deps(over: Partial<ReprintDeps> = {}) {
  const saved: LabelReprintRun[] = [];
  const d: ReprintDeps = {
    enforce: vi.fn(async () => ({ allowed: true })),
    printItem: vi.fn(async () => ({ ok: true })),
    cassettesBlocked: vi.fn(async () => false),
    saveRun: vi.fn(async r => { saved.push(JSON.parse(JSON.stringify(r))); }),
    sleep: vi.fn(async () => undefined),
    now: () => '2026-10-10T12:00:00Z',
    newId: () => 'run-1',
    ...over,
  };
  return { d, saved };
}

describe('batch label reprint (Batch 518, PS-123)', () => {
  it('finds cases by accession date and/or number, oldest first; an empty filter finds nothing', () => {
    expect(casesForReprint(CASES, {})).toEqual([]);
    expect(casesForReprint(CASES, { accessionedFrom: '2026-10-02' }).map(c => c.id)).toEqual(['c2', 'c3']);
    expect(casesForReprint(CASES, { accessionedTo: '2026-10-02' }).map(c => c.id)).toEqual(['c1', 'c2']);
    expect(casesForReprint(CASES, { accessionFrom: 'S26-0102', accessionTo: 'S26-0102' }).map(c => c.id)).toEqual(['c2']);
  });

  it('lists the chosen labels, case by case', () => {
    const items = reprintItems([CASES[1]], ['requisition', 'container', 'cassette']);
    expect(items.map(i => `${i.kind}:${i.target ?? ''}`)).toEqual(['requisition:', 'container:A', 'container:B', 'cassette:A1', 'cassette:A2']);
    expect(reprintItems([CASES[1]], ['container']).every(i => i.kind === 'container')).toBe(true);
  });

  it('needs label:batch:reprint; a refusal prints nothing', async () => {
    const { d } = deps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await reprintLabels({ items: reprintItems(CASES, ['requisition']), startedBy: 'u1' }, d)).toBe('notPermitted');
    expect(d.enforce).toHaveBeenCalledWith('label:batch:reprint');
    expect(d.printItem).not.toHaveBeenCalled();
  });

  it('cassettes need a printer; nothing to print is said so', async () => {
    const { d } = deps();
    expect(await reprintLabels({ items: [], startedBy: 'u1' }, d)).toBe('nothingToPrint');
    expect(await reprintLabels({ items: reprintItems([CASES[0]], ['cassette']), startedBy: 'u1' }, d)).toBe('noCassettePrinter');
  });

  it('prints one at a time with a pause between labels, reports progress, and keeps the run', async () => {
    const progress: string[] = [];
    const { d, saved } = deps({ printItem: vi.fn(async i => (i.target === 'B' ? { ok: false, message: 'Printer offline' } : { ok: true })) });
    const run = await reprintLabels({ items: reprintItems([CASES[1]], ['requisition', 'container']), startedBy: 'u1' }, d, (n, t) => progress.push(`${n}/${t}`));
    if (typeof run === 'string') throw new Error(run);
    expect(progress).toEqual(['1/3', '2/3', '3/3']);
    expect(d.sleep).toHaveBeenCalledTimes(2);
    expect(d.sleep).toHaveBeenCalledWith(REPRINT_THROTTLE_MS);
    expect(reprintSummary(run)).toEqual({ pending: 0, printed: 2, failed: 1, blocked: 0 });
    expect(run.items.find(i => i.target === 'B')).toMatchObject({ status: 'failed', message: 'Printer offline' });
    expect(saved[0]).toMatchObject({ id: 'run-1', startedBy: 'u1', finishedAt: '2026-10-10T12:00:00Z' });
  });

  it('retry prints only the failed labels again, and checks the permission again', async () => {
    let fail = true;
    const { d } = deps({ printItem: vi.fn(async i => (i.target === 'B' && fail ? { ok: false } : { ok: true })) });
    const first = await reprintLabels({ items: reprintItems([CASES[1]], ['container']), startedBy: 'u1' }, d);
    if (typeof first === 'string') throw new Error(first);
    fail = false;
    (d.printItem as ReturnType<typeof vi.fn>).mockClear();
    const second = await retryFailedLabels(first, d);
    if (typeof second === 'string') throw new Error(second);
    expect(d.printItem).toHaveBeenCalledTimes(1);
    expect(reprintSummary(second)).toEqual({ pending: 0, printed: 2, failed: 0, blocked: 0 });
    expect(await retryFailedLabels(second, d)).toBe('nothingToPrint');
    expect(d.enforce).toHaveBeenCalledTimes(3);
  });

  it('the on-demand guardrail blocks cassettes, not requisition or container labels', async () => {
    const { d } = deps({ cassettesBlocked: vi.fn(async () => true) });
    const run = await reprintLabels({ items: reprintItems([CASES[0]], ['requisition', 'cassette']), printerProfileId: 'p1', startedBy: 'u1' }, d);
    if (typeof run === 'string') throw new Error(run);
    expect(run.items.map(i => `${i.kind}:${i.status}`)).toEqual(['requisition:printed', 'cassette:blocked']);
    expect(d.printItem).toHaveBeenCalledTimes(1);
  });
});
