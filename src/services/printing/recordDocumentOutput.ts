// src/services/printing/recordDocumentOutput.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-282 (Batch 437): the app's wiring for documentOutputAudit.ts — writes to
// the audit log as the signed-in person, and plans a report print from the
// audit log (printed before?) and the lab's print settings (reason required
// for a reprint?). Screens reach these through '@/services'.
// ─────────────────────────────────────────────────────────────────────────────

import { reportSupportActivity } from '../supportAccess/supportActivity';
import { auditService } from '../auditlog/auditServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import { printSettingsService } from '../printSettings/printSettingsServiceInstance';
import { facilityPrintSettingsService } from '../printSettings/facilityPrintSettingsServiceInstance';
import { resolveEffectivePrintSettings } from '../printSettings/IFacilityPrintSettingsService';
import { facilityService } from '../facilities/facilityServiceInstance';
import { resolveCasePerformingLab } from '../facilities/resolveCasePerformingLab';
import { heldPrintOutcome, releaseHoldPolicyForCase, type ReleaseHoldPrintPolicy } from '../reportRelease/heldPrintPolicy';
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
  return recordDocumentOutputWith(e, { logEvent: entry => auditService.logEvent(entry), actor: sessionActor });
}

/** Whether the case's performing lab asks for a reason when a report is reprinted. */
async function reprintReasonRequired(caseRecord: { originHospitalId?: string | null }): Promise<boolean> {
  const global = await printSettingsService.get();
  if (!global.ok) return false;
  const facilities = await facilityService.getAll();
  const lab = facilities.ok ? resolveCasePerformingLab(caseRecord, facilities.data) : undefined;
  const override = lab ? await facilityPrintSettingsService.getForFacility(lab.id) : null;
  const effective = resolveEffectivePrintSettings(global.data, override && override.ok ? override.data : null);
  return effective.requireReprintReason === true;
}

/** What pressing Print on a report should do: print, or reprint (asking why when the lab requires it). */
export async function planReportPrint(input: {
  document: string;
  caseId: string;
  caseRecord: { originHospitalId?: string | null; order?: { facilityId?: string | null } | null };
  /** Batch 654: the Release Hold Print Policy when the report is Pending Release; null when it is not on hold. */
  releaseHoldPolicy: ReleaseHoldPrintPolicy | null;
}): Promise<PrintPlan> {
  const [logs, requireReprintReason] = await Promise.all([
    auditService.getAuditLogs().then(r => (r.ok ? r.data : [])).catch(() => []),
    reprintReasonRequired(input.caseRecord).catch(() => false),
  ]);
  // Supervisor policy (the authorization service is imported on use: it would otherwise close an import cycle through the export gate): the override capability is checked (and audited) here, in the service, for the case's facility.
  let canOverride = false;
  if (input.releaseHoldPolicy === 'supervisor') {
    try {
      const { authorizationService } = await import('../authorization/defaultAuthorizationService');
      canOverride = (await authorizationService.enforce('print:release-hold:override', { caseId: input.caseId, facilityId: input.caseRecord.order?.facilityId ?? null })).allowed;
    } catch {
      canOverride = false;   // a failed check refuses
    }
  }
  return planDocumentPrint({
    printedBefore: wasPrintedBefore(logs, input.document, input.caseId),
    requireReprintReason,
    held: heldPrintOutcome(input.releaseHoldPolicy, canOverride),
  });
}

/** Batch 654: the Release Hold Print Policy for a case (null unless it is Pending Release). */
export async function releaseHoldPolicyFor(caseRecord: { status?: string | null } | null | undefined): Promise<ReleaseHoldPrintPolicy | null> {
  if (caseRecord?.status !== 'pending-release') return null;   // no import needed for a report that is not on hold
  // Imported on use: a static import would close an import cycle through the export gate.
  const { reportReleaseService } = await import('../reportRelease/reportReleaseInstance');
  return releaseHoldPolicyForCase(caseRecord, reportReleaseService);
}
