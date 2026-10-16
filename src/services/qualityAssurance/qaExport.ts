// src/services/qualityAssurance/qaExport.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-355 (Batch 369): every Quality Assurance report export goes through
// here. The report's own capability is checked (and the check audited:
// every export is high risk) before any file is produced. One capability
// per report, per Pete: exporting one QA report doesn't let you export
// another.
//
// Batch 450 (PS-282): each export is also recorded in the audit log as
// DOCUMENT_EXPORTED, like every other export (printing/documentOutputAudit.ts).
//
// Rows must already be PHI-safe; see components/QualityAssurance/
// qaReportUtils.ts for the export convention each tab follows.
// ─────────────────────────────────────────────────────────────────────────────

import { toCsv, downloadCsv } from '@/utils/csv';
import { recordDocumentOutput } from '../printing/recordDocumentOutput';
import { DESTINATION, type DocumentOutputEvent } from '../printing/documentOutputAudit';
import type { QaExportCapability } from '../authorization/capabilityCatalog';
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { CapabilityContext } from '../authorization/evaluateCapability';
import type { QaScope } from './qaScope';

/**
 * PS-356 (Batch 370): the facility context of a QA export, for facility
 * scope. A client scope is that one facility; an organisation- or
 * enterprise-wide scope, or a report with no scope switcher, spans every
 * facility, so someone limited to some facilities can't export it.
 * (An organisation's own facilities aren't resolved here: refusing is the
 * safe reading.)
 *
 * Batch 549: resolving an organisation's facilities was tried and taken out
 * again. The rows of an organisation scope are chosen by the case's origin
 * hospital (the legacy map in organisationService.ts), while the facility
 * tree places some of those cases' ordering facilities outside the
 * organisation, so a check against the tree could pass an export holding
 * rows from facilities the person isn't assigned to. It waits for the
 * Organisation-to-Facility migration (one definition of an organisation's
 * facilities). PS-610.
 */
export function qaScopeContext(scope?: QaScope): CapabilityContext {
  if (scope?.level === 'client') return { facilityIds: [scope.clientId] };
  return { allFacilities: true };
}

export type QaExportResult = { ok: true; rowCount: number } | { ok: false; reason: 'notPermitted' };

export interface QaExportDeps {
  authorization: Pick<IAuthorizationService, 'enforce'>;
  /** Hands the file to the user (defaults to a browser download). */
  deliver?: (filename: string, csv: string) => void;
  /** Batch 450: records the export in the audit log (defaults to recordDocumentOutput). */
  record?: (e: DocumentOutputEvent) => Promise<void>;
}

/** The audit log's document name for a QA export: 'qa:discordance-report:export' → 'qa-discordance-report'. */
export function qaExportDocumentName(capability: QaExportCapability): string {
  return capability.replace(/:export$/, '').replace(/:/g, '-');
}

/** Checks `capability`, then exports `rows` as CSV. `filename` may end in .csv or .xlsx; either is replaced. */
export async function exportQaReport(
  capability: QaExportCapability,
  rows: Record<string, string | number>[],
  filename: string,
  deps: QaExportDeps,
  context: CapabilityContext,
): Promise<QaExportResult> {
  const decision = await deps.authorization.enforce(capability, context);
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  const base = filename.replace(/\.(xlsx|csv)$/i, '');
  (deps.deliver ?? downloadCsv)(base, toCsv(rows));
  // Batch 450 (PS-282): like every other export, the file is recorded as
  // DOCUMENT_EXPORTED (the permission check alone was audited before).
  await (deps.record ?? recordDocumentOutput)({
    action: 'export', document: qaExportDocumentName(capability), destination: DESTINATION.download(`${base}.csv`),
    status: 'success', format: 'csv', rowCount: rows.length,
    facilityId: context.facilityIds?.length === 1 ? context.facilityIds[0] : null,
  });
  return { ok: true, rowCount: rows.length };
}
