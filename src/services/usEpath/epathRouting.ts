// src/services/usEpath/epathRouting.ts
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part E, PS-800, Pete Oct 19): which state registry, and so which profile, receives a US ePath report.
// It is the state of the facility that PERFORMED THE WORK, never the patient's address: a lab in one state reports
// to that state's registry whichever state the patient lives in. This file never reads a patient field.
//
// Where the technical work was done at a different facility from the reading lab (technicalComponentFacilityId,
// PS-336), the profile says which counts (facilityBasis; default the technical-component facility).
//
// A facility's profile, in order: the facility's own assignment, the profile for the facility's state, the
// enterprise default assignment. Pure.
// ─────────────────────────────────────────────────────────────────────
import type { EpathProfileAssignment, EpathStateProfile } from './epathProfile';

/** The parts of a facility routing reads (its address state, as the facility record keeps it). */
export interface EpathRoutingFacility { id: string; state?: string }

export interface EpathRoutingInput {
  /** The lab that reads the case. */
  performingFacilityId?: string;
  /** The facility that did the technical work, when it is not the reading lab. */
  technicalComponentFacilityId?: string;
  facilities: readonly EpathRoutingFacility[];
  profiles: readonly EpathStateProfile[];
  assignments: readonly EpathProfileAssignment[];
}

export type EpathRoutingVia = 'facilityOverride' | 'facilityState' | 'enterpriseDefault';
export type EpathRoutingRefusal = 'noFacility' | 'noProfile';

export type EpathRouting =
  | { ok: true; profile: EpathStateProfile; basisFacilityId: string; stateCode: string; via: EpathRoutingVia }
  | { ok: false; reason: EpathRoutingRefusal; basisFacilityId?: string };

const stateOf = (f?: EpathRoutingFacility): string => (f?.state ?? '').trim().toUpperCase();

/** One facility's profile: its own assignment, else the profile for its state (never the example), else the enterprise default. */
export function profileForFacility(facilityId: string, i: Pick<EpathRoutingInput, 'facilities' | 'profiles' | 'assignments'>): { profile: EpathStateProfile; via: EpathRoutingVia } | undefined {
  const byId = (id: string) => i.profiles.find(p => p.id === id);
  const own = i.assignments.find(a => a.facilityId === facilityId);
  const ownProfile = own && byId(own.profileId);
  if (ownProfile) return { profile: ownProfile, via: 'facilityOverride' };
  const state = stateOf(i.facilities.find(f => f.id === facilityId));
  const forState = state ? i.profiles.find(p => !p.example && p.state === state) : undefined;
  if (forState) return { profile: forState, via: 'facilityState' };
  const def = i.assignments.find(a => a.facilityId === null);
  const defProfile = def && byId(def.profileId);
  return defProfile ? { profile: defProfile, via: 'enterpriseDefault' } : undefined;
}

export function resolveEpathRouting(i: EpathRoutingInput): EpathRouting {
  const reading = i.performingFacilityId;
  const technical = i.technicalComponentFacilityId && i.technicalComponentFacilityId !== reading ? i.technicalComponentFacilityId : undefined;
  if (!reading && !technical) return { ok: false, reason: 'noFacility' };
  // Technical-component facility first when there is one, each judged by the basis its own profile states.
  const candidates: { id: string; role: 'technicalComponent' | 'reading' | 'both' }[] = technical && reading
    ? [{ id: technical, role: 'technicalComponent' }, { id: reading, role: 'reading' }]
    : [{ id: (technical ?? reading)!, role: 'both' }];
  for (const c of candidates) {
    const found = profileForFacility(c.id, i);
    if (found && (c.role === 'both' || found.profile.facilityBasis === c.role)) {
      const facilityState = stateOf(i.facilities.find(f => f.id === c.id));
      return { ok: true, profile: found.profile, basisFacilityId: c.id, stateCode: facilityState || found.profile.state, via: found.via };
    }
  }
  return { ok: false, reason: 'noProfile', basisFacilityId: candidates[0].id };
}
