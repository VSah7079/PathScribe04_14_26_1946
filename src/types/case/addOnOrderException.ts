// src/types/case/addOnOrderException.ts
// Moved out of Specimen.ts in Batch 732 (CLAUDE.md rule 10: that file is over 1,000 lines and may not grow), unchanged.
// Re-exported from Specimen.ts, so every import keeps working.
import type { BlockStatus } from './Specimen';

/** See StainOrder.exception's own doc comment (PS-287). */
export interface AddOnOrderException {
  reason: 'Block exhausted' | 'Insufficient tissue for panel' | 'Requires re-grossing';
  note?: string;
  /** Batch 736: the code of the bench reason picked for the flag (Reason Dictionary id), so reports count it the same
   *  way after a lab rewords it. Absent when only a note was typed. */
  reasonCode?: string;
  flaggedBy: string;
  flaggedByName: string;
  flaggedAt: string;
  /** 'pending_pathologist_review' the moment a tech flags it — the
   *  real trigger for the spec's own "Pathologist Notification Loop."
   *  The next three are the loop's responses (cancel/modify/approve destructive cutting); Batch 731 (spec §10.6)
   *  adds the alternatives (used_unstained, moved_to_other_block, reembed_requested → reembedded). */
  status: 'pending_pathologist_review' | 'approved_destructive_cut' | 'modified' | 'cancelled' | 'used_unstained' | 'moved_to_other_block' | 'reembed_requested' | 'reembedded';
  pathologistResponseBy?: string;
  pathologistResponseByName?: string;
  pathologistResponseAt?: string;
  responseNote?: string;
  /** Batch 736: the code of the bench reason the pathologist picked when answering. */
  responseReasonCode?: string;
  /** Batch 610 (#16): the block's status when 'Block exhausted' was flagged, so a Cancel or Modify answer puts it back. */
  blockStatusBefore?: BlockStatus;
}

/** See StainOrder.exceptionEvents's own doc comment (PS-287). */
export interface AddOnOrderExceptionEvent {
  id: string;
  action: 'flagged' | 'approved_destructive_cut' | 'cancelled' | 'modified' | 'used_unstained' | 'moved_to_other_block' | 'reembed_requested' | 'reembedded';
  timestamp: string;
  actorId: string;
  actorName: string;
  detail: string;
}
