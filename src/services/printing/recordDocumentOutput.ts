// src/services/printing/recordDocumentOutput.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-282 (Batch 437): the app's wiring for documentOutputAudit.ts — writes to
// the audit log as the signed-in person, and plans a report print from the
// audit log (printed before?) and the lab's print settings (reason required
// for a reprint?). Screens reach these through '@/services'.
// ─────────────────────────────────────────────────────────────────────────────

import { reportSupportActivity } from '../supportAccess/supportActivity';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { printSettingsService } from '../printSettings/printSettingsServiceInstance';
import { facilityPrintSettingsService } from '../printSettings/facilityPrintSettingsServiceInstance';
import { resolveEffectivePrintSettings } from '../printSettings/IFacilityPrintSettingsService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { resolveCasePerformingLab } from '../facilities/resolveCasePerformingLab';
import {
  recordDocumentOutputWith, wasPrintedBefore, planDocumentPrint,
  type DocumentOutputEvent, type PrintPlan,
} from './documentOutputAudit';

const sessionActor = (): string => {
  const p = readSessionProfile();
  return p?.name || p?.id || 'unknown';
};

/** Records a print, reprint, preview print or export in the audit log. */
export function recordDocumentOutput(e: DocumentOutputEvent): Promise<void> {
  // Batch 604: a support agent's own export is also written to the support audit stream.
  if (e.action === 'export') reportSupportActivity({ kind: 'export', detail: `Exported ${e.document}${e.format ? ` as ${e.format}` : ''}.` });
  return recordDocumentOutputWith(e, { logEvent: entry => mockAuditService.logEvent(entry), actor: sessionActor });
}

/** Whether the case's performing lab asks for a reason when a report is reprinted. */
async function reprintReasonRequired(caseRecord: { originHospitalId?: string | null }): Promise<boolean> {
  const global = await printSettingsService.get();
  if (!global.ok) return false;
  const facilities = await mockFacilityService.getAll();
  const lab = facilities.ok ? resolveCasePerformingLab(caseRecord, facilities.data) : undefined;
  const override = lab ? await facilityPrintSettingsService.getForFacility(lab.id) : null;
  const effective = resolveEffectivePrintSettings(global.data, override && override.ok ? override.data : null);
  return effective.requireReprintReason === true;
}

/** What pressing Print on a report should do: print, or reprint (asking why when the lab requires it). */
export async function planReportPrint(input: {
  document: string;
  caseId: string;
  caseRecord: { originHospitalId?: string | null };
  pendingReleaseRestricted: boolean;
}): Promise<PrintPlan> {
  const [logs, requireReprintReason] = await Promise.all([
    mockAuditService.getAuditLogs().then(r => (r.ok ? r.data : [])).catch(() => []),
    reprintReasonRequired(input.caseRecord).catch(() => false),
  ]);
  return planDocumentPrint({
    printedBefore: wasPrintedBefore(logs, input.document, input.caseId),
    requireReprintReason,
    pendingReleaseRestricted: input.pendingReleaseRestricted,
  });
}
