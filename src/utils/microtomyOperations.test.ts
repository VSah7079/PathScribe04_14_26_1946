// src/utils/microtomyOperations.test.ts
import { describe, it, expect } from 'vitest';
import {
  addMicrotomyStain, removeMicrotomyStain, computeNextUnprintedStain, markStainPrinting,
  markStainPrintResult, reprintMicrotomyStain, reorderBlockStains, updateStainComment,
  updateBlockComment, setBlockAlertFlags, updateDecantCytologyFields, applyCytologyPrepSuggestions,
  addDecantStain, removeDecantStain,
  stainsInGridOrder, matrixBlockAsSpecimenView, matrixBlockFromSpecimenView, isMatrixView, microtomyViewOf, microtomyCaseUpdates,
  markDecantStainPrinting, markDecantStainPrintResult,
  updateDecantStainComment, reprintDecantStain, restoreStainOrder, remainingPrepSuggestions, MICROTOMY_UNDO_WINDOW_MS,
} from './microtomyOperations';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import type { StainType } from '@/services/stains/IStainService';

const specimen = (overrides: Partial<Specimen> = {}): Specimen => ({
  id: 'sp1', label: 'A', displayId: 'S26-0001-A',
  blocks: [{
    id: 'blk-1', label: '1', status: 'Grossed',
    stains: [
      { id: 'stain-1', stainName: 'H&E', status: 'Pending Cut', printStatus: 'Pending' },
      { id: 'stain-2', stainName: 'PAS', status: 'Pending Cut', printStatus: 'Printed', printedAt: '2026-09-01T00:00:00Z', printedBy: 'tech-1' },
    ],
  }],
  decants: [{
    id: 'dec-1', label: 'D1', decantType: 'residual_fluid' as any, createdAt: '2026-09-01T00:00:00Z',
    stains: [{ id: 'dstain-1', stainName: 'Pap Smear, Conventional', status: 'Pending Cut' }],
  }],
  ...overrides,
} as unknown as Specimen);

const stainType = (id: string, name: string): StainType => ({ id, name, category: 'IHC', active: true } as unknown as StainType);
const actor = { id: 'tech-1', name: 'J. Smith' };

