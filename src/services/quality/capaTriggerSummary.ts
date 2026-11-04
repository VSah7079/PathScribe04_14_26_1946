// src/services/quality/capaTriggerSummary.ts
// Batch 441: what the QA Configuration Center's CAPA Trigger column shows for
// an activity type, moved out of the screen. Pure; the screen translates the
// severities and joins them in the user's language.
import type { QaCapaTriggerRule } from '@/types/quality/QaActivityType';
import type { QaDiscordanceSeverity } from '@/types/quality/QaActivityRecord';

export interface CapaTriggerSummary {
  severities: QaDiscordanceSeverity[];
  /** The deficiency type's name, or its id when it no longer exists, or null when none is chosen. */
  deficiencyName: string | null;
  /** Batch 439 (PS-148): only for reviews made after the report was released. */
  postSignOutOnly: boolean;
}

/** Null when the type recommends no CAPA. */
export function capaTriggerSummary(
  rule: QaCapaTriggerRule | undefined,
  deficiencyTypes: ReadonlyArray<{ id: string; name: string }>,
): CapaTriggerSummary | null {
  if (!rule?.triggerSeverities?.length) return null;
  const id = rule.deficiencyTypeId;
  return {
    severities: [...rule.triggerSeverities],
    deficiencyName: id ? deficiencyTypes.find(d => d.id === id)?.name ?? id : null,
    postSignOutOnly: !!rule.postSignOutOnly,
  };
}
