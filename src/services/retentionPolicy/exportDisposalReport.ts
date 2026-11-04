// src/services/retentionPolicy/exportDisposalReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 407 (PS-357 sweep item named on the page itself). Exporting the
// disposal (waste-tracking) report needs retention:disposal-report:export,
// checked here before anything is written. The rows carry accession numbers,
// so the export is its own permission (one capability per report, Pete). A
// report limited to one facility is checked at that facility; "all
// facilities" needs an assignment covering all of them.
//
// Batch 543 (finding F9): the export is recorded in the audit log as
// DOCUMENT_EXPORTED, like every other export of case data (it wasn't).
// ─────────────────────────────────────────────────────────────────────────────

import { toCsv, downloadCsv } from '@/utils/csv';
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { CapabilityContext } from '../authorization/evaluateCapability';
import type { recordDocumentOutput } from '../printing/recordDocumentOutput';
import { DESTINATION } from '../printing/documentOutputAudit';

export type DisposalReportExportResult = { ok: true; rowCount: number } | { ok: false; reason: 'notPermitted' };

export interface DisposalReportExportDeps {
  authorization: Pick<IAuthorizationService, 'enforce'>;
  /** Hands the file to the user (defaults to a browser download). */
  deliver?: (filename: string, csv: string) => void;
  /** Batch 543: records the export (defaults to the audit log's document-output entry). */
  record?: typeof recordDocumentOutput;
}

/** The permission context for the report's facility filter ('all' or a facility id). */
export function disposalReportContext(facilityId: string): CapabilityContext {
  return facilityId === 'all' ? { allFacilities: true } : { facilityIds: [facilityId] };
}

export async function exportDisposalReport(
  rows: Record<string, string | number>[],
  filename: string,
  facilityId: string,
  deps: DisposalReportExportDeps,
): Promise<DisposalReportExportResult> {
  const decision = await deps.authorization.enforce('retention:disposal-report:export', disposalReportContext(facilityId));
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  (deps.deliver ?? downloadCsv)(filename, toCsv(rows));
  const record = deps.record ?? (await import('../printing/recordDocumentOutput')).recordDocumentOutput;
  await record({
    action: 'export', document: 'disposal-report', destination: DESTINATION.download(filename.endsWith('.csv') ? filename : `${filename}.csv`),
    status: 'success', format: 'csv', rowCount: rows.length, facilityId: facilityId === 'all' ? null : facilityId,
  }).catch(e => console.error('[exportDisposalReport] The export was not recorded in the audit log:', e));
  return { ok: true, rowCount: rows.length };
}
