// src/services/labelPrintRoutes/printAtDeps.ts
// Batch 730: the app's services behind printAddOnLabelsAt.
import { authorizationService, scanStationService, printerProfileService, printSettingsService, slideLevelOf } from '@/services';
import { printSlideLabel } from '@/utils/labels/printCassetteSlideLabel';
import { markSlideLabelOutput } from '@/utils/labels/dispatchSlideLabel';
import { DEFAULT_SLIDE_LABEL_LAYOUT } from '../printSettings/IPrintSettingsService';
import { labelPrintRouteService } from './labelPrintRouteServiceInstance';
import { recordStationScan } from '../stationScans/recordStationScan';
import type { PrintAtDeps } from './printAddOnLabelsAt';

export const printAtDeps: PrintAtDeps = {
  enforce: key => authorizationService.enforce(key as never),
  getStation: async id => { const r = await scanStationService.getById(id); return r.ok ? r.data : null; },
  getPrinter: async id => { const r = await printerProfileService.getById(id); return r.ok && r.data ? r.data : null; },
  getPrintSettings: async () => { const r = await printSettingsService.get(); return r.ok ? { gtin: r.data.gs1Gtin, layout: r.data.slideLabelLayout ?? DEFAULT_SLIDE_LABEL_LAYOUT } : { gtin: '', layout: DEFAULT_SLIDE_LABEL_LAYOUT }; },
  print: async (input, printer, gtin, layout) => {
    const r = await printSlideLabel(input, printer, gtin, layout);
    if (r.ok) markSlideLabelOutput(input.slideId);
    return r.ok ? { ok: true } : { ok: false, message: (r as { message?: string }).message };
  },
  recordRoutes: async routes => { const r = await labelPrintRouteService.recordPrinted(routes); return { ok: r.ok === true }; },
  recordScan: e => { recordStationScan(e); },
  levelOf: (stain, i) => slideLevelOf(stain, i),
};
