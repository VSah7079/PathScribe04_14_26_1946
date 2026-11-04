// src/services/clinical/detectCriticalFindings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own revised PS-105 scope: negation-aware
// detection of critical/abnormal narrative findings (PS-105's own
// "Narrative NLP & Keyphrase Extraction" section), built on this
// app's existing, proven callAi() provider abstraction rather than a
// separate spaCy/MedSpaCy pipeline this app has no real
// infrastructure for. Same real, established pattern as
// evaluateSynopticAssignment (mockCaseService.ts) - a standalone
// function calling callAi() directly, not a method on
// PathScribeAIService/IAIIntegrationService.
//
// Real, per direct guidance's own follow-up ("will the data going to
// the LLM be encrypted, we have to be careful"): deliberately scoped
// to narrative text only (gross/microscopic/ancillary) - the exact
// same real fields suggestSynopticFields already sends, never
// patient name, MRN, DOB, or any other direct identifier. This is a
// real, enforced boundary at this function's own signature, not
// implicit - there is no parameter this function could even pass a
// patient identifier through. Encryption in transit and at-rest
// retention are governed by the configured provider's own
// infrastructure/contract, not by this function.
// ─────────────────────────────────────────────────────────────────────────────

import { callAi } from '@/services/aiIntegration/aiProviderService';
import type { CodingTerm } from '../abnormalDetection/IAbnormalTriggerRuleService';
import type { ServiceResult } from '../types';
import type { AbnormalSeverity } from '../abnormalDetection/IAbnormalTriggerRuleService';
import { partitionNegatedFindings } from './negatedFindingCheck';

export interface CriticalFindingFlag {
  /** The real term/phrase the model flagged, e.g. "invasive carcinoma". */
  term: string;
  /** Real, per direct guidance: 'synoptic' added alongside the original
   *  three narrative fields — PS-129's discrete trigger-rule matches
   *  (services/abnormalDetection/) are genuinely sourced from a
   *  structured synoptic field/value, not narrative text, and forcing
   *  them into 'gross'/'microscopic'/'ancillary' would mislabel where
   *  the finding actually came from. */
  sourceField: 'gross' | 'microscopic' | 'ancillary' | 'synoptic';
  /** Short, real quote from the source text showing the term in
   *  context - lets a reviewer see WHY this was flagged, not just
   *  that it was. */
  sourceQuote: string;
  /** Real, per direct guidance: "the case is considered abnormal or
   *  not, however the human makes the final call. We just offer the
   *  suggestion and why with a confidence factor." Shares
   *  AbnormalSeverity with PS-129's discrete trigger rules — one real,
   *  unified severity vocabulary across both detection paths, rather
   *  than two independently-drifting ones. */
  severity: AbnormalSeverity;
  /** 0-100, real per direct guidance's own confidence-factor
   *  requirement — the model's own stated confidence in this specific
   *  finding, never fabricated or defaulted when the model provides
   *  one. */
  confidence: number;
  /** Real, per direct guidance: "we can use synthetic codes because we
   *  will not have a license until our first customer or a
   *  partnership." Only ever real for a `sourceField: 'synoptic'`
   *  finding (PS-129's own discrete trigger rules, which can carry a
   *  real, per-rule synthetic code — services/abnormalDetection/).
   *  An AI-narrative finding (gross/microscopic/ancillary) has no
   *  fixed rule to attach one to; the point of application
   *  (`handleRecordCriticalNotification`, useSignOutWorkflow.ts) falls
   *  back to the real, severity-keyed default (`resolveSyntheticCoding`)
   *  for those. */
  syntheticCoding?: CodingTerm[];
}

/**
 * Batch 655 (Pete, Oct 23, 2026: "consider changing this if we have no safeguards against low-confidence critical
 * findings generating excessive noise"). Until now nothing looked at the model's confidence. The model's confidence is
 * its own, never calibrated, so it is not trusted to switch off anything that matters. The floor therefore applies only to
 * the lowest severity, 'Abnormal' ("clinically significant but not immediately urgent"): an Abnormal flag the model itself
 * is under 50 percent sure of is not put in front of the pathologist as a sign-out finding. 'Critical' and 'Malignant'
 * flags are NEVER dropped for low confidence: a missed critical result is worse than an extra prompt (the same posture
 * as negatedFindingCheck.ts). Dropped flags are returned in `belowFloor`, not discarded, so a caller or test can see them.
 */
export const ABNORMAL_CONFIDENCE_FLOOR = 50;

/** Splits flags by the confidence floor (pure). Only 'Abnormal' flags below the floor are set aside. */
export function applyConfidenceFloor<T extends Pick<CriticalFindingFlag, 'severity' | 'confidence'>>(
  flags: readonly T[], floor: number = ABNORMAL_CONFIDENCE_FLOOR,
): { kept: T[]; belowFloor: T[] } {
  const kept: T[] = []; const belowFloor: T[] = [];
  for (const f of flags) (f.severity === 'Abnormal' && f.confidence < floor ? belowFloor : kept).push(f);
  return { kept, belowFloor };
}

