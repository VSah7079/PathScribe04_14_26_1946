// src/services/quality/frozenReconciliationPlan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Frozen-to-permanent reconciliation at sign-out: which frozen specimens the
// signer must reconcile, and in what order.
//
// Batch 652: the rule used to take only the FIRST non-deferred frozen specimen
// of the first merged session, so a case with frozen sections on parts A and B
// reconciled A and silently skipped B. It now lists every non-deferred frozen
// specimen of every session merged into the case. The queue hands them to the
// reconciliation modal one at a time; sign-out finishes after the last.
//
// What the comparison is: the signer records the FINAL CATEGORY (benign,
// malignant, atypical/suspicious) and the rule compares it with the frozen
// category (discordanceStage). It is a category match decided by a rule and
// confirmed by the pathologist. There is no AI model in this path. The stored
// setting key is still `aiComparisonEnabled` so saved settings keep working;
// the screens call it the automatic category comparison.
// ─────────────────────────────────────────────────────────────────────────────
import type { FrozenCategory, IntraoperativeEntry } from '@/types/intraop/IntraoperativeEntry';

export interface FrozenReconciliationItem {
  specimenId: string;
  caseType: string;
  frozenCategory: FrozenCategory;
  frozenDx: string;
}

export interface ConcordanceGate {
  /** Stored key kept for migration safety; it switches the category comparison. */
  aiComparisonEnabled: boolean;
  reviewScreenEnabled: boolean;
}

/** Every non-deferred frozen specimen of every session merged into the case. [] when the settings do not ask for the screen. */
export function planFrozenReconciliation(
  caseId: string,
  sessions: readonly Pick<IntraoperativeEntry, 'status' | 'mergedIntoCaseId' | 'specimens'>[],
  settings: ConcordanceGate,
): FrozenReconciliationItem[] {
  if (!settings.aiComparisonEnabled || !settings.reviewScreenEnabled) return [];
  return sessions
    .filter(s => s.status === 'merged' && s.mergedIntoCaseId === caseId)
    .flatMap(s => s.specimens)
    .filter(sp => sp.frozenCategory && sp.frozenCategory !== 'deferred')
    .map(sp => ({
      specimenId: sp.id,
      caseType: sp.specimenLabel,
      frozenCategory: sp.frozenCategory!,
      frozenDx: sp.frozenSectionDiagnosis ?? '',
    }));
}

/** The hand-off between specimens. Plain data, held by the sign-out hook for one sign-out attempt. */
export interface ReconciliationQueue {
  load(items: readonly FrozenReconciliationItem[]): void;
  next(): FrozenReconciliationItem | undefined;
  clear(): void;
}

export function createReconciliationQueue(): ReconciliationQueue {
  let items: FrozenReconciliationItem[] = [];
  return {
    load(i) { items = [...i]; },
    next() { return items.shift(); },
    clear() { items = []; },
  };
}
