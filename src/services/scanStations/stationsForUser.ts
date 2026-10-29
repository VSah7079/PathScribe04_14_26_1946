// src/services/scanStations/stationsForUser.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 713 (Pete, Oct 28, 2026): "stations should only show the stations the
// signed-in user is authorized to access, plus None."
//
// The rule, in one place (no decision logic in components):
//   • A station is offered only while it is Active.
//   • A user restricted to facilities (StaffUser.facilityIds, the same scope the
//     authorization service reads) is offered only the stations whose
//     facilityId is one of theirs.
//   • A user with no facility restriction (an empty or absent list: all
//     facilities, which is also what a Superadmin support session resolves to)
//     is offered every Active station.
//   • "No station" is not a station and is never filtered; the screens always
//     offer it.
//
// What this is not: it does not stop a person who is allowed a station from
// picking it, and it is not a server-side check. The production API server
// must apply the same rule when it records a scan against a station.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScanStation } from './IScanStationService';

/** True when the facility list restricts the user (a non-empty list). */
export function isFacilityRestricted(facilityIds: readonly string[] | null | undefined): boolean {
  return (facilityIds?.length ?? 0) > 0;
}

/** Whether this user may use a station at all (ignores Active/Inactive). */
export function canUseStation(station: Pick<ScanStation, 'facilityId'>, facilityIds: readonly string[] | null | undefined): boolean {
  return !isFacilityRestricted(facilityIds) || (facilityIds as readonly string[]).includes(station.facilityId);
}

/** The Active stations this user may pick, in the order given. */
export function stationsForUser(stations: readonly ScanStation[], facilityIds: readonly string[] | null | undefined): ScanStation[] {
  return stations.filter(s => s.status === 'Active' && canUseStation(s, facilityIds));
}

/**
 * Of the station ids this computer or user would use (the one stored on this
 * computer, the user's own default), the ones that belong to a facility the
 * user may not use. An id that is not in the list (deleted, or the list is
 * not loaded) is not judged: only a known station in another facility is.
 */
export function unavailableStationIds(
  candidateIds: ReadonlyArray<string | null | undefined>,
  stations: readonly ScanStation[],
  facilityIds: readonly string[] | null | undefined,
): string[] {
  const out = new Set<string>();
  for (const id of candidateIds) {
    if (!id) continue;
    const s = stations.find(x => x.id === id);
    if (s && !canUseStation(s, facilityIds)) out.add(id);
  }
  return [...out];
}
