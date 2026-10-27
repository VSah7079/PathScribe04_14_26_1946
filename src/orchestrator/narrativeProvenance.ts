// src/orchestrator/narrativeProvenance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 651: a confidence and a source quote for every AI-written narrative section, as the docs always said.
//
// The section itself still streams as prose. When it has finished, ONE short non-streaming call asks the model about that
// text under a closed schema, exactly two keys:  { "confidence": 0-100, "quote": "verbatim words from the source text" }.
//   • confidence is read on the one 0 to 100 scale (aiSuggestionRules.normaliseAiConfidence);
//   • the quote is checked against the report's source text with the same check the synoptic suggestions use
//     (utils/sourceTextMatching.matchSourceInText); a quote that cannot be found is marked unverified, never trusted;
//   • any other answer (extra keys, no JSON, no usable confidence) is "unavailable", which is shown as unverified too.
// A failure here never affects the section: the text is already written. Pure but for the injected `ask`.
// ─────────────────────────────────────────────────────────────────────────────
import type { StructuredContext } from './contextBuilder';
import { normaliseAiConfidence } from '../services/aiIntegration/aiSuggestionRules';
import { matchSourceInText } from '../utils/sourceTextMatching';

/** 'verified': the quote was found in the source text. 'unverified': it was not. 'unavailable': the model gave no usable answer. */
export type NarrativeProvenanceStatus = 'verified' | 'unverified' | 'unavailable';

export interface NarrativeProvenance {
  status: NarrativeProvenanceStatus;
  /** 0 to 100. Absent when unavailable. */
  confidence?: number;
  /** The words the model quoted, as it wrote them. Absent when unavailable. */
  quote?: string;
}

const KEYS = ['confidence', 'quote'];
export const PROVENANCE_SYSTEM = 'You are a pathology quality assistant. Return only valid JSON — no markdown, no preamble.';

/** The text a quote may come from: the order's indication, gross, microscopic, ancillary, and the synoptic answers. */
export function narrativeSourceText(ctx: StructuredContext): string {
  const synoptic = (ctx.synoptics ?? []).flatMap(s => s.answers.map(a => `${a.fieldLabel}: ${a.displayValue}`));
  return [ctx.order?.clinicalIndication, ctx.diagnostic?.grossDescription, ctx.diagnostic?.microscopicDescription, ctx.diagnostic?.ancillaryStudies, ...synoptic]
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '').join('\n');
}

/** The question about one finished section (the wording is the AI's instruction, not screen text). */
export function provenancePrompt(sectionTitle: string, sectionText: string, sourceText: string): string {
  return `A report section titled "${sectionTitle}" was written from the SOURCE TEXT below. How well does the source text support what the section says, and which words in it support it most?

SOURCE TEXT:
${sourceText || '(none)'}

SECTION:
${sectionText}

Return exactly this JSON and nothing else: { "confidence": 85, "quote": "exact words copied from the source text" }
Rules:
- confidence is 0 to 100: how clearly the source text supports the section
- quote MUST be an exact, verbatim substring of the source text, at most 12 words, not a paraphrase`;
}

/** Reads the model's answer under the closed schema and checks the quote against the source text (pure). */
export function parseNarrativeProvenance(raw: string, sourceText: string): NarrativeProvenance {
  const unavailable: NarrativeProvenance = { status: 'unavailable' };
  let parsed: unknown;
  try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch { return unavailable; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return unavailable;
  const o = parsed as Record<string, unknown>;
  if (Object.keys(o).length !== KEYS.length || !KEYS.every(k => k in o)) return unavailable;
  const confidence = normaliseAiConfidence(o.confidence);
  if (confidence === undefined || typeof o.quote !== 'string' || !o.quote.trim()) return unavailable;
  const quote = o.quote.trim();
  return { status: matchSourceInText(quote, sourceText).found ? 'verified' : 'unverified', confidence, quote };
}

/** Asks about one finished section. Never throws: no answer is "unavailable". */
export async function requestNarrativeProvenance(
  sectionTitle: string, sectionText: string, ctx: StructuredContext,
  ask: (call: { system: string; prompt: string; maxTokens: number }) => Promise<string>,
): Promise<NarrativeProvenance> {
  if (!sectionText.trim()) return { status: 'unavailable' };
  const source = narrativeSourceText(ctx);
  try {
    return parseNarrativeProvenance(await ask({ system: PROVENANCE_SYSTEM, prompt: provenancePrompt(sectionTitle, sectionText, source), maxTokens: 200 }), source);
  } catch {
    return { status: 'unavailable' };
  }
}
