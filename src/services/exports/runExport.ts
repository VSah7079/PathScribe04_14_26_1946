// src/services/exports/runExport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d, D7): the one call every export button makes.
// With the API server, the server builds the file from `parameters` (the
// screen's filters); in the demo, `buildInBrowser` builds it as before.
// ─────────────────────────────────────────────────────────────────────────────
import { exportService } from './exportTrackerInstance';
import { exportTitleFromFilename, type ExportKind } from './asyncExportContract';
import type { RunExportOutcome } from './exportTracker';

export function runExport(
  kind: ExportKind,
  filename: string,
  parameters: Record<string, unknown>,
  buildInBrowser: () => Promise<unknown> | unknown,
  options: { facilityId?: string; service?: Pick<typeof exportService, 'run'> } = {},
): Promise<RunExportOutcome> {
  const service = options.service ?? exportService;
  return service.run({
    kind, title: exportTitleFromFilename(filename), parameters, buildInBrowser,
    ...(options.facilityId ? { facilityId: options.facilityId } : {}),
  });
}
