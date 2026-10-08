// src/services/clinical/detectClinicalPathologicMismatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-145 (Batch 439): the discrepancy check PS-131 named but never built —
// compare the order's clinical indication and history (and the frozen-section
// impression, when there was one) against the microscopic findings, and flag
// a meaningful divergence: unexpected malignancy in a routine, benign-leaning
// workup, an expected malignancy not found, or the wrong site or organ.
//
// A suggestion with a confidence factor, never an automatic determination:
// the pathologist decides (clinicalMismatchDecision.ts). Only an unresolved
// mismatch they confirm recommends a CAPA, through the shared engine.
//
// Two layers:
//   1. The AI evaluation (callAi, the same provider abstraction as
//      detectCriticalFindings.ts). Narrative and clinical text only; no
//      patient identifier can be passed through this function's signature.
//   2. When the AI can't be reached, one narrow rule-based check, labelled as
//      such with a modest confidence: the pathologist has confirmed a
//      malignancy, the clinical text leans routine or benign, and it never
//      mentions a malignancy at all — not even to rule one out. "Rule out
//      lymphoma" means the clinician was considering it, so it is not
//      unexpected (Pete's acceptance criterion: not a blunt keyword match).
// ─────────────────────────────────────────────────────────────────────────────

import { callAi } from '@/services/aiIntegration/aiProviderService';
import type { ServiceResult } from '../types';
import { mentionsMalignancy } from '../quality/peerReviewRules';

export type ClinicalMismatchKind = 'unexpected-malignancy' | 'expected-malignancy-absent' | 'site-or-organ' | 'other';
const KINDS: readonly ClinicalMismatchKind[] = ['unexpected-malignancy', 'expected-malignancy-absent', 'site-or-organ', 'other'];

export interface ClinicalMismatchInput {
  clinicalIndication: string;
  /** The order's structured clinical history, rendered as text (no identifiers). */
  clinicalHistory: string;
  /** The frozen-section impression, when an intraoperative consult was made. */
  frozenImpression?: string;
  microscopic: string;
  diagnosis: string;
  /** The pathologist has confirmed a malignant finding on this case. */
  malignantNow: boolean;
}

export interface ClinicalMismatchSuggestion {
  kind: ClinicalMismatchKind;
  /** The model's own explanation (data from the model, shown as written). Absent for the rule-based check. */
  explanation?: string;
  /** 0-100. */
  confidence: number;
  source: 'ai' | 'rule';
}

/** Confidence for the rule-based check: a prompt to look, not a finding. */
export const RULE_BASED_CONFIDENCE = 50;
/** Below this, an AI suggestion isn't shown. */
export const MIN_AI_CONFIDENCE = 40;

const ROUTINE_OR_BENIGN = /\b(routine|screening|surveillance|follow[- ]?up|benign|polyp|cyst|lipoma|n(a)?evus|skin tag|inflammation|inflammatory|infection|hernia|hyperplasia|gallstones?|cholelithiasis|appendicitis|fibroid|leiomyoma|haemorrhoids?|hemorrhoids?)\b/i;

/** The rule-based check (pure). */
export function ruleBasedMismatch(input: ClinicalMismatchInput): ClinicalMismatchSuggestion | null {
  if (!input.malignantNow) return null;
  const clinical = `${input.clinicalIndication} ${input.clinicalHistory} ${input.frozenImpression ?? ''}`;
  if (!clinical.trim()) return null;
  if (mentionsMalignancy(clinical)) return null;
  if (!ROUTINE_OR_BENIGN.test(clinical)) return null;
  return { kind: 'unexpected-malignancy', confidence: RULE_BASED_CONFIDENCE, source: 'rule' };
}

/** Reads the model's answer defensively: an unknown kind, or a confidence outside 0–100, never passes through. */
export function parseMismatchResponse(raw: string): ClinicalMismatchSuggestion | null {
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  if (!parsed?.mismatch) return null;
  const kind: ClinicalMismatchKind = KINDS.includes(parsed.kind) ? parsed.kind : 'other';
  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
  if (confidence < MIN_AI_CONFIDENCE) return null;
  const explanation = typeof parsed.explanation === 'string' ? parsed.explanation.slice(0, 400) : undefined;
  return { kind, confidence, source: 'ai', ...(explanation ? { explanation } : {}) };
}

/**
 * The suggestion to show, or null. ok:false only when there is nothing to
 * compare (no clinical text and no findings).
 */
export async function detectClinicalPathologicMismatch(input: ClinicalMismatchInput): Promise<ServiceResult<ClinicalMismatchSuggestion | null>> {
  const clinical = `${input.clinicalIndication}${input.clinicalHistory}${input.frozenImpression ?? ''}`.trim();
  const findings = `${input.microscopic}${input.diagnosis}`.trim();
  if (!clinical || (!findings && !input.malignantNow)) return { ok: true, data: null };
  try {
    const { text } = await callAi({
      system: 'You are a pathology quality assistant checking clinical-pathologic correlation. Return only valid JSON — no markdown, no preamble.',
      prompt: `Compare what the clinician expected with what the pathology shows.

CLINICAL INDICATION: ${input.clinicalIndication || '—'}
CLINICAL HISTORY: ${input.clinicalHistory || '—'}
FROZEN SECTION IMPRESSION: ${input.frozenImpression || '—'}
MICROSCOPIC: ${input.microscopic || '—'}
DIAGNOSIS: ${input.diagnosis || '—'}
PATHOLOGIST-CONFIRMED MALIGNANT FINDING: ${input.malignantNow ? 'yes' : 'no'}

Flag a mismatch only when the findings meaningfully contradict the clinical picture:
- "unexpected-malignancy": a malignancy in a case the clinician plainly expected to be routine or benign. If the clinician raised malignancy at all (including "rule out", "suspicious for", "concern for"), it is NOT unexpected.
- "expected-malignancy-absent": the clinician clearly expected a malignancy (e.g. a known mass on imaging) and none is found, in a way that suggests a sampling or specimen problem.
- "site-or-organ": the tissue or site does not match the procedure or site the order describes.
- "other": any other contradiction a reasonable pathologist would want to reconcile before sign-out.
A finding that merely adds detail, or a benign result in a benign workup, is NOT a mismatch.

Return JSON: { "mismatch": true | false, "kind": "unexpected-malignancy" | "expected-malignancy-absent" | "site-or-organ" | "other", "explanation": "one or two sentences quoting what conflicts", "confidence": 0-100 }`,
      maxTokens: 400,
    });
    return { ok: true, data: parseMismatchResponse(text) };
  } catch {
    return { ok: true, data: ruleBasedMismatch(input) };
  }
}
