// src/services/cases/caseFilterUtils.test.ts
import { describe, it, expect } from 'vitest';
import { applyCasePagination, mergeDualSourcePages } from './caseFilterUtils';
import type { Case } from '../../types/case/Case';

// Real cases, each with a distinct, real updatedAt timestamp — pagination's
// entire correctness depends on this field, so tests use genuinely
// different values throughout, never a shared/duplicate timestamp.
function makeCase(id: string, updatedAt: string): Case {
  return { id, updatedAt } as any as Case;
}

describe('applyCasePagination — real cursor-based pagination, matching FirestoreCaseService.ts\'s own orderBy/startAfter semantics', () => {
  const cases = [
    makeCase('S26-1', '2026-01-01T10:00:00.000Z'),
    makeCase('S26-2', '2026-01-02T10:00:00.000Z'),
    makeCase('S26-3', '2026-01-03T10:00:00.000Z'),
    makeCase('S26-4', '2026-01-04T10:00:00.000Z'),
    makeCase('S26-5', '2026-01-05T10:00:00.000Z'),
  ];

  it('returns everything, unpaginated, when no pageSize is given — existing callers see no behavior change', () => {
    const result = applyCasePagination(cases);
    expect(result.data.length).toBe(5);
    expect(result.meta).toBeUndefined();
  });

  it('sorts by updatedAt descending before paginating, regardless of input order', () => {
    const shuffled = [cases[2], cases[0], cases[4], cases[1], cases[3]];
    const result = applyCasePagination(shuffled, { pageSize: 5 });
    expect(result.data.map(c => c.id)).toEqual(['S26-5', 'S26-4', 'S26-3', 'S26-2', 'S26-1']);
  });

  it('returns exactly pageSize items and flags hasMore when more exist', () => {
    const result = applyCasePagination(cases, { pageSize: 2 });
    expect(result.data.map(c => c.id)).toEqual(['S26-5', 'S26-4']);
    expect(result.meta?.hasMore).toBe(true);
    expect(result.meta?.nextCursor).toBe('2026-01-04T10:00:00.000Z');
  });

  it('walks through every real page in sequence using the returned cursor each time, visiting every case exactly once', () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const result = applyCasePagination(cases, { pageSize: 2, cursor });
      seen.push(...result.data.map(c => c.id));
      if (!result.meta?.hasMore) break;
      cursor = result.meta.nextCursor;
    }
    expect(seen).toEqual(['S26-5', 'S26-4', 'S26-3', 'S26-2', 'S26-1']);
  });

  it('the real last page has hasMore false and no nextCursor', () => {
    const result = applyCasePagination(cases, { pageSize: 2, cursor: '2026-01-02T10:00:00.000Z' });
    expect(result.data.map(c => c.id)).toEqual(['S26-1']);
    expect(result.meta?.hasMore).toBe(false);
    expect(result.meta?.nextCursor).toBeUndefined();
  });

  it('a pageSize exactly matching the remaining count reports hasMore false, not a phantom empty next page', () => {
    const result = applyCasePagination(cases, { pageSize: 5 });
    expect(result.data.length).toBe(5);
    expect(result.meta?.hasMore).toBe(false);
  });

  it('a stale cursor (item no longer in the filtered set) falls back to the start rather than erroring', () => {
    const result = applyCasePagination(cases, { pageSize: 2, cursor: '1999-01-01T00:00:00.000Z' });
    expect(result.data.map(c => c.id)).toEqual(['S26-5', 'S26-4']);
  });

  it('a genuinely empty result set returns an honest empty page, not an error', () => {
    const result = applyCasePagination([], { pageSize: 10 });
    expect(result.data).toEqual([]);
    expect(result.meta?.hasMore).toBe(false);
  });
});

