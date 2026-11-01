// src/utils/blockPieceRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 732 (Lab Workflow & Batch spec §11): block types, piece maps, slide size
// and partial exhaustion. Pure.
//   • BLOCK_TYPE_PROFILES: what a block type sets (cassette size, mold, slide
//     size, the label templates the interface engine is asked for, §11.7).
//   • piecesOf: one piece map for a HistologyBlock (its own pieces) and a
//     MatrixBlock (its participants, one per part).
//   • slideSizeOf: a slide's own size, else its block type's.
//   • pieceMapProblems / setBlockPieceMap / markPieceExhausted: the grossing
//     piece map and the Microtome's "piece exhausted". When the last piece is
//     used up the block itself is Exhausted.
//   • targetedPieces / onExhaustedTissue: an order for pieces that are all used up
//     is treated like an order on an exhausted block (spec §10.6, per piece).
//   • slideFitsHardware: a large-format slide needs a rack, stainer or scanner
//     marked as taking large-format slides.
// ─────────────────────────────────────────────────────────────────────────────
import type { HistologyBlock, Specimen, EmbeddingMoldSize } from '@/types/case/Specimen';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { Case } from '@/types/case/Case';
import { BLOCK_TYPES, type BlockPiece, type BlockType, type SlideSize } from '@/types/case/blockPieces';
import { isExhausted } from './blockExceptionStates';

export interface BlockTypeProfile {
  cassette: 'standard' | 'mega';
  mold?: EmbeddingMoldSize;
  slideSize: SlideSize;
  /** The label templates PathScribe names in the print payload; the printer (through the interface engine) holds them. */
  cassetteTemplate: string;
  slideTemplate: string;
}

export const BLOCK_TYPE_PROFILES: Readonly<Record<BlockType, BlockTypeProfile>> = {
  standard: { cassette: 'standard', slideSize: 'standard', cassetteTemplate: 'ZPL-CASSETTE-V3', slideTemplate: 'ZPL-SLIDE-V1' },
  megablock: { cassette: 'mega', mold: 'Mega Mold', slideSize: 'large_format', cassetteTemplate: 'ZPL-CASSETTE-MEGA-V1', slideTemplate: 'ZPL-SLIDE-LF-V1' },
  multi_piece: { cassette: 'standard', slideSize: 'standard', cassetteTemplate: 'ZPL-CASSETTE-V3', slideTemplate: 'ZPL-SLIDE-V1' },
  matrix: { cassette: 'standard', slideSize: 'standard', cassetteTemplate: 'ZPL-CASSETTE-V3', slideTemplate: 'ZPL-SLIDE-V1' },
};

export const SLIDE_TEMPLATE_BY_SIZE: Readonly<Record<SlideSize, string>> = { standard: 'ZPL-SLIDE-V1', large_format: 'ZPL-SLIDE-LF-V1' };

/** A block's type: a matrix block is 'matrix'; a block with no type set is standard. */
export function blockTypeOf(block: Pick<HistologyBlock, 'blockType'> | MatrixBlock | null | undefined, isMatrix = false): BlockType {
  if (isMatrix || (block && 'participants' in block)) return 'matrix';
  return (block as Pick<HistologyBlock, 'blockType'> | null | undefined)?.blockType ?? 'standard';
}

/** A slide's size: its own, else the one its block type produces. */
export function slideSizeOf(slide: { slideSize?: SlideSize }, blockType: BlockType): SlideSize {
  return slide.slideSize ?? BLOCK_TYPE_PROFILES[blockType].slideSize;
}

/** The piece map, in position order: a block's own pieces; a matrix block's participants (one piece per part). */
export function piecesOf(block: Pick<HistologyBlock, 'pieces'> | MatrixBlock, specimens: readonly Pick<Specimen, 'id' | 'label'>[] = []): BlockPiece[] {
  if ('participants' in block) {
    return [...block.participants].sort((a, b) => a.positionInBlock - b.positionInBlock).map(p => ({
      id: p.specimenId, position: p.positionInBlock, partLabel: specimens.find(sp => sp.id === p.specimenId)?.label ?? '',
      description: p.tissueType, orientation: p.orientation, ink: p.ink, exhaustedAt: p.exhaustedAt, exhaustedByName: p.exhaustedByName,
    }));
  }
  return [...(block.pieces ?? [])].sort((a, b) => a.position - b.position);
}

