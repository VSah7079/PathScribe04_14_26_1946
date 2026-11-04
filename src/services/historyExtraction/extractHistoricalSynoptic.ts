// src/services/historyExtraction/extractHistoricalSynoptic.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 621: the extraction runner. Given a historical case's Final Diagnosis and Microscopic text, it asks the existing AI
// synoptic capability (the same prompt as suggestSynopticFields, aiIntegration/synopticFieldsPrompt.ts) which template fits and
// what its fields read, and returns the metadata to keep beside the case.
//
//   • Every AI call goes through callAi with a context naming the feature ('history-extraction') and the case and facility, so
//     the PS-558 vendor policy (AI not allowed for a jurisdiction or facility) is enforced exactly as everywhere else.
//   • Cached by a hash of the source text: the same text never makes a second call.
//   • Never throws. A failure comes back as a recorded `failed` extraction with a fixed code, so the history view is unaffected.
//   • Advisory only (see historyExtraction.ts). Nothing here writes to a case.
// Pure but for the injected dependencies. Contract: docs/architecture/HISTORY_AI_EXTRACTION_API.md
// ─────────────────────────────────────────────────────────────────────────────
import { checkSuggestedAnswer } from '../aiIntegration/aiSuggestionRules';
import { buildSynopticFieldsPrompt, type SynopticPromptField } from '../aiIntegration/synopticFieldsPrompt';
import {
  HISTORY_EXTRACTION_VERIFICATION, hashSourceText, isCurrent,
  type ExtractedField, type HistoryExtraction, type HistoryExtractionFailure, type HistorySourceText,
} from './historyExtraction';

export interface ExtractionTemplate { id: string; name: string; version: string; category: string }

export interface ExtractionAiCall {
  system: string;
  prompt: string;
  maxTokens: number;
  context: { feature: 'history-extraction'; caseId: string; facilityId?: string };
}
export interface ExtractionAiAnswer { text: string; provider: string; model: string }

export interface ExtractionDeps {
  /** callAi, with the facility's model already resolved. Throws AiNotAvailableError when the vendor policy refuses. */
  callAi: (call: ExtractionAiCall) => Promise<ExtractionAiAnswer>;
  /** Published diagnostic templates the report could have been made on. */
  listTemplates: () => Promise<ExtractionTemplate[]>;
  getTemplateFields: (templateId: string) => Promise<SynopticPromptField[]>;
  now: () => string;
}

export interface ExtractionInput {
  sourceCaseId: string;
  facilityId?: string;
  text: HistorySourceText;
  /** What is stored for this case already, if anything. */
  existing?: HistoryExtraction | null;
}

const isVendorRefusal = (e: unknown) => !!e && typeof e === 'object' && (e as { code?: unknown }).code === 'AI_VENDOR_NOT_ALLOWED';

const parseJson = (raw: string): unknown => JSON.parse(raw.replace(/```json|```/g, '').trim());

/** The instruction for choosing one template (or none). The wording is the AI's instruction, not screen text. */
export function buildTemplateChoicePrompt(text: HistorySourceText, templates: readonly ExtractionTemplate[]): { system: string; prompt: string; maxTokens: number } {
  const list = templates.map(t => `- ${t.id} | ${t.name} | ${t.category}`).join('\n');
  return {
    system: 'You are a pathology AI assistant. Return only valid JSON — no markdown, no preamble.',
    prompt: `Choose which ONE synoptic report template best fits this historical pathology report, so a pathologist can look at it. Use only the template ids listed; if none is a reasonable fit, answer null.

FINAL DIAGNOSIS: ${text.diagnosis}
MICROSCOPIC: ${text.microscopic}

TEMPLATES (id | name | category):
${list}

Return JSON: { "templateId": "id_or_null", "confidence": 85 }`,
    maxTokens: 200,
  };
}

const base = (input: ExtractionInput, hash: string, now: string): Pick<HistoryExtraction, 'sourceCaseId' | 'sourceTextHash' | 'extractedAt' | 'verification' | 'fields'> =>
  ({ sourceCaseId: input.sourceCaseId, sourceTextHash: hash, extractedAt: now, verification: HISTORY_EXTRACTION_VERIFICATION, fields: [] });

const failed = (b: ReturnType<typeof base>, failure: HistoryExtractionFailure): HistoryExtraction => ({ ...b, status: 'failed', failure });

/** Keeps only fields the template has, with an option id where options are listed, and a confidence of at least 30
 *  (Batch 651: the checks are services/aiIntegration/aiSuggestionRules.ts, shared with the live-case suggestions). */
export function cleanFields(parsed: unknown, fields: readonly SynopticPromptField[]): ExtractedField[] {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const answers = parsed as Record<string, unknown>;
  const out: ExtractedField[] = [];
  for (const f of fields) {
    const checked = checkSuggestedAnswer(f, answers[f.id]);
    if (checked.ok === false) continue;
    let display = checked.raw;
    if (f.options?.length) display = checked.raw.split(', ').map(id => f.options!.find(o => o.id === id)!.label).join(', ');
    out.push({ fieldId: f.id, label: f.label, value: checked.raw, display, ...(checked.confidence !== undefined ? { confidence: checked.confidence } : {}) });
  }
  return out;
}

/** Returns the extraction to keep (the cached one when the text has not changed). Never throws. */
export async function extractHistoricalSynoptic(input: ExtractionInput, deps: ExtractionDeps): Promise<HistoryExtraction> {
  const hash = hashSourceText(input.text);
  if (isCurrent(input.existing, hash)) return input.existing as HistoryExtraction;
  const b = base(input, hash, deps.now());
  if (!input.text.diagnosis.trim() && !input.text.microscopic.trim()) return { ...b, status: 'noText' };
  const context = { feature: 'history-extraction' as const, caseId: input.sourceCaseId, ...(input.facilityId ? { facilityId: input.facilityId } : {}) };
  try {
    const templates = await deps.listTemplates();
    if (templates.length === 0) return failed(b, 'noTemplates');

    const choice = buildTemplateChoicePrompt(input.text, templates);
    const chosen = await deps.callAi({ ...choice, context });
    const picked = parseJson(chosen.text) as { templateId?: unknown; confidence?: unknown } | null;
    const template = picked && typeof picked.templateId === 'string' ? templates.find(t => t.id === picked.templateId) : undefined;
    const templateConfidence = picked && typeof picked.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(picked.confidence))) : undefined;
    if (!template) return { ...b, status: 'noTemplate', aiService: { provider: chosen.provider, model: chosen.model } };

    const fields = await deps.getTemplateFields(template.id);
    const built = buildSynopticFieldsPrompt({ gross: '', microscopic: input.text.microscopic, ancillary: '', finalDiagnosis: input.text.diagnosis }, fields);
    const answered = await deps.callAi({ system: built.system, prompt: built.prompt, maxTokens: built.maxTokens, context });
    const cleaned = cleanFields(parseJson(answered.text), fields);
    return {
      ...b, status: 'extracted', fields: cleaned,
      templateId: template.id, templateName: template.name, templateVersion: template.version,
      ...(templateConfidence !== undefined ? { templateConfidence } : {}),
      aiService: { provider: answered.provider, model: answered.model },
    };
  } catch (e) {
    if (isVendorRefusal(e)) return failed(b, 'vendorNotAllowed');
    return failed(b, e instanceof SyntaxError ? 'badResponse' : 'aiError');
  }
}
