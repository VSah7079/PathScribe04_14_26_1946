// src/services/reports/publishReportReleasedEvent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct spec ("Decoupled Dispatch & Print Management
// System" — "The LIS processes report events... by creating a
// centralized Report_Released_Event. The system decouples the
// electronic data dispatch from physical output generation, allowing
// both to execute concurrently as independent downstream tasks").
//
// Real, deliberate scope for this pass (Component A refinement only,
// per direct follow-up): formalizes the event itself and gives it one,
// real, named publish point — it does NOT rebuild the real, already-
// working, already-tested dispatch loops in dispatchCaseInstances.ts
// or releasePreliminaryReport.ts. Those keep their own, deliberately
// different dedup semantics (FINAL dispatches exactly once per
// instance; PRELIMINARY has no dedup at all — a pathologist may
// legitimately re-release). This function is the one, real place that
// logs the event and then delegates to whichever of those two already
// does the real work for this event's own reportType — never a third,
// duplicate dispatch implementation.
//
// Real, honest limit, updated: Component B (the Print Queue Engine)
// and the Delivery Configuration Rules Engine (Section 3 of the same
// spec) are now both real and wired in here — see
// resolveRealDeliveryDecision.ts for the real rules-engine resolution
// this function now gates both subscribers behind, per direct
// follow-up ("Component C").
//
// Cytology (corrects an older note that said cytology wasn't wired here):
// its sign-out, corrections and addenda publish through this event with
// source 'CYTOLOGY'. Since Batch 532 that is once per accession, when the
// case closes, with the consolidated case report
// (services/cytology/signOutCytologyCase.ts, publishCytologyRevision.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { generateOnce, savedReportPdf } from './resolveOruReportPdf';
import { captureReleaseDocument, documentPdf, type IReportDocumentService } from '../reportDocuments/reportDocumentService';
import { dispatchCaseInstances } from './dispatchCaseInstances';
import { dispatchAmendedCaseInstance } from './dispatchAmendedCaseInstance';
import { dispatchCytologyCaseInstances } from '../cytology/dispatchCytologyCaseInstances';
import { dispatchCytologyAmendedCaseInstance } from '../cytology/dispatchCytologyAmendedCaseInstance';
import { dispatchPreliminaryCaseInstances } from './dispatchPreliminaryCaseInstances';
import { dispatchPrintJob } from '../printing/dispatchPrintJob';
import { resolveRealDeliveryDecision } from '../delivery/resolveRealDeliveryDecision';
import { deliverReportWithEntry } from '../delivery/deliverReport';
import type { DeliveryReleaseContext } from '@/types/delivery/DeliveryRetryRecord';
import type { GenerateReportPdf } from './resolveOruReportPdf';
import type { DeliveryDecisionResult } from '../delivery/resolveDeliveryAction';
import { fallbackChannels, immediateChannels, planFromAction, type ChannelOutcome, type ChannelRole } from '../delivery/deliveryPlan';
import type { DeliveryChannel } from '@/types/delivery/DeliveryRule';
import { reportReleasedEventLogService } from './reportReleasedEventLogServiceInstance';
import { getEffectiveScanStationId } from '@/utils/effectiveScanStation';

/** Real, per the source spec's own "Core Event" field list (Case/
 *  Accession ID, Report Type, Distribution Criteria), adapted to what
 *  this app actually has real data for today. Deliberately does NOT
 *  carry the rendered PDF or structured HL7 payload itself — those
 *  are real, already-built by buildOruR01Payload.ts at the moment
 *  each real dispatch function needs them, never duplicated or
 *  pre-computed here just to sit in an event object. */
export type ReportReleasedEventType = 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'ADDENDUM';

