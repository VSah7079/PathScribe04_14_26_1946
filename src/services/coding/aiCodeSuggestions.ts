// src/services/coding/aiCodeSuggestions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 651: the AI code suggestions, moved out of AddCodeModal.tsx (CLAUDE.md rules 2 and 10) and made honest about what the
// call returned:
//   • Confidence is ONE scale, 0 to 100 (a whole percent), for the suggestion, the stored CodedEntry.ai and the screen. A vendor
//     that answers 0 to 1 is converted where its answer is read (parseAiCodeSuggestions, aiSuggestionRules.normaliseAiConfidence).
//   • The stored model is the model the call really used (callAi returns the configured provider and model id), not a label.
//   • A suggestion with no usable confidence, or below the minimum (30), is dropped.
//   • A suggestion whose system only has demonstration reference data (OPCS-4, opcs4Sample.ts) is marked `simulated`; it can be
//     looked at but not applied (canApplyCode).
// The prompt wording is the AI's instruction, not screen text. Dependencies are the same modules the modal used.
// ─────────────────────────────────────────────────────────────────────────────
import { callAi } from '@/services/aiIntegration/aiProviderService';
import { resolveAiConfigOverrideForClient } from '@/components/Config/AI/resolveClientAiModel';
import { CODE_MAP_TABLE } from '@/services/billing/codeMapTable';
import { verifyAndDescribeCodes } from '../terminologySearch/codeSearchService';
import { AI_MIN_CONFIDENCE, normaliseAiConfidence } from '../aiIntegration/aiSuggestionRules';
import { isDemonstrationOnlySystem } from './opcs4Sample';
import type { CodedEntryAiDetail } from './codedEntry';
import { normaliseSuggestionOrigin, type CodeSourceSection } from './suggestionOrigin';

export interface AiCodeSuggestion {
  code: string;
  display: string;
  system: string;
  /** 0 to 100 (a whole percent). */
  confidence: number;
  rationale: string;
  rvu?: number | null;
  /** The model id the call used (absent on codes derived from a template, which no model suggested). */
  model?: string;
  /** The configured AI service the call went to. */
  provider?: string;
  /** The code was found only in demonstration reference data (OPCS-4): shown labelled Simulated, never applied. */
  simulated?: boolean;
  /** Batch 696: which part of the case the AI says the code was derived from (checked: that part must have text). */
  sourceSection?: CodeSourceSection;
  /** Batch 696: the specimen the AI says it applies to (kept only when the case text names that specimen). */
  specimenLabel?: string;
  /** Batch 696: which check confirmed the code. `display` is then the dictionary's description, not the AI's wording. */
  verifiedBy?: 'dictionary' | 'code-map';
  /** Batch 696: the wording the AI gave, kept for the audit trail only. */
  aiWording?: string;
}

/** The array in a model's answer, each item on the 0 to 100 scale; ones with no code, display, system or usable confidence, or below 30, are dropped. Throws when there is no list. */
export function parseAiCodeSuggestions(raw: string, texts?: { gross: string; microscopic: string; ancillary: string; narrative?: string; hasSynoptic?: boolean }): AiCodeSuggestion[] {
  const clean = raw.replace(/```json|```/g, '').trim();
  // The model sometimes adds text after the array: take it by its outermost [ ].
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) throw new Error('AI response did not contain a recognizable code list — please try again.');
  const parsed: unknown = JSON.parse(clean.slice(start, end + 1));
  if (!Array.isArray(parsed)) return [];
  const out: AiCodeSuggestion[] = [];
  for (const item of parsed as Array<Record<string, unknown>>) {
    if (!item || typeof item !== 'object') continue;
    const { code, display, system } = item;
    if (typeof code !== 'string' || !code.trim() || typeof display !== 'string' || typeof system !== 'string') continue;
    const confidence = normaliseAiConfidence(item.confidence);
    if (confidence === undefined || confidence < AI_MIN_CONFIDENCE) continue;
    out.push({ code: code.trim(), display, system, confidence, rationale: typeof item.rationale === 'string' ? item.rationale : '', rvu: typeof item.rvu === 'number' ? item.rvu : null, ...(texts ? normaliseSuggestionOrigin(item.source, item.specimen, texts) : {}) });
  }
  return out;
}

/** What is stored with an applied AI code: the real model, the service, and the confidence on the one scale. */
export function aiDetailFor(s: Pick<AiCodeSuggestion, 'confidence' | 'model' | 'provider'> & Partial<Pick<AiCodeSuggestion, 'sourceSection' | 'specimenLabel' | 'verifiedBy'>>): CodedEntryAiDetail {
  return {
    model: s.model ?? 'unknown', ...(s.provider ? { provider: s.provider } : {}), confidence: s.confidence,
    ...(s.verifiedBy ? { verifiedBy: s.verifiedBy } : {}), ...(s.sourceSection ? { sourceSection: s.sourceSection } : {}), ...(s.specimenLabel ? { specimen: s.specimenLabel } : {}),
  };
}

