// src/services/cytology/saveRecallSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 640. Saves one country's self-collected recall windows and wording (recallWindows.ts, recallWording.ts) into the
// cytology screening strategy settings, and records who changed what in the audit log. The settings service enforces
// config:cytology-screening-strategy:manage on the write. Audit text is literal English and holds no patient data.
// ─────────────────────────────────────────────────────────────────────────────
import type { ICytologyScreeningStrategyService } from './ICytologyScreeningStrategyService';
import type { RecallWindows, WeeksWindow } from './recallWindows';
import { recallWindowsProblem } from './recallWindows';
import { recallWordingProblem, type RecallWordingConfig } from './recallWording';

export type RecallJurisdictionCode = 'AU' | 'NZ';

export interface RecallSettingsDraft { jurisdiction: RecallJurisdictionCode; windows: RecallWindows; wording: RecallWordingConfig }
export type SaveRecallSettingsOutcome = 'saved' | 'invalid' | 'failed';

const fmt = (w: WeeksWindow | null) => (w ? `${w.min}-${w.max} weeks` : 'as soon as practicable');

export function recallSettingsAuditDetail(j: RecallJurisdictionCode, windows: RecallWindows, wording: RecallWordingConfig, userName: string): string {
  const langs = Object.entries(wording[j] ?? {}).flatMap(([kind, byLang]) => Object.keys(byLang ?? {}).map(l => `${kind}/${l}`));
  return `${userName} saved the ${j} self-collected recall settings. Windows: urgent ${fmt(windows.urgent)}, routine ${fmt(windows.routine)}, Australia repeat ${fmt(windows.repeatAU)}, New Zealand repeat ${fmt(windows.repeatNZ)}. Custom wording: ${langs.length ? langs.join(', ') : 'none (built-in text)'}.`;
}

/** Replaces one country's wording and leaves the other country's as saved. Text is trimmed on save. */
export function withJurisdictionWording(saved: RecallWordingConfig | undefined, j: RecallJurisdictionCode, draft: RecallWordingConfig): RecallWordingConfig {
  const out: RecallWordingConfig = { ...saved };
  const mine = Object.fromEntries(Object.entries(draft[j] ?? {}).map(([kind, byLang]) => [kind, Object.fromEntries(Object.entries(byLang ?? {}).map(([l, t]) => [l, (t ?? '').trim()]).filter(([, t]) => t))]).filter(([, byLang]) => Object.keys(byLang as object).length));
  if (Object.keys(mine).length) out[j] = mine as RecallWordingConfig['AU']; else delete out[j];
  return out;
}

export async function saveRecallSettings(
  draft: RecallSettingsDraft, user: { name: string },
  deps: { strategy: ICytologyScreeningStrategyService; logAudit: (e: { type: 'user'; event: string; detail: string; user: string; caseId: string; confidence: null }) => unknown },
): Promise<SaveRecallSettingsOutcome> {
  if (recallWindowsProblem(draft.windows)) return 'invalid';
  for (const [kind, byLang] of Object.entries(draft.wording[draft.jurisdiction] ?? {}))
    for (const text of Object.values(byLang ?? {})) if (recallWordingProblem(text ?? '', kind as 'clinician_lbc' | 'repeat_collection')) return 'invalid';
  const current = await deps.strategy.get();
  if (!current.ok) return 'failed';
  const r = await deps.strategy.update({
    ...current.data,
    selfCollectedRecallWindowsByJurisdiction: { ...current.data.selfCollectedRecallWindowsByJurisdiction, [draft.jurisdiction]: draft.windows },
    selfCollectedRecallWording: withJurisdictionWording(current.data.selfCollectedRecallWording, draft.jurisdiction, draft.wording),
  });
  if (!r.ok) return 'failed';
  await deps.logAudit({ type: 'user', event: 'RECALL_SETTINGS_CHANGED', detail: recallSettingsAuditDetail(draft.jurisdiction, draft.windows, draft.wording, user.name), user: user.name, caseId: '', confidence: null });
  return 'saved';
}
