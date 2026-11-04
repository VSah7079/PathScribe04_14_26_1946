// src/services/aiIntegration/synopticFieldsPrompt.ts
// Batch 621: the one prompt for "suggest answers for each synoptic field from the case text". Shared by
// PathScribeAIService.suggestSynopticFields (a case being reported) and the historical-report extraction
// (services/historyExtraction), so the two never drift. Pure. The wording is the AI's instruction, not screen text.
export interface SynopticPromptField { id: string; label: string; options?: Array<{ id: string; label: string }> }
/** finalDiagnosis is for a historical report (Batch 621); a case being reported leaves it out and the prompt is unchanged. */
export interface SynopticPromptCaseText { gross: string; microscopic: string; ancillary: string; finalDiagnosis?: string }

export const SYNOPTIC_FIELDS_SYSTEM = 'You are a pathology AI assistant. Return only valid JSON — no markdown, no preamble.';

export function buildSynopticFieldsPrompt(caseText: SynopticPromptCaseText, fields: readonly SynopticPromptField[]): { system: string; prompt: string; maxTokens: number } {
  const fieldList = fields.map(f => {
    const opts = f.options?.map(o => `${o.id} (${o.label})`).join(', ');
    return opts
      ? `- ${f.id} | ${f.label} | options: [${opts}]`
      : `- ${f.id} | ${f.label} | free text`;
  }).join('\n');
  const prompt = `Analyse the following pathology case and suggest answers for each synoptic field.

${caseText.finalDiagnosis !== undefined ? `FINAL DIAGNOSIS: ${caseText.finalDiagnosis}\n` : ''}GROSS: ${caseText.gross}
MICROSCOPIC: ${caseText.microscopic}
ANCILLARY: ${caseText.ancillary}

FIELDS (id | label | allowed option ids):
${fieldList}

Return JSON: { "field_id": { "value": "option_id_or_string", "confidence": 85, "source": "short quote" } }
Rules:
- value must be an option id when options are listed
- confidence 0–100
- source ≤12 words from the case text
- Only include fields you can answer with confidence ≥30`;
  return { system: SYNOPTIC_FIELDS_SYSTEM, prompt, maxTokens: 1000 };
}
