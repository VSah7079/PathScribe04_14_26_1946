// src/services/historyExtraction/historyExtractionRuntime.ts
// Batch 621: the app's real dependencies for the extraction (the AI call, the published templates, the stores, the permission
// check and the audit log), loaded when first used. The history view calls these two functions and nothing else.
import type { ExtractionAiCall, ExtractionDeps } from './extractHistoricalSynoptic';
import { extractHistoricalSynoptic } from './extractHistoricalSynoptic';
import { readStoredExtraction, runHistoryExtraction, type HistoryExtractionRunDeps, type HistoryExtractionRunInput } from './runHistoryExtraction';

const ENFORCE = 'ai:history-extraction:run';

export async function buildExtractionDeps(): Promise<ExtractionDeps> {
  const [{ callAi }, { resolveAiConfigOverrideForClient }, templates] = await Promise.all([
    import('../aiIntegration/aiProviderService'),
    import('../../components/Config/AI/resolveClientAiModel'),
    import('../templates/templateService'),
  ]);
  return {
    callAi: async (call: ExtractionAiCall) => {
      const r = await callAi({ system: call.system, prompt: call.prompt, maxTokens: call.maxTokens, configOverride: await resolveAiConfigOverrideForClient(call.context.facilityId), context: call.context });
      return { text: r.text, provider: String(r.provider), model: String(r.model) };
    },
    listTemplates: async () => (await templates.listTemplates('published')).filter(t => t.isDiagnostic !== false).map(t => ({ id: t.id, name: t.name, version: t.version, category: t.category })),
    getTemplateFields: async id => {
      const detail = await templates.getTemplate(id);
      return detail.template.sections.flatMap(s => s.fields.map(f => ({ id: f.id, label: f.label, options: f.options?.map(o => ({ id: o.id, label: o.label })) })));
    },
    now: () => new Date().toISOString(),
  };
}

async function buildRunDeps(userName: string): Promise<HistoryExtractionRunDeps> {
  const [{ historyExtractionService, historyExtractionSettingsService }, { authorizationService }, { auditService }] = await Promise.all([
    import('./historyExtractionServiceInstance'),
    import('../authorization/defaultAuthorizationService'),
    import('../auditlog/auditServiceInstance'),
  ]);
  const extractionDeps = await buildExtractionDeps();
  return {
    getSettings: async () => { const r = await historyExtractionSettingsService.getAll(); return r.ok ? r.data : []; },
    enforce: ctx => authorizationService.enforce(ENFORCE, ctx),
    getStored: async id => { const r = await historyExtractionService.getForCase(id); return r.ok ? r.data : null; },
    extract: input => extractHistoricalSynoptic(input, extractionDeps),
    save: e => historyExtractionService.save(e),
    audit: entry => { void auditService.logEvent({ type: 'ai', event: entry.event, detail: entry.detail, user: userName, caseId: entry.caseId, confidence: null }).catch(() => undefined); },
  };
}

/** The stored extraction for a case, if the setting is on and the user may see it. Runs no AI. */
export async function loadStoredHistoryExtraction(input: HistoryExtractionRunInput) {
  return readStoredExtraction(input, await buildRunDeps(''));
}

/** Starts (or reuses) the extraction for a case. Call it after the history is shown: it is not meant to be awaited by the history pull. */
export async function startHistoryExtraction(input: HistoryExtractionRunInput, userName: string) {
  return runHistoryExtraction(input, await buildRunDeps(userName));
}

/** "Flag as wrong": records it for accuracy measurement (needs ai:history-extraction:flag) and audits it (case id and field id only). Changes nothing else. */
export async function flagHistoryExtractionWrong(input: { sourceCaseId: string; fieldId: string | null; templateId: string | null; sourceTextHash: string; userName: string }): Promise<boolean> {
  const [{ historyExtractionService }, { auditService }] = await Promise.all([import('./historyExtractionServiceInstance'), import('../auditlog/auditServiceInstance')]);
  const r = await historyExtractionService.flagAsWrong({ sourceCaseId: input.sourceCaseId, fieldId: input.fieldId, templateId: input.templateId, sourceTextHash: input.sourceTextHash, flaggedBy: input.userName });
  if (!r.ok) return false;
  void auditService.logEvent({
    type: 'user', event: 'HISTORY_EXTRACTION_FLAGGED',
    detail: `AI extraction of a historical report flagged as wrong: ${input.fieldId ? `field ${input.fieldId}` : 'whole extraction'}, template ${input.templateId ?? 'none'}.`,
    user: input.userName, caseId: input.sourceCaseId, confidence: null,
  }).catch(() => undefined);
  return true;
}
