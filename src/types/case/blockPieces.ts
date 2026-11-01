// src/types/case/blockPieces.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 732 (Lab Workflow & Batch spec §11, Pete Oct 29, 2026): megablocks and
// multi-piece blocks.
//   • Block type: standard, megablock, multi-piece (a block of one part holding
//     several pieces), and matrix (a MatrixBlock: several parts in one cassette,
//     types/case/MatrixBlock.ts). The type sets the cassette size, the mold, the
//     label templates and the size of the slides it produces
//     (utils/blockPieceRules.ts, BLOCK_TYPE_PROFILES).
//   • Slide size is an attribute of the slide (standard, large format). It drives
//     the slide label template, rack and stainer compatibility and the slide
//     scanner choice.
//   • Piece map: a multi-piece block holds an ordered list of pieces, each linked
//     to the specimen part it came from, with an optional description,
//     orientation or ink and its position. The block keeps one barcode and one
//     item id; the pieces are data on it, not separately tracked items. A piece
//     can be used up while others remain (partial exhaustion, §11.5).
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCK_TYPES = ['standard', 'megablock', 'multi_piece'] as const;
/** A HistologyBlock's type. A MatrixBlock is always 'matrix'. */
export type BlockType = typeof BLOCK_TYPES[number] | 'matrix';

export const SLIDE_SIZES = ['standard', 'large_format'] as const;
export type SlideSize = typeof SLIDE_SIZES[number];

export interface BlockPiece {
  id: string;
  /** Position in the block (1, 2, 3…), as on the gross description's block key. */
  position: number;
  /** The specimen part it came from (A, B…). */
  partLabel: string;
  description?: string;
  orientation?: string;
  ink?: string;
  /** Set when the piece is used up (partial exhaustion, spec §11.5). */
  exhaustedAt?: string;
  exhaustedByName?: string;
}
