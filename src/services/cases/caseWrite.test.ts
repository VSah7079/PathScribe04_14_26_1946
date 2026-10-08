// Batch 458 (PS-71): versioned case saves.
import { describe, it, expect, vi } from 'vitest';
import { updateCaseWithRetry, updateCaseWithRetryOrThrow, overwriteAfterConflict, caseConflictRows, adoptSavedVersion, savePageChange, commitMergeReview, takeUpSavedCase } from './caseWrite';
import { ConcurrencyConflictError } from './ConcurrencyConflictError';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** A one-case store that refuses a save made against an old version, like the real one. */
function store(initial: any) {
  let c = { ...initial };
  const saves: any[] = [];
  return {
    get: () => c,
    saves,
    deps: {
      getCase: vi.fn(async () => ({ ...c })),
      updateCase: vi.fn(async (_id: string, updates: any, v: number) => {
        if ((c.version ?? 0) !== v) throw new ConcurrencyConflictError(c.id, v, c.version ?? 0);
        c = { ...c, ...updates, version: (c.version ?? 0) + 1 };
        saves.push(updates);
      }),
    },
    /** Someone else saves. */
    otherSaves(updates: any) { c = { ...c, ...updates, version: (c.version ?? 0) + 1 }; },
  };
}

describe('updateCaseWithRetry', () => {
  it('saves with the version it read', async () => {
    const s = store({ id: 'C', version: 4, caseFlags: ['a'] });
    const r = await updateCaseWithRetry('C', cur => ({ caseFlags: [...(cur.caseFlags as any), 'b'] }), s.deps as any);
    expect(r).toMatchObject({ ok: true, version: 5, attempts: 1 });
    expect(s.deps.updateCase).toHaveBeenCalledWith('C', { caseFlags: ['a', 'b'] }, 4);
  });

  it('a save that lands in between: the change is rebuilt from the newer case and their change survives', async () => {
    const s = store({ id: 'C', version: 4, caseFlags: ['a'] });
    let first = true;
    const r = await updateCaseWithRetry('C', cur => {
      if (first) { first = false; s.otherSaves({ caseFlags: [...(cur.caseFlags as any), 'theirs'] }); }
      return { caseFlags: [...(cur.caseFlags as any), 'mine'] };
    }, s.deps as any);
    expect(r).toMatchObject({ ok: true, attempts: 2 });
    expect(s.get().caseFlags).toEqual(['a', 'theirs', 'mine']);
  });

  it('never saves without a version, and gives up after 3 tries', async () => {
    const s = store({ id: 'C', version: 1 });
    const r = await updateCaseWithRetry('C', () => { s.otherSaves({}); return { status: 'x' } as any; }, s.deps as any);
    expect(r).toEqual({ ok: false, reason: 'conflict', attempts: 3 });
    for (const call of s.deps.updateCase.mock.calls) expect(typeof call[2]).toBe('number');
    expect(s.saves).toHaveLength(0);
  });

  it('nothing to do on the newest case: no save; no case: notFound', async () => {
    const s = store({ id: 'C', version: 1 });
    expect(await updateCaseWithRetry('C', () => null, s.deps as any)).toEqual({ ok: false, reason: 'noChange', attempts: 1 });
    expect(await updateCaseWithRetry('C', () => ({}), { ...s.deps, getCase: async () => undefined } as any)).toEqual({ ok: false, reason: 'notFound', attempts: 1 });
  });

  it('OrThrow throws a ConcurrencyConflictError when it can\'t land', async () => {
    const s = store({ id: 'C', version: 1 });
    await expect(updateCaseWithRetryOrThrow('C', () => { s.otherSaves({}); return { status: 'x' } as any; }, s.deps as any)).rejects.toBeInstanceOf(ConcurrencyConflictError);
  });
});

