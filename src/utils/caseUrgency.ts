// src/utils/caseUrgency.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, shared source of truth for "is this case urgent" — both STAT and
// Rush priority count as urgent for queue-ordering, visual treatment, and
// filtering purposes throughout the Worklist.
//
// Confirmed, deliberate product/clinical decision (Pete Nimmo, Aug 2026):
// at the case level, entering either "Urgent" (STAT) or "Rush" typically
// triggers the same high-priority flags for specimen tracking, so merging
// them into one isUrgentCase bucket is correct — not just an engineering
// convenience. Note for future reference: some institutions' own SOPs
// reserve STAT/Urgent strictly for critical clinical emergencies and Rush
// for standard expedited biopsy protocols, distinguishing the two more
// sharply than this app currently does. If a facility-configurable
// distinction is ever needed, this is the single function to change —
// deliberately kept as one shared source rather than re-duplicated.
//
// Real bug found and fixed here: WorklistTable.tsx had its own local
// isUrgentCase() checking priority === 'STAT' || 'Rush', while
// WorklistPage.tsx independently, repeatedly checked 'STAT' only, across
// 7 separate inline occurrences (the Urgent filter tile's click handler,
// its count badge, and pool-urgent detection for both LIS and
// Orchestration cases). 'Rush' is a genuine, first-class CasePriority
// value (see services/cases/ICaseService.ts: 'Routine' | 'Rush' | 'STAT'),
// just never actually assigned in the current seed/demo case data —
// confirmed directly, so this wasn't visibly wrong yet. But it was a real,
// latent trap: the moment a Rush-priority case exists, WorklistTable would
// visually group and style it as urgent (red border, Urgent divider,
// UrgentDot) while WorklistPage's dedicated "Urgent" filter tile would
// neither show it nor count it — a real, meaningful inconsistency a
// pathologist could miss a genuinely urgent case over.
//
// Note: this is distinct from the separate, block-level priority override
// (Specimen.ts's HistologyBlock.priority, same CasePriority type) used
// for individual "material adds" — a specific block/stain that needs
// different urgency than the rest of its case. That field is untouched by
// this function; isUrgentCase only ever reads the case's own
// order.priority.
//
// Single, shared function now used by both files instead of two
// independently-maintained copies that already diverged once.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

export function isUrgentCase(c: Case): boolean {
  return c.order?.priority === 'STAT' || c.order?.priority === 'Rush';
}

