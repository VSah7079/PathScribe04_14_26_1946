// src/services/scanStations/stationAvailability.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 713: the station ids that are set on this computer (or are the user's
// default) but belong to a facility the signed-in user may not use.
//
// In memory only, for this tab and this sign-in: the computer's stored station
// is NOT cleared, because the next person to sign in here may be allowed it.
// Every reader of "the current station" (useCurrentScanStation,
// utils/effectiveScanStation) treats a listed id as "no station", so a scan is
// never recorded against a station the user may not use. The list is set by
// useSelectableScanStations once it has the stations and the user's facilities,
// and emptied at sign-out.
// ─────────────────────────────────────────────────────────────────────────────

let unavailable: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

export function getUnavailableStationIds(): ReadonlySet<string> { return unavailable; }

export function isStationUnavailable(id: string | null | undefined): boolean {
  return !!id && unavailable.has(id);
}

export function setUnavailableStationIds(ids: readonly string[]): void {
  const same = ids.length === unavailable.size && ids.every(i => unavailable.has(i));
  if (same) return;
  unavailable = new Set(ids);
  listeners.forEach(fn => fn());
}

export function subscribeStationAvailability(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
