// src/services/historyExtraction/historyExtraction.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 621 (Pete, Oct 19 2026: "when a historical case gets pulled, we read its Microscopic/Final Diagnosis and run it through
// the existing capability, but it gets saved as metadata, not for output, just for the Pathologist to look at").
//
// THE TYPES AND PURE RULES for AI extraction of a historical report's synoptic fields.
//
//   ADVISORY ONLY. What is extracted is metadata beside a historical case, labelled "AI-extracted, not verified". No report,
//   print, registry feed, billing rule, rule engine or export reads it (services/historyExtraction/advisoryOnly.guard.test.ts
//   fails the build if any module outside the extraction and display code imports it).
//   OFF by default, for the enterprise, with a performing-facility override (the delivery-schedules pattern).
//   No patient text is stored here beyond a hash of the source text; the extracted field values are the pathologist's
//   to look at and are shown tagged data-phi.
// Contract: docs/architecture/HISTORY_AI_EXTRACTION_API.md. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { ID } from '../types';

/** The fixed label every extraction carries (shown with the locale text historyExtraction.aiLabel). */
export const HISTORY_EXTRACTION_VERIFICATION = 'ai-unverified' as const;

/** Why an extraction has no fields. Fixed codes: never a message that could echo patient text. */
export type HistoryExtractionStatus = 'extracted' | 'noText' | 'noTemplate' | 'failed';
export type HistoryExtractionFailure = 'vendorNotAllowed' | 'aiError' | 'badResponse' | 'noTemplates';

export interface ExtractedField {
  fieldId: string;
  label: string;
  /** The option id, or free text. */
  value: string;
  /** What the option or text reads as, for display. */
  display: string;
  /** 0 to 100 when the AI gave one. */
  confidence?: number;
}

/** The metadata kept beside a cached historical case. */
export interface HistoryExtraction {
  sourceCaseId: string;
  /** Hash of the source text it was made from: the cache key. Re-run only when it changes. */
  sourceTextHash: string;
  status: HistoryExtractionStatus;
  failure?: HistoryExtractionFailure;
  templateId?: string;
  templateName?: string;
  /** The version of the template it was matched against (a guess: the template in use now, not the one the report was signed on). */
  templateVersion?: string;
  templateConfidence?: number;
  fields: ExtractedField[];
  extractedAt: string;
  /** The AI service that answered (provider and model), when one did. */
  aiService?: { provider: string; model: string };
  verification: typeof HISTORY_EXTRACTION_VERIFICATION;
}

/** Someone said an extraction (or one field of it) was wrong. Kept to measure accuracy; it changes nothing else. */
export interface HistoryExtractionFlag {
  id: ID;
  sourceCaseId: string;
  /** Null: the whole extraction. */
  fieldId: string | null;
  templateId: string | null;
  sourceTextHash: string;
  flaggedBy: string;
  flaggedAt: string;
}

export interface HistoryExtractionFlagInput {
  sourceCaseId: string;
  fieldId: string | null;
  templateId: string | null;
  sourceTextHash: string;
  flaggedBy: string;
}

export interface HistoryExtractionAccuracy {
  extractions: number;
  fieldsExtracted: number;
  flagged: number;
}

// ── Settings: enterprise default, performing-facility override, OFF unless turned on ─────────────────────────────
export interface HistoryExtractionSettings { enabled: boolean }
export interface HistoryExtractionSetting extends HistoryExtractionSettings { id: ID; facilityId: ID | null; updatedAt: string }
export type HistoryExtractionSettingInput = HistoryExtractionSettings & { facilityId: ID | null };

export const DEFAULT_HISTORY_EXTRACTION: HistoryExtractionSettings = { enabled: false };

export type HistoryExtractionSettingProblem = 'enabledInvalid';
export function validateSetting(input: HistoryExtractionSettings): HistoryExtractionSettingProblem[] {
  return typeof input.enabled === 'boolean' ? [] : ['enabledInvalid'];
}

export interface ResolvedHistoryExtraction extends HistoryExtractionSettings { source: 'facility' | 'enterprise' | 'default' }

/** What applies to a performing facility: its own setting, else the enterprise's, else OFF. */
export function resolveHistoryExtraction(entries: readonly HistoryExtractionSetting[], facilityId: ID | null | undefined): ResolvedHistoryExtraction {
  const own = facilityId ? entries.find(e => e.facilityId === facilityId) : undefined;
  const hit = own ?? entries.find(e => e.facilityId === null);
  if (!hit) return { ...DEFAULT_HISTORY_EXTRACTION, source: 'default' };
  return { enabled: hit.enabled, source: own ? 'facility' : 'enterprise' };
}

// ── The text and its hash ───────────────────────────────────────────────────────────────────────────────────────
export interface HistorySourceText { diagnosis: string; microscopic: string }

/** The text the extraction reads, normalised so a change of spacing alone is not a change. */
export function normaliseSourceText(t: HistorySourceText): string {
  const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
  return `DIAGNOSIS:${clean(t.diagnosis)}\nMICROSCOPIC:${clean(t.microscopic)}`;
}

/** A fixed-length hash of the normalised text (cyrb53 twice over, as hex). Not a security hash: it only detects change. */
export function hashSourceText(t: HistorySourceText): string {
  const s = normaliseSourceText(t);
  const one = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  };
  return one(0) + one(1);
}

/** Whether a stored extraction answers for this text (so no new AI call is needed). A failure is never an answer: it is tried again. */
export function isCurrent(existing: HistoryExtraction | null | undefined, sourceTextHash: string): boolean {
  return !!existing && existing.sourceTextHash === sourceTextHash && existing.status !== 'failed';
}

export function summariseAccuracy(extractions: readonly HistoryExtraction[], flags: readonly HistoryExtractionFlag[]): HistoryExtractionAccuracy {
  const done = extractions.filter(e => e.status === 'extracted');
  return { extractions: done.length, fieldsExtracted: done.reduce((n, e) => n + e.fields.length, 0), flagged: flags.length };
}