export interface CriticalFindingDetectionResult {
  flags: CriticalFindingFlag[];
  /** Batch 655: 'Abnormal' flags the model was under ABNORMAL_CONFIDENCE_FLOOR percent sure of; set aside, never 'Critical' or 'Malignant'. */
  belowFloor?: CriticalFindingFlag[];
  /** Batch 452 (PS-131, PS-105): findings the model returned that the
   *  code-side negation check (negatedFindingCheck.ts) dropped because the
   *  narrative negates the term everywhere it appears ("no evidence of
   *  carcinoma"). Kept here, not silently discarded, so a caller or test can
   *  see what was suppressed. */
  negated: CriticalFindingFlag[];
}

/** Real, per direct guidance's own PS-105 scope - scans real,
 *  already-entered narrative text for critical/abnormal findings a
 *  pathologist may need to communicate urgently. Negation-aware twice
 *  over: the prompt asks the model not to flag negated terms, and since
 *  Batch 452 every narrative flag is re-checked in code against the
 *  narrative itself (negatedFindingCheck.ts) and dropped when the term is
 *  negated wherever it appears (flags "high-grade dysplasia", not "no
 *  evidence of high-grade dysplasia" - PS-105's own stated example), covering the
 *  same real high-severity term categories PS-105 names (malignant,
 *  carcinoma, melanoma, acid-fast bacilli, organ rejection) without
 *  hard-coding a fixed keyword list, since real pathology narrative
 *  language varies far more than any fixed dictionary could capture.
 *
 *  Never a hard gate on its own - this only detects and returns real,
 *  structured flags; a caller (the sign-out workflow) decides what to
 *  do with them (surface a banner, require acknowledgment or a real
 *  CriticalResultNotification before finalizing). Returns an honest,
 *  empty flags array, never a fabricated one, when nothing in the
 *  real text warrants flagging. */
export async function detectCriticalFindings(
  caseText: { gross: string; microscopic: string; ancillary: string },
  /** Batch 536 (PS-558): where the work belongs, for the AI vendor policy (never sent to the AI). */
  where?: { caseId?: string; facilityId?: string },
): Promise<ServiceResult<CriticalFindingDetectionResult>> {
  if (!caseText.gross.trim() && !caseText.microscopic.trim() && !caseText.ancillary.trim()) {
    return { ok: true, data: { flags: [], negated: [] } };
  }

  try {
    const { text: raw } = await callAi({
      system: 'You are a pathology AI assistant identifying critical and abnormal findings that may require urgent physician notification. Return only valid JSON — no markdown, no preamble.',
      prompt: `Analyse the following pathology case narrative for critical or abnormal findings requiring urgent clinical notification.

GROSS: ${caseText.gross || '—'}
MICROSCOPIC: ${caseText.microscopic || '—'}
ANCILLARY: ${caseText.ancillary || '—'}

Flag real findings such as: unexpected or newly-diagnosed malignancy (e.g. carcinoma, melanoma, invasive disease), organ transplant rejection, acid-fast bacilli or other findings suggesting active infectious disease requiring urgent treatment, and any other finding a reasonable pathologist would consider a critical value requiring immediate physician communication.

Be negation-aware: do NOT flag a term that is explicitly negated or ruled out (e.g. "no evidence of malignancy", "negative for acid-fast bacilli") — only flag findings actually present.

Return JSON: { "flags": [ { "term": "short flagged term", "sourceField": "gross" | "microscopic" | "ancillary", "sourceQuote": "≤15 word quote from the text", "severity": "Abnormal" | "Critical" | "Malignant", "confidence": 0-100 } ] }
Rules:
- "Malignant" severity: a genuine, newly-identified malignancy (e.g. unexpected carcinoma)
- "Critical" severity: findings requiring immediate/urgent notification that are not themselves a malignancy (e.g. organ rejection, active untreated infection)
- "Abnormal" severity: clinically significant but not immediately urgent
- confidence: your genuine confidence (0-100) that this specific finding is real and correctly characterized — never a placeholder value
- Return an empty flags array if nothing in the real text warrants flagging — never fabricate a finding`,
      maxTokens: 800,
      context: { feature: 'critical-findings', ...where },
    });

    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const rawFlags = Array.isArray(parsed?.flags) ? parsed.flags : [];
    // Defensive validation on the way out — same "don't trust, verify"
    // posture as evaluateSynopticAssignment's own candidate-ID filter:
    // never pass through a severity the model invented outside the
    // three real, offered values, and always clamp confidence to a
    // genuine 0-100 range rather than trusting the model's own number.
    const validSeverities: AbnormalSeverity[] = ['Abnormal', 'Critical', 'Malignant'];
    const validFields = ['gross', 'microscopic', 'ancillary'];
    const valid: CriticalFindingFlag[] = rawFlags
      .filter((f: any) => validSeverities.includes(f?.severity) && typeof f?.term === 'string' && f.term.trim() && validFields.includes(f?.sourceField))
      .map((f: any) => ({
        ...f,
        sourceQuote: typeof f.sourceQuote === 'string' ? f.sourceQuote : '',
        confidence: Math.max(0, Math.min(100, Number(f.confidence) || 0)),
      }));
    // Batch 452 (PS-131, PS-105): don't rely on the prompt alone - re-read
    // the narrative and drop a flag whose term it negates everywhere.
    const { kept: notNegated, negated } = partitionNegatedFindings(valid, caseText);
    const { kept, belowFloor } = applyConfidenceFloor(notNegated);
    return { ok: true, data: { flags: kept, negated, belowFloor } };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'Critical finding detection failed' };
  }
}
