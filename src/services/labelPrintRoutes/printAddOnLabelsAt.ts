// src/services/labelPrintRoutes/printAddOnLabelsAt.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §5, §8): "print labels at". After an
// add-on order is placed, its new slides' labels are printed at the station the
// pathologist chose, through that station's slide printer, instead of at the
// microtome when the block is cut. Needs print:job:redirect (checked here before
// anything prints). Each label printed is recorded (labelPrintRouteService), so
// the Microtome records the cut without printing it again, and goes on the
// station scan log as "printed" at that station. A label that fails is left for
// the microtome as before. Deps are passed in (testable).
// ─────────────────────────────────────────────────────────────────────────────
import { benchParentItemId } from '../material/materialLineage';
import type { Case } from '@/types/case/Case';
import type { PrinterProfile } from '../printerProfiles/IPrinterProfileService';
import type { SlideLabelLayoutConfig } from '../printSettings/IPrintSettingsService';
import type { NewLabelPrintRoute } from './ILabelPrintRouteService';
import type { StationScanInput } from '../stationScans/recordStationScan';

export interface PrintAtDeps {
  enforce: (capability: string) => Promise<{ allowed: boolean }>;
  getStation: (id: string) => Promise<{ id: string; name: string; supportsPrinting?: boolean; cassetteSlidePrinterProfileId?: string } | null>;
  getPrinter: (profileId: string) => Promise<PrinterProfile | null>;
  getPrintSettings: () => Promise<{ gtin: string; layout?: SlideLabelLayoutConfig }>;
  print: (input: { fullAccession: string; specimenLabel: string; blockLabel: string; level: string; stainName: string; slideId: string; slideDesignation?: 'letters' | 'numbers'; slideSize?: 'standard' | 'large_format' }, printer: PrinterProfile, gtin: string, layout?: SlideLabelLayoutConfig) => Promise<{ ok: boolean; message?: string }>;
  recordRoutes: (routes: NewLabelPrintRoute[]) => Promise<{ ok: boolean }>;
  recordScan: (e: StationScanInput) => void;
  levelOf: (stain: { displayId?: string; level?: string }, index: number) => string;
}

export type PrintAtOutcome =
  | { status: 'printed'; printed: number; failed: number }
  | { status: 'notPermitted' }
  | { status: 'noPrinter' };

/** The slides an order created: ids on `after` that were not on `before`, control slides included (they need labels too). */
export function newSlideIds(before: Pick<Case, 'specimens'>, after: Pick<Case, 'specimens'>): Set<string> {
  const had = new Set((before.specimens ?? []).flatMap(sp => (sp.blocks ?? []).flatMap(b => (b.stains ?? []).map(s => s.id))));
  return new Set((after.specimens ?? []).flatMap(sp => (sp.blocks ?? []).flatMap(b => (b.stains ?? []).map(s => s.id))).filter(id => !had.has(id)));
}

export async function printAddOnLabelsAt(
  input: { caseData: Case; slideIds: Set<string>; stationId: string; actor: { id: string; name: string } },
  deps: PrintAtDeps,
): Promise<PrintAtOutcome> {
  if (!(await deps.enforce('print:job:redirect')).allowed) return { status: 'notPermitted' };
  const station = await deps.getStation(input.stationId);
  if (!station || !station.supportsPrinting || !station.cassetteSlidePrinterProfileId) return { status: 'noPrinter' };
  const printer = await deps.getPrinter(station.cassetteSlidePrinterProfileId);
  if (!printer) return { status: 'noPrinter' };
  const { gtin, layout } = await deps.getPrintSettings();
  const c = input.caseData;
  const fullAccession = c.accession?.fullAccession ?? c.id;
  const routes: NewLabelPrintRoute[] = [];
  let failed = 0;
  for (const sp of c.specimens ?? []) {
    for (const b of sp.blocks ?? []) {
      const stains = b.stains ?? [];
      for (let i = 0; i < stains.length; i++) {
        const s = stains[i];
        if (!input.slideIds.has(s.id)) continue;
        const level = deps.levelOf(s as { displayId?: string }, i);
        const slideId = s.displayId ?? `${fullAccession}-${sp.label}${b.label}-${level}`;
        const r = await deps.print({ fullAccession, specimenLabel: sp.label, blockLabel: b.label, level, stainName: s.stainName, slideId, slideDesignation: c.labelStyle?.slide, ...(s.slideSize ? { slideSize: s.slideSize } : {}) }, printer, gtin, layout);
        if (!r.ok) { failed += 1; continue; }
        routes.push({ stainOrderId: s.id, slideId, caseId: c.id, stationId: station.id, stationName: station.name, byUserId: input.actor.id, byUserName: input.actor.name });
        deps.recordScan({ stationId: station.id, itemId: slideId, materialType: 'slide', caseAccession: fullAccession, userId: input.actor.id, userName: input.actor.name, action: 'printed', result: 'ok', parentItemId: benchParentItemId(fullAccession, { specimenLabel: sp.label, label: b.label }), note: 'Add-on label printed at this station when the order was placed.' });
      }
    }
  }
  if (routes.length > 0) await deps.recordRoutes(routes);
  return { status: 'printed', printed: routes.length, failed };
}
