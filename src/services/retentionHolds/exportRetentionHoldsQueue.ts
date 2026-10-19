// src/services/retentionHolds/exportRetentionHoldsQueue.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#12): CSV export of the Retention holds queue. Needs
// retention:holds-queue:export (checked here, at the facility filter), and is
// recorded in the audit log as a document output with the row count only.
// ─────────────────────────────────────────────────────────────────────────────
import { toCsv, downloadCsv } from '@/utils/csv';
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { CapabilityContext } from '../authorization/evaluateCapability';
import type { recordDocumentOutput } from '../printing/recordDocumentOutput';
import { DESTINATION } from '../printing/documentOutputAudit';

export type RetentionHoldsExportResult = { ok: true; rowCount: number } | { ok: false; reason: 'notPermitted' };

export interface RetentionHoldsExportDeps {
  authorization: Pick<IAuthorizationService, 'enforce'>;
  deliver?: (filename: string, csv: string) => void;
  record?: typeof recordDocumentOutput;
}

export async function exportRetentionHoldsQueue(
  rows: Record<string, string | number>[], filename: string, context: CapabilityContext, deps: RetentionHoldsExportDeps,
): Promise<RetentionHoldsExportResult> {
  const decision = await deps.authorization.enforce('retention:holds-queue:export', context);
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  (deps.deliver ?? downloadCsv)(filename, toCsv(rows));
  const record = deps.record ?? (await import('../printing/recordDocumentOutput')).recordDocumentOutput;
  await record({
    action: 'export', document: 'retention-holds-queue', destination: DESTINATION.download(filename.endsWith('.csv') ? filename : `${filename}.csv`),
    status: 'success', format: 'csv', rowCount: rows.length, facilityId: null,
  }).catch(e => console.error('[exportRetentionHoldsQueue] The export was not recorded in the audit log:', e));
  return { ok: true, rowCount: rows.length };
}