export type PieceMapProblem = 'typeUnknown' | 'positionInvalid' | 'positionRepeated' | 'partMissing' | 'piecesNeedMultiPiece' | 'pieceInUse';

/** What is wrong with a block type and piece map before it is saved (empty: it can be saved). */
export function pieceMapProblems(blockType: string, pieces: readonly Pick<BlockPiece, 'position' | 'partLabel'>[]): PieceMapProblem[] {
  const out: PieceMapProblem[] = [];
  if (!(BLOCK_TYPES as readonly string[]).includes(blockType)) out.push('typeUnknown');
  if (pieces.some(p => !Number.isInteger(p.position) || p.position < 1)) out.push('positionInvalid');
  if (new Set(pieces.map(p => p.position)).size !== pieces.length) out.push('positionRepeated');
  if (pieces.some(p => !p.partLabel.trim())) out.push('partMissing');
  if (pieces.length > 1 && blockType !== 'multi_piece' && blockType !== 'megablock') out.push('piecesNeedMultiPiece');
  return out;
}

/** A piece that is used up, or that an order names, cannot be removed from the map (the record would point at
 *  nothing). */
export function pieceRemovalProblems(block: Pick<HistologyBlock, 'pieces' | 'stains'>, pieces: readonly Pick<BlockPiece, 'id'>[]): PieceMapProblem[] {
  const kept = new Set(pieces.map(p => p.id));
  const named = new Set((block.stains ?? []).filter(s => s.status !== 'Cancelled').flatMap(s => s.pieceIds ?? []));
  return (block.pieces ?? []).some(p => !kept.has(p.id) && (p.exhaustedAt || named.has(p.id))) ? ['pieceInUse'] : [];
}

type OpResult = { ok: true; specimen: Specimen } | { ok: false; error: string };

/** Sets a block's type and piece map (grossing). Pieces already used up stay used up. */
export function setBlockPieceMap(specimen: Specimen, blockId: string, blockType: Exclude<BlockType, 'matrix'>, pieces: readonly BlockPiece[]): OpResult {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  if (pieceMapProblems(blockType, pieces).length > 0 || pieceRemovalProblems(block, pieces).length > 0) return { ok: false, error: 'Piece map is not valid.' };
  // Slides already cut keep the size they were cut at when the type changes the size the block produces.
  const before0 = BLOCK_TYPE_PROFILES[blockTypeOf(block)].slideSize;
  const keepSize = before0 !== BLOCK_TYPE_PROFILES[blockType].slideSize;
  const before = new Map((block.pieces ?? []).map(p => [p.id, p]));
  const next = [...pieces].sort((a, b) => a.position - b.position).map(p => {
    const old = before.get(p.id);
    return { ...p, partLabel: p.partLabel.trim(), ...(old?.exhaustedAt ? { exhaustedAt: old.exhaustedAt, exhaustedByName: old.exhaustedByName } : {}) };
  });
  const blocks = (specimen.blocks ?? []).map(b => (b.id !== blockId ? b : {
    ...b, blockType, pieces: next, ...(next.length > 0 ? { pieceCount: next.length } : {}),
    ...(keepSize ? { stains: b.stains.map(s => (s.status !== 'Pending Cut' && !s.slideSize ? { ...s, slideSize: before0 } : s)) } : {}),
    ...(BLOCK_TYPE_PROFILES[blockType].mold && !b.moldSize ? { moldSize: BLOCK_TYPE_PROFILES[blockType].mold } : {}),
    userModified: true,
  }));
  return { ok: true, specimen: { ...specimen, blocks } };
}

