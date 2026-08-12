// src/types/config/CaseMaskConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Per-organisation accession number mask configuration — replaces the
// temporary global O26-NNNN max+1 scheme in AccessionPage.tsx's
// generateNextCaseId(). See the design discussion this came out of:
//
//   - Scoped by organisationId (not clientId) — accession numbers belong
//     to the accessioning lab, not the ordering client. One organisation
//     (e.g. MFT) serves many referring clients under one continuous
//     numbering sequence, matching standard CAP/CLIA practice.
//   - sitePrefixMap is optional and only feeds the {SITE} token — an
//     organisation with multiple physical sites (MFT has three: MRI, WYT,
//     NMGH) can still run ONE shared sequence across all of them while
//     having the mask surface which site each number came from, or can
//     leave it unset and just use {PREFIX}.
//   - No {SPECIMEN_TYPE} token — a case can hold multiple specimens of
//     different types (see O26-0024's lung + lymph-node specimens under
//     one case number), so a single specimen-type token has no sensible
//     value at the case level. Numbering stays case-level; specimens are
//     sub-indexed off the case id exactly as they already are today
//     (`${caseId}-SP-${label}`), not part of this mask.
// ─────────────────────────────────────────────────────────────────────────────

/** Supported mask template tokens. {SEQ:N} is the only parameterized one —
 *  N is the zero-padded digit count, e.g. {SEQ:4} -> "0029". */
export type CaseMaskToken = '{PREFIX}' | '{SITE}' | '{YEAR:4}' | '{YEAR:2}';

export interface CaseMaskConfig {
  /** Matches Organisation.id (e.g. 'ORG-MFT') — also the Firestore
   *  document id in /caseRegistries/{organisationId}, so this field is
   *  slightly redundant with the doc's own key, kept for readability when
   *  the record is viewed standalone (exports, admin tooling). */
  organisationId: string;
  /** e.g. 'MFT', 'DVMC' — feeds the {PREFIX} token. Defaults to the
   *  Organisation's own shortName when a config is first provisioned. */
  prefix: string;
  /** Optional site shortName -> mask-prefix override, only consulted when
   *  the mask pattern actually uses {SITE} and a siteId is passed to
   *  allocateNextCaseNumber. e.g. { 'SITE-MRI': 'MRI', 'SITE-WYT': 'WYT',
   *  'SITE-NMGH': 'NMGH' }. Keyed by Site.id, not Site.siteCode — siteCode
   *  is shared across an org's sites today (see organisationService.ts),
   *  which is exactly the ambiguity this map exists to let an org resolve
   *  per-site if they want to, without being forced to. */
  sitePrefixMap?: Record<string, string>;
  /** e.g. "{PREFIX}-{YEAR:4}-{SEQ:6}" -> "MFT-2026-000029",
   *  or "{PREFIX}{YEAR:2}-{SEQ:4}" -> "MFT26-0029" (matches the existing
   *  O26-NNNN shape most closely, swapping O for the real org prefix). */
  maskPattern: string;
  /** The digit count for the {SEQ:N} portion of maskPattern — kept as its
   *  own field (not re-parsed out of maskPattern every allocation) since
   *  the sequence-registry document itself needs to know how to format
   *  the number it's counting, independent of the rest of the pattern. */
  sequenceDigits: number;
  /** Last sequence number actually issued — allocateNextCaseNumber reads
   *  this, increments, and writes it back inside the same transaction. */
  currentSequence: number;
  resetSequenceAnnually: boolean;
  /** Set whenever the sequence was last reset — allocateNextCaseNumber
   *  compares this against the current year to decide whether a reset is
   *  due, rather than relying on any wall-clock side channel. */
  lastResetYear?: number;
  updatedBy: string;
  updatedAt: string;
}

/** The fallback shape used when no CaseMaskConfig exists yet for an
 *  organisation — mirrors today's O26-NNNN scheme exactly (prefix 'O',
 *  2-digit year, 4-digit sequence), so an unconfigured organisation keeps
 *  working exactly as it does today rather than failing. See
 *  allocateNextCaseNumber's fallback path. */
export const DEFAULT_FALLBACK_MASK = '{PREFIX}{YEAR:2}-{SEQ:4}';
export const DEFAULT_FALLBACK_PREFIX = 'O';
export const DEFAULT_FALLBACK_SEQUENCE_DIGITS = 4;
