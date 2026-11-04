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
//
// Batch 523 (PS-145, Pete's decision 15, Oct 11): the check also runs at
// cytology sign-out (pathologist track) and at autopsy FAD sign-out. The
// discipline changes what counts as a mismatch:
//   - cytology: an abnormal result in a GYN screen is what screening is for,
//     never "unexpected"; the rule-based fallback runs for non-GYN only,
//     without the screening words;
//   - autopsy: the clinical cause of death or a major clinical diagnosis
//     contradicted by the findings ("cause-of-death"; Goldman class I/II),
//     or a malignancy found that was never diagnosed in life. No rule-based
//     fallback: that comparison needs judgement.
//
// Batch 536 (PS-554, PS-558): what the AI is told counts as a mismatch is the
// approved, governed text for the discipline (aiInstructions.ts,
// aiInstructionService.ts), never an unapproved edit; the suggestion records
// the version used. The call is checked against the jurisdiction's AI vendor
// policy; when it isn't allowed, the rule-based check runs and the suggestion
// says the AI is not available for this jurisdiction.
// ─────────────────────────────────────────────────────────────────────────────

import { callAi } from '@/services/aiIntegration/aiProviderService';
import type { ServiceResult } from '../types';
import { mentionsMalignancy } from '../quality/peerReviewRules';
import { isAiNotAvailable, type AiCallContext } from '@/services/aiIntegration/aiCallPolicy';
import { BUILT_IN_AI_INSTRUCTIONS } from './aiInstructions';

export type ClinicalMismatchKind = 'unexpected-malignancy' | 'expected-malignancy-absent' | 'site-or-organ' | 'cause-of-death' | 'other';
const KINDS: readonly ClinicalMismatchKind[] = ['unexpected-malignancy', 'expected-malignancy-absent', 'site-or-organ', 'cause-of-death', 'other'];

/** Batch 523: where the check runs. */
export type ClinicalMismatchDiscipline = 'surgical' | 'cytology' | 'autopsy';

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
  /** Batch 523: surgical when absent. */
  discipline?: ClinicalMismatchDiscipline;
  /** Batch 523: a GYN cytology screen (an abnormal result is never "unexpected" there). */
  gynScreening?: boolean;
}

/** Batch 683: a quote the model gave, and whether those exact words are in the case text (a quote that is not is never trusted). */
export interface EvidenceQuote { text: string; found: boolean }
export interface ClinicalMismatchEvidence { clinical?: EvidenceQuote; pathology?: EvidenceQuote }

export interface ClinicalMismatchSuggestion {
  kind: ClinicalMismatchKind;
  /** The model's own explanation (data from the model, shown as written). Absent for the rule-based check. */
  explanation?: string;
  /** 0-100. */
  confidence: number;
  /** Batch 683: the words on each side that conflict, copied by the model and checked against the case text. Absent for the rule-based check. */
  evidence?: ClinicalMismatchEvidence;
  source: 'ai' | 'rule';
  /** Batch 536: the version of the approved AI instructions the AI answered (0: PathScribe's own). */
  instructionVersion?: number;
  /** Batch 536 (PS-558): the AI wasn't asked because the jurisdiction's AI vendor policy doesn't allow the configured service or region. */
  aiNotAvailable?: 'jurisdiction';
}

/** Batch 536: where the work belongs (for the AI vendor policy; never sent to the AI) and the instructions to use. */
export interface ClinicalMismatchCheckOptions {
  caseId?: string;
  facilityId?: string;
  /** The instructions to use (the Test panel's draft). Absent: the approved ones. */
  instructions?: { text: string; version: number };
  /** The approved instructions for a discipline (default: the AI instruction service). */
  approvedInstructions?: (discipline: ClinicalMismatchDiscipline) => Promise<{ text: string; version: number }>;
}

const approvedFromService = async (discipline: ClinicalMismatchDiscipline) =>
  (await import('./mockAiInstructionService')).mockAiInstructionService.instructionsForCheck(discipline);

/** Confidence for the rule-based check: a prompt to look, not a finding. */
export const RULE_BASED_CONFIDENCE = 50;
/** Below this, an AI suggestion isn't shown. */
export const MIN_AI_CONFIDENCE = 40;