describe('overwriteAfterConflict ("Save mine anyway")', () => {
  const actor = { id: 'PATH-001', name: 'Pete Nimmo' };
  it('needs case:edit-conflict:override; refused is audited and nothing is saved', async () => {
    const s = store({ id: 'C', version: 7 });
    const logAudit = vi.fn();
    const r = await overwriteAfterConflict({ caseId: 'C', caseLabel: 'S26-1', updates: { status: 'x' } as any, changedFields: ['status'], actor },
      { ...s.deps, enforce: async c => ({ allowed: c !== 'case:edit-conflict:override' }), logAudit } as any);
    expect(r).toEqual({ ok: false, reason: 'notPermitted' });
    expect(s.saves).toHaveLength(0);
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Edit conflict overwrite refused' }));
  });
  it('saves against the newest version and audits which parts it overwrote', async () => {
    const s = store({ id: 'C', version: 7 });
    const logAudit = vi.fn();
    const r = await overwriteAfterConflict({ caseId: 'C', caseLabel: 'S26-1', updates: { synopticReports: [] } as any, changedFields: ['synopticReports'], actor },
      { ...s.deps, enforce: async () => ({ allowed: true }), logAudit } as any);
    expect(r).toEqual({ ok: true, version: 8, overwroteVersion: 7 });
    expect(s.deps.updateCase).toHaveBeenCalledWith('C', { synopticReports: [] }, 7);
    expect(logAudit.mock.calls[0][0].detail).toContain('saved over version 7 (fields: synopticReports)');
  });
  it('a third save landing during the overwrite is caught, not overwritten', async () => {
    const s = store({ id: 'C', version: 7 });
    const deps = { ...s.deps, enforce: async () => ({ allowed: true }), logAudit: vi.fn() } as any;
    deps.getCase = vi.fn(async () => { const c = { ...s.get() }; s.otherSaves({}); return c; });
    expect(await overwriteAfterConflict({ caseId: 'C', caseLabel: 'S26-1', updates: {} as any, changedFields: [], actor }, deps)).toEqual({ ok: false, reason: 'conflict' });
  });
});

describe('View changes and adopting versions', () => {
  it('lists the parts that differ, and whether Overwrite replaces each', () => {
    const mine = { synopticReports: [{ a: 1 }], participants: [{ id: 'x' }], status: 'in-progress' } as any;
    const theirs = { synopticReports: [{ a: 2 }], participants: [{ id: 'y' }], status: 'in-progress' } as any;
    expect(caseConflictRows(mine, theirs, ['synopticReports'])).toEqual([
      { field: 'synopticReports', overwritten: true },
      { field: 'participants', overwritten: false },
    ]);
  });
  it('a screen adopts a saved version only when it was saved straight on top of its own', () => {
    expect(adoptSavedVersion(4, 5)).toBe(5);
    expect(adoptSavedVersion(4, 7)).toBe(4);
    expect(adoptSavedVersion(4, undefined)).toBe(4);
  });
});

import { mergeDraftParts, saveDraftParts } from './caseWrite';

describe('draft saves merged section by section (Pete, Oct 4)', () => {
  const sec = (id: string, text: string) => ({ id, text });
  const base = { orchSections: [sec('gross', 'g0'), sec('micro', 'm0')], synopticReports: [{ instanceId: 'S1', v: 0 }] } as any;

  it('different sections: mine where I changed, theirs where they changed', () => {
    const mine = { ...base, orchSections: [sec('gross', 'g0'), sec('micro', 'MINE')] };
    const theirs = { ...base, orchSections: [sec('gross', 'THEIRS'), sec('micro', 'm0')] };
    expect(mergeDraftParts(base, mine, theirs)).toEqual({ ok: true, parts: { orchSections: [sec('gross', 'THEIRS'), sec('micro', 'MINE')], synopticReports: [{ instanceId: 'S1', v: 0 }] } });
  });
  it('the same section changed on both sides is an overlap; identical changes are not', () => {
    const mine = { ...base, orchSections: [sec('gross', 'g0'), sec('micro', 'MINE')] };
    expect(mergeDraftParts(base, mine, { ...base, orchSections: [sec('gross', 'g0'), sec('micro', 'THEIRS')] })).toEqual({ ok: false, overlap: ['orchSections:micro.text'] });
    expect(mergeDraftParts(base, mine, mine).ok).toBe(true);
  });
  it('a section they added is kept; one I removed stays removed', () => {
    const mine = { ...base, orchSections: [sec('gross', 'g0')] };
    const theirs = { ...base, orchSections: [...base.orchSections, sec('addendum', 'a')] };
    expect((mergeDraftParts(base, mine, theirs) as any).parts.orchSections).toEqual([sec('gross', 'g0'), sec('addendum', 'a')]);
  });

  it('saveDraftParts: no one else saved → one save; someone saved another section → merged and saved on their version', async () => {
    const s = store({ id: 'C', version: 3, ...base });
    const mine = { ...base, orchSections: [sec('gross', 'g0'), sec('micro', 'MINE')] };
    expect(await saveDraftParts('C', mine, base, 3, s.deps as any)).toEqual({ ok: true, version: 4, merged: false });
    const s2 = store({ id: 'C', version: 3, ...base });
    s2.otherSaves({ orchSections: [sec('gross', 'THEIRS'), sec('micro', 'm0')], participants: [{ id: 'tech' }] });
    const r: any = await saveDraftParts('C', mine, base, 3, s2.deps as any);
    expect(r).toMatchObject({ ok: true, version: 5, merged: true });
    expect(s2.get().orchSections).toEqual([sec('gross', 'THEIRS'), sec('micro', 'MINE')]);
    expect(s2.get().participants).toEqual([{ id: 'tech' }]);
  });
  it('saveDraftParts: the same section changed by both → overlap, nothing saved', async () => {
    const s = store({ id: 'C', version: 3, ...base });
    s.otherSaves({ orchSections: [sec('gross', 'g0'), sec('micro', 'THEIRS')] });
    const mine = { ...base, orchSections: [sec('gross', 'g0'), sec('micro', 'MINE')] };
    expect(await saveDraftParts('C', mine, base, 3, s.deps as any)).toEqual({ ok: false, reason: 'overlap', actualVersion: 4, overlap: ['orchSections:micro.text'] });
    expect(s.get().orchSections[1].text).toBe('THEIRS');
  });
});

