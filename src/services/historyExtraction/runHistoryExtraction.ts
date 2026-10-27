// src/services/historyExtraction/runHistoryExtraction.ts
// Batch 621: what happens when a historical case is opened or refreshed in the history view. Not blocking (the caller starts
// it after the history is shown), never throws, advisory only.
//
//   1. The setting for the case's performing facility must be ON (enterprise default OFF; facility override).
//   2. The user needs ai:history-extraction:run (checked here, audited by the authorization service). Without it nothing runs
//      and nothing is shown.
//   3. A stored extraction for the same source text is returned as it is: no AI call. A recorded failure is tried again.
//   4. Otherwise the runner asks the AI (through callAi, so the vendor policy applies), the result is stored beside the case,
//      and one audit entry is written: literal English, the case id, the template id and counts. No patient text.
// Contract: docs/architecture/HISTORY_AI_EXTRACTION_API.md
// ─────────────────────────────────────────────────────────────────────────────
import { hashSourceText, isCurrent, resolveHistoryExtraction, type HistoryExtraction, type HistoryExtractionSetting, type HistorySourceText } from './historyExtraction';
import type { ExtractionInput } from './extractHistoricalSynoptic';

export type HistoryExtractionRunOutcome =
  | { state: 'off' }
  | { state: 'notPermitted' }
  | { state: 'ready'; extraction: HistoryExtraction; ran: boolean };

export interface HistoryExtractionRunDeps {
  getSettings: () => Promise<HistoryExtractionSetting[]>;
  enforce: (context: { caseId: string | null; facilityId: string | null }) => Promise<{ allowed: boolean }>;
  getStored: (sourceCaseId: string) => Promise<HistoryExtraction | null>;
  extract: (input: ExtractionInput) => Promise<HistoryExtraction>;
  save: (extraction: HistoryExtraction) => Promise<unknown>;
  audit: (entry: { event: string; detail: string; caseId: string }) => void;
}

export interface HistoryExtractionRunInput { sourceCaseId: string; facilityId?: string; text: HistorySourceText }

/** What the history view may show for a case right now, without running anything: the stored extraction, when the setting is on and the user may. */
export async function readStoredExtraction(input: HistoryExtractionRunInput, deps: Pick<HistoryExtractionRunDeps, 'getSettings' | 'enforce' | 'getStored'>): Promise<HistoryExtractionRunOutcome | { state: 'none' }> {
  try {
    if (!resolveHistoryExtraction(await deps.getSettings(), input.facilityId ?? null).enabled) return { state: 'off' };
    if (!(await deps.enforce({ caseId: input.sourceCaseId, facilityId: input.facilityId ?? null })).allowed) return { state: 'notPermitted' };
    const stored = await deps.getStored(input.sourceCaseId);
    return stored ? { state: 'ready', extraction: stored, ran: false } : { state: 'none' };
  } catch {
    return { state: 'none' };
  }
}

export async function runHistoryExtraction(input: HistoryExtractionRunInput, deps: HistoryExtractionRunDeps): Promise<HistoryExtractionRunOutcome | { state: 'none' }> {
  try {
    const gate = await readStoredExtraction(input, deps);
    if (gate.state === 'off' || gate.state === 'notPermitted') return gate;
    const stored = gate.state === 'ready' ? gate.extraction : null;
    if (isCurrent(stored, hashSourceText(input.text))) return { state: 'ready', extraction: stored as HistoryExtraction, ran: false };
    const extraction = await deps.extract({ sourceCaseId: input.sourceCaseId, facilityId: input.facilityId, text: input.text, existing: stored });
    await deps.save(extraction).catch(() => undefined);
    deps.audit({
      event: 'HISTORY_EXTRACTION_RUN',
      detail: `AI extraction of a historical report ${extraction.status}${extraction.failure ? ` (${extraction.failure})` : ''}: template ${extraction.templateId ?? 'none'}, ${extraction.fields.length} field(s). Advisory only, not verified.`,
      caseId: input.sourceCaseId,
    });
    return { state: 'ready', extraction, ran: true };
  } catch {
    return { state: 'none' };
  }
}
