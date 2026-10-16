// src/services/qualityAssurance/runQaExport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d, D7): a QA report export goes through the app's
// export service. With the API server, the server builds the file from the
// tab's filters and the facility the export is checked for; in the demo the
// browser builds it from the rows on screen, as before (`buildInBrowser`).
// ─────────────────────────────────────────────────────────────────────────────
import { exportService } from '../exports/exportTrackerInstance';
import { runExport } from '../exports/runExport';
import { exportFacilityId, exportKindFor } from '../exports/asyncExportContract';
import type { RunExportOutcome } from '../exports/exportTracker';
import type { CapabilityContext } from '../authorization/evaluateCapability';

export function runQaExport(
  capability: string, filename: string, context: CapabilityContext, parameters: Record<string, unknown>,
  buildInBrowser: () => Promise<unknown>,
  service: Pick<typeof exportService, 'run'> = exportService,
): Promise<RunExportOutcome | unknown> {
  const kind = exportKindFor(capability);
  // Every export capability has a kind (phase2cContracts guard); without one, build it here as before.
  if (!kind) return buildInBrowser();
  return runExport(kind, filename, parameters, buildInBrowser, { facilityId: exportFacilityId(context), service });
}