describe('addMicrotomyStain', () => {
  it('adds a single, real, userAdded, Pending-print stain with the requested level depth', () => {
    const result = addMicrotomyStain(specimen(), 'blk-1', stainType('st-ki67', 'Ki-67'), 'S26-0001', { levelDepthMicrons: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.stains).toHaveLength(3);
    const added = block.stains.find(s => s.stainName === 'Ki-67')!;
    expect(added.userAdded).toBe(true);
    expect(added.printStatus).toBe('Pending');
    expect(added.levelDepthMicrons).toBe(4);
    expect(block.userModified).toBe(true);
  });

  it('honors duplicateCount, creating that many independent slides', () => {
    const result = addMicrotomyStain(specimen(), 'blk-1', stainType('st-he', 'H&E'), 'S26-0001', { duplicateCount: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.stains.filter(s => s.stainName === 'H&E')).toHaveLength(4); // 1 pre-existing + 3 new
  });

  it('pairWithControl creates a real, symmetric-linked control slide alongside the clinical one', () => {
    const result = addMicrotomyStain(specimen(), 'blk-1', stainType('st-ki67', 'Ki-67'), 'S26-0001', { pairWithControl: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    const clinical = block.stains.find(s => s.stainName === 'Ki-67')!;
    const control = block.stains.find(s => s.isControlSlide)!;
    expect(control.stainName).toContain('Control');
    expect(control.pairedControlSlideId).toBe(clinical.id);
    expect(clinical.pairedControlSlideId).toBe(control.id);
  });
});

describe('removeMicrotomyStain', () => {
  it('directly deletes an unprinted stain, no reason required', () => {
    const result = removeMicrotomyStain(specimen(), 'blk-1', 'stain-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.stains.find(s => s.id === 'stain-1')).toBeUndefined();
  });

  it('refuses to remove an already-printed stain without a reason', () => {
    const result = removeMicrotomyStain(specimen(), 'blk-1', 'stain-2');
    expect(result.ok).toBe(false);
    expect(!result.ok && 'needsReason' in result && result.needsReason).toBe(true);
  });

  it('with a reason, marks an already-printed stain Cancelled rather than deleting the real record', () => {
    const result = removeMicrotomyStain(specimen(), 'blk-1', 'stain-2', 'Tissue Exhausted');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    const stain = block.stains.find(s => s.id === 'stain-2')!;
    expect(stain.status).toBe('Cancelled');
    expect(stain.printStatus).toBe('Canceled');
    expect(stain.printFailureReason).toBe('Tissue Exhausted');
  });
});

describe('computeNextUnprintedStain', () => {
  it('finds the first stain that is not yet Printed/Printing/Canceled', () => {
    const block = specimen().blocks![0];
    const next = computeNextUnprintedStain(block.stains);
    expect(next?.id).toBe('stain-1');
  });

  it('returns undefined once every real stain is Printed', () => {
    const stains = [{ id: 's1', stainName: 'H&E', status: 'Pending Cut' as const, printStatus: 'Printed' as const }];
    expect(computeNextUnprintedStain(stains)).toBeUndefined();
  });
});

describe('markStainPrinting / markStainPrintResult', () => {
  it('transitions Pending -> Printing -> Printed on success', () => {
    const printing = markStainPrinting(specimen(), 'blk-1', 'stain-1');
    expect(printing.ok).toBe(true);
    if (!printing.ok) return;
    const printed = markStainPrintResult(printing.specimen, 'blk-1', 'stain-1', { ok: true }, 'tech-1');
    expect(printed.ok).toBe(true);
    if (!printed.ok) return;
    const stain = printed.specimen.blocks!.find(b => b.id === 'blk-1')!.stains.find(s => s.id === 'stain-1')!;
    expect(stain.printStatus).toBe('Printed');
    expect(stain.printedBy).toBe('tech-1');
  });

  it('records a real failure reason on a failed dispatch, leaving the slide retryable', () => {
    const result = markStainPrintResult(specimen(), 'blk-1', 'stain-1', { ok: false, message: 'No GS1 GTIN configured' }, 'tech-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stain = result.specimen.blocks!.find(b => b.id === 'blk-1')!.stains.find(s => s.id === 'stain-1')!;
    expect(stain.printStatus).toBe('Failed');
    expect(stain.printFailureReason).toBe('No GS1 GTIN configured');
  });
});

describe('reprintMicrotomyStain', () => {
  it('resets an already-printed slide back to Pending, records the reason, and increments reprintCount', () => {
    const result = reprintMicrotomyStain(specimen(), 'blk-1', 'stain-2', 'Scratched Glass', 'tech-2');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stain = result.specimen.blocks!.find(b => b.id === 'blk-1')!.stains.find(s => s.id === 'stain-2')!;
    expect(stain.printStatus).toBe('Pending');
    expect(stain.lastReprintReason).toBe('Scratched Glass');
    expect(stain.lastReprintOrderedBy).toBe('tech-2');
    expect(stain.reprintCount).toBe(1);
  });

  it('increments reprintCount across repeated reprints rather than resetting it', () => {
    const once = reprintMicrotomyStain(specimen(), 'blk-1', 'stain-2', 'Jam', 'tech-2');
    if (!once.ok) throw new Error('setup failed');
    const twice = reprintMicrotomyStain(once.specimen, 'blk-1', 'stain-2', 'Misprint', 'tech-2');
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    const stain = twice.specimen.blocks!.find(b => b.id === 'blk-1')!.stains.find(s => s.id === 'stain-2')!;
    expect(stain.reprintCount).toBe(2);
  });
});

describe('reorderBlockStains', () => {
  it('reorders stains to match the given id order', () => {
    const result = reorderBlockStains(specimen(), 'blk-1', ['stain-2', 'stain-1']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.stains.map(s => s.id)).toEqual(['stain-2', 'stain-1']);
  });

  it('defensively appends any real stain missing from the caller\'s own reorder list, rather than dropping it', () => {
    const result = reorderBlockStains(specimen(), 'blk-1', ['stain-2']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.stains.map(s => s.id)).toEqual(['stain-2', 'stain-1']);
  });
});

describe('updateStainComment / updateBlockComment', () => {
  it('appends a real, plain-text comment to a specific slide and records the label-print toggle', () => {
    const result = updateStainComment(specimen(), 'blk-1', 'stain-1', 'Repeat requested — poor uptake', true, actor);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stain = result.specimen.blocks!.find(b => b.id === 'blk-1')!.stains.find(s => s.id === 'stain-1')!;
    expect(stain.comments).toHaveLength(1);
    expect(stain.comments![0].text).toBe('Repeat requested — poor uptake');
    expect(stain.commentPrintsOnLabel).toBe(true);
  });

  it('appends a real block-level comment without touching any slide', () => {
    const result = updateBlockComment(specimen(), 'blk-1', 'Tiny fragment, handle with care', actor);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.comments).toHaveLength(1);
    expect(block.comments![0].authorName).toBe('J. Smith');
  });
});

describe('setBlockAlertFlags', () => {
  it('sets the real, high-contrast alert flags on a block', () => {
    const result = setBlockAlertFlags(specimen(), 'blk-1', { tinyTissue: true, fragile: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.specimen.blocks!.find(b => b.id === 'blk-1')!;
    expect(block.tinyTissue).toBe(true);
    expect(block.fragile).toBe(true);
  });
});

describe('Decant / Cytology operations', () => {
  it('updateDecantCytologyFields records volume/appearance/yield', () => {
    const result = updateDecantCytologyFields(specimen(), 'dec-1', { totalVolumeMl: 25, appearance: 'Bloody', yieldPelletSize: 'High' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const decant = result.specimen.decants!.find(d => d.id === 'dec-1')!;
    expect(decant.totalVolumeMl).toBe(25);
    expect(decant.appearance).toBe('Bloody');
    expect(decant.yieldPelletSize).toBe('High');
  });

  it('applyCytologyPrepSuggestions creates the exact real number of real stain rows, with sensible default stains per method', () => {
    const result = applyCytologyPrepSuggestions(
      specimen(), 'dec-1',
      [{ preparationMethod: 'ThinPrep/Liquid-Based', count: 2 }, { preparationMethod: 'Cell Block', count: 1 }],
      'S26-0001',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const decant = result.specimen.decants!.find(d => d.id === 'dec-1')!;
    const thinPreps = decant.stains.filter(s => s.preparationMethod === 'ThinPrep/Liquid-Based');
    const cellBlocks = decant.stains.filter(s => s.preparationMethod === 'Cell Block');
    expect(thinPreps).toHaveLength(2);
    expect(cellBlocks).toHaveLength(1);
    expect(cellBlocks[0].stainName).toBe('H&E');
  });

  it('addDecantStain / removeDecantStain mirror the block versions for a decant\'s own slides', () => {
    const added = addDecantStain(specimen(), 'dec-1', stainType('st-diffquik', 'Diff-Quik / Wright-Giemsa'), 'S26-0001', 'Direct Smear (Air-Dried)');
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const decant = added.specimen.decants!.find(d => d.id === 'dec-1')!;
    expect(decant.stains).toHaveLength(2);

    const removed = removeDecantStain(added.specimen, 'dec-1', decant.stains[1].id);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.specimen.decants!.find(d => d.id === 'dec-1')!.stains).toHaveLength(1);
  });
});

describe('Batch 460: slide levels at the bench', () => {
  it('a slide added after an unprinted one was removed never reuses a printed level', () => {
    const sp = specimen({ blocks: [{ id: 'blk-1', label: '1', status: 'Grossed', stains: [
      { id: 's1', stainName: 'H&E', status: 'Pending Cut', displayId: 'S26-0001-A1-L1' },
      { id: 's3', stainName: 'PAS', status: 'Pending Cut', displayId: 'S26-0001-A1-L3', printStatus: 'Printed' },
    ] }] } as any);
    const r = addMicrotomyStain(sp, 'blk-1', stainType('st-ki67', 'Ki-67'), 'S26-0001');
    expect(r.ok && r.specimen.blocks![0].stains[2].displayId).toBe('S26-0001-A1-L4');
    const d = addDecantStain(specimen({ decants: [{ id: 'dec-1', label: 'D1', stains: [{ id: 'x', stainName: 'Pap', status: 'Pending Cut', displayId: 'S26-0001-AD1-L2' }] }] } as any), 'dec-1', stainType('st-pap', 'Pap'), 'S26-0001');
    expect(d.ok && d.specimen.decants![0].stains[1].displayId).toBe('S26-0001-AD1-L3');
  });
  it('batch prints follow the grid order, not the order slides were ticked', () => {
    const stains = specimen().blocks![0].stains;
    expect(stainsInGridOrder(stains, ['stain-2', 'stain-1']).map(s => s.id)).toEqual(['stain-1', 'stain-2']);
  });
  it('decant slide print state', () => {
    const p = markDecantStainPrinting(specimen(), 'dec-1', 'dstain-1');
    expect(p.ok && p.specimen.decants![0].stains[0].printStatus).toBe('Printing');
    const f = markDecantStainPrintResult(specimen(), 'dec-1', 'dstain-1', { ok: false, message: 'Jam' }, 'tech-1');
    expect(f.ok && f.specimen.decants![0].stains[0]).toMatchObject({ printStatus: 'Failed', printFailureReason: 'Jam' });
    const ok = markDecantStainPrintResult(specimen(), 'dec-1', 'dstain-1', { ok: true }, 'tech-1');
    expect(ok.ok && ok.specimen.decants![0].stains[0]).toMatchObject({ printStatus: 'Printed', printedBy: 'tech-1' });
  });
});

describe('Batch 460: matrix blocks at the bench', () => {
  const mb: MatrixBlock = {
    id: 'mb-1', label: 'M1', status: 'Embedded' as any, createdAt: '', createdBy: '',
    participants: [{ specimenId: 'sp-D', positionInBlock: 1 }, { specimenId: 'sp-E', positionInBlock: 2 }],
    slides: [{ id: 'm-he', stainName: 'H&E', status: 'Pending Cut', displayId: 'S26-4404-M1-L1' }],
  };
  it('every block operation works on the view, and the slide id is the matrix slide id', () => {
    const view = matrixBlockAsSpecimenView(mb);
    expect(isMatrixView(view)).toBe(true);
    const r = addMicrotomyStain(view, 'mb-1', stainType('st-ki67', 'Ki-67'), 'S26-4404');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const back = matrixBlockFromSpecimenView(mb, r.specimen);
    expect(back.slides[1]).toMatchObject({ stainName: 'Ki-67', displayId: 'S26-4404-M1-L2', targetSpecimenIds: ['sp-D', 'sp-E'] });
    expect(back.slides[0].targetSpecimenIds).toEqual(['sp-D', 'sp-E']);
    const flagged = setBlockAlertFlags(view, 'mb-1', { fragile: true });
    expect(flagged.ok && matrixBlockFromSpecimenView(mb, flagged.specimen).fragile).toBe(true);
    const commented = updateBlockComment(view, 'mb-1', 'thin cores', actor);
    expect(commented.ok && matrixBlockFromSpecimenView(mb, commented.specimen).comments?.[0].text).toBe('thin cores');
  });
  it('the save writes Case.matrixBlocks for a matrix block and the specimens otherwise', () => {
    const c = { specimens: [specimen()], matrixBlocks: [mb] } as any;
    const view = microtomyViewOf(c, { kind: 'matrix', matrixBlockId: 'mb-1' })!;
    expect(Object.keys(microtomyCaseUpdates(c, view))).toEqual(['matrixBlocks']);
    expect(Object.keys(microtomyCaseUpdates(c, microtomyViewOf(c, { kind: 'block', specimenId: 'sp1', blockId: 'blk-1' })!))).toEqual(['specimens']);
    expect(microtomyViewOf(c, { kind: 'matrix', matrixBlockId: 'nope' })).toBeNull();
  });
});

describe('Batch 460 (PS-71): a bench change is re-applied to the newer case, never written over it', () => {
  it('a slide added from a stale copy keeps the other save (the scan tracker cutting the H&E)', async () => {
    let stored: Case = { id: 'C1', version: 1, specimens: [specimen()], matrixBlocks: [] } as any;
    const deps = {
      getCase: async () => structuredClone(stored),
      updateCase: async (_id: string, updates: Partial<Case>, expected: number) => {
        if (expected !== stored.version) throw new ConcurrencyConflictError('C1', expected, stored.version ?? 0);
        stored = { ...stored, ...updates, version: (stored.version ?? 0) + 1 } as Case;
      },
    };
    const stale = structuredClone(stored);
    // Someone else saves first: the H&E is cut.
    const cut = { ...stored, specimens: [{ ...stored.specimens![0], blocks: [{ ...stored.specimens![0].blocks![0], stains: stored.specimens![0].blocks![0].stains.map(s => (s.id === 'stain-1' ? { ...s, status: 'Cut & Placed' } : s)) }] }] } as any;
    await deps.updateCase('C1', { specimens: cut.specimens }, 1);
    const target = { kind: 'block' as const, specimenId: 'sp1', blockId: 'blk-1' };
    const op = (sp: Specimen) => addMicrotomyStain(sp, 'blk-1', stainType('st-ki67', 'Ki-67'), 'S26-0001');
    expect(op(microtomyViewOf(stale, target)!).ok).toBe(true); // what the screen showed
    const r = await updateCaseWithRetry('C1', current => {
      const res = op(microtomyViewOf(current, target)!);
      return res.ok ? microtomyCaseUpdates(current, res.specimen) : null;
    }, deps);
    expect(r.ok).toBe(true);
    const stains = stored.specimens![0].blocks![0].stains;
    expect(stains.find(s => s.id === 'stain-1')!.status).toBe('Cut & Placed');
    expect(stains.some(s => s.stainName === 'Ki-67')).toBe(true);
    expect(stored.version).toBe(3);
  });
});

describe('Batch 460: no label for a slide that is gone', () => {
  it('marking a removed slide as printing is refused', () => {
    expect(markStainPrinting(specimen(), 'blk-1', 'gone')).toEqual({ ok: false, error: 'Stain not found.' });
    expect(markDecantStainPrinting(specimen(), 'dec-1', 'gone')).toEqual({ ok: false, error: 'Stain not found.' });
  });
});

describe('Batch 669: decant slide comments and reprints (ws-2)', () => {
  it('updateDecantStainComment adds a comment and the print-on-label choice to a decant slide', () => {
    const r = updateDecantStainComment(specimen(), 'dec-1', 'dstain-1', 'thin smear', true, actor);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const stain = r.specimen.decants![0].stains[0];
    expect(stain.comments).toHaveLength(1);
    expect(stain.comments![0]).toMatchObject({ text: 'thin smear', authorId: 'tech-1', authorName: 'J. Smith' });
    expect(stain.commentPrintsOnLabel).toBe(true);
  });
  it('refuses a missing decant or slide', () => {
    expect(updateDecantStainComment(specimen(), 'nope', 'dstain-1', 'x', false, actor).ok).toBe(false);
    expect(updateDecantStainComment(specimen(), 'dec-1', 'nope', 'x', false, actor).ok).toBe(false);
  });
  it('reprintDecantStain records the reason, who, when and the count, and sets the slide back to Pending', () => {
    const printed = markDecantStainPrintResult(specimen(), 'dec-1', 'dstain-1', { ok: true }, 'tech-1');
    expect(printed.ok).toBe(true);
    if (!printed.ok) return;
    const r = reprintDecantStain(printed.specimen, 'dec-1', 'dstain-1', 'Jam', 'tech-2');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const stain = r.specimen.decants![0].stains[0];
    expect(stain).toMatchObject({ printStatus: 'Pending', lastReprintReason: 'Jam', lastReprintOrderedBy: 'tech-2', reprintCount: 1 });
    expect(stain.lastReprintOrderedAt).toBeTruthy();
    const again = reprintDecantStain(r.specimen, 'dec-1', 'dstain-1', 'Misprint', 'tech-2');
    expect(again.ok && again.specimen.decants![0].stains[0].reprintCount).toBe(2);
  });
  it('reprintDecantStain refuses a missing decant or slide', () => {
    expect(reprintDecantStain(specimen(), 'nope', 'dstain-1', 'Jam', 'u').ok).toBe(false);
    expect(reprintDecantStain(specimen(), 'dec-1', 'nope', 'Jam', 'u').ok).toBe(false);
  });
});

describe('Batch 669: Accept suggestion does not add the same slides twice (ws-5)', () => {
  const high = [{ preparationMethod: 'ThinPrep/Liquid-Based' as const, count: 2 }, { preparationMethod: 'Cell Block' as const, count: 1 }];
  it('the second press adds nothing and refuses, so nothing is saved', () => {
    const first = applyCytologyPrepSuggestions(specimen(), 'dec-1', high, 'S26-0001');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = applyCytologyPrepSuggestions(first.specimen, 'dec-1', high, 'S26-0001');
    expect(second.ok).toBe(false);
    expect(first.specimen.decants![0].stains.filter(s => s.userAdded)).toHaveLength(3);
  });
  it('adds only what is missing when some of the suggested slides are already there', () => {
    const sp = specimen({ decants: [{ id: 'dec-1', label: 'D1', stains: [{ id: 'x', stainName: 'Pap', status: 'Pending Cut', preparationMethod: 'ThinPrep/Liquid-Based' }] }] } as any);
    const r = applyCytologyPrepSuggestions(sp, 'dec-1', high, 'S26-0001');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const stains = r.specimen.decants![0].stains;
    expect(stains.filter(s => s.preparationMethod === 'ThinPrep/Liquid-Based')).toHaveLength(2);
    expect(stains.filter(s => s.preparationMethod === 'Cell Block')).toHaveLength(1);
  });
  it('a cancelled slide does not count as already added', () => {
    const stains = [{ id: 'x', stainName: 'H&E', status: 'Cancelled', printStatus: 'Canceled', preparationMethod: 'Cell Block' }] as any;
    expect(remainingPrepSuggestions(stains, high)).toEqual(high);
  });
  it('remainingPrepSuggestions is empty once every suggested slide exists', () => {
    const stains = [
      { id: 'a', preparationMethod: 'ThinPrep/Liquid-Based' }, { id: 'b', preparationMethod: 'ThinPrep/Liquid-Based' }, { id: 'c', preparationMethod: 'Cell Block' },
    ] as any;
    expect(remainingPrepSuggestions(stains, high)).toEqual([]);
  });
});

describe('Batch 669: Undo after Remove or Reprint (ws-6)', () => {
  it('puts back an unprinted slide that Remove deleted, at its place in the grid', () => {
    const sp = specimen();
    const snapshot = sp.blocks![0].stains[0];
    const removed = removeMicrotomyStain(sp, 'blk-1', 'stain-1');
    expect(removed.ok && removed.specimen.blocks![0].stains.map(s => s.id)).toEqual(['stain-2']);
    if (!removed.ok) return;
    const back = restoreStainOrder(removed.specimen, { kind: 'block', id: 'blk-1' }, snapshot, 0);
    expect(back.ok && back.specimen.blocks![0].stains.map(s => s.id)).toEqual(['stain-1', 'stain-2']);
  });
  it('puts back a printed slide that Remove cancelled', () => {
    const sp = specimen();
    const snapshot = sp.blocks![0].stains[1];
    const removed = removeMicrotomyStain(sp, 'blk-1', 'stain-2', 'Damaged Section');
    expect(removed.ok && removed.specimen.blocks![0].stains[1].printStatus).toBe('Canceled');
    if (!removed.ok) return;
    const back = restoreStainOrder(removed.specimen, { kind: 'block', id: 'blk-1' }, snapshot, 1);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.specimen.blocks![0].stains[1]).toMatchObject({ status: 'Pending Cut', printStatus: 'Printed', printedBy: 'tech-1' });
    expect(back.specimen.blocks![0].stains[1].printFailureReason).toBeUndefined();
  });
  it('undoes a reprint (count, reason, status) but keeps a comment added meanwhile', () => {
    const sp = specimen();
    const snapshot = sp.blocks![0].stains[1];
    const re = reprintMicrotomyStain(sp, 'blk-1', 'stain-2', 'Jam', 'tech-1');
    if (!re.ok) throw new Error('reprint refused');
    const commented = updateStainComment(re.specimen, 'blk-1', 'stain-2', 'note', false, actor);
    if (!commented.ok) throw new Error('comment refused');
    const back = restoreStainOrder(commented.specimen, { kind: 'block', id: 'blk-1' }, snapshot, 1);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const stain = back.specimen.blocks![0].stains[1];
    expect(stain.printStatus).toBe('Printed');
    expect(stain.reprintCount).toBeUndefined();
    expect(stain.lastReprintReason).toBeUndefined();
    expect(stain.comments).toHaveLength(1);
  });
  it('works for a decant slide too', () => {
    const sp = specimen();
    const snapshot = sp.decants![0].stains[0];
    const removed = removeDecantStain(sp, 'dec-1', 'dstain-1');
    if (!removed.ok) throw new Error('remove refused');
    const back = restoreStainOrder(removed.specimen, { kind: 'decant', id: 'dec-1' }, snapshot, 0);
    expect(back.ok && back.specimen.decants![0].stains.map(s => s.id)).toEqual(['dstain-1']);
  });
  it('refuses a block or decant that is gone, and the window is a few seconds', () => {
    expect(restoreStainOrder(specimen(), { kind: 'block', id: 'nope' }, specimen().blocks![0].stains[0], 0).ok).toBe(false);
    expect(restoreStainOrder(specimen(), { kind: 'decant', id: 'nope' }, specimen().blocks![0].stains[0], 0).ok).toBe(false);
    expect(MICROTOMY_UNDO_WINDOW_MS).toBeGreaterThanOrEqual(5000);
    expect(MICROTOMY_UNDO_WINDOW_MS).toBeLessThanOrEqual(15000);
  });
});