/** The Microtome's "piece exhausted": the piece is used up; when it was the last one left, the block is Exhausted. */
export function markPieceExhausted(specimen: Specimen, blockId: string, pieceId: string, actor: { name: string }): OpResult & { blockExhausted?: boolean } {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  const piece = block?.pieces?.find(p => p.id === pieceId);
  if (!block || !piece) return { ok: false, error: 'Piece not found.' };
  if (piece.exhaustedAt) return { ok: false, error: 'Piece already exhausted.' };
  const now = new Date().toISOString();
  const pieces = (block.pieces ?? []).map(p => (p.id !== pieceId ? p : { ...p, exhaustedAt: now, exhaustedByName: actor.name }));
  const allUsed = pieces.every(p => p.exhaustedAt);
  const blocks = (specimen.blocks ?? []).map(b => (b.id !== blockId ? b : { ...b, pieces, ...(allUsed ? { status: 'Exhausted' as const } : {}), userModified: true }));
  return { ok: true, specimen: { ...specimen, blocks }, blockExhausted: allUsed };
}

/** The pieces an order is for (none chosen: the whole block). */
export function targetedPieces(block: Pick<HistologyBlock, 'pieces'>, pieceIds: readonly string[] | undefined): BlockPiece[] {
  const all = piecesOf(block);
  return pieceIds && pieceIds.length > 0 ? all.filter(p => pieceIds.includes(p.id)) : all;
}

/** Whether an order for these pieces lands on tissue that is used up: the block is exhausted, or every piece chosen is
 *  (spec §11.5: the exhausted warning is per block and, where known, per piece). */
export function onExhaustedTissue(block: Pick<HistologyBlock, 'status' | 'pieces'>, pieceIds: readonly string[] | undefined): boolean {
  if (isExhausted(block)) return true;
  const chosen = targetedPieces(block, pieceIds);
  return chosen.length > 0 && chosen.every(p => p.exhaustedAt);
}

/** An order for some used-up pieces and some remaining ones is refused: choose the remaining pieces, or only the
 *  used-up ones to get the exhausted-block alternatives. */
export function mixesExhaustedPieces(block: Pick<HistologyBlock, 'pieces'>, pieceIds: readonly string[] | undefined): boolean {
  const chosen = targetedPieces(block, pieceIds);
  return chosen.some(p => p.exhaustedAt) && chosen.some(p => !p.exhaustedAt) && !!pieceIds && pieceIds.length > 0;
}

/** The pieces still holding tissue. */
export function remainingPieces(block: Pick<HistologyBlock, 'pieces'>): BlockPiece[] {
  return piecesOf(block).filter(p => !p.exhaustedAt);
}

/** A large-format slide needs hardware marked as taking large-format slides; a standard slide fits anything. */
export function slideFitsHardware(size: SlideSize, hardware: { supportsLargeFormat?: boolean } | null | undefined): boolean {
  return size === 'standard' || !!hardware?.supportsLargeFormat;
}

/** Batch 737 (spec §11.1): the size of a slide scanned in, found on the case by its printed id (a matrix slide is
 *  standard unless its own size says otherwise); null when the scan is not a slide. */
export function slideSizeOnScan(
  caseData: Pick<Case, 'specimens' | 'matrixBlocks'>,
  target: { level: string; matrixBlockId?: string },
  displayId: string,
): SlideSize | null {
  const want = displayId.toUpperCase();
  if (target.level === 'slide') {
    for (const sp of caseData.specimens ?? []) for (const b of sp.blocks ?? []) {
      const st = b.stains.find(s => (s.displayId ?? '').toUpperCase() === want);
      if (st) return slideSizeOf(st, blockTypeOf(b));
    }
    return 'standard';
  }
  if (target.level === 'matrix_slide') {
    const st = (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId)?.slides?.find(s => (s.displayId ?? '').toUpperCase() === want);
    return st ? slideSizeOf(st, 'matrix') : 'standard';
  }
  return null;
}

/** Batch 737 (spec §11.1): a large-format slide only goes into a staining carrier that takes large-format slides. */
export function slideFitsCarrier(size: SlideSize | null, carrier: { processingNode: string; largeFormat?: boolean }): boolean {
  if (size !== 'large_format') return true;
  return carrier.processingNode !== 'Staining' || !!carrier.largeFormat;
}