describe('Batch 458: field-level merge (Pete: "We can\'t lose the user\'s changes")', () => {
  const sp = (id: string, extra: any = {}) => ({ id, description: 'Colon', comments: [], blocks: [], ...extra });
  it('a comment on specimen A and someone else\'s new block on specimen A are both kept', () => {
    const base = { specimens: [sp('A'), sp('B')] } as any;
    const mine = { specimens: [sp('A', { comments: [{ id: 'c1', text: 'mine' }] }), sp('B')] } as any;
    const theirs = { specimens: [sp('A', { blocks: [{ id: 'A1' }] }), sp('B')] } as any;
    expect(mergeDraftParts(base, mine, theirs)).toEqual({ ok: true, parts: { specimens: [sp('A', { comments: [{ id: 'c1', text: 'mine' }], blocks: [{ id: 'A1' }] }), sp('B')] } });
  });
  it('two people answering different questions in the same synoptic report are merged', () => {
    const r = (answers: any) => ({ instanceId: 'S1', answers });
    const m = mergeDraftParts({ synopticReports: [r({ q1: 'a' })] } as any, { synopticReports: [r({ q1: 'a', q2: 'mine' })] } as any, { synopticReports: [r({ q1: 'a', q3: 'theirs' })] } as any);
    expect(m).toEqual({ ok: true, parts: { synopticReports: [r({ q1: 'a', q3: 'theirs', q2: 'mine' })] } });
  });
  it('the same answer changed both ways is an overlap, named down to the field', () => {
    const r = (answers: any) => ({ instanceId: 'S1', answers });
    expect(mergeDraftParts({ synopticReports: [r({ q1: 'a' })] } as any, { synopticReports: [r({ q1: 'mine' })] } as any, { synopticReports: [r({ q1: 'theirs' })] } as any))
      .toEqual({ ok: false, overlap: ['synopticReports:S1.answers.q1'] });
  });
  it('records added on both sides are all kept; one removed here and edited there is an overlap', () => {
    const base = { caseFlags: [{ id: 'f1', v: 1 }] } as any;
    expect((mergeDraftParts(base, { caseFlags: [{ id: 'f1', v: 1 }, { id: 'mine' }] } as any, { caseFlags: [{ id: 'f1', v: 1 }, { id: 'theirs' }] } as any) as any).parts.caseFlags.map((f: any) => f.id))
      .toEqual(['f1', 'theirs', 'mine']);
    expect(mergeDraftParts(base, { caseFlags: [] } as any, { caseFlags: [{ id: 'f1', v: 2 }] } as any)).toEqual({ ok: false, overlap: ['caseFlags:f1'] });
  });
});

