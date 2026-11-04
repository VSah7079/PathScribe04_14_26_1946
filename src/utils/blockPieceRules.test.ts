// Batch 732 (Lab Workflow & Batch spec §11): block types, piece maps, slide size, partial exhaustion, level ranges and
// orders for a piece.
import { describe, it, expect } from 'vitest';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { StainType } from '@/services/stains/IStainService';
import {
  blockTypeOf, slideSizeOf, piecesOf, pieceMapProblems, setBlockPieceMap, markPieceExhausted, onExhaustedTissue, mixesExhaustedPieces,
  slideFitsHardware, BLOCK_TYPE_PROFILES, pieceRemovalProblems,
} from './blockPieceRules';
import { stainCuttingBlocked, exhaustionFlagTarget } from './blockExceptionStates';
import { unstainedSlidesOf } from './exhaustedBlockRules';
import { createAddOnOrder, expandLevelRanges, buildAddOnLines } from './addOnOrderOperations';
import { whatRemains, checkExhaustedLines, completeReembed } from './exhaustedBlockRules';
import { cuttingBlockedByExhaustion } from './blockExceptionStates';

const pieces = [
  { id: 'p1', position: 1, partLabel: 'A', description: 'left lobe' },
  { id: 'p2', position: 2, partLabel: 'A', description: 'right lobe' },
];
const specimen = (block: Partial<HistologyBlock> = {}): Specimen => ({
  id: 'sp1', label: 'A',
  blocks: [{ id: 'b1', label: '1', status: 'Embedded', stains: [], ...block } as HistologyBlock, { id: 'b2', label: '2', status: 'Embedded', stains: [] } as unknown as HistologyBlock],
} as unknown as Specimen);
const he = { id: 'st-he', name: 'H&E', category: 'Routine', active: true } as StainType;
const submission = { priority: 'Routine Sign-Out' as const, slideMediaType: 'Standard Charged' as const };
const actor = { id: 'u1', name: 'Tech' };

describe('block types and slide size', () => {
  it('a megablock makes large-format slides and uses a mega mold; a matrix block is "matrix"', () => {
    expect(blockTypeOf({ blockType: 'megablock' })).toBe('megablock');
    expect(blockTypeOf({})).toBe('standard');
    expect(blockTypeOf({ participants: [] } as unknown as MatrixBlock)).toBe('matrix');
    expect(BLOCK_TYPE_PROFILES.megablock).toMatchObject({ mold: 'Mega Mold', slideSize: 'large_format', slideTemplate: 'ZPL-SLIDE-LF-V1' });
    expect(slideSizeOf({}, 'megablock')).toBe('large_format');
    expect(slideSizeOf({ slideSize: 'standard' }, 'megablock')).toBe('standard');
  });
  it('a large-format slide needs hardware marked for it', () => {
    expect(slideFitsHardware('standard', null)).toBe(true);
    expect(slideFitsHardware('large_format', {})).toBe(false);
    expect(slideFitsHardware('large_format', { supportsLargeFormat: true })).toBe(true);
  });
});

describe('piece map', () => {
  it('checks positions, parts and the type', () => {
    expect(pieceMapProblems('multi_piece', pieces)).toEqual([]);
    expect(pieceMapProblems('standard', pieces)).toEqual(['piecesNeedMultiPiece']);
    expect(pieceMapProblems('multi_piece', [{ position: 1, partLabel: 'A' }, { position: 1, partLabel: ' ' }])).toEqual(['positionRepeated', 'partMissing']);
    expect(pieceMapProblems('odd', [{ position: 0, partLabel: 'A' }])).toEqual(['typeUnknown', 'positionInvalid']);
  });
  it('saves the type and pieces in order, sets the piece count and the megablock mold, and keeps a used-up piece used up', () => {
    const used = specimen({ pieces: [{ ...pieces[1], exhaustedAt: 'x', exhaustedByName: 'T' }] });
    const r = setBlockPieceMap(used, 'b1', 'megablock', [pieces[1], pieces[0]]);
    const b = (r as { specimen: Specimen }).specimen.blocks![0];
    expect(b).toMatchObject({ blockType: 'megablock', pieceCount: 2, moldSize: 'Mega Mold' });
    expect(b.pieces!.map(p => p.id)).toEqual(['p1', 'p2']);
    expect(b.pieces![1].exhaustedAt).toBe('x');
    expect(setBlockPieceMap(used, 'b1', 'standard', pieces).ok).toBe(false);
  });
  it('a matrix block\'s parts are its pieces', () => {
    const m = { participants: [{ specimenId: 's2', positionInBlock: 2 }, { specimenId: 's1', positionInBlock: 1, tissueType: 'core' }] } as unknown as MatrixBlock;
    expect(piecesOf(m, [{ id: 's1', label: 'A' }, { id: 's2', label: 'B' }]).map(p => `${p.position}${p.partLabel}`)).toEqual(['1A', '2B']);
  });
});

