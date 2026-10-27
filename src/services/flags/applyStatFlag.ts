// src/services/flags/applyStatFlag.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (everyday-22): "Apply STAT Flag" (Alt+S, or saying it) applies the STAT flag to the open
// case. It used to only open the Flag Manager. The same capability the Flag Manager needs
// (case:flag:apply) is checked first; the STAT flag is the active case-level flag whose LIS code is
// STAT; a case that already has it is left alone (the action never toggles it off); and the change is
// audited exactly as a Flag Manager save audits it (flag_applied).
// ─────────────────────────────────────────────────────────────────────────────

import type { FlagAuditEntry } from './flagChangeAudit';

export type StatFlagOutcome = 'applied' | 'alreadyStat' | 'notPermitted' | 'noStatFlag' | 'failed';

interface StatFlagDefinition { id: string; name?: string; lisCode?: string; level?: string; active?: boolean }
interface StatCase { caseFlags?: Array<{ flagDefinitionId: string; deletedAt?: string | null }> }

export interface ApplyStatDeps {
  enforce: (capability: string, context: { caseId: string }) => Promise<{ allowed: boolean }>;
  getCase: (caseId: string) => Promise<StatCase | null | undefined>;
  applyFlag: (p: { caseId: string; flagDefinitionId: string }) => Promise<unknown>;
  audit: (entry: FlagAuditEntry) => void;
}

const isStatCode = (d: StatFlagDefinition) => (d.lisCode ?? '').trim().toUpperCase() === 'STAT';

/** The flag catalog's active, case-level STAT flag, if there is one. */
export function findStatFlag(definitions: ReadonlyArray<StatFlagDefinition>): StatFlagDefinition | undefined {
  return definitions.find(d => isStatCode(d) && d.active !== false && (d.level ?? 'case').toLowerCase() === 'case');
}

/** The toast text key for each outcome (the page shows it; no window). */
export const STAT_FLAG_MESSAGE_KEY: Record<StatFlagOutcome, string> = {
  applied: 'synopticReportPage.toast.statFlagApplied',
  alreadyStat: 'synopticReportPage.toast.statFlagAlready',
  notPermitted: 'caseActionPermissions.flagApply',
  noStatFlag: 'synopticReportPage.toast.statFlagMissing',
  failed: 'synopticReportPage.toast.statFlagFailed',
};

export async function applyStatFlagToCase(
  input: { caseId: string; definitions: ReadonlyArray<StatFlagDefinition> },
  deps: ApplyStatDeps,
): Promise<StatFlagOutcome> {
  const { caseId, definitions } = input;
  if (!(await deps.enforce('case:flag:apply', { caseId })).allowed) return 'notPermitted';
  const stat = findStatFlag(definitions);
  if (!stat) return 'noStatFlag';
  try {
    const current = await deps.getCase(caseId);
    const statIds = new Set(definitions.filter(isStatCode).map(d => d.id));
    if ((current?.caseFlags ?? []).some(f => !f.deletedAt && statIds.has(f.flagDefinitionId))) return 'alreadyStat';
    await deps.applyFlag({ caseId, flagDefinitionId: stat.id });
  } catch {
    return 'failed';
  }
  deps.audit({ action: 'flag_applied', caseId, flagName: stat.name ?? stat.id });
  return 'applied';
}
