// src/types/case/Specimen.ts
// ─────────────────────────────────────────────────────────────────────────────
// Clinical-grade specimen model.
// Aligned with:
//   • FHIR Specimen
//   • LIS specimen workflows
//   • CAP synoptic reporting
//   • PathScribe flag + reporting workflows
// ─────────────────────────────────────────────────────────────────────────────
import { SpecimenFlag } from "./SpecimenFlag";
import { CaseComment } from "./CaseComment";
import type { CasePriority } from "@/services/cases/ICaseService";

export interface SpecimenCollection {
  collectedAt?: string;
  collectedBy?: string;
  method?: string;
  bodySite?: string;
  laterality?: string;
}
export interface SpecimenProcessing {
  fixative?: string;
  processingDescription?: string;
  /** When fixative was added — the end of the cold ischemia window
   *  (collection → fixation), tracked per CAP/ASCO biomarker guidance. */
  processedAt?: string;
  /**
   * True when processedAt is a professional estimate, not a directly
   * documented time — e.g. the surgical suite failed to record it, and
   * the accessioner/pathologist provided their best estimate rather than
   * leaving it blank. Distinct from simply omitting processedAt: this is
   * a deliberate, permanent flag on the value itself, so anywhere this
   * time is later displayed (report, audit record) it stays visibly
   * marked as approximate rather than silently presented as a verified
   * fact. Must remain attached to the value everywhere it's shown, not
   * just noted once in the deficiency resolution log that led to it.
   */
  processedAtIsEstimated?: boolean;
}
export interface SpecimenContainer {
  type?: string;
  identifier?: string;
  description?: string;
}

// ── Histology Blocks & Stains — minimal demo model ─────────────────────────
// See Specimen.blocks's own doc comment for full scope reasoning. Status
// unions are fixed (not a runtime-configurable dictionary) — deliberate,
// same reasoning as CasePriority: these are settled clinical vocabularies,
// not something that benefits from being database-driven.

export type BlockStatus = 'Pending' | 'Grossed' | 'Embedded' | 'Exhausted';
export type StainOrderStatus =
  | 'Pending Cut' | 'Cut & Placed' | 'Staining' | 'Coverslipped'
  | 'Ready for Review' | 'Recut Requested' | 'QC Failed';

export interface StainOrder {
  id: string;
  /** Display name only for this pass — e.g. "H&E", "ER" — not yet a real
   *  foreign key into the Stain Dictionary (stainTypeId), since resolving
   *  that requires the specimen's defaultStains (plain name strings) to
   *  be matched back to real StainType records, which the dictionary
   *  doesn't yet expose a lookup-by-name helper for. Flagged as real
   *  follow-up work, not done here for time. */
  stainName: string;
  status: StainOrderStatus;
}

export interface HistologyBlock {
  id: string;
  /** Block letter — "A", "B", "C"... sequential per specimen. */
  label: string;
  status: BlockStatus;
  stains: StainOrder[];
  /**
   * Which processing pathway this block came from, if generated from a
   * multi-pathway Protocol (services/protocols/IProtocolService.ts) —
   * e.g. "Light Microscopy", "Immunofluorescence". Undefined for
   * blocks generated the old way (single block, defaultStains/H&E
   * fallback) — most specimen types still work exactly that way; this
   * only populates for the specimen types that actually have a
   * multi-pathway protocol configured.
   */
  sourcePathwayName?: string;
  /** Carried over from the pathway for display/downstream use — e.g.
   *  "10% Neutral Buffered Formalin" vs. "Michel's Transport Medium".
   *  Same undefined-unless-protocol-generated reasoning as above. */
  fixativeType?: string;
  processingFormat?: string;
  requiresDecal?: boolean;
  /**
   * Optional per-block priority override. Undefined means "inherit
   * the case's own priority" — this is the default and correct state
   * for the overwhelming majority of blocks. Only set this when
   * someone has deliberately decided one specific block needs
   * different urgency than the rest of the case (e.g. a frozen
   * section or a single EM block needing to move faster than a
   * routine H&E on the same case) — set, it takes precedence over
   * Case.priority for that one block only; nothing else on the case
   * is affected.
   */
  priority?: CasePriority;
}

