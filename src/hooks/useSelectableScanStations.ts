// src/hooks/useSelectableScanStations.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 713 (Pete, Oct 28, 2026): every place that offers a scan station to pick
// (the sign-in prompt, the header list) shows only the Active stations the
// signed-in user may use, plus "No station" (which the screens always offer).
// The rule is services/scanStations/stationsForUser.ts; this hook loads the
// stations and the user's facilities (the authorization snapshot reads
// StaffUser.facilityIds; an empty list means all facilities, which is also what
// a Superadmin demo session resolves to) and applies it.
//
// It also records which stored/default station ids are not available to this
// user (services/scanStations/stationAvailability.ts), so the rest of the app
// treats them as "no station" instead of scanning against them silently.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { authorizationService, scanStationService } from '@/services';
import { stationsForUser, unavailableStationIds } from '@/services/scanStations/stationsForUser';
import { setUnavailableStationIds } from '@/services/scanStations/stationAvailability';
import type { ScanStation } from '@/services/scanStations/IScanStationService';
import { useAuth } from '@/contexts/AuthContext';
import { getWorkstationSetting } from '@/utils/workstationSettings';

const DEVICE_KEY = 'pathscribe_current_scan_station_id';

export function useSelectableScanStations() {
  const { user } = useAuth();
  const userId = user?.id;
  const defaultStationId = user?.defaultScanStationId;
  const [stations, setStations] = useState<ScanStation[]>([]);
  const [allStations, setAllStations] = useState<ScanStation[]>([]);

  const reload = useCallback(async () => {
    if (!userId) { setStations([]); setAllStations([]); setUnavailableStationIds([]); return; }
    const [res, snap] = await Promise.all([
      scanStationService.getAll(),
      authorizationService.snapshot().catch(() => null),
    ]);
    if (!res.ok) return;
    const facilityIds = snap?.subject?.facilityIds ?? [];
    setAllStations(res.data);
    setStations(stationsForUser(res.data, facilityIds));
    setUnavailableStationIds(unavailableStationIds([getWorkstationSetting(DEVICE_KEY), defaultStationId], res.data, facilityIds));
  }, [userId, defaultStationId]);

  useEffect(() => { void reload(); }, [reload]);

  return { stations, allStations, reload };
}