export interface ReportReleasedEvent {
  caseId: string;
  reportType: ReportReleasedEventType;
  releasedAt: string;
  /** Real, optional — every real caller today happens to know who
   *  triggered the release (the signing pathologist, or the release-
   *  buffer's own automatic expiry with no human actor), but this
   *  event's own shape doesn't require one. */
  releasedBy?: { id: string; name: string };
  /** Real, per direct follow-up ("Let's move to B" — Component B, the
   *  Print Queue Engine): the case's own performing facility, needed
   *  to resolve Facility.printDeliveryConfig
   *  (services/facilities/IFacilityService.ts). Optional — a caller
   *  with no real facility context (none exist yet, but the shape
   *  stays honest) simply means print dispatch is skipped, same
   *  'not_configured' outcome as a facility that never opted in. */
  performingFacilityId?: string;
  /** Real, optional — see dispatchPrintJob.ts's own header for the
   *  full, honest account of why this is a callback rather than
   *  pre-rendered bytes: the real PDF-generation function lives
   *  inside SynopticReportPage.tsx's own React closure, not callable
   *  from any background/service-layer function. A caller with no
   *  real access to it (the release-buffer's own automatic expiry
   *  path, today) simply can't supply one — print dispatch then fails
   *  honestly rather than queuing a job with nothing to ever print. */
  generatePdf?: GenerateReportPdf;
  /** Batch 538: the release's report document, when it was already stored (a report held for the
   *  release delay). Every channel sends it, and no new PDF is made. */
  documentId?: string;
  /** Real, per the source spec's own Use Case 3 (Emergency/High-
   *  Priority Preliminary Notification) — defaults to 'Routine' when
   *  omitted; a real caller sets 'Urgent' for a high-risk finding
   *  needing immediate delivery. Forwarded directly to
   *  dispatchPrintJob.ts's own PrintJob.priority — this event doesn't
   *  itself change behavior based on it (real batch-bypass logic
   *  would live in whatever real print-processing loop eventually
   *  reads the queue; none exists yet beyond this dispatch call
   *  itself, since there's no real batching to bypass today). */
  priority?: 'Routine' | 'Urgent';
  /** Real, per direct follow-up ("wire in Cytology") — explicit,
   *  caller-set, never inferred from Case data. Cytology has a
   *  genuinely separate real dispatch mechanism (no
   *  SynopticReportInstance at all — CytologySignOutRecord, its own
   *  outbound queue and payload builder, confirmed directly before
   *  building this), so this event needs to know which real path to
   *  use rather than guessing from case shape. Defaults to
   *  'SURGPATH' when omitted — every real caller before this field
   *  existed was already Surg Path, so this preserves their exact,
   *  existing behavior unchanged. */
  source?: 'SURGPATH' | 'CYTOLOGY';
  /** Real, per direct follow-up ("wire that in" — replacing
   *  sendSynopticReportToLis entirely for orchestration amendments):
   *  required for a real CORRECTED/ADDENDUM dispatch — scopes it to
   *  the one, specific real instance that was actually amended, never
   *  every SynopticReportInstance on the case. FINAL and PRELIMINARY
   *  ignore this field entirely — those are genuine, case-wide "sign
   *  everything out" moments, resolving their own real instances
   *  directly from the case. */
  instanceId?: string;
  /** Real, per direct correction ("the system shouldn't be
   *  constructing anything... the previous text for the Final
   *  Diagnosis is the previously reported as") — the real, prior
   *  instance.comment, verbatim, forwarded straight through to
   *  buildOruR01Payload.ts's own identical parameter for a real
   *  CORRECTED dispatch. This event never fetches or constructs it
   *  itself — only the caller (useAmendmentWorkflow.ts), which
   *  already has it directly from the real AmendmentRecord's own
   *  originalReportSnapshot, can supply it. */
  previouslyReportedAs?: string;
}

