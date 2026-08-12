// src/pages/SynopticReportPage/hooks/useLisIntegration.ts
// ─────────────────────────────────────────────────────────────────────────────
// Extracted from SynopticReportPage.tsx (originally lines ~1631-1852,
// ~2626-2639) as the first pass of a deliberate, incremental cleanup of
// that file — see the file's own header comment ("intentionally thin —
// layout + modal wiring only") for why this exists as a separate hook
// rather than living inline.
//
// This is a PURE MOVE, not a rewrite: every function body below is
// unchanged from its original implementation. The only things that
// changed are (a) these functions/state now live in their own hook
// instead of directly in the page component, and (b) caseData,
// signingUser, and showToast are received as parameters instead of
// being closed-over component state, since a hook can't see another
// hook's return value unless it's explicitly passed in.
//
// Scope: all LIS-transmission and CoPilot-report-view concerns —
// simulated outbound material-order/synoptic-report transmission to the
// LIS, the inbound "Disconnected Modification" simulation, and the
// CoPilot print/report view. sendSynopticReportToLis and
// pendingLisNotice are genuinely shared beyond this file's original LIS
// section — sendSynopticReportToLis is also called from the sign-out
// and amendment workflows, and pendingLisNotice is read directly in
// openAmendmentDraft and in the page's JSX. Both are returned here
// specifically so the page component can keep using them exactly as it
// did before this extraction.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import type { CopilotReportInstance } from '../modals/CopilotReportViewModal';
import { amendmentService, reportVersionService } from '@/services';
import { lisAmendmentNoticeService, messageService } from '@/services';
import type { Case, SynopticReportInstance } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import { getFieldLabel } from '@/utils/synopticFieldLabels';
import { resolveAnswers } from '@/orchestrator/contextBuilder';
import type { SigningUser } from './sharedHookTypes';

interface UseLisIntegrationParams {
  caseData:   Case | null;
  signingUser: SigningUser;
  showToast:  (message: string) => void;
}

