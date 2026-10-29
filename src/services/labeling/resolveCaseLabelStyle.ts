// src/services/labeling/resolveCaseLabelStyle.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 715: the label style for a case that already exists (adding a block
// at grossing or on the report page). The style recorded on the case at
// accessioning wins, so a case is labelled one way throughout; an older case
// without one is resolved from its facility now. The facility lookup is passed
// in (no service import here), so it is testable.
// ─────────────────────────────────────────────────────────────────────────────

import type { Facility } from '../facilities/IFacilityService';
import { resolveTenantFacility } from '../auth/resolveTenantFacility';
import { DEFAULT_LABEL_STYLE, type LabelStyle } from './labelStyle';
import { resolveLabelStyleForFacility } from './resolveLabelStyle';

export interface CaseLabelStyleSource {
  labelStyle?: LabelStyle;
  originHospitalId?: string | null;
  order?: { facilityId?: string | null } | null;
}

export interface CaseLabelStyleDeps {
  getFacilities: () => Promise<readonly Facility[]>;
}

/** The facility the case's order came from, by id or legacy tenant id (pure). */
export function orderingFacilityOf(c: CaseLabelStyleSource, facilities: readonly Facility[]): Facility | undefined {
  const id = c.order?.facilityId ?? c.originHospitalId ?? undefined;
  if (!id) return undefined;
  return facilities.find(f => f.id === id) ?? resolveTenantFacility(id, [...facilities]);
}

export async function resolveCaseLabelStyle(c: CaseLabelStyleSource | null | undefined, deps: CaseLabelStyleDeps): Promise<LabelStyle> {
  if (!c) return { ...DEFAULT_LABEL_STYLE };
  if (c.labelStyle) return c.labelStyle;
  let facilities: readonly Facility[] = [];
  try { facilities = await deps.getFacilities(); } catch { /* today's labels */ }
  return resolveLabelStyleForFacility(orderingFacilityOf(c, facilities), facilities);
}
