// src/services/requisitions/requisitionIngestionRunner.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762: "Run ingestion now". In the demonstration (no API server) the browser reads the demo drop folder and
// records what it found (demoRequisitionEngine.ts). With an API server the scheduled function does the work
// (RECURRING_JOBS 'requisition.ingest'), so the browser offers no run: it never reads a hospital file share.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import { usesApiServer } from '../apiServer/serviceSelection';
import { barcodesOnImage, readDropFolder } from './demoRequisitionEngine';
import type { IRequisitionService } from './IRequisitionService';
import type { IngestionRun, RequisitionSource } from './requisitionTypes';

/** The demonstration's drop folder (public/demo-requisitions/). */
export const DEMO_REQUISITION_FOLDER = '/demo-requisitions/';

/** Whether this deployment runs ingestion in the browser (the demonstration only). */
export const ingestionRunsInBrowser = (): boolean => !usesApiServer('requisitions');

/** Runs each enabled source in turn (the service checks requisition:ingestion:run for each source's facility; a
 *  source the user may not run is skipped and named). The demonstration's sources all read its one drop folder; a file
 *  already ingested from it is not ingested again. */
export async function runIngestionNow(sources: readonly RequisitionSource[], service: Pick<IRequisitionService, 'recordIngestion' | 'sweepMissing'>): Promise<ServiceResult<{ runs: IngestionRun[]; refusedSourceIds: string[] }>> {
  if (!ingestionRunsInBrowser()) return { ok: false, error: 'SERVER_RUNS_IT' };
  const runs: IngestionRun[] = [];
  const refusedSourceIds: string[] = [];
  for (const source of sources.filter(s => s.enabled)) {
    const report = await readDropFolder(source, { fetch: (...a) => fetch(...a), readBarcodes: barcodesOnImage, folder: DEMO_REQUISITION_FOLDER });
    const r = await service.recordIngestion(report);
    if (r.ok) runs.push(r.data); else refusedSourceIds.push(source.id);
  }
  if (runs.length === 0 && refusedSourceIds.length > 0) return { ok: false, error: 'NOT_PERMITTED' };
  await service.sweepMissing(); // then look for cases still missing their requisition (the server runs this on its own schedule)
  return { ok: true, data: { runs, refusedSourceIds } };
}