const ROUTINE_OR_BENIGN = /\b(routine|screening|surveillance|follow[- ]?up|benign|polyp|cyst|lipoma|n(a)?evus|skin tag|inflammation|inflammatory|infection|hernia|hyperplasia|gallstones?|cholelithiasis|appendicitis|fibroid|leiomyoma|haemorrhoids?|hemorrhoids?)\b/i;

/** Batch 523: for cytology, a screening or surveillance specimen is expected to find disease, so those words don't count. */
const SCREENING_WORDS = /\b(routine|screening|surveillance|follow[- ]?up)\b/gi;

/** The rule-based check (pure). */
export function ruleBasedMismatch(input: ClinicalMismatchInput): ClinicalMismatchSuggestion | null {
  const discipline = input.discipline ?? 'surgical';
  if (discipline === 'autopsy') return null;
  if (discipline === 'cytology' && input.gynScreening) return null;
  if (!input.malignantNow) return null;
  let clinical = `${input.clinicalIndication} ${input.clinicalHistory} ${input.frozenImpression ?? ''}`;
  if (discipline === 'cytology') clinical = clinical.replace(SCREENING_WORDS, ' ');
  if (!clinical.trim()) return null;
  if (mentionsMalignancy(clinical)) return null;
  if (!ROUTINE_OR_BENIGN.test(clinical)) return null;
  return { kind: 'unexpected-malignancy', confidence: RULE_BASED_CONFIDENCE, source: 'rule' };
}

/**
 * Batch 523: what the model is asked, by discipline (pure). Batch 536: the
 * instructions (what counts as a mismatch) are the approved, governed text
 * (aiInstructions.ts); the case data and the answer format stay fixed here.
 */
export function mismatchPrompt(input: ClinicalMismatchInput, instructions?: string): string {
  const discipline = input.discipline ?? 'surgical';
  const data = discipline === 'autopsy'
    ? `CLINICAL HISTORY AND CLINICAL CAUSE OF DEATH: ${[input.clinicalIndication, input.clinicalHistory].filter(Boolean).join(' | ') || '—'}
AUTOPSY FINDINGS: ${input.microscopic || '—'}
FINAL ANATOMIC DIAGNOSES: ${input.diagnosis || '—'}
MALIGNANCY FOUND AT AUTOPSY: ${input.malignantNow ? 'yes' : 'no'}`
    : `CLINICAL INDICATION: ${input.clinicalIndication || '—'}
CLINICAL HISTORY: ${input.clinicalHistory || '—'}
${discipline === 'surgical' ? `FROZEN SECTION IMPRESSION: ${input.frozenImpression || '—'}\n` : ''}${discipline === 'cytology' ? 'CYTOLOGY FINDINGS' : 'MICROSCOPIC'}: ${input.microscopic || '—'}
${discipline === 'cytology' ? 'CYTOLOGY INTERPRETATION' : 'DIAGNOSIS'}: ${input.diagnosis || '—'}
PATHOLOGIST-CONFIRMED MALIGNANT FINDING: ${input.malignantNow ? 'yes' : 'no'}`;
  const rules = (instructions ?? BUILT_IN_AI_INSTRUCTIONS[discipline]).trim();
  const kinds = discipline === 'autopsy' ? '"cause-of-death" | "unexpected-malignancy" | "other"' : '"unexpected-malignancy" | "expected-malignancy-absent" | "site-or-organ" | "other"';
  return `Compare what the clinician ${discipline === 'autopsy' ? 'knew in life' : 'expected'} with what the pathology shows.

${data}

${rules}

Return JSON: { "mismatch": true | false, "kind": ${kinds}, "explanation": "one or two sentences quoting what conflicts", "clinicalQuote": "exact words copied from the clinical side", "pathologyQuote": "exact words copied from the pathology side", "confidence": 0-100 }
The two quotes must be exact, verbatim pieces of the text above (at most 20 words each), never paraphrased; use "" when there is none.`;
}