/**
 * LIS synchronisation status — only meaningful for LIS mode (S26-) cases.
 *
 * lis_owned      — received from LIS, no local changes (no badge shown)
 * pending_sync   — added or edited in PathScribe, not yet transmitted to LIS
 * sync_sent      — transmitted to LIS, awaiting ACK
 * sync_rejected  — LIS rejected the update, needs attention
 * local_only     — Orchestration (O26-) case; specimen transmitted as part of
 *                  outbound result message at finalisation — no separate sync
 */
export type SpecimenLisStatus =
  | 'lis_owned'
  | 'pending_sync'
  | 'sync_sent'
  | 'sync_rejected'
  | 'local_only';

export interface Specimen {
  /** Internal UUID */
  id: string;
  /** Specimen letter or number (A, B, C…) */
  label: string;
  /** Human-readable description ("Left breast biopsy") */
  description: string;
  /** Full display label ("Specimen A — Left breast biopsy") */
  displayName?: string;
  /** Collection metadata (FHIR Specimen.collection) */
  collection?: SpecimenCollection;
  /** Processing metadata (fixative, processing steps) */
  processing?: SpecimenProcessing;
  /** Container metadata (jar, slide, block) */
  container?: SpecimenContainer;
  /** When the lab received the specimen */
  receivedAt?: string;
  /** When the specimen was collected (if known) */
  collectedAt?: string;
  /** Flags applied to this specimen */
  specimenFlags?: SpecimenFlag[];
  /**
   * Specimen-level comment thread — distinct from `description`. Changed
   * from a single overwritable string to a real append-only thread, same
   * reasoning and same shape as Case.caseComments (types/case/Case.ts) —
   * each entry has a real author and timestamp, nothing here is ever
   * edited or deleted once posted.
   */
  comments?: CaseComment[];
  /**
   * Confirmation that a specimen's protocol triage checklist
   * (services/protocols/IProtocolService.ts Protocol.triageChecklist)
   * was actually followed at the bench — e.g. "split the core into
   * LM/IF/EM portions." Deliberately retrospective, not a gate before
   * block creation: blocks are already auto-generated from the
   * protocol at accession time, so this confirms the physical work
   * matched what was expected, rather than blocking anything.
   */
  triageConfirmedAt?: string;
  triageConfirmedBy?: string;
  /**
   * Specimen Dictionary entry this specimen was populated from
   * (useSpecimenDictionary's SpecimenEntry.id), if any — lets later code
   * trace back to the dictionary's structured type/site/laterality/
   * procedure without re-matching on description text. Undefined for
   * specimens entered manually (no dictionary match) or seeded before
   * this field existed.
   */
  specimenDictionaryEntryId?: string;
  /**
   * Histology blocks generated for this specimen — minimal model built
   * for a same-week end-to-end demo (Accession → Grossing Template →
   * Blocks/Stains → Worklist → Synoptic → sign-out). Deliberately
   * narrow: no block-level priority, no full exception-status lifecycle,
   * no export/Vantage anything — all real follow-up work, cut here for
   * time. Auto-generated at Accession submit from the matched dictionary
   * entry's defaultStains (falling back to H&E if unset, which is most
   * entries today — defaultStains was added to the type but never
   * backfilled onto real seed data). No editing UI yet at the grossing
   * bench; this pass is read-through visibility, not editing.
   */
  blocks?: HistologyBlock[];
  /** Optional SNOMED specimen type code */
  snomedTypeCode?: string;
  /** Optional SNOMED anatomic site code */
  snomedSiteCode?: string;
  /** Whether this specimen is active (not deleted/retired) */
  active?: boolean;
  /**
   * LIS synchronisation status.
   * Undefined or 'lis_owned' = normal LIS specimen, no badge.
   * Set to 'pending_sync' when PathScribe adds or edits a specimen on an S26- case.
   * Set to 'local_only' for O26- orchestration cases (no LIS sync required).
   * Updated to 'sync_sent' / 'sync_rejected' by the LIS write-back service.
   */
  lisStatus?: SpecimenLisStatus;
  /** Audit metadata */
  createdAt?: string;
  updatedAt?: string;
}