describe('partial exhaustion (spec §11.5)', () => {
  it('marks a piece used up; the last one makes the block Exhausted', () => {
    const first = markPieceExhausted(specimen({ blockType: 'multi_piece', pieces }), 'b1', 'p1', actor);
    expect(first.ok && first.blockExhausted).toBe(false);
    const sp = (first as { specimen: Specimen }).specimen;
    expect(markPieceExhausted(sp, 'b1', 'p1', actor).ok).toBe(false);
    const second = markPieceExhausted(sp, 'b1', 'p2', actor);
    expect(second.ok && second.blockExhausted).toBe(true);
    expect((second as { specimen: Specimen }).specimen.blocks![0].status).toBe('Exhausted');
  });
  it('an order for used-up pieces is on exhausted tissue; mixing used and remaining pieces is refused', () => {
    const block = { status: 'Embedded', pieces: [{ ...pieces[0], exhaustedAt: 'x' }, pieces[1]] } as unknown as HistologyBlock;
    expect(onExhaustedTissue(block, ['p1'])).toBe(true);
    expect(onExhaustedTissue(block, ['p2'])).toBe(false);
    expect(onExhaustedTissue(block, undefined)).toBe(false);
    expect(mixesExhaustedPieces(block, ['p1', 'p2'])).toBe(true);
    expect(mixesExhaustedPieces(block, undefined)).toBe(false);
  });
  it('the alternatives include another piece of the block that remains', () => {
    const sp = specimen({ blockType: 'multi_piece', pieces: [{ ...pieces[0], exhaustedAt: 'x' }, pieces[1]] });
    expect(whatRemains(sp, 'b1')!.otherPieces.map(p => p.id)).toEqual(['p2']);
    const checks = checkExhaustedLines(sp, 'b1', [{ orderKind: 'recut' }, { orderKind: 'recut' }], { reason: 'r', lines: { 0: { kind: 'otherPiece', pieceId: 'p2' }, 1: { kind: 'otherPiece', pieceId: 'p1' } } });
    expect(checks.map(c => (c.ok ? 'ok' : c.problem))).toEqual(['ok', 'pieceUnusable']);
  });
  it('an order waiting for re-embedding of a used-up piece holds the block; re-embedding restores the piece', () => {
    const sp = specimen({ blockType: 'multi_piece', pieces: [{ ...pieces[0], exhaustedAt: 'x' }, pieces[1]] });
    const r = createAddOnOrder(sp, 'b1', 'S26-1', [{ stainType: he, orderKind: 'recut' }], submission, actor, { holdForReembed: { note: 'n' }, pieceIds: ['p1'] });
    const held = (r as { specimen: Specimen }).specimen;
    expect(cuttingBlockedByExhaustion(held.blocks![0])).toBe(true);
    const done = completeReembed(held, 'b1', actor, undefined);
    const b = (done as { specimen: Specimen }).specimen.blocks![0];
    expect(b.pieces!.find(p => p.id === 'p1')!.exhaustedAt).toBeUndefined();
    expect(cuttingBlockedByExhaustion(b)).toBe(false);
  });
});