export interface ReportReleasedEventResult {
  /** Real count of real SynopticReportInstances a message was
   *  actually dispatched for. Undefined (not 0) for FINAL/CORRECTED/
   *  ADDENDUM — dispatchCaseInstances.ts's own real, existing shape
   *  is fire-and-forget/void, so no real count is available to
   *  report back for those event types today; a real, separate
   *  enhancement to that function if a caller ever needs one. */
  dispatchedCount?: number;
  /** Real, per direct follow-up ("Component B") — the real, second,
   *  concurrent subscriber's own outcome (dispatchPrintJob.ts). See
   *  that function's own DispatchPrintJobResult for the full, real
   *  tri-state meaning. */
  printOutcome?: 'not_configured' | 'dispatched' | 'failed';
  /** Real, per direct follow-up ("Component C" — the Delivery
   *  Configuration Rules Engine) — the real action this event's own
   *  real criteria (provider/facility/location/report type) resolved
   *  to, and which real rule (if any) actually won. See
   *  resolveDeliveryAction.ts's own DeliveryDecisionResult for the
   *  full, real meaning. */
  deliveryAction?: import('@/types/delivery/DeliveryRule').DeliveryAction;
  matchedRuleId?: string;
  /** Batch 520 (PS-280): how each channel that went fared ('queued' for the result message,
   *  which reports through its own queue), and the fallback channels sent. */
  channelOutcomes?: Partial<Record<DeliveryChannel, ChannelOutcome>>;
  fallbackSent?: DeliveryChannel[];
}

/**
 * The one, real, named publish point for "a report was released."
 * Logs the event (real, new, persisted audit trail — see
 * reportReleasedEventLogService.ts) then delegates to the real,
 * existing dispatch mechanism for this event's own reportType — the
 * one, real place a future print-queue subscriber would also hook in,
 * rather than every real caller needing to learn about it separately.
 */
/** Batch 426: an Assist case's finalized workups, to the LIS. The signer is whoever released it,
 *  or (the release buffer running out, no one on the page) whoever finalized the case. */
async function releaseAssistWorkups(event: ReportReleasedEvent): Promise<void> {
  const [{ dispatchAssistCaseRelease }, { assistSynopticDeps }, { caseRouter }, { userService }] = await Promise.all([
    import('./dispatchAssistSynopticResult'), import('./dispatchAssistSynopticResultDeps'), import('../cases/CaseRouter'), import('../users/userServiceInstance'),
  ]);
  const c: any = await caseRouter.getCase(event.caseId);
  if (!c || c.reportingMode !== 'assist') return;
  let signer = event.releasedBy;
  if (!signer && c.finalizedBy) {
    const u = await userService.getById(c.finalizedBy).catch(() => null);
    signer = { id: c.finalizedBy, name: u && u.ok ? [u.data.firstName, u.data.lastName].filter(Boolean).join(' ') : c.finalizedBy };
  }
  await dispatchAssistCaseRelease(event.caseId, signer ?? { id: '', name: '' }, assistSynopticDeps);
}

