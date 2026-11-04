// src/components/Worklist/autopsyGrouping.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure, testable extraction of the Worklist's Autopsy branch grouping
// — same discipline as amendmentGrouping.ts/poolGrouping.ts. Real
// feature, per direct follow-up ("Autopsy, there are so few, can we
// just group the records?"): given genuinely low Autopsy case volume,
// a real, dedicated filter tile per Autopsy attribute would be
// overkill — grouping the already-narrow Autopsy branch's own case
// list is the real, right-sized alternative.
//
// Real, deliberate choice of grouping key: resolveAutopsyAccessionStatus.ts
// (temporary vs. fully_authorized) — the one Autopsy-specific status
// this app already, honestly tracks and displays elsewhere (the case
// header badge), never a fabricated new grouping dimension invented
// just for this.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { resolveAutopsyAccessionStatus } from '@/services/autopsy/resolveAutopsyAccessionStatus';

export type AutopsyGroupKey = 'temporary' | 'fully_authorized';

export type AutopsyDividerRow = {
  __divider: true;
  /** i18n key for the divider text (Batch 513, PS-269). */
  labelKey: string;
  count: number;
  isAutopsyGroup: true;
  groupKey: AutopsyGroupKey;
};

const GROUP_ORDER: { key: AutopsyGroupKey; labelKey: string }[] = [
  // Real, deliberate order: temporary accessions (written
  // authorization still pending) surface first — the real, more
  // urgent, less-progressed state a pathologist needs to notice and
  // act on, ahead of cases already fully authorized and free to
  // proceed.
  { key: 'temporary', labelKey: 'worklistTable.autopsyGroup.temporary' },
  { key: 'fully_authorized', labelKey: 'worklistTable.autopsyGroup.fullyAuthorized' },
];

/**
 * Groups the real, already-filtered Autopsy branch case list into (in
 * order): Temporary Accession, Fully Authorized. A case with no real
 * `autopsy` details at all (shouldn't happen — every case reaching
 * this function was already filtered to the Autopsy branch upstream)
 * is silently skipped rather than guessed into a group.
 */
export function buildAutopsyGroupRows(cases: Case[]): (Case | AutopsyDividerRow)[] {
  const groups = new Map<AutopsyGroupKey, Case[]>();
  for (const c of cases) {
    const autopsy = (c as any).autopsy;
    if (!autopsy) continue;
    const key = resolveAutopsyAccessionStatus(autopsy);
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }

  const rows: (Case | AutopsyDividerRow)[] = [];
  for (const { key, labelKey } of GROUP_ORDER) {
    const casesInGroup = groups.get(key);
    if (!casesInGroup || casesInGroup.length === 0) continue;
    rows.push({ __divider: true, labelKey, count: casesInGroup.length, isAutopsyGroup: true, groupKey: key });
    rows.push(...casesInGroup);
  }
  return rows;
}
