// src/utils/labels/dispatchScanSlideLabel.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: the slide label produced when a block is scanned at a Microtomy / Sectioning station.
//
// The scan path used to call only dispatchSlideLabel, the engraver stand-in that writes to the console, and marked
// every pending slide "Cut & Placed" whatever the station was set up for. A station with a label printer
// (supportsPrinting) printed nothing, and the slide was then recorded as done, so the Microtome Workstation skipped
// it too (it trusts the once-only ledger in dispatchSlideLabel.ts).
//
// Now the station's two flags are honoured independently, as IScanStationService documents:
//   supportsEngraving → dispatchSlideLabel (engraver dispatch, unchanged)
//   supportsPrinting  → printSlideLabel, the same GS1 / ZPL service the Microtome Workstation's manual Print Next
//                       uses (QZ Tray, PathScribe agent or interface engine, per the printer profile)
// A slide counts as produced only when at least one of them succeeded; the caller leaves the others "Pending Cut" so
// they can be printed from the workstation. Never throws.
// ─────────────────────────────────────────────────────────────────────────────

import { dispatchSlideLabel, wasSlideLabelOutput, markSlideLabelOutput, type SlideLabelDispatchRequest } from './dispatchSlideLabel';
import { printSlideLabel } from './printCassetteSlideLabel';
import { printerProfileService, printSettingsService } from '@/services';
import type { ScanStation } from '@/services/scanStations/IScanStationService';

export type ScanLabelStation = Pick<ScanStation, 'supportsEngraving' | 'supportsPrinting' | 'cassetteSlidePrinterProfileId'>;

export interface ScanSlideLabelDeps {
  dispatchSlideLabel: typeof dispatchSlideLabel;
  printSlideLabel: typeof printSlideLabel;
  getPrinterProfile: (id: string) => Promise<{ ok: boolean; data?: Parameters<typeof printSlideLabel>[1] | null }>;
  getPrintSettings: () => Promise<{ ok: boolean; data?: { gs1Gtin: string; slideLabelLayout: Parameters<typeof printSlideLabel>[3] } }>;
}

const defaultDeps = (): ScanSlideLabelDeps => ({
  dispatchSlideLabel,
  printSlideLabel,
  getPrinterProfile: id => printerProfileService.getById(id) as ReturnType<ScanSlideLabelDeps['getPrinterProfile']>,
  getPrintSettings: () => printSettingsService.get() as ReturnType<ScanSlideLabelDeps['getPrintSettings']>,
});

export interface ScanSlideLabelOutcome {
  /** True when a label was engraved or printed for this slide (or it already had one). */
  produced: boolean;
  engraved: boolean;
  printed: boolean;
  /** Why nothing was produced, in English for the log; the technician sees the slide still pending. */
  reason?: string;
}

export async function dispatchScanSlideLabel(
  request: SlideLabelDispatchRequest,
  station: ScanLabelStation,
  deps: ScanSlideLabelDeps = defaultDeps(),
): Promise<ScanSlideLabelOutcome> {
  if (wasSlideLabelOutput(request.slideId)) return { produced: true, engraved: false, printed: false };
  if (!station.supportsEngraving && !station.supportsPrinting) {
    return { produced: false, engraved: false, printed: false, reason: 'The station has neither engraving nor label printing switched on.' };
  }

  let engraved = false;
  let printed = false;
  let reason: string | undefined;

  if (station.supportsEngraving) {
    try { engraved = (await deps.dispatchSlideLabel(request)).dispatched; } catch (e) { reason = `Engraving failed: ${String(e)}`; }
  }

  if (station.supportsPrinting) {
    try {
      if (!station.cassetteSlidePrinterProfileId) {
        reason = 'The station has no slide printer profile.';
      } else {
        const profile = await deps.getPrinterProfile(station.cassetteSlidePrinterProfileId);
        const settings = await deps.getPrintSettings();
        if (!profile.ok || !profile.data) {
          reason = 'The station\'s slide printer profile was not found.';
        } else {
          const res = await deps.printSlideLabel(
            { fullAccession: request.fullAccession, specimenLabel: request.specimenLabel, blockLabel: request.blockLabel, level: request.level, stainName: request.stainName, slideId: request.slideId, slideDesignation: request.slideDesignation },
            profile.data,
            settings.ok && settings.data ? settings.data.gs1Gtin : '',
            settings.ok && settings.data ? settings.data.slideLabelLayout : undefined,
          );
          if (res.ok) { printed = true; markSlideLabelOutput(request.slideId); } else { reason = res.message; }
        }
      }
    } catch (e) {
      reason = `Printing failed: ${String(e)}`;
    }
  }

  return { produced: engraved || printed, engraved, printed, ...(engraved || printed ? {} : { reason }) };
}
