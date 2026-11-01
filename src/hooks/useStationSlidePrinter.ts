// src/hooks/useStationSlidePrinter.ts
// Batch 740: the station's slide printer and label layout for a bench screen (the Cytology Preparation bench; the
// Microtome page has the same lookup inline). Errors are message keys under `microtomyWorkstation.hardware`.
import { useEffect, useState } from 'react';
import { printSettingsService, printerProfileService, scanStationService } from '@/services';
import { DEFAULT_SLIDE_LABEL_LAYOUT, type SlideLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

export function useStationSlidePrinter(stationId: string | undefined | null) {
  const [printer, setPrinter] = useState<PrinterProfile | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [labelLayout, setLabelLayout] = useState<SlideLabelLayoutConfig>(DEFAULT_SLIDE_LABEL_LAYOUT);
  useEffect(() => { void printSettingsService.get().then(r => { if (r.ok) setLabelLayout(r.data.slideLabelLayout); }); }, []);
  useEffect(() => {
    let live = true;
    if (!stationId) { setPrinter(null); setErrorKey('noStation'); return; }
    void scanStationService.getById(stationId).then(async st => {
      if (!live) return;
      if (!st.ok || !st.data.supportsPrinting || !st.data.cassetteSlidePrinterProfileId) { setPrinter(null); setErrorKey('notConfigured'); return; }
      const p = await printerProfileService.getById(st.data.cassetteSlidePrinterProfileId);
      if (!live) return;
      if (p.ok && p.data) { setPrinter(p.data); setErrorKey(null); } else { setPrinter(null); setErrorKey('profileMissing'); }
    });
    return () => { live = false; };
  }, [stationId]);
  return { printer, errorKey, labelLayout };
}
