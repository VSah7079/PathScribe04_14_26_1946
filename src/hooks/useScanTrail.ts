// src/hooks/useScanTrail.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.4): loads the station scan trail of a
// case (or one item) for ScanTrailPanel, only when asked for (the panel is closed
// until opened). Reading the trail needs station:scan-history:view, checked by
// the service; a refusal shows as `refused`. The rules are in
// services/stationScans/stationTrailRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { stationScanEventService } from '@/services';
import { scanTrail } from '@/services/stationScans/stationTrailRules';
import type { StationScanEvent } from '@/services/stationScans/IStationScanEventService';

export interface ScanTrailState {
  open: boolean;
  loading: boolean;
  refused: boolean;
  events: StationScanEvent[];
  toggle: () => void;
  refresh: () => Promise<void>;
}

export function useScanTrail(caseAccession: string | undefined, itemId?: string): ScanTrailState {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refused, setRefused] = useState(false);
  const [events, setEvents] = useState<StationScanEvent[]>([]);

  const refresh = useCallback(async () => {
    if (!caseAccession) { setEvents([]); return; }
    setLoading(true);
    const res = await stationScanEventService.query({ caseAccession });
    setLoading(false);
    if (res.ok === true) { setRefused(false); setEvents(scanTrail(res.data, { itemId })); }
    else { setRefused(true); setEvents([]); }
  }, [caseAccession, itemId]);

  // A different case or item closes the trail, so it never shows another case's history.
  useEffect(() => { setOpen(false); setEvents([]); }, [caseAccession, itemId]);
  useEffect(() => { if (open) void refresh(); }, [open, refresh]);

  const toggle = useCallback(() => setOpen(o => !o), []);
  return { open, loading, refused, events, toggle, refresh };
}
