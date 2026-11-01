// src/services/material/pieceExhaustion.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 732 (Lab Workflow & Batch spec §11.5): partial exhaustion. At the
// Microtome the tech marks one piece of a multi-piece block as used up. Needs
// material:end-state:record (it records that tissue is gone). Audited. When it
// was the last piece left, the block itself becomes Exhausted and its end state
// "exhausted" is recorded (spec §10.5). An add-on order for used-up pieces then
// gets the exhausted-block alternatives (utils/exhaustedBlockRules.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { NewItemEndState } from '../itemEndStates/IItemEndStateService';
import { markPieceExhausted } from '@/utils/blockPieceRules';
import { resolveBlockDisplayId } from '@/utils/materialDisplayId';
import { matrixBlockAsSpecimenView } from '@/utils/microtomyOperations';
import { matrixBlockIdentifier } from '@/types/labels/LabelData';

export interface PieceExhaustionDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  saveSpecimens: (caseData: Case, specimens: Specimen[]) => Promise<void>;
  audit?: (entry: NewAuditLog) => Promise<unknown>;
  recordEndState?: (entry: NewItemEndState & { source: 'exhaustion_flag' }) => void;
}

export type PieceExhaustionResult = { ok: true; specimens: Specimen[]; blockExhausted: boolean } | { ok: false; notPermitted?: boolean; failed?: boolean };

export async function markBlockPieceExhausted(
  input: { caseData: Case; blockId: string; pieceId: string; actor: { id: string; name: string } },
  deps: PieceExhaustionDeps,
): Promise<PieceExhaustionResult> {
  const { caseData, actor } = input;
  if (!(await deps.enforce('material:end-state:record', { caseId: caseData.id })).allowed) return { ok: false, notPermitted: true };
  // Batch 737 (spec §11.5): a matrix block's part is used up the same way, through its one-block view (the piece id
  // is the part's specimen id); the caller saves the view back onto Case.matrixBlocks.
  const matrix = (caseData.matrixBlocks ?? []).find(m => m.id === input.blockId);
  const specimen = matrix ? matrixBlockAsSpecimenView(matrix) : (caseData.specimens ?? []).find(sp => (sp.blocks ?? []).some(b => b.id === input.blockId));
  if (!specimen) return { ok: false, failed: true };
  const result = markPieceExhausted(specimen, input.blockId, input.pieceId, actor);
  if (!result.ok) return { ok: false, failed: true };
  const specimens = matrix ? (caseData.specimens ?? []) : (caseData.specimens ?? []).map(sp => (sp.id === specimen.id ? result.specimen : sp));
  await deps.saveSpecimens(caseData, specimens);
  const block = (specimen.blocks ?? []).find(b => b.id === input.blockId)!;
  const piece = block.pieces?.find(p => p.id === input.pieceId);
  const partLabel = matrix ? (caseData.specimens ?? []).find(sp => sp.id === input.pieceId)?.label : piece?.partLabel;
  const acc = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  const blockItemId = matrix ? matrixBlockIdentifier(acc, matrix.label) : resolveBlockDisplayId(acc, specimen.label, block);
  void deps.audit?.({
    type: 'user', event: 'Block Piece Exhausted', user: actor.name, caseId: acc, confidence: null,
    detail: `${blockItemId} piece ${piece?.position ?? '?'} (part ${partLabel ?? '?'}) used up${result.blockExhausted ? '; no pieces remain, block marked Exhausted' : ''}`,
  })?.catch(() => undefined);
  if (result.blockExhausted) {
    deps.recordEndState?.({
      itemId: blockItemId, materialType: matrix ? 'matrix_block' : 'block', caseAccession: acc, state: 'exhausted', reason: 'Every piece of the block used up at the Microtome',
      userId: actor.id, userName: actor.name, source: 'exhaustion_flag',
    });
  }
  return { ok: true, specimens, blockExhausted: !!result.blockExhausted };
}