export function useLisIntegration({ caseData, signingUser, showToast }: UseLisIntegrationParams) {
  // ── LIS order requests — Blocks/Recuts and Stains ───────────────────────
  // Real, well-defined HL7 entities (ORM^O01-style order messages) — this
  // is the one seam both should go through, so the real formatter/receiver
  // work planned for the next couple weeks has a single, obvious place to
  // land rather than being scattered across every caller. Applies
  // identically in both modes: PathScribe doesn't run the physical bench
  // in either Orchestration or CoPilot — the order always has to leave
  // the app to actually happen. Today this is a simulated round-trip
  // (a delay + success), not a real outbound HL7 message — nothing here
  // should be read as more real than that until the actual formatter
  // exists.
  //
  // Real implementation would likely:
  //   1. Build an ORM^O01 (or site-specific order message) from `order`
  //   2. Send via whatever transport the site's LIS integration uses
  //      (MLLP/TCP, a message broker, a REST gateway — site-dependent)
  //   3. This function's Promise should resolve once the LIS
  //      acknowledges receipt (an ACK segment), not before
  //   4. A *separate* inbound listener (not this function) would handle
  //      receiving the eventual ORU^R01 result message and update the
  //      matching StainOrder's status — that's a different code path,
  //      not something this send function does itself
  const sendMaterialOrderToLis = useCallback(async (_order: {
    kind: 'block_recut' | 'stain' | 'cancel' | 'restain';
    specimenId: string;
    label: string;
  }): Promise<{ ok: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 400)); // simulated round-trip
    return { ok: true };
  }, []);

  // CoPilot amendment/addendum transmission — same honest simulation as
  // sendMaterialOrderToLis above: no real HL7 MDM/ORU or FHIR
  // DiagnosticReport message actually leaves this app. What's real is
  // the seam and, for corrections specifically, a genuine trigger event.
  //
  // The "Disconnected Modification" risk a real LIS integration needs
  // to guard against: someone amends directly in the LIS without going
  // through PathScribe, leaving PathScribe's structured data stale.
  // PathScribe can't detect that — it happens entirely outside this
  // app. What it CAN do is the inverse: the moment PathScribe itself
  // sends a correction, fire a real, documented event a real LIS
  // integration layer would listen for to force-sync or show a warning
  // banner. That's what PATHSCRIBE_LIS_SYNC_REQUIRED is — a genuine
  // trigger with no real subscriber yet, not a fake success.
  // Builds the actual hardcoded text header baked into the outgoing
  // payload — per the spec, this has to survive even if the LIS has a
  // rigid layout engine, so it's part of the text itself, not just a
  // flag the LIS might render correctly.
  const buildEmbeddedHeader = (kind: 'corrected' | 'new_instance' | 'corrected_with_addition', timestamp: string, sequenceNumber?: number, title?: string): string => {
    const formatted = new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    if (kind === 'new_instance') {
      const label = title ? `ADDENDUM ${sequenceNumber ?? 1}: ${title.toUpperCase()}` : `ADDITIONAL SYNOPTIC REPORT ADDED`;
      return `--- ${label} (Transmitted: ${formatted}) ---`;
    }
    if (kind === 'corrected_with_addition') {
      const label = title ? ` — ${title.toUpperCase()}` : '';
      return `[CORRECTED RESULT WITH ADDITIONAL INFORMATION${label} (Transmitted: ${formatted})]`;
    }
    return `[AMENDED REPORT — CORRECTED: ${formatted}]`;
  };

  const sendSynopticReportToLis = useCallback(async (payload: {
    kind: 'corrected' | 'new_instance' | 'corrected_with_addition';
    caseId: string;
    instanceId: string;
    reasonForChange?: string; // only meaningful for 'corrected'
    sequenceNumber?: number; // addendum numbering, for the header label
    addendumTitle?: string;
    /** The actual discrete text block being handed to the LIS — the
     *  embedded header gets prepended to this, not just attached as
     *  separate metadata. */
    payloadBody: string;
  }): Promise<{ ok: boolean }> => {
    const timestamp = new Date().toISOString();
    // HL7 OBR-25 / FHIR DiagnosticReport.status equivalent — this is
    // what tells the LIS to stamp its own "Amended/Supplemented" page
    // header. 'A' = Amended, 'P' = Append/Supplemental. The hybrid case
    // gets 'A' too — per spec, the overall envelope must be flagged as
    // a correction so the EMR scans the whole file for modified
    // fields, even though the payload also carries new content.
    const transactionStatusFlag: 'A' | 'P' = payload.kind === 'new_instance' ? 'P' : 'A';
    const embeddedHeader = buildEmbeddedHeader(payload.kind, timestamp, payload.sequenceNumber, payload.addendumTitle);
    const fullPayloadText = `${embeddedHeader}\n\n${payload.payloadBody}`;

    await new Promise(resolve => setTimeout(resolve, 400)); // simulated round-trip
    if (payload.kind === 'corrected' || payload.kind === 'corrected_with_addition') {
      window.dispatchEvent(new CustomEvent('PATHSCRIBE_LIS_SYNC_REQUIRED', { detail: { ...payload, transactionStatusFlag, embeddedHeader, fullPayloadText, timestamp } }));
    }
    return { ok: true };
  }, []);

  const [showCopilotReportView, setShowCopilotReportView] = useState(false);
  const [pendingLisNotice, setPendingLisNotice] = useState<{ id: string; lisAmendmentSummary: string; receivedAt: string } | null>(null);

  useEffect(() => {
    if (!caseData?.id) { setPendingLisNotice(null); return; }
    lisAmendmentNoticeService.getByCaseId(caseData.id).then(res => {
      if (!res.ok) return;
      const pending = res.data.find(n => n.status === 'pending_review');
      setPendingLisNotice(pending ? { id: pending.id, lisAmendmentSummary: pending.lisAmendmentSummary, receivedAt: pending.receivedAt } : null);
    });
  }, [caseData?.id]);

  // Exit Gate A — clerical clearance. Only reachable when there's no
  // open amendment/addendum draft for this case (Exit Gate B rule: an
  // active draft keeps the case in triage regardless of this button).
  const handleMarkReviewedNoChanges = useCallback(async () => {
    if (!pendingLisNotice) return;
    await lisAmendmentNoticeService.updateStatus(pendingLisNotice.id, 'acknowledged');
    setPendingLisNotice(null);
    showToast('Marked reviewed — confirmed no PathScribe synoptic changes necessary.');
  }, [pendingLisNotice, showToast]);

  const [copilotReportInstances, setCopilotReportInstances] = useState<CopilotReportInstance[]>([]);

  // Simulated inbound "Disconnected Modification" event — honest
  // simulation, same as every other LIS-boundary stub tonight: no real
  // LIS exists to receive this from. What's real is the response: a
  // tracked notice record and a genuine urgent message to the
  // finalizing pathologist specifically, via the real message service.
  //
  // Deliberately does NOT touch synopticReports, does NOT unlock
  // anything, and does NOT invoke AI in any way. Per explicit
  // direction: AI never updates the record on its own — only if the
  // pathologist has already created an amendment and asks for
  // re-evaluation themselves. This handler's entire effect is the
  // notice + the message; everything else is a manual decision made
  // later, by the pathologist, through the existing amendment flow.
  const simulateLisAmendmentReceived = useCallback(async () => {
    if (!caseData?.id) return;
    const finalizedByName = caseData.diagnostic?.finalizedBy ?? signingUser?.name ?? 'Unknown Pathologist';
    const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '';

    await lisAmendmentNoticeService.create({
      caseId: caseData.id,
      notifiedPathologistId: signingUser?.id ?? 'unknown',
      notifiedPathologistName: finalizedByName,
      lisAmendmentSummary: 'LIS reports this case was corrected directly in the LIS text editor, outside PathScribe.',
    });

    await messageService.send({
      senderId: 'system-lis-integration',
      senderName: 'LIS Integration',
      recipientId: signingUser?.id ?? 'unknown',
      recipientName: finalizedByName,
      subject: `Case ${accession} corrected in LIS — review required`,
      body: `This case was amended directly in the LIS, outside PathScribe. Review the correction and decide whether the synoptic data you originally reported also needs amending. PathScribe will not change anything automatically — if the synoptic report needs correcting, start that amendment yourself from this case.`,
      caseNumber: accession,
      timestamp: new Date(),
      isUrgent: true,
    });

    showToast('Simulated LIS amendment notice sent — check Messages for the urgent notification.');
  }, [caseData, signingUser, showToast]);

  const openCopilotReportView = useCallback(async () => {
    if (!caseData) return;
    const templateModule = await import('@/services/templates/templateService');
    const instances = caseData.synopticReports ?? [];
    const [versionsRes, amendmentsRes] = await Promise.all([
      reportVersionService.getByCaseId(caseData.id),
      amendmentService.getByCaseId(caseData.id),
    ]);
    const allVersions = versionsRes.ok ? versionsRes.data : [];
    const allAmendments = amendmentsRes.ok ? amendmentsRes.data : [];

    const resolved = await Promise.all(instances.map(async (inst: SynopticReportInstance) => {
      const detail = await templateModule.getTemplate(inst.templateId);
      const specimen = (caseData.specimens ?? []).find((s: Specimen) => s.id === inst.specimenId);

      // Real version picker, per feedback — was always printing live
      // current data with no way to select an earlier reported version.
      const instanceVersions = allVersions
        .filter(v => v.instanceId === inst.instanceId && v.synopticAnswersSnapshot)
        .sort((a, b) => a.versionNumber - b.versionNumber);
      const total = instanceVersions.length;
      const versions = total > 1 ? instanceVersions.map((v, i) => {
        // Per feedback — print output must include the amendment
        // narrative and "Originally Reported As" diff, not just the
        // bare field values. Linked via amendmentRecordId, already
        // stored on ReportVersionRecord since the earlier root-cause fix.
        const record = v.amendmentRecordId ? allAmendments.find(a => a.id === v.amendmentRecordId) : undefined;
        const prevSnapshot = i > 0 ? instanceVersions[i - 1].synopticAnswersSnapshot ?? {} : undefined;
        const changedFromPrevious = prevSnapshot && detail
          ? Object.keys({ ...prevSnapshot, ...v.synopticAnswersSnapshot })
              .filter(k => JSON.stringify(prevSnapshot[k]) !== JSON.stringify(v.synopticAnswersSnapshot?.[k]))
              .map(k => ({
                fieldLabel: getFieldLabel(k, 'generic'),
                previousValue: prevSnapshot[k],
                currentValue: v.synopticAnswersSnapshot?.[k],
              }))
          : undefined;
        return {
          versionNumber: v.versionNumber,
          label: i === 0 ? 'Original' : i === total - 1 ? `${i === 1 ? '1st' : `${i}th`} Amended (Most Recent)` : `${i === 1 ? '1st' : `${i}th`} Amended`,
          releasedAt: v.createdAt,
          createdByName: v.createdBy?.userName ?? 'Unknown',
          answers: detail ? resolveAnswers((v.synopticAnswersSnapshot ?? {}) as Record<string, string | string[]>, detail.template) : [],
          explanationOfChange: record?.explanationOfChange,
          notification: record?.notification,
          changedFromPrevious,
        };
      }) : undefined;

      const templateSections = detail?.template?.sections ?? [];

      return {
        instanceId: inst.instanceId,
        specimenId: inst.specimenId,
        specimenLabel: specimen?.label ?? inst.specimenId,
        specimenDesc: specimen?.description,
        templateName: inst.templateName ?? detail?.name ?? inst.templateId,
        answers: detail ? resolveAnswers(inst.answers ?? {}, detail.template) : [],
        sections: templateSections.map(s => ({ title: s.title, fieldKeys: (s.fields ?? []).map(f => f.id) })),
        versions,
      };
    }));
    setCopilotReportInstances(resolved);
    setShowCopilotReportView(true);
  }, [caseData]);

  // StainMultiSelect (inside BlockStainEditorModal) was committing new
  // stain orders straight to local state, bypassing this seam entirely —
  // the same gap handleAddBlock had before it was wired. This is the fix
  // for that: the picker now awaits this before adding anything locally.
  const handleSendStainOrder = useCallback(async (specimenId: string, _blockId: string, stainName: string): Promise<{ ok: boolean }> => {
    // _blockId unused — sendMaterialOrderToLis's own order type only
    // has {kind, specimenId, label}, so there's nowhere to pass this
    // through even though it's captured here. Harmless while
    // sendMaterialOrderToLis is a simulation stub, but a real LIS
    // transmission would need to know which physical block the new
    // stain is being cut from — worth adding to that type when this
    // stops being simulated.
    const result = await sendMaterialOrderToLis({ kind: 'stain', specimenId, label: stainName });
    if (!result.ok) {
      showToast(`LIS did not acknowledge the ${stainName} order — nothing was recorded. Try again.`);
    }
    return result;
  }, [sendMaterialOrderToLis, showToast]);

  return {
    sendMaterialOrderToLis,
    sendSynopticReportToLis,
    handleSendStainOrder,
    showCopilotReportView, setShowCopilotReportView,
    pendingLisNotice, setPendingLisNotice,
    handleMarkReviewedNoChanges,
    simulateLisAmendmentReceived,
    copilotReportInstances,
    openCopilotReportView,
  };
}