/** Reads the model's answer defensively: an unknown kind, or a confidence outside 0–100, never passes through. */
export function parseMismatchResponse(raw: string, sources?: { clinical: string; pathology: string }): ClinicalMismatchSuggestion | null {
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  if (!parsed?.mismatch) return null;
  const kind: ClinicalMismatchKind = KINDS.includes(parsed.kind) ? parsed.kind : 'other';
  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
  if (confidence < MIN_AI_CONFIDENCE) return null;
  const explanation = typeof parsed.explanation === 'string' ? parsed.explanation.slice(0, 400) : undefined;
  const evidence = sources ? mismatchEvidence(parsed, sources) : undefined;
  return { kind, confidence, source: 'ai', ...(explanation ? { explanation } : {}), ...(evidence ? { evidence } : {}) };
}

const normaliseForQuote = (v: string) => v.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();

/** Batch 683: the model's two quotes, each checked against the text it should come from (pure). */
export function mismatchEvidence(parsed: { clinicalQuote?: unknown; pathologyQuote?: unknown }, sources: { clinical: string; pathology: string }): ClinicalMismatchEvidence | undefined {
  const one = (q: unknown, source: string): EvidenceQuote | undefined => {
    const text = typeof q === 'string' ? q.trim().slice(0, 200) : '';
    return text ? { text, found: normaliseForQuote(source).includes(normaliseForQuote(text)) } : undefined; // the whole quote must be there, not just its first words
  };
  const clinical = one(parsed.clinicalQuote, sources.clinical), pathology = one(parsed.pathologyQuote, sources.pathology);
  return clinical || pathology ? { ...(clinical ? { clinical } : {}), ...(pathology ? { pathology } : {}) } : undefined;
}

/**
 * Batch 536: the AI's answer with these instructions, or null for no
 * mismatch. Throws when the AI can't be asked (unreachable, or not allowed
 * for the jurisdiction: AiNotAvailableError); the Test panel shows that as is.
 */
export async function askAiForMismatch(
  input: ClinicalMismatchInput, instructions: { text: string; version: number }, context: AiCallContext,
): Promise<ClinicalMismatchSuggestion | null> {
  const { text } = await callAi({
    system: 'You are a pathology quality assistant checking clinical-pathologic correlation. Return only valid JSON — no markdown, no preamble.',
    prompt: mismatchPrompt(input, instructions.text),
    maxTokens: 400,
    context,
  });
  const parsed = parseMismatchResponse(text, { clinical: `${input.clinicalIndication} ${input.clinicalHistory} ${input.frozenImpression ?? ''}`, pathology: `${input.microscopic} ${input.diagnosis}` });
  return parsed ? { ...parsed, instructionVersion: instructions.version } : null;
}

/**
 * The suggestion to show, or null. ok:false only when there is nothing to
 * compare (no clinical text and no findings).
 */
export async function detectClinicalPathologicMismatch(input: ClinicalMismatchInput, options: ClinicalMismatchCheckOptions = {}): Promise<ServiceResult<ClinicalMismatchSuggestion | null>> {
  const clinical = `${input.clinicalIndication}${input.clinicalHistory}${input.frozenImpression ?? ''}`.trim();
  const findings = `${input.microscopic}${input.diagnosis}`.trim();
  if (!clinical || (!findings && !input.malignantNow)) return { ok: true, data: null };
  const discipline = input.discipline ?? 'surgical';
  // Batch 536: only approved instructions (or the Test panel's draft); PathScribe's own when none can be read.
  const instructions = options.instructions
    ?? await (options.approvedInstructions ?? approvedFromService)(discipline).catch(() => ({ text: BUILT_IN_AI_INSTRUCTIONS[discipline], version: 0 }));
  try {
    return { ok: true, data: await askAiForMismatch(input, instructions, { feature: 'clinical-mismatch', caseId: options.caseId, facilityId: options.facilityId }) };
  } catch (e) {
    // Batch 536 (PS-558): not allowed for this jurisdiction: the rule-based check, saying why.
    const rule = ruleBasedMismatch(input);
    return { ok: true, data: rule && isAiNotAvailable(e) ? { ...rule, aiNotAvailable: 'jurisdiction' } : rule };
  }
}