describe('orders: level ranges, slide size, pieces (spec §11.3, §11.4)', () => {
  it('a level range makes one slide per slide-full of levels', () => {
    expect(expandLevelRanges([{ stainType: he, orderKind: 'recut', levelCount: 3, levelsPerSlide: 2 }]).map(l => l.slideLevels)).toEqual([2, 1]);
    expect(buildAddOnLines({ orderKind: 'recut', stain: he, stainTypes: [he], levelDepth: '4', controlMode: 'none', levelCount: '3', levelsPerSlide: '2' })[0])
      .toMatchObject({ levelCount: 3, levelsPerSlide: 2 });
  });
  it('slides record their levels, the megablock\'s size and the pieces ordered for', () => {
    const r = createAddOnOrder(specimen({ blockType: 'megablock', pieces }), 'b1', 'S26-1', [{ stainType: he, orderKind: 'recut', levelCount: 3, levelsPerSlide: 2 }], submission, actor, { pieceIds: ['p2'] });
    const slides = (r as { specimen: Specimen }).specimen.blocks![0].stains;
    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({ levelCount: 2, sectionCount: 2, slideSize: 'large_format', pieceIds: ['p2'], displayId: 'S26-1-A1-L1' });
    expect(slides[1].levelCount).toBeUndefined();
    const plain = createAddOnOrder(specimen(), 'b1', 'S26-1', [{ stainType: he, orderKind: 'recut' }], submission, actor);
    expect((plain as { specimen: Specimen }).specimen.blocks![0].stains[0].slideSize).toBeUndefined();
  });
});

describe('Batch 732 review fixes', () => {
  it('on an exhausted block a slide still to be cut is held until answered; a cut slide is not', () => {
    const block = { status: 'Exhausted', stains: [
      { id: 'a', stainName: 'ER', status: 'Pending Cut' }, { id: 'b', stainName: 'PR', status: 'Pending Cut', exception: { status: 'approved_destructive_cut' } },
      { id: 'c', stainName: 'H&E', status: 'Cut & Placed' }, { id: 'd', stainName: 'X', status: 'Cancelled' },
    ] } as unknown as HistologyBlock;
    expect(stainCuttingBlocked(block, block.stains[0])).toBe(true);
    expect(stainCuttingBlocked(block, block.stains[1])).toBe(false);
    expect(stainCuttingBlocked(block, block.stains[2])).toBe(false);
    expect(stainCuttingBlocked({ ...block, status: 'Embedded' }, block.stains[0])).toBe(false);
    expect(exhaustionFlagTarget(block)?.id).toBe('a');
    expect(exhaustionFlagTarget({ stains: [block.stains[2], block.stains[3]] } as unknown as HistologyBlock)).toBeUndefined();
  });
  it('a checked-out or sent-out unstained slide is not offered', () => {
    const block = { stains: [
      { id: 'u1', stainName: 'Unstained', status: 'Cut & Placed' }, { id: 'u2', stainName: 'Unstained', status: 'Cut & Placed', distributionStatus: 'Checked Out' },
      { id: 'u3', stainName: 'Unstained', status: 'Cut & Placed', sendOutReferenceLabFacilityId: 'lab' }, { id: 'u4', stainName: 'Unstained', status: 'QC Failed' },
    ] } as unknown as HistologyBlock;
    expect(unstainedSlidesOf(block).map(s => s.id)).toEqual(['u1']);
  });
  it('a used-up or ordered piece cannot be removed; slides already cut keep their size when the type changes', () => {
    const block = { pieces: [{ ...pieces[0], exhaustedAt: 'x' }, pieces[1]], stains: [{ id: 's', status: 'Pending Cut', pieceIds: ['p2'] }] } as unknown as HistologyBlock;
    expect(pieceRemovalProblems(block, [pieces[1]])).toEqual(['pieceInUse']);
    expect(pieceRemovalProblems(block, [{ id: 'p1' }])).toEqual(['pieceInUse']);
    expect(pieceRemovalProblems(block, pieces)).toEqual([]);
    const sp = specimen({ blockType: 'megablock', stains: [{ id: 'cut', stainName: 'H&E', status: 'Cut & Placed' } as never, { id: 'todo', stainName: 'H&E', status: 'Pending Cut' } as never] });
    const r = setBlockPieceMap(sp, 'b1', 'standard', []);
    const st = (r as { specimen: Specimen }).specimen.blocks![0].stains;
    expect(st.find(s => s.id === 'cut')?.slideSize).toBe('large_format');
    expect(st.find(s => s.id === 'todo')?.slideSize).toBeUndefined();
  });
});
