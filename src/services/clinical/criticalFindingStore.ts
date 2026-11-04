// src/services/clinical/criticalFindingStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-323: keeps the critical findings flagged for a case, so the highlight is
// still there after the case is saved and reopened (they used to live only in
// page state until Finalize was pressed again). Presentation data only: the
// saved report text is never touched. Stored per case through mockStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import type { CriticalFindingFlag } from './detectCriticalFindings';

export const CRITICAL_FINDINGS_KEY = 'critical_findings_by_case_v1';

type Store = Record<string, CriticalFindingFlag[]>;

export function loadCriticalFindings(caseId: string): CriticalFindingFlag[] {
  const found = storageGet<Store>(CRITICAL_FINDINGS_KEY, {})[caseId];
  return Array.isArray(found) ? found : [];
}

/** An empty list clears the case's entry. */
export function saveCriticalFindings(caseId: string, findings: CriticalFindingFlag[]): void {
  const all = { ...storageGet<Store>(CRITICAL_FINDINGS_KEY, {}) };
  if (findings.length === 0) delete all[caseId];
  else all[caseId] = findings;
  storageSet(CRITICAL_FINDINGS_KEY, all);
}
