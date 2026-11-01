// Batch 731 (spec §10.6): the exhausted-block rule. A line needing a new section is blocked unless an alternative is
// chosen; a line that can use an unstained slide already cut is allowed (with a reason); the Microtome flag can be
// answered with the same alternatives; re-embedding releases the orders waiting for it.
import { describe, it, expect } from 'vitest';
import type { Specimen, StainOrder } from '@/types/case/Specimen';
import {
  unstainedSlidesOf, whatRemains, checkExhaustedLines, exhaustedChoiceProblems, orderOnUnstainedSlide,
  resolveExhaustionWithAlternative, completeReembed, ordersAwaitingReembed, lineNeedsNewSection,
} from './exhaustedBlockRules';
import { cuttingBlockedByExhaustion } from './blockExceptionStates';

const slide = (id: string, level: number, extra: Partial<StainOrder> = {}): StainOrder =>
  ({ id, stainName: 'Unstained', status: 'Cut & Placed', displayId: `S26-1-A3-L${level}`, ...extra } as StainOrder);

const specimen = (): Specimen => ({
  id: 'sp1', label: 'A',
  blocks: [
    { id: 'b1', label: '1', status: 'Embedded', stains: [] },
    { id: 'b2', label: '2', status: 'Lost', stains: [] },
    {
      id: 'b3', label: '3', status: 'Exhausted', stains: [
        slide('h', 1, { stainName: 'H&E' }),
        slide('u4', 4),
        slide('u5', 5),
        slide('pc', 6, { status: 'Pending Cut' }),
      ],
    },
  ],
} as unknown as Specimen);

const recut = { orderKind: 'recut' as const };
const ihc = { orderKind: 'ihc' as const };
const actor = { id: 'p1', name: 'Dr P' };

describe('what remains', () => {
  it('lists the unstained slides already cut and the part\'s other blocks that can be cut', () => {
    expect(unstainedSlidesOf(specimen().blocks![2]).map(s => s.id)).toEqual(['u4', 'u5']);
    expect(whatRemains(specimen(), 'b3')).toEqual({
      blockLabel: 'A3', unstained: [{ id: 'u4', level: 'L4' }, { id: 'u5', level: 'L5' }], otherBlocks: [{ id: 'b1', label: 'A1' }], awaitingReembed: 0, otherPieces: [],
    });
  });
});

describe('the builder\'s per-line check', () => {
  it('blocks a line with no choice: a recut needs a new section, a stain needs an alternative', () => {
    expect(lineNeedsNewSection(recut)).toBe(true);
    expect(lineNeedsNewSection({ orderKind: 'special_stain', levelDepthMicrons: 50 })).toBe(true);
    const checks = checkExhaustedLines(specimen(), 'b3', [recut, ihc], undefined);
    expect(checks).toEqual([{ line: 0, ok: false, problem: 'needsNewSection' }, { line: 1, ok: false, problem: 'chooseAlternative' }]);
  });
  it('never puts a recut on an existing slide, and one slide takes one line', () => {
    const checks = checkExhaustedLines(specimen(), 'b3', [recut, ihc, ihc], {
      reason: 'r', lines: { 0: { kind: 'useSlide', slideId: 'u4' }, 1: { kind: 'useSlide', slideId: 'u4' }, 2: { kind: 'useSlide', slideId: 'u4' } },
    });
    expect(checks.map(c => (c.ok ? 'ok' : c.problem))).toEqual(['needsNewSection', 'ok', 'slideUnavailable']);
  });
  it('allows re-embedding or another usable block of the same part', () => {
    const checks = checkExhaustedLines(specimen(), 'b3', [recut, recut, recut], {
      reason: 'r', lines: { 0: { kind: 'reembed' }, 1: { kind: 'otherBlock', blockId: 'b1' }, 2: { kind: 'otherBlock', blockId: 'b2' } },
    });
    expect(checks.map(c => (c.ok ? 'ok' : c.problem))).toEqual(['ok', 'ok', 'blockUnusable']);
    expect(exhaustedChoiceProblems(checks, ' ')).toEqual({ blockedLines: [2], reasonMissing: true });
  });
  it('an order on an unstained slide keeps the slide and gives it the stain', () => {
    const after = orderOnUnstainedSlide(specimen(), 'b3', 'u4', { stainName: 'ER', orderedByPathologistId: 'p1' });
    const s = after!.blocks![2].stains.find(x => x.id === 'u4')!;
    expect(s).toMatchObject({ stainName: 'ER', status: 'Cut & Placed', displayId: 'S26-1-A3-L4', userAdded: true, orderedByPathologistId: 'p1' });
    expect(orderOnUnstainedSlide(specimen(), 'b3', 'h', { stainName: 'ER' })).toBeNull();
  });
});