describe('mergeDualSourcePages — real cursor-based pagination for CaseRouter.getAll()\'s dual-source (LIS + Orchestration) merge', () => {
  const lis = [
    makeCase('S26-1', '2026-01-01T10:00:00.000Z'),
    makeCase('S26-3', '2026-01-03T10:00:00.000Z'),
    makeCase('S26-5', '2026-01-05T10:00:00.000Z'),
  ];
  const orch = [
    makeCase('O26-2', '2026-01-02T10:00:00.000Z'),
    makeCase('O26-4', '2026-01-04T10:00:00.000Z'),
  ];

  it('interleaves both sources correctly by updatedAt descending, not source-then-source', () => {
    const lisFetched = applyCasePagination(lis, { pageSize: 5 });
    const orchFetched = applyCasePagination(orch, { pageSize: 5 });
    const result = mergeDualSourcePages(lisFetched.data, orchFetched.data, 5, {});
    expect(result.data.map(c => c.id)).toEqual(['S26-5', 'O26-4', 'S26-3', 'O26-2', 'S26-1']);
  });

  it('a real, complete multi-page walk visits every item from both sources exactly once, in correct overall order', () => {
    const seen: string[] = [];
    let cursor: { lis?: string; orch?: string } = {};
    for (let i = 0; i < 10; i++) {
      // Real calling convention (matches CaseRouter.getAll()): each source
      // is independently cursor-advanced first via applyCasePagination -
      // exactly what mockCaseService.getAll()/mockOrchestratorCaseService.
      // getAll() do internally - and only the resulting fetched batches
      // are handed to mergeDualSourcePages, not the full raw arrays.
      const lisFetched = applyCasePagination(lis, { pageSize: 2, cursor: cursor.lis });
      const orchFetched = applyCasePagination(orch, { pageSize: 2, cursor: cursor.orch });
      const result = mergeDualSourcePages(
        lisFetched.data, orchFetched.data, 2, cursor,
        { lis: lisFetched.meta?.hasMore, orch: orchFetched.meta?.hasMore },
      );
      seen.push(...result.data.map(c => c.id));
      if (!result.meta.hasMore) break;
      cursor = JSON.parse(result.meta.nextCursor!);
    }
    expect(seen).toEqual(['S26-5', 'O26-4', 'S26-3', 'O26-2', 'S26-1']);
  });

  it('when a page draws entirely from one source, the untouched source\'s cursor stays exactly where it was (not skipped ahead)', () => {
    // First page (size 1): each source independently pre-paginated first,
    // matching the real calling convention.
    const lisFetched1 = applyCasePagination(lis, { pageSize: 1 });
    const orchFetched1 = applyCasePagination(orch, { pageSize: 1 });
    const first = mergeDualSourcePages(
      lisFetched1.data, orchFetched1.data, 1, {},
      { lis: lisFetched1.meta?.hasMore, orch: orchFetched1.meta?.hasMore },
    );
    expect(first.data.map(c => c.id)).toEqual(['S26-5']);
    const firstCursor = JSON.parse(first.meta.nextCursor!);
    expect(firstCursor.orch).toBeUndefined();
    expect(firstCursor.lis).toBe('2026-01-05T10:00:00.000Z');

    // Resuming from that cursor must still see O26-4 next — proof the
    // orch source wasn't silently skipped past, even though it
    // contributed nothing to the first page.
    const lisFetched2 = applyCasePagination(lis, { pageSize: 1, cursor: firstCursor.lis });
    const orchFetched2 = applyCasePagination(orch, { pageSize: 1, cursor: firstCursor.orch });
    const second = mergeDualSourcePages(
      lisFetched2.data, orchFetched2.data, 1, firstCursor,
      { lis: lisFetched2.meta?.hasMore, orch: orchFetched2.meta?.hasMore },
    );
    expect(second.data.map(c => c.id)).toEqual(['O26-4']);
  });

  it('one source completely empty still merges and paginates the other correctly', () => {
    const lisFetched = applyCasePagination(lis, { pageSize: 2 });
    const result = mergeDualSourcePages(lisFetched.data, [], 2, {}, { lis: lisFetched.meta?.hasMore });
    expect(result.data.map(c => c.id)).toEqual(['S26-5', 'S26-3']);
    expect(result.meta.hasMore).toBe(true);
  });

  it('both sources empty returns an honest empty page', () => {
    const result = mergeDualSourcePages([], [], 5, {});
    expect(result.data).toEqual([]);
    expect(result.meta.hasMore).toBe(false);
  });

  it('real, confirmed regression: a source\'s hasMore must survive even when its entire fetched batch is fully consumed by this page', () => {
    // lis has 3 items, fetched with pageSize 2 — applyCasePagination
    // correctly reports hasMore: true for lis alone. Both fetched lis
    // items end up in the merged page (pageSize 2, orch empty), so the
    // merged/trimmed set itself is NOT larger than pageSize — the only
    // way this test can see hasMore: true is if the source's own prior
    // hasMore genuinely survives into the merge's result.
    const lisFetched = applyCasePagination(lis, { pageSize: 2 });
    expect(lisFetched.meta?.hasMore).toBe(true); // confirms the premise
    const result = mergeDualSourcePages(lisFetched.data, [], 2, {}, { lis: lisFetched.meta?.hasMore });
    expect(result.meta.hasMore).toBe(true);
  });
});