describe('Batch 458: savePageChange (a screen\'s instant save)', () => {
  it('saved straight away when nobody else saved', async () => {
    const s = store({ id: 'C', version: 2, caseFlags: [] });
    expect(await savePageChange({ caseId: 'C', patch: { caseFlags: [{ id: 'f' }] } as any, before: s.get(), knownVersion: 2, pending: null }, s.deps as any)).toEqual({ kind: 'saved', version: 3 });
  });
  it('the same field changed both ways: nothing saved, and the change is kept as pending', async () => {
    const s = store({ id: 'C', version: 2, specimens: [{ id: 'A', description: 'Colon' }] });
    const before = s.get();
    s.otherSaves({ specimens: [{ id: 'A', description: 'Sigmoid colon' }] });
    const r: any = await savePageChange({ caseId: 'C', patch: { specimens: [{ id: 'A', description: 'Rectum' }] } as any, before, knownVersion: 2, pending: null }, s.deps as any);
    expect(r).toMatchObject({ kind: 'conflict', actualVersion: 3, pending: { parts: { specimens: [{ id: 'A', description: 'Rectum' }] }, base: { specimens: [{ id: 'A', description: 'Colon' }] } } });
    expect(s.get().specimens[0].description).toBe('Sigmoid colon');
  });
});

describe('Batch 458: review before saving over someone else\'s save (Pete: "an option to abort or accept")', () => {
  it('saveDraftParts with review: nothing saved; the merge, what they changed and what I change are reported', async () => {
    const s = store({ id: 'C', version: 2, synopticReports: [{ instanceId: 'S1', a: 1 }], participants: [] });
    const before = s.get();
    s.otherSaves({ participants: [{ staffId: 'T' }] });
    const r: any = await saveDraftParts('C', { synopticReports: [{ instanceId: 'S1', a: 2 }] } as any, { synopticReports: [{ instanceId: 'S1', a: 1 }] } as any, 2, s.deps as any, { review: true, before });
    expect(r).toMatchObject({ ok: false, reason: 'review', review: { version: 3, theirsChanged: ['participants'], mineChanged: ['synopticReports'], parts: { synopticReports: [{ instanceId: 'S1', a: 2 }] } } });
    expect(s.saves).toHaveLength(0);
  });
  it('commitMergeReview saves against the reviewed version; a save in between means review again', async () => {
    const s = store({ id: 'C', version: 3 });
    const review = { caseId: 'C', latest: s.get(), version: 3, parts: { status: 'x' }, theirsChanged: [], mineChanged: [] } as any;
    expect(await commitMergeReview(review, s.deps as any)).toMatchObject({ ok: true, version: 4 });
    expect(await commitMergeReview(review, s.deps as any)).toEqual({ ok: false, reason: 'changedAgain' });
  });
  it('takeUpSavedCase: unsaved typing is merged onto the saved case; if it collides, it is kept as typed and the old version stays', () => {
    const saved = { id: 'C', version: 5, synopticReports: [{ instanceId: 'S1', a: 1, b: 'theirs' }], participants: [{ staffId: 'T' }] } as any;
    const clean = takeUpSavedCase({ saved, savedVersion: 5, applied: { participants: saved.participants } as any, pageDraft: { synopticReports: [{ instanceId: 'S1', a: 2 }] } as any, draftBase: { synopticReports: [{ instanceId: 'S1', a: 1 }] } as any });
    expect(clean.adoptVersion).toBe(5);
    expect(clean.show.synopticReports).toEqual([{ instanceId: 'S1', a: 2, b: 'theirs' }]);
    const clash = takeUpSavedCase({ saved: { ...saved, synopticReports: [{ instanceId: 'S1', a: 9 }] }, savedVersion: 5, applied: {}, pageDraft: { synopticReports: [{ instanceId: 'S1', a: 2 }] } as any, draftBase: { synopticReports: [{ instanceId: 'S1', a: 1 }] } as any });
    expect(clash.adoptVersion).toBeNull();
    expect(clash.show.synopticReports).toEqual([{ instanceId: 'S1', a: 2 }]);
  });
  it('savePageChange stops for review when someone else saved other parts', async () => {
    const s = store({ id: 'C', version: 2, specimens: [{ id: 'A', comments: [] }], participants: [] });
    const before = s.get();
    s.otherSaves({ participants: [{ staffId: 'T' }] });
    const r: any = await savePageChange({ caseId: 'C', patch: { specimens: [{ id: 'A', comments: [{ id: 'c1' }] }] } as any, before, knownVersion: 2, pending: null }, s.deps as any);
    expect(r.kind).toBe('review');
    expect(r.review.theirsChanged).toEqual(['participants']);
    expect(s.saves).toHaveLength(0);
  });
});