/** Whether a code can be applied to a case: not while its system only has demonstration data (OPCS-4, until the licensed feed exists). */
export function canApplyCode(r: { system: string }): boolean {
  return !isDemonstrationOnlySystem(r.system);
}

export interface AiCodeSuggestionInput {
  caseText: { gross: string; microscopic: string; ancillary: string };
  synopticAnswers?: Record<string, string | string[]>;
  templateName?: string;
  narrativeText?: string;
  isUK: boolean;
  /** The coding systems this site allows. */
  siteCodingSystems: readonly string[];
  isOrchestrationMode: boolean;
  facilityId?: string;
}

export async function suggestAiCodes(input: AiCodeSuggestionInput): Promise<AiCodeSuggestion[]> {
  return (await suggestAiCodesWithDrops(input)).suggestions;
}

/** Batch 656: the verified suggestions plus how many were left out because their code could not be confirmed. */
export async function suggestAiCodesWithDrops(input: AiCodeSuggestionInput): Promise<{ suggestions: AiCodeSuggestion[]; unverified: number }> {
  const { caseText, synopticAnswers, templateName, narrativeText, isUK, siteCodingSystems, isOrchestrationMode, facilityId } = input;
  const answersText = synopticAnswers
    ? Object.entries(synopticAnswers)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n')
    : 'No synoptic answers available';

  const { text: raw, provider, model } = await callAi({
    system: isUK
      ? 'You are a pathology coding specialist with expertise in NHS surgical pathology coding — SNOMED CT, ICD-10, ICD-O, and OPCS-4. Return only valid JSON — no markdown, no preamble.'
      : 'You are a pathology coding specialist with expertise in ICD-10, SNOMED CT, and ICD-O diagnostic coding. Return only valid JSON — no markdown, no preamble.',
    prompt: isUK
      ? `Suggest appropriate medical codes for this NHS pathology case. Include diagnostic codes and OPCS-4 procedure codes.

TEMPLATE: ${templateName ?? 'Unknown'}
${narrativeText ? `NARRATIVE REPORT (primary source):\n${narrativeText}\n\nSUPPORTING:` : ''}
GROSS: ${caseText.gross}
MICROSCOPIC: ${caseText.microscopic}
ANCILLARY: ${caseText.ancillary}
SYNOPTIC ANSWERS:
${answersText}

Return a JSON array covering:

DIAGNOSTIC CODES (ICD-10, SNOMED CT, ICD-O):
- Primary diagnosis ICD-10 code (UK 5th edition)
- SNOMED CT morphology code (UK SNOMED release)
- ICD-O topography and morphology codes if applicable

PROCEDURE CODES (OPCS-4):
- Primary surgical pathology procedure code
- Additional procedures if applicable (IHC, molecular)

Format:
[
  {
"code": "C20",
"display": "Malignant neoplasm of rectum",
"system": "ICD10",
"confidence": 95,
"rationale": "Rectal adenocarcinoma primary diagnosis",
"source": "microscopic",
"specimen": "A",
"rvu": null
  },
  {
"code": "Y76.8",
"display": "Examination of specimen from rectum",
"system": "OPCS4",
"confidence": 92,
"rationale": "Histological examination of resection specimen",
"source": "gross",
"specimen": null,
"rvu": null
  }
]

Rules:
- system must be one of: ICD10, SNOMED, ICDO, LOINC, OPCS4
- Do NOT include CPT codes — not used in NHS
- confidence 0-100, rationale ≤12 words
- source: the part of the case the code was taken from, one of: narrative, gross, microscopic, ancillary, synoptic
- specimen: the specimen letter or number it applies to if the text names one, otherwise null
- Return 4-8 codes total — MUST include at least one SNOMED morphology code`
      : `Suggest appropriate diagnostic codes for this pathology case.

TEMPLATE: ${templateName ?? 'Unknown'}
${narrativeText ? `NARRATIVE REPORT (primary source):
${narrativeText}

SUPPORTING:` : ''}
GROSS: ${caseText.gross}
MICROSCOPIC: ${caseText.microscopic}
ANCILLARY: ${caseText.ancillary}
SYNOPTIC ANSWERS:
${answersText}

Return a JSON array covering:

DIAGNOSTIC CODES (ICD-10, SNOMED CT, ICD-O):
- Primary diagnosis ICD-10 code
- SNOMED CT morphology code
- ICD-O topography and morphology codes if applicable
${!isOrchestrationMode ? `
SPECIMEN-LEVEL BILLING CODE (RVU ESTIMATE ONLY — Assist mode):
- This case is in Assist mode: your LIS owns real billing, this is
  read-only, internal RVU/productivity tracking - never a real charge.
- Pick at most ONE code from this exact, real, verified list, based
  on the overall complexity of the gross/microscopic work described -
  never invent a code outside this list:
${CODE_MAP_TABLE.filter(e => e.level === 'specimen').map(e => `  - ${e.code}: ${e.description}`).join('\n')}
- Do NOT suggest ancillary/stain-level codes (special stains, IHC) -
  those need an exact stain count this prompt cannot reliably judge
  from narrative text alone, and are already handled by this app's
  own real, structured rule engine in orchestration mode.
- Mark confidence honestly lower for this one (it's a rough estimate,
  not a precision determination) and say so in rationale.
` : ''}
Format:
[
  {
"code": "C50.412",
"display": "Malignant neoplasm of upper-outer quadrant of left female breast",
"system": "ICD10",
"confidence": 95,
"rationale": "Left breast invasive carcinoma upper outer quadrant",
"source": "microscopic",
"specimen": "A",
"rvu": null
  }${!isOrchestrationMode ? `,
  {
"code": "88305",
"display": "Code 88305 — Specimen Level",
"system": "CPT",
"confidence": 65,
"rationale": "Estimate only - moderate complexity specimen, Assist mode",
"rvu": null
  }` : ''}
]

Rules:
- system must be one of: ICD10, SNOMED, ICDO, LOINC${!isOrchestrationMode ? ', CPT' : ''}
${isOrchestrationMode ? '- Do NOT include CPT codes — surgical pathology level, special stain, and IHC billing codes are resolved by this app\'s own real, verified rule engine from structured stain data, not guessed from narrative text' : '- At most ONE CPT code, only from the real, verified list above, only for the specimen-level base code - never a stain-level ancillary code'}
- confidence 0-100
- rationale ≤12 words
- source: the part of the case the code was taken from, one of: narrative, gross, microscopic, ancillary, synoptic
- specimen: the specimen letter or number it applies to if the text names one, otherwise null
- rvu: always null - this prompt no longer suggests billable procedure codes
- Return 4-8 codes total — MUST include at least one SNOMED morphology code
- SNOMED morphology example: {"code":"413448000","display":"Invasive carcinoma of breast, no special type","system":"SNOMED","confidence":95,"rationale":"Primary diagnosis morphology","rvu":null}
- Only include codes you are highly confident are correct`,
    maxTokens: 1200,
    configOverride: await resolveAiConfigOverrideForClient(facilityId),
    context: { feature: 'coding', facilityId },
  });

  const parsed = parseAiCodeSuggestions(raw, { ...caseText, narrative: narrativeText, hasSynoptic: !!synopticAnswers && Object.keys(synopticAnswers).length > 0 });
  // Real, defensive filter, per direct requirement: CPT is no
  // longer part of what this prompt asks for (see the prompt's own
  // header comment on this whole function for why), but an LLM
  // doesn't always perfectly follow an instruction - explicitly
  // dropping any CPT suggestion here too, rather than relying on
  // the prompt change alone, since a wrong CPT guess with a false
  // sense of confidence is a real billing risk, not just noise.
  const specimenLevelCptCodes = new Set(CODE_MAP_TABLE.filter(e => e.level === 'specimen').map(e => e.code));
  let cptSeen = false;
  const filtered = parsed.filter(s => {
        if (!siteCodingSystems.includes(s.system)) return false;
        if (s.system !== 'CPT') return true;
        // Real fix: CPT suggestions are only ever real here in
        // Assist mode (see the prompt's own conditional block
        // above) - defensively re-verify even then, since the
        // model is only asked, not guaranteed, to stay inside the
        // real, verified specimen-level list this app actually
        // knows about. A wrong or hallucinated code showing up
        // with a confident-looking percentage is the real risk
        // this guards against, not just noise to filter later.
        if (isOrchestrationMode || cptSeen || !specimenLevelCptCodes.has(s.code)) return false;
        cptSeen = true;
        return true;
      });
  // Real, per direct guidance: "before any suggestion is [shown],
  // verify that code actually exists and is a real code. Machine
  // verified. Then the Practitioner makes the medical decision to
  // use or not use that code" — applies to every real system this
  // modal presents (SNOMED, ICD-10, ICD-11, ICD-O, LOINC — CPT
  // already got its own, separate re-verification just above,
  // short-circuited to true inside filterToVerifiedCodes rather
  // than checked twice). A hallucinated code is dropped here,
  // silently, before the practitioner ever sees it as an option —
  // their own review still decides whether a genuinely-real code
  // is the medically right one for this case, exactly as before.
  const verified = await verifyAndDescribeCodes(filtered);
  return {
    suggestions: verified.map(s => ({ ...s, model, provider, ...(isDemonstrationOnlySystem(s.system) ? { simulated: true } : {}) })),
    unverified: filtered.length - verified.length,
  };
}
