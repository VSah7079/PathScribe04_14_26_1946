// src/services/flags/resolveLisFlagDefinition.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: the flag a LIS-reported flag code stands for. A code the catalog
// doesn't know yet is added to it (autoCreated: true). Moved here from the
// report page's header bar: adding to the flag catalog is a Configuration
// change (config:case-flags:manage), but this one is the LIS sync's, not the
// person's who pressed "Check now", so it uses the catalog unchecked.
// ─────────────────────────────────────────────────────────────────────────────

import type { LisSyncPendingFlag } from '../lisSync/ILisSyncService';
import { flagServiceUnchecked } from './mockFlagService';

export async function resolveLisFlagDefinitionId(pf: LisSyncPendingFlag): Promise<string> {
  const catalog = await flagServiceUnchecked.getAll();
  const existing = catalog.ok ? catalog.data.find(f => f.lisCode === pf.lisCode) : undefined;
  if (existing) return existing.id;
  const created = await flagServiceUnchecked.add({
    name: pf.name,
    lisCode: pf.lisCode,
    description: `Auto-created from LIS sync (code: ${pf.lisCode})`,
    level: pf.specimenId ? 'Specimen' : 'Case',
    severity: pf.severity,
    status: 'Active',
    tagClass: pf.tagClass,
    autoCreated: true,
  });
  if (created.ok) return created.data.id;
  throw new Error((created as { ok: false; error: string }).error);
}
