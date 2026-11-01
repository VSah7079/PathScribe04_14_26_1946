// src/utils/embeddingMatrixView.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §11.6): the Embedding Station accepts a
// matrix block (a cassette shared by several specimens, Case.matrixBlocks[])
// as well as an ordinary one. Same approach as the Microtome since Batch 460: the
// matrix block is worked through a one-block specimen view, so every embedding
// operation (embeddingOperations.ts) applies to it unchanged, and the result is
// written back to Case.matrixBlocks. Before, the station refused it with "not
// supported here" (observed: S26-4404-M1 refused while S26-4403-A1 was accepted).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { HistologyBlock, Specimen } from '@/types/case/Specimen';
import { matrixBlockAsSpecimenView, MATRIX_VIEW_SPECIMEN_ID } from './microtomyOperations';

/** The block fields the Embedding Station reads or changes, kept on the matrix block too. */
export const EMBEDDING_MATRIX_FIELDS = [
  'status', 'pieceCount', 'pieceDescription', 'pieceCountAtEmbedding', 'isEntirelySubmitted',
  'moldSize', 'orientationInstructions', 'lastDiscrepancyReason', 'lastDiscrepancyReportedBy', 'lastDiscrepancyReportedAt',
  'lastCassetteReprintReason', 'lastCassetteReprintOrderedBy', 'lastCassetteReprintOrderedAt', 'cassetteReprintCount', 'comments', 'tinyTissue', 'fragile', 'requiresDecal',
] as const;

type Fields = Record<string, unknown>;

/** The matrix block as a one-block specimen the embedding operations can work on. */
export function matrixBlockAsEmbeddingView(matrixBlock: MatrixBlock): Specimen {
  const base = matrixBlockAsSpecimenView(matrixBlock);
  const source = matrixBlock as unknown as Fields;
  const block = { ...(base.blocks ?? [])[0] } as unknown as Fields;
  for (const f of EMBEDDING_MATRIX_FIELDS) if (source[f] !== undefined) block[f] = source[f];
  return { ...base, blocks: [block as unknown as HistologyBlock] } as Specimen;
}

/** The matrix block as changed through its view (only the embedding fields; its slides and participants stay). */
export function matrixBlockFromEmbeddingView(matrixBlock: MatrixBlock, view: Specimen): MatrixBlock {
  const block = (view.blocks ?? [])[0] as unknown as Fields | undefined;
  if (!block) return matrixBlock;
  const out = { ...matrixBlock } as unknown as Fields;
  for (const f of EMBEDDING_MATRIX_FIELDS) {
    if (block[f] === undefined) delete out[f];
    else out[f] = block[f];
  }
  return out as unknown as MatrixBlock;
}

/** The case's matrix blocks with one replaced by its changed view; null when the matrix block is gone. */
export function matrixBlocksWithEmbeddingView(caseData: Pick<Case, 'matrixBlocks'>, matrixBlockId: string, view: Specimen): MatrixBlock[] | null {
  const list = caseData.matrixBlocks ?? [];
  if (!list.some(m => m.id === matrixBlockId)) return null;
  return list.map(m => (m.id === matrixBlockId ? matrixBlockFromEmbeddingView(m, view) : m));
}

/** Whether a specimen is the view of a matrix block (its label is empty; the page shows the matrix label instead). */
export const isEmbeddingMatrixView = (specimen: Pick<Specimen, 'id'>): boolean => specimen.id === MATRIX_VIEW_SPECIMEN_ID;
