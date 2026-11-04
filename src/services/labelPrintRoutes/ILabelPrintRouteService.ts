// src/services/labelPrintRoutes/ILabelPrintRouteService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §5, §8): "print labels at": an add-on
// order's slide labels can be printed at a chosen station when the order is
// placed, instead of at the microtome when the block is cut. Each slide whose
// label was printed elsewhere is recorded here, so the Microtome does not print
// it again (it still records the cut). Printing at another station needs
// print:job:redirect (the print-queue redirect capability the spec names as the
// starting point); the printer is reached through the station, as every bench
// label is (interface boundary, §8).
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';

export interface LabelPrintRoute {
  /** The slide (StainOrder) id. */
  stainOrderId: string;
  /** The slide's own identifier, as printed. */
  slideId: string;
  caseId: string;
  stationId: string;
  stationName: string;
  printedAt: string;
  byUserId: string;
  byUserName: string;
}

export type NewLabelPrintRoute = Omit<LabelPrintRoute, 'printedAt'>;

export interface ILabelPrintRouteService {
  /** Records labels printed at another station. Needs print:job:redirect (NOT_PERMITTED). */
  recordPrinted(routes: NewLabelPrintRoute[]): Promise<ServiceResult<LabelPrintRoute[]>>;
  /** The routes for these slides (any not printed elsewhere are absent). */
  getForStainOrders(stainOrderIds: string[]): Promise<ServiceResult<LabelPrintRoute[]>>;
}
