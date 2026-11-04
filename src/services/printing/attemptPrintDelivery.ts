// src/services/printing/attemptPrintDelivery.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-279 — extracted directly out of dispatchPrintJob.ts's own
// three mode branches (NATIVE_QZ_TRAY / DIRECT_NETWORK_PRINT /
// INTERFACE_ENGINE_HANDOFF), unchanged in behavior, so a second real
// caller (redispatchPrintJob.ts, PS-279 §2.2.3's own Retry/Redirect)
// can genuinely re-attempt delivery of an already-queued job without
// duplicating this branching logic a second time. dispatchPrintJob.ts
// itself now calls this too, right after its own enqueue() +
// destination-resolution — resolution (which destination, which
// printer) stays there, since that's real, first-dispatch-only
// business logic (PrintRoutingRule resolution, facility config
// lookup); this file only ever ATTEMPTS delivery to an already-decided
// target and records the real queue-state transition
// (markPrinted/markFailed), same as the code it was extracted from.
//
// Real, per PS-279 §2.2.4 — `presentation` is passed straight through
// to dispatchViaPrintProtocol.ts for a DIRECT_NETWORK_PRINT job; see
// that file and sendIppPrintJob.ts's own header for the honest,
// per-protocol account of which of the three real wire protocols can
// actually carry it.
// ─────────────────────────────────────────────────────────────────────────────

import { checkDirectDevicePrint, type DirectPrintDeps } from './directDevicePrinting';
import { directDevicePrintingDeps } from './directDevicePrintingDeps';
import { printQueueService } from './printQueueServiceInstance';
import { recordSimulatedPrint, simulationAllowed } from './simulatedPrint';
import { printPdfViaQzTray, isQzTrayConnected } from '@/utils/labels/qzTrayBridge';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { dispatchViaPrintProtocol } from './transport/dispatchViaPrintProtocol';
import { AGENT_PRINT_NEEDS_SERVER, canSendNetworkPrintHere, NETWORK_PRINT_NEEDS_SITE_AGENT } from './transport/networkPrintRuntime';
import type { PrintDeliveryMode, PrintJobReportType, PaperSize, PaperSourceTray, DuplexMode } from '@/types/printing/PrintJob';
import { isAgentPrintDestination, type PrintDestination } from '@/types/printRouting/PrintDestination';

export interface PrintDeliveryPresentation {
  paperSource?: PaperSourceTray;
  duplexMode?: DuplexMode;
}

export interface AttemptPrintDeliveryInput {
  jobId: string;
  caseId: string;
  reportType: PrintJobReportType;
  priority: 'Routine' | 'Urgent';
  mode: PrintDeliveryMode;
  pdfBase64: string;
  /** Only meaningful for NATIVE_QZ_TRAY. */
  printerName?: string;
  /** Batch 734: the performing facility, for the direct-printing check (NATIVE_QZ_TRAY prints from the browser). */
  facilityId?: string;
  paperSize?: PaperSize;
  /** Only meaningful for DIRECT_NETWORK_PRINT — the already-decided
   *  real target (freshly resolved on first dispatch, or the job's
   *  own persisted resolvedDestination/redirectedToDestination on a
   *  real Retry/Redirect). */
  destination?: PrintDestination;
  /** Real, per PS-279 §2.2.4. */
  presentation?: PrintDeliveryPresentation;
}

export interface AttemptPrintDeliveryResult {
  outcome: 'dispatched' | 'failed';
  jobId: string;
  /** Batch 546 (F3): false when retrying can't help, so the release goes straight to the exception queue and its fallback. */
  retriable?: boolean;
}