describe('answering the Microtome\'s "Block exhausted" flag with an alternative', () => {
  const flagged = (): Specimen => {
    const sp = specimen();
    sp.blocks![2].stains[3] = { ...sp.blocks![2].stains[3], stainName: 'ER', orderedByPathologistId: 'p1', exception: {
      reason: 'Block exhausted', flaggedBy: 't1', flaggedByName: 'Tech', flaggedAt: 'x', status: 'pending_pathologist_review', blockStatusBefore: 'Embedded',
    } };
    return sp;
  };
  it('uses an unstained slide: the slide takes the stain, the flagged order is cancelled, the block stays exhausted', () => {
    const r = resolveExhaustionWithAlternative(flagged(), 'b3', 'pc', { kind: 'useSlide', slideId: 'u5' }, 'ok', actor, 'S26-1');
    expect(r.ok).toBe(true);
    const b = (r as { specimen: Specimen }).specimen.blocks![2];
    expect(b.status).toBe('Exhausted');
    expect(b.stains.find(s => s.id === 'u5')?.stainName).toBe('ER');
    expect(b.stains.find(s => s.id === 'pc')).toMatchObject({ status: 'Cancelled', exception: { status: 'used_unstained' } });
  });
  it('moves the order to another block of the same part at its next level', () => {
    const r = resolveExhaustionWithAlternative(flagged(), 'b3', 'pc', { kind: 'otherBlock', blockId: 'b1' }, undefined, actor, 'S26-1');
    const sp = (r as { specimen: Specimen }).specimen;
    expect(sp.blocks![0].stains).toHaveLength(1);
    expect(sp.blocks![0].stains[0]).toMatchObject({ stainName: 'ER', status: 'Pending Cut', displayId: 'S26-1-A1-L1' });
    expect(sp.blocks![2].stains.find(s => s.id === 'pc')?.exception?.status).toBe('moved_to_other_block');
    expect(resolveExhaustionWithAlternative(flagged(), 'b3', 'pc', { kind: 'otherBlock', blockId: 'b2' }, undefined, actor, 'S26-1')).toEqual({ ok: false, error: 'blockUnusable' });
  });
  it('re-embedding keeps the order waiting (cutting held) until the block is re-embedded', () => {
    const r = resolveExhaustionWithAlternative(flagged(), 'b3', 'pc', { kind: 'reembed' }, undefined, actor, 'S26-1');
    const sp = (r as { specimen: Specimen }).specimen;
    expect(ordersAwaitingReembed(sp.blocks![2]).map(s => s.id)).toEqual(['pc']);
    expect(cuttingBlockedByExhaustion(sp.blocks![2])).toBe(true);
    const done = completeReembed(sp, 'b3', { id: 't1', name: 'Tech' }, undefined);
    expect(done.ok && done.released).toBe(1);
    const b = (done as { specimen: Specimen }).specimen.blocks![2];
    expect(b.status).toBe('Embedded');
    expect(cuttingBlockedByExhaustion(b)).toBe(false);
    expect(b.stains.find(s => s.id === 'pc')).toMatchObject({ status: 'Pending Cut', exception: { status: 'reembedded' } });
    expect(completeReembed(specimen(), 'b3', actor, undefined)).toEqual({ ok: false, error: 'nothingWaiting' });
  });
  it('refuses when there is no open flag', () => {
    expect(resolveExhaustionWithAlternative(specimen(), 'b3', 'pc', { kind: 'reembed' }, undefined, actor, 'S26-1')).toEqual({ ok: false, error: 'noOpenFlag' });
  });
});

describe('the builder\'s form values', () => {
  it('round-trips a choice through the select value', async () => {
    const { encodeLineChoice, decodeLineChoice, choicesForSubmit, lineChoiceOptions } = await import('./exhaustedBlockRules');
    for (const c of [{ kind: 'useSlide', slideId: 'u4' }, { kind: 'reembed' }, { kind: 'otherBlock', blockId: 'b1' }] as const) {
      expect(decodeLineChoice(encodeLineChoice(c))).toEqual(c);
    }
    expect(decodeLineChoice('')).toBeUndefined();
    expect(choicesForSubmit(['c1', 'c2'], { b3: { reason: 'r', byCart: { c2: { kind: 'reembed' } } } }))
      .toEqual({ b3: { reason: 'r', lines: { 0: undefined, 1: { kind: 'reembed' } } } });
    const remains = whatRemains(specimen(), 'b3')!;
    expect(lineChoiceOptions(remains, recut, false)).toEqual([{ kind: 'otherBlock', blockId: 'b1' }]);
    expect(lineChoiceOptions(remains, ihc, true).map(c => c.kind)).toEqual(['useSlide', 'useSlide', 'reembed', 'otherBlock']);
  });
});