/** The report document store, loaded when first used. */
const lazyDocuments: Pick<IReportDocumentService, 'store' | 'read'> = {
  store: async input => (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService.store(input),
  read: async id => (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService.read(id),
};

/**
 * Batch 538 (Pete, Oct 12): the release's one report document. Made once
 * (a report held for the release delay keeps its bytes on the hold and is
 * stored here, when the delay ends), stored with its SHA-256, and given to
 * every channel; its id goes with every queue entry, retry and fallback, so
 * they all send the same bytes.
 * Batch 392's rule stays: a surgical release that brings no PDF (the end of the
 * release delay) uses the signed PDF saved with the case's report versions.
 */
export function releaseDocument(event: ReportReleasedEvent, documents: Pick<IReportDocumentService, 'store' | 'read'> = lazyDocuments): GenerateReportPdf | undefined {
  if (event.documentId) return documentPdf(event.documentId, documents);
  const own = event.generatePdf;
  const base = own ?? (event.source === 'CYTOLOGY' ? undefined : savedReportPdf(event.caseId, event.reportType));
  return captureReleaseDocument(base, {
    caseId: event.caseId, reportType: event.reportType, source: event.source ?? 'SURGPATH', releasedAt: event.releasedAt,
    ...(event.instanceId ? { instanceId: event.instanceId } : {}),
    // Batch 539: cytology is made by the report renderer too ('browser-cytology' stays only on older documents).
    producedBy: !own ? 'saved-version' : 'report-renderer',
  }, documents);
}

export async function publishReportReleasedEvent(incoming: ReportReleasedEvent): Promise<ReportReleasedEventResult> {
  const generatePdf = releaseDocument(incoming);
  // Made now, before any channel, so every queue entry can record the document it sends.
  const made = generatePdf ? await generatePdf() : undefined;
  const event: ReportReleasedEvent = made?.documentId ? { ...incoming, documentId: made.documentId } : incoming;
  await reportReleasedEventLogService.record(event);

  // Real, per direct follow-up ("Component C" — the Delivery
  // Configuration Rules Engine, Section 3 of the same spec): resolves
  // the real action (ELECTRONIC_ONLY | PRINT_ONLY | DUAL | SUPPRESS)
  // BEFORE either subscriber runs at all — this is the real gate the
  // source spec's own architecture describes ("A configurable rules
  // engine evaluates client/provider preferences at event runtime"),
  // not an afterthought bolted onto two subscribers that already ran
  // unconditionally.
  // Real, deliberate: a failure resolving the real delivery decision
  // itself (a real, transient Case/Location service hiccup) must
  // never silently block BOTH real subscribers from ever running at
  // all — that would mean a genuine release never reaches the EHR or
  // a printer over something as incidental as a Location lookup
  // failing. Degrades to the same, real, spec-stated default
  // (ELECTRONIC_ONLY) resolveDeliveryAction.ts itself already applies
  // when no rule matches, never a second, different fallback invented
  // here.
  const decision: DeliveryDecisionResult = await resolveRealDeliveryDecision(event.caseId, event.reportType)
    .catch(() => ({ action: 'ELECTRONIC_ONLY' as const }));
  const { action, matchedRuleId } = decision;
  // Batch 520 (PS-280): the rule's channel plan (spec 3.1.3). Primary and
  // secondary channels go at once; fallback channels only when a primary
  // channel fails. A rule saved before Batch 520 has only an action, and its
  // plan follows it, so ELECTRONIC_ONLY / PRINT_ONLY / DUAL / SUPPRESS behave
  // exactly as before.
  const plan = decision.plan ?? planFromAction(action);

  const immediate = immediateChannels(plan).map(c => [c, plan.primary.includes(c) ? 'primary' : 'secondary'] as [DeliveryChannel, ChannelRole]);
  const first = await sendReleaseChannels(event, generatePdf, decision, immediate, plan.fallback);
  // A primary channel with nowhere to go (no printer, no file-drop target) falls back at once; one that
  // failed falls back only after its retries (Batch 521, PS-281).
  const fallback = fallbackChannels(plan, first.outcomes);
  const later = await sendReleaseChannels(event, generatePdf, decision, fallback.map(c => [c, 'fallback'] as [DeliveryChannel, ChannelRole]), []);

  return {
    ...first.electronicResult, ...later.electronicResult,
    printOutcome: first.printOutcome ?? later.printOutcome,
    deliveryAction: action, matchedRuleId, channelOutcomes: { ...first.outcomes, ...later.outcomes }, fallbackSent: fallback,
  };
}

/** What a later fallback needs to send this release again (Batch 521, PS-281). */
type ReleaseExtras = Pick<DeliveryReleaseContext, 'performingFacilityId' | 'instanceId' | 'previouslyReportedAs' | 'priority' | 'faxNumber' | 'fileDropTargetId' | 'documentId'>;
const releaseExtras = (event: ReportReleasedEvent, decision: DeliveryDecisionResult): ReleaseExtras => ({
  ...(event.documentId ? { documentId: event.documentId } : {}),
  ...(event.performingFacilityId ? { performingFacilityId: event.performingFacilityId } : {}),
  ...(event.instanceId ? { instanceId: event.instanceId } : {}),
  ...(event.previouslyReportedAs ? { previouslyReportedAs: event.previouslyReportedAs } : {}),
  ...(event.priority ? { priority: event.priority } : {}),
  ...(decision.faxNumber ? { faxNumber: decision.faxNumber } : {}),
  ...(decision.fileDropTargetId ? { fileDropTargetId: decision.fileDropTargetId } : {}),
});

const releaseContext = (event: ReportReleasedEvent, decision: DeliveryDecisionResult): DeliveryReleaseContext => ({
  caseId: event.caseId, reportType: event.reportType, releasedAt: event.releasedAt, source: event.source ?? 'SURGPATH',
  ...releaseExtras(event, decision),
});

interface ChannelsSent {
  outcomes: Partial<Record<DeliveryChannel, ChannelOutcome>>;
  electronicResult: ReportReleasedEventResult;
  printOutcome?: ReportReleasedEventResult['printOutcome'];
}

/** Sends a release on the given channels, at once. A failed print, fax or file drop is scheduled for
 *  retry (PS-281); `fallbackForPrimary` is what a dead-lettered primary channel falls back to. */
async function sendReleaseChannels(
  event: ReportReleasedEvent,
  generatePdf: GenerateReportPdf | undefined,
  decision: DeliveryDecisionResult,
  channels: [DeliveryChannel, ChannelRole][],
  fallbackForPrimary: DeliveryChannel[],
): Promise<ChannelsSent> {
  // Real, per the source spec's own architecture ("The system
  // decouples the electronic data dispatch from physical output
  // generation, allowing both to execute concurrently as independent
  // downstream tasks") — genuinely concurrent via Promise.all, not
  // sequential. A print, fax or file-drop failure never blocks or
  // delays electronic dispatch, and vice versa; each subscriber owns
  // its own failure handling (dispatchPrintJob.ts marks its own job
  // FAILED internally; deliverReport.ts marks its queue entry FAILED).
  const runElectronic = async (): Promise<ReportReleasedEventResult> => {
    switch (event.reportType) {
      case 'FINAL':
        // Real, per direct follow-up ("wire in Cytology"):
        // branches on the caller's own, explicit source — never
        // inferred. Cytology's own dispatch function is real,
        // separate, extracted from CytologyScreeningPage.tsx's
        // own original inline logic (dispatchCytologyCaseInstances.ts's
        // own header has the full, honest account of why this
        // can't just be a branch inside dispatchCaseInstances.ts
        // itself — genuinely different data model, not a
        // stylistic split).
        if (event.source === 'CYTOLOGY') {
          await dispatchCytologyCaseInstances(event.caseId, generatePdf);
        } else {
          // Real, per this file's own header: dispatchCaseInstances.ts's
          // own real, existing, tested dispatch loop and dedup logic —
          // never re-implemented here.
          await dispatchCaseInstances(event.caseId, generatePdf);
          // Batch 426 (Pete): an Assist case sends its synoptic workups to the LIS
          // (dispatchAssistSynopticResult.ts); dispatchCaseInstances skips it.
          await releaseAssistWorkups(event).catch(e => console.error('[publishReportReleasedEvent] Assist workups not sent:', e));
        }
        return {};
      case 'CORRECTED':
      case 'ADDENDUM':
        // Real, per direct follow-up ("Cytology has no amendment
        // mechanism at all... work this"), then corrected
        // ("Cytology cases can have addendums") — branches on
        // the caller's own, explicit source, same real pattern
        // as the FINAL case above. An earlier version of this
        // switch routed Cytology only for CORRECTED, on the
        // wrong assumption that Cytology had no real addendum
        // concept at all — corrected directly: Cytology's own
        // dispatch function now handles both, built against its
        // own genuinely different data model
        // (CytologySignOutRecord, not SynopticReportInstance).
        if (event.source === 'CYTOLOGY') {
          if (event.instanceId) {
            await dispatchCytologyAmendedCaseInstance(event.caseId, event.instanceId, event.reportType, event.previouslyReportedAs, generatePdf);
          }
          return {};
        }
        // Real, per direct follow-up ("wire that in" — replacing
        // sendSynopticReportToLis entirely for orchestration
        // amendments): dispatchCaseInstances.ts is genuinely,
        // permanently 'FINAL'-only (confirmed directly — it
        // hardcodes 'FINAL' in its own dedup check, payload
        // build, and enqueue call) and dispatches every real
        // instance on the case, not the one specific instance
        // that was actually amended. Neither fits a real
        // correction/addendum, which is why this now routes to
        // its own, dedicated, instance-scoped function instead.
        // Real, honest requirement: a real caller must supply
        // instanceId for this to mean anything — without one,
        // there's no real, specific instance to report on, so
        // this is a real, silent no-op rather than a guess at
        // which instance the caller meant.
        if (event.instanceId) {
          await dispatchAmendedCaseInstance(event.caseId, event.instanceId, event.reportType, event.previouslyReportedAs, generatePdf);
        }
        return {};
      case 'PRELIMINARY': {
        // Real, per this file's own header: the same, real, extracted
        // dispatch loop releasePreliminaryReport.ts's own real caller
        // now shares through this one, real function — never a second,
        // separate copy of it.
        // Batch 533: a cytology preliminary is one specimen's urgent report (dispatchCytologyPreliminary).
        if (event.source === 'CYTOLOGY') {
          const { dispatchCytologyPreliminary } = await import('../cytology/dispatchCytologyPreliminary');
          return { dispatchedCount: await dispatchCytologyPreliminary(event.caseId, event.instanceId, generatePdf) };
        }
        const dispatchedCount = await dispatchPreliminaryCaseInstances(event.caseId, generatePdf);
        return { dispatchedCount };
      }
    }
};

  const runPrint = () =>
    dispatchPrintJob(
      event.caseId, event.performingFacilityId, event.reportType, event.priority ?? 'Routine', generatePdf,
      // Real, per PS-278 — forwards the same real 'SURGPATH' |
      // 'CYTOLOGY' signal this event already carries, so
      // dispatchPrintJob's own DIRECT_NETWORK_PRINT mode (Mode 3)
      // can resolve the real Specimen/Case Type criterion (see
      // resolveRealPrintRoutingContext.ts's own header).
      // Updated (PS-278/279 gap-closing pass, Sep 2026) — real
      // identity threading, closing this layer's own previously-
      // disclosed gap: every real interactive call site already
      // resolves and passes releasedBy (the real signing user), so
      // forwarding releasedBy.id as userId here is a genuine
      // signal, never fabricated — it's simply undefined on the
      // one real, truly non-human path (the release-buffer's own
      // automatic expiry), same honest behavior as before for that
      // path specifically. workstationId reuses the same real,
      // established, non-React getEffectiveScanStationId() this
      // app's own audit/case-routing services already call from
      // service-layer code — the sign-out that triggers this IS
      // the real action of a real pathologist at their real,
      // current workstation, so this is a real signal too, not a
      // guess.
      { source: event.source, userId: event.releasedBy?.id, workstationId: getEffectiveScanStationId() ?? undefined },
    )
      .catch(() => ({ outcome: 'failed' as const, jobId: undefined }));

  // Batch 520 (PS-280): e-fax and file drop go to the interface server, which
  // delivers them (deliverReport.ts); each is an outbound queue entry.
  const runDelivery = async (channel: 'FAX' | 'FILE_DROP', role: ChannelRole) => {
    const { reportDeliveryDeps } = await import('../delivery/reportDeliveryDeps');
    return deliverReportWithEntry({
      caseId: event.caseId, reportType: event.reportType, source: event.source ?? 'SURGPATH', releasedAt: event.releasedAt,
      channel, role, ruleFaxNumber: decision.faxNumber, fileDropTargetId: decision.fileDropTargetId, generatePdf,
      ...(role === 'primary' && fallbackForPrimary.length ? { fallbackChannels: fallbackForPrimary } : {}),
      release: releaseExtras(event, decision),
    }, reportDeliveryDeps).catch(() => ({ outcome: 'failed' as const, entryId: undefined, error: undefined }));
  };

  // Batch 521 (PS-281): a print, fax or file drop that failed is retried on the
  // lab's schedule, then dead-lettered (with the fallback, for a primary).
  const scheduleRetry = async (kind: 'print' | 'report_delivery', entryId: string | undefined, channel: DeliveryChannel, role: ChannelRole, error?: string, retriable?: boolean) => {
    if (!entryId) return;
    const [{ scheduleDeliveryRetry }, { deliveryRetryDeps }] = await Promise.all([import('../delivery/deliveryRetries'), import('../delivery/deliveryRetryDeps')]);
    await scheduleDeliveryRetry({ kind, entryId, channel, role, release: releaseContext(event, decision), fallbackChannels: fallbackForPrimary, error, ...(retriable === false ? { retriable } : {}) }, deliveryRetryDeps).catch(() => undefined);
  };

  const outcomes: Partial<Record<DeliveryChannel, ChannelOutcome>> = {};
  let electronicResult: ReportReleasedEventResult = {};
  let printOutcome: ReportReleasedEventResult['printOutcome'];
  const go = async (channel: DeliveryChannel, role: ChannelRole) => {
    if (channel === 'ELECTRONIC') {
      electronicResult = await runElectronic();
      // The result message goes through its own queue; a failure shows there, not here.
      outcomes.ELECTRONIC = 'queued';
    } else if (channel === 'PRINT') {
      const r = await runPrint();
      printOutcome = r.outcome;
      outcomes.PRINT = r.outcome === 'dispatched' ? 'sent' : r.outcome;
      if (r.outcome === 'failed') await scheduleRetry('print', r.jobId, 'PRINT', role, undefined, 'retriable' in r ? r.retriable : undefined);
    } else {
      const r = await runDelivery(channel, role);
      outcomes[channel] = r.outcome;
      if (r.outcome === 'failed') await scheduleRetry('report_delivery', r.entryId, channel, role, r.error);
    }
  };
  await Promise.all(channels.map(([c, role]) => go(c, role)));
  return { outcomes, electronicResult, printOutcome };
}

/** Batch 521 (PS-281): a dead-lettered primary channel's fallback — the release sent again on its
 *  fallback channels, with the case's signed report PDF. */
export async function sendReleaseFallback(release: DeliveryReleaseContext, channels: DeliveryChannel[]): Promise<Partial<Record<DeliveryChannel, ChannelOutcome>>> {
  const event: ReportReleasedEvent = {
    caseId: release.caseId, reportType: release.reportType, releasedAt: release.releasedAt, source: release.source,
    ...(release.performingFacilityId ? { performingFacilityId: release.performingFacilityId } : {}),
    ...(release.instanceId ? { instanceId: release.instanceId } : {}),
    ...(release.previouslyReportedAs ? { previouslyReportedAs: release.previouslyReportedAs } : {}),
    ...(release.priority ? { priority: release.priority } : {}),
    ...(release.documentId ? { documentId: release.documentId } : {}),
  };
  // Batch 538: the release's own document; before, the case's newest signed PDF (for a correction,
  // the pre-correction sign-out). A release from before Batch 538 (no document id) keeps the old
  // behaviour and stores nothing: a fallback is not a new release, so it makes no new document.
  const generatePdf = release.documentId
    ? releaseDocument(event)
    : generateOnce(release.source === 'CYTOLOGY' ? undefined : savedReportPdf(release.caseId, release.reportType));
  const decision: DeliveryDecisionResult = { action: 'SUPPRESS', faxNumber: release.faxNumber, fileDropTargetId: release.fileDropTargetId };
  const sent = await sendReleaseChannels(event, generatePdf, decision, channels.map(c => [c, 'fallback'] as [DeliveryChannel, ChannelRole]), []);
  return sent.outcomes;
}