export async function attemptPrintDelivery(input: AttemptPrintDeliveryInput, direct: DirectPrintDeps = directDevicePrintingDeps): Promise<AttemptPrintDeliveryResult> {
  const { jobId, caseId, reportType, priority, mode, pdfBase64 } = input;

  if (mode === 'NATIVE_QZ_TRAY') {
    if (!input.printerName) {
      await printQueueService.markFailed(jobId, {
        errorCode: 'PRINT_REJECTED', errorMessage: 'No printer configured for Native QZ Tray delivery.', maxRetriesExceeded: true,
      });
      return { outcome: 'failed', jobId };
    }
    // Batch 734 (Pete, Decision 6): QZ Tray prints from the browser straight to the printer. In a server deployment
    // that is blocked unless the facility allows it (audited); the job goes to the exception queue and its fallback.
    if ((await checkDirectDevicePrint({ bridgeType: 'qz_tray', facilityId: input.facilityId, printerId: input.printerName }, `report ${reportType}`, direct)) === 'blocked') {
      await printQueueService.markFailed(jobId, {
        errorCode: 'PRINT_REJECTED', errorMessage: 'Direct printing from the browser is off for this facility. Use the interface engine or the browser print dialog.', maxRetriesExceeded: true,
      });
      return { outcome: 'failed', jobId, retriable: false };
    }
    if (!isQzTrayConnected()) {
      // Real, per the source spec's own Use Case 2 — an unreachable
      // real printer/bridge holds the job for real, manual retry
      // rather than blocking or throwing.
      await printQueueService.markFailed(jobId, {
        errorCode: 'PRINTER_OFFLINE', errorMessage: 'QZ Tray is not connected.', maxRetriesExceeded: false,
      });
      return { outcome: 'failed', jobId };
    }
    // Real, per PS-278/279 gap-closing follow-up — presentation (paper
    // source/duplex) is now threaded to QZ Tray too, closing the real,
    // previously-disclosed gap where it was resolved for every job
    // (resolvePrintPresentationOptions.ts) but only ever read by the
    // DIRECT_NETWORK_PRINT branch below, never this one.
    const printRes = await printPdfViaQzTray(input.printerName, pdfBase64, 1, input.paperSize, input.presentation);
    if (!printRes.ok) {
      // Real, deliberate cast — this project's own tsconfig.json has
      // strictNullChecks disabled, under which TypeScript cannot
      // reliably narrow a discriminated union to its `ok: false`
      // branch. Same real, established workaround dispatchZplLabel.ts's
      // own identical situation already uses.
      await printQueueService.markFailed(jobId, {
        errorCode: 'PRINTER_UNREACHABLE', errorMessage: (printRes as { ok: false; message: string }).message, maxRetriesExceeded: false,
      });
      return { outcome: 'failed', jobId };
    }
    await printQueueService.markPrinted(jobId);
    return { outcome: 'dispatched', jobId };
  }

  if (mode === 'DIRECT_NETWORK_PRINT') {
    if (!input.destination) {
      await printQueueService.markFailed(jobId, {
        errorCode: 'PRINT_REJECTED',
        errorMessage: 'No real PrintDestination available for this Direct Network Print job.',
        maxRetriesExceeded: true,
      });
      return { outcome: 'failed', jobId };
    }
    // Batch 553: a site agent's printer is reached only through the API
    // server, which hands the job to the site's agent (SITE_AGENT_API.md §4).
    // Nothing here can send it, so the job fails at once with that reason and
    // goes to the exception queue and its fallback, as a browser attempt does.
    // Batch 606: in the demo, network and site-agent print goes through a labelled Simulated transport
    // ("Simulated: sent to printer"), with an audit entry and a failure switch (Configuration, System, Simulated print log).
    if (simulationAllowed() && (isAgentPrintDestination(input.destination) || !canSendNetworkPrintHere())) {
      const agent = isAgentPrintDestination(input.destination);
      const rec = recordSimulatedPrint({
        kind: 'report', transport: agent ? 'site agent' : 'network print',
        destination: input.destination.displayName ?? (agent ? 'site agent printer' : (input.destination as { ipAddress: string }).ipAddress),
      });
      if (rec.outcome === 'delivered') {
        await printQueueService.markPrinted(jobId, { simulated: true });
        return { outcome: 'dispatched', jobId };
      }
      await printQueueService.markFailed(jobId, { errorCode: 'PRINTER_UNREACHABLE', errorMessage: 'Simulated failure (the failure switch is on).', maxRetriesExceeded: false });
      return { outcome: 'failed', jobId };
    }
    if (isAgentPrintDestination(input.destination)) {
      await printQueueService.markFailed(jobId, {
        errorCode: 'NEEDS_SITE_AGENT', errorMessage: AGENT_PRINT_NEEDS_SERVER, maxRetriesExceeded: true,
      });
      return { outcome: 'failed', jobId, retriable: false };
    }
    // Batch 546 (finding F3): the network transports need Node. From a
    // browser the job fails with a plain reason instead of throwing, so it is
    // FAILED (not stuck QUEUED). Retrying from here can't help, so it goes
    // straight to the exception queue, the fallback channels and the alert.
    if (!canSendNetworkPrintHere()) {
      await printQueueService.markFailed(jobId, {
        errorCode: 'NEEDS_SITE_AGENT', errorMessage: NETWORK_PRINT_NEEDS_SITE_AGENT, maxRetriesExceeded: true,
      });
      return { outcome: 'failed', jobId, retriable: false };
    }
    let sendRes: { ok: boolean; error?: string };
    try {
      sendRes = await dispatchViaPrintProtocol(input.destination, Buffer.from(pdfBase64, 'base64'), input.presentation);
    } catch (e) {
      sendRes = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (!sendRes.ok) {
      await printQueueService.markFailed(jobId, {
        errorCode: 'PRINTER_UNREACHABLE', errorMessage: sendRes.error ?? 'Direct network print failed.', maxRetriesExceeded: false,
      });
      return { outcome: 'failed', jobId };
    }
    await printQueueService.markPrinted(jobId);
    return { outcome: 'dispatched', jobId };
  }

  // Mode 2 — Interface Engine Hand-off. Real, per the source spec's
  // own Use Case 1: hands the rendered PDF off; the Interface Engine
  // owns real printer-spooling middleware from there, never PathScribe.
  const dispatchRes = await dispatchInterfaceMessage(jobId, 'PRINT_JOB', {
    caseId, reportType, priority, pdfBase64, paperSize: input.paperSize,
  });
  if (!dispatchRes.ok) {
    await printQueueService.markFailed(jobId, {
      errorCode: 'PRINTER_UNREACHABLE', errorMessage: (dispatchRes as any).error ?? 'Interface Engine hand-off failed.', maxRetriesExceeded: false,
    });
    return { outcome: 'failed', jobId };
  }
  await printQueueService.markPrinted(jobId);
  return { outcome: 'dispatched', jobId };
}
