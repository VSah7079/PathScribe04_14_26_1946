// src/services/labeling/resolveLabelStyle.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 715: the one place that decides which label style applies. Pure.
//
//   resolveLabelStyle(enterprise, facility)  ->  { specimen, block, slide }
//
// Per level, the first of these that sets it wins:
//   1. the facility's own choice (Facility.labelStyle, or its legacy preset)
//   2. the enterprise's choice (the enterprise is a Facility with isEnterprise)
//   3. DEFAULT_LABEL_STYLE (specimen letters, block numbers, slide numbers)
//
// "Facility" here is the performing lab. resolveLabelStyleForFacility walks
// ordering client -> its performing lab -> that lab's enterprise, so a client
// that carries a preset of its own (before this batch, the only place the
// setting lived) keeps its labels.
// ─────────────────────────────────────────────────────────────────────────────

import { enterpriseOf } from '../facilities/resolveCasePerformingLab';
import { resolvePerformingLabFacilityId, type Facility } from '../facilities/IFacilityService';
import { DEFAULT_LABEL_STYLE, LABEL_LEVELS, ownLabelStyle, type LabelStyle, type LabelStyleCarrier, type LabelStyleSetting } from './labelStyle';

/** The style for a list of records, most specific first (pure). */
export function resolveLabelStyleChain(chain: ReadonlyArray<LabelStyleCarrier | null | undefined>): LabelStyle {
  const out: LabelStyle = { ...DEFAULT_LABEL_STYLE };
  for (const level of LABEL_LEVELS) {
    for (const record of chain) {
      const v = ownLabelStyle(record)[level];
      if (v) { out[level] = v; break; }
    }
  }
  return out;
}

/** The style for a performing facility under its enterprise (pure). */
export function resolveLabelStyle(enterprise: LabelStyleCarrier | null | undefined, facility: LabelStyleCarrier | null | undefined): LabelStyle {
  return resolveLabelStyleChain([facility, enterprise]);
}

/** Where each level's value comes from, for the "(inherited)" notes in the editor (pure). */
export function labelStyleSources(
  enterprise: LabelStyleCarrier | null | undefined,
  facility: LabelStyleCarrier | null | undefined,
): Record<(typeof LABEL_LEVELS)[number], 'facility' | 'enterprise' | 'default'> {
  const own = ownLabelStyle(facility);
  const ent = ownLabelStyle(enterprise);
  const src = (l: (typeof LABEL_LEVELS)[number]) => (own[l] ? 'facility' : ent[l] ? 'enterprise' : 'default') as 'facility' | 'enterprise' | 'default';
  return { specimen: src('specimen'), block: src('block'), slide: src('slide') };
}

/**
 * The style that applies to work for `facility` (an ordering client or a lab):
 * the facility, then the lab that performs its work, then that lab's
 * enterprise (pure; the caller passes the facility list).
 */
export function resolveLabelStyleForFacility(facility: Facility | null | undefined, facilities: readonly Facility[]): LabelStyle {
  if (!facility) return { ...DEFAULT_LABEL_STYLE };
  const labId = resolvePerformingLabFacilityId(facility);
  const lab = labId && labId !== facility.id ? facilities.find(f => f.id === labId) : undefined;
  const enterprise = enterpriseOf(lab ?? facility, facilities);
  return resolveLabelStyleChain([facility, lab, enterprise]);
}

/** A stored setting reduced to the three known parts (drops anything else) (pure). */
export function cleanLabelSetting(setting: LabelStyleSetting | null | undefined): LabelStyleSetting {
  return ownLabelStyle({ labelStyle: setting });
}
