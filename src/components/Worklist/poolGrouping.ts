// src/components/Worklist/poolGrouping.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure, testable extraction of the Worklist's pool sub-grouping logic.
// Groups pool-status cases by their actual pool (poolName), each with its
// own urgent/normal two-tier split - matching the existing urgent-first
// non-pool sections, just keyed per-pool instead of applied globally.
// Pools containing at least one urgent case sort before pools that don't;
// alphabetical within each urgency tier.
//
// Real fix included here: divider rows now carry explicit isUrgent/isPool
// flags instead of relying on exact-string matches against row.label
// ('Pool', 'Pool — Urgent') - those matches silently broke the moment
// labels became dynamic per-pool names (e.g. "GI Pool — Urgent"), a real
// styling regression introduced by this same file's own earlier version.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

export type PoolDividerRow = {
  __divider: true;
  label: string;
  count: number;
  isPool: true;
  isUrgent: boolean;
  /** Raw grouping key (poolName/poolId), stable across re-renders - use this,
   *  not label, as the key for collapse/expand state. */
  poolKey: string;
  /** True if the viewing user is not a member of this pool while it has
   *  membership restriction enabled - i.e. they can see it's there but
   *  can't claim from it. Worklist uses this to default the group collapsed. */
  restrictedForMe: boolean;
};

export interface SubspecialtyForRestrictionCheck {
  id: string;
  name: string;
  isWorkgroupEnabled: boolean;
  userIds: string[];
}

/** Given the real Subspecialty records and the viewing user's id, returns
 *  the set of pool keys (matched by name or id - a case's poolName could
 *  be either) that this user can see but cannot claim from: membership
 *  restriction is on for that pool, and this user isn't in userIds. A
 *  pool key matching no real Subspecialty record (e.g. the plain-string
 *  fallback pool) is correctly treated as unrestricted - there's nothing
 *  to restrict against. */
export function computeRestrictedPoolKeys(
  subspecialties: SubspecialtyForRestrictionCheck[],
  currentUserId: string | undefined
): Set<string> {
  const restricted = new Set<string>();
  for (const sub of subspecialties) {
    if (!sub.isWorkgroupEnabled) continue;
    const isMember = !!currentUserId && sub.userIds.includes(currentUserId);
    if (isMember) continue;
    restricted.add(sub.name);
    restricted.add(sub.id);
  }
  return restricted;
}

export function buildPoolGroupRows(
  pool: Case[],
  isUrgentCase: (c: Case) => boolean,
  restrictedPoolKeys: ReadonlySet<string> = new Set()
): (Case | PoolDividerRow)[] {
  const poolGroups = new Map<string, Case[]>();
  for (const c of pool) {
    const key = (c as any).poolName ?? (c as any).poolId ?? 'Pool';
    const list = poolGroups.get(key) ?? [];
    list.push(c);
    poolGroups.set(key, list);
  }

  const sortedPoolNames = Array.from(poolGroups.keys()).sort((a, b) => {
    const aUrgent = poolGroups.get(a)!.some(isUrgentCase);
    const bUrgent = poolGroups.get(b)!.some(isUrgentCase);
    if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
    return a.localeCompare(b);
  });

  const rows: (Case | PoolDividerRow)[] = [];
  for (const poolName of sortedPoolNames) {
    const casesInPool     = poolGroups.get(poolName)!;
    const urgentInPool    = casesInPool.filter(isUrgentCase);
    const normalInPool    = casesInPool.filter(c => !isUrgentCase(c));
    const restrictedForMe = restrictedPoolKeys.has(poolName);
    if (urgentInPool.length > 0) {
      rows.push({ __divider: true, label: `${poolName} — Urgent`, count: urgentInPool.length, isPool: true, isUrgent: true, poolKey: poolName, restrictedForMe });
      rows.push(...urgentInPool);
    }
    if (normalInPool.length > 0) {
      rows.push({ __divider: true, label: poolName, count: normalInPool.length, isPool: true, isUrgent: false, poolKey: poolName, restrictedForMe });
      rows.push(...normalInPool);
    }
  }
  return rows;
}

/**
 * Splits buildPoolGroupRows' own output into the urgent-tier divider+case
 * groups vs. everything else — additive, doesn't change that function's
 * own behavior or its existing test coverage. Built for a real, direct
 * request: unassigned + urgent cases (someone needs to claim these AND
 * they're time-sensitive) should sort to the very top of the whole
 * worklist, ahead of even assigned/non-pool urgent cases — not buried at
 * the bottom the way every pool case previously was, urgent or not.
 * Each pool's own urgent divider ('{poolName} — Urgent') and the case
 * rows immediately following it (up to the next divider) move to
 * urgentRows; every other row — normal-tier pool dividers and their
 * cases — stays in normalRows, in the same relative order
 * buildPoolGroupRows already produced.
 */
export function splitPoolRowsByUrgency(
  rows: (Case | PoolDividerRow)[]
): { urgentRows: (Case | PoolDividerRow)[]; normalRows: (Case | PoolDividerRow)[] } {
  const urgentRows: (Case | PoolDividerRow)[] = [];
  const normalRows: (Case | PoolDividerRow)[] = [];
  let inUrgentGroup = false;
  for (const row of rows) {
    if ('__divider' in row) inUrgentGroup = row.isUrgent;
    (inUrgentGroup ? urgentRows : normalRows).push(row);
  }
  return { urgentRows, normalRows };
}
