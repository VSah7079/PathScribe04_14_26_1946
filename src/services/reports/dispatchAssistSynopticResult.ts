// src/services/reports/dispatchAssistSynopticResult.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 426 (Pete, Oct 1 2026: "In Assist Mode, we are sending back the
// synoptic reports back to the LIS ... the LIS will include this information
// into their reports"). The outbound side of an Assist case. A synoptic
// workup goes to the LIS through the interface engine:
//   - on Finalize, as `final`; once the release buffer runs out, when one applies;
//   - on each correction (`corrected`, `corrected_with_addition`);
//   - on each addendum (`new_instance`).
//
// Each message carries:
//   - the v1.0.0 structured result (synopticResultPayload.ts);
//   - the workup's own PDF (workupPdf.ts);
//   - a plain-text block (embeddedHeader + fullPayloadText, the shape Assist
//     always sent), for an LIS that only takes text.
//
// Before Batch 426 an Assist case sent nothing on Finalize. A correction or
// addendum sent a one-line placeholder, and no synoptic data at all. The
// Orchestration result pipeline's note that an Assist report "is never
// PathScribe's to send" was a misreading, corrected here. In Assist, the
// LIS's report is the formal one; PathScribe sends the synoptic for it.
//
// Rules:
//   - Rides the existing LIS-sync queue and the LIS_SYNC message, so the
//     outbound dead-letter screen retries it (prepareAssistSynopticMessage
//     rebuilds it).
//   - Version: one more than the messages already queued for this workup.
//     The id of each version's PDF is carried with the result.
//   - Batch 392's rule applies: a result goes with its PDF. If the PDF can't
//     be made, the message is held (FAILED, not retried automatically) and
//     sent when retried.
//   - A FINAL is sent once per workup (a repeat release doesn't send it again).
//   - Batch 427: a performing lab whose LIS takes one PDF per accession (its
//     Facility setting, LIS Integration tab) gets every finalized workup in one combined PDF
//     (`case_pdf`, a new version whenever any workup is released), and each
//     workup's message names that PDF instead of carrying its own.
// ─────────────────────────────────────────────────────────────────────────────

import type { LisSyncKind, OutboundLisSyncQueueEntry } from '@/types/case/OutboundLisSyncQueueEntry';
import {
  buildSynopticResultPayload, casePdfDocumentId, workupStatusFor, type CaseLike, type CodeSystemVersions, type InstanceLike,
  type SynopticObservation, type SynopticResultPayloadV1, type TemplateLike,
} from './synopticResultPayload';
import { buildCombinedRenderPayload, buildWorkupRenderPayload, workupChanges, type WorkupChange } from './workupPdf';
import { heldMessage } from './heldMessage';
import { documentPdf, type IReportDocumentService } from '../reportDocuments/reportDocumentService';
import type { ReportDocumentType, ReportPdf } from '../reportDocuments/reportDocuments';
import type { OrganMapDeliverySettings } from '../organMapping/organMapDeliveryRules';
import type { OrganMapForDelivery } from '../organMapping/organMapDelivery';
import { ORGAN_MAP_GENERATED_FROM } from '../organMapping/organMapDeliveryRules';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

export interface AssistSynopticDeps {
  getCase: (caseId: string) => Promise<(CaseLike & { reportingMode?: string; synopticReports?: (InstanceLike & { status?: string })[]; patient?: { id?: string; mrn?: string; firstName?: string; lastName?: string; dateOfBirth?: string } }) | null | undefined>;
  getTemplate: (templateId: string) => Promise<TemplateLike | null>;
  /** The signer's NPI from their staff record. */
  getNpi: (userId: string) => Promise<string | undefined>;
  organisationIdForPatient: (patientId: string) => Promise<string | undefined>;
  queue: {
    getByCaseId: (caseId: string) => Promise<Result<OutboundLisSyncQueueEntry[]>>;
    enqueue: (entry: Omit<OutboundLisSyncQueueEntry, 'id' | 'status' | 'queuedAt' | 'retryCount' | 'maxRetriesExceeded'>) => Promise<Result<OutboundLisSyncQueueEntry>>;
    markSent: (id: string) => Promise<unknown>;
    markFailed: (id: string, f: { errorCode: OutboundLisSyncQueueEntry['errorCode']; errorMessage: string; maxRetriesExceeded: boolean }) => Promise<unknown>;
  };
  dispatch: (queueEntryId: string, payload: object) => Promise<{ ok: boolean; errorCode?: string; error?: string }>;
  /** Renders one workup's PDF from the render request (workupPdf.ts renderWorkupPdf). */
  renderPdf: (renderPayload: object) => Promise<{ pdfBase64?: string; generationError?: string }>;
  /** Wording for the PDF in the report's language, and how dates are written in it. */
  reportLanguage: (caseData: any) => Promise<{ language?: string; labels?: Record<string, string>; formatDate: (iso: string) => string; formatDob: (iso?: string) => string }>;
  codeVersions: () => CodeSystemVersions;
  now: () => string;
  /** Batch 427: the performing lab's LIS takes one PDF per accession (Facility setting). */
  consolidatePdfs: (caseData: any) => Promise<boolean>;
  /** Batch 538: where each PDF sent is stored once, with its SHA-256 (a retry sends the stored one). */
  documents?: Pick<IReportDocumentService, 'store' | 'read'>;
  /** Batch 751: the performing lab's organ map delivery (absent: none), and the map drawn for a workup. */
  organMap?: {
    settings: (caseData: object) => Promise<OrganMapDeliverySettings>;
    build: (caseData: object, instance: object, settings: OrganMapDeliverySettings, at: string) => Promise<OrganMapForDelivery | null>;
    audit: (entry: { event: string; detail: string; caseId: string }) => void;
  };
}

const DOCUMENT_TYPE: Record<LisSyncKind, ReportDocumentType> = {
  final: 'FINAL', case_pdf: 'FINAL', corrected: 'CORRECTED', corrected_with_addition: 'CORRECTED', new_instance: 'ADDENDUM', organ_map: 'FINAL',
};

/** Batch 751: the messages that are a workup's own versions (not the case PDF or an organ map file). */
export const isWorkupMessage = (e: Pick<OutboundLisSyncQueueEntry, 'kind'>) => e.kind !== 'case_pdf' && e.kind !== 'organ_map';

/**
 * Batch 538: the PDF a message carries. A retry with the entry's stored document sends those bytes;
 * otherwise it is rendered and, when the store is there, stored as a report document.
 */
async function messagePdf(
  render: () => Promise<{ pdfBase64?: string; generationError?: string }>,
  meta: { caseId: string; instanceId?: string; kind: LisSyncKind; releasedAt: string; reportDocumentId?: string },
  deps: AssistSynopticDeps,
): Promise<ReportPdf> {
  if (meta.reportDocumentId && deps.documents) return documentPdf(meta.reportDocumentId, deps.documents)();
  const made = await render();
  if (!made.pdfBase64 || !deps.documents) return made;
  const stored = await deps.documents.store({
    pdfBase64: made.pdfBase64, caseId: meta.caseId, reportType: DOCUMENT_TYPE[meta.kind], source: 'SURGPATH',
    releasedAt: meta.releasedAt, producedBy: 'report-renderer', ...(meta.instanceId ? { instanceId: meta.instanceId } : {}),
  }).catch(() => null);
  return stored?.ok ? { pdfBase64: made.pdfBase64, documentId: stored.data.id, sha256: stored.data.sha256 } : made;
}

const documentFields = (d?: { id: string; sha256?: string }) => (d ? { reportDocumentId: d.id, ...(d.sha256 ? { pdfSha256: d.sha256 } : {}) } : {});

const KIND_TO_FLAG: Record<LisSyncKind, 'A' | 'P'> = { final: 'A', corrected: 'A', corrected_with_addition: 'A', new_instance: 'P', case_pdf: 'A', organ_map: 'A' };

/** The plain-text header the LIS shows above the block (literal English, as Assist always sent it). */
export function embeddedLisHeader(kind: LisSyncKind, timestamp: string, sequenceNumber?: number, title?: string): string {
  const formatted = timestamp.replace('T', ' ').slice(0, 16) + ' UTC';
  if (kind === 'case_pdf') return `--- SYNOPTIC REPORTS (Transmitted: ${formatted}) ---`;
  if (kind === 'final') return `--- SYNOPTIC REPORT${title ? `: ${title.toUpperCase()}` : ''} (Transmitted: ${formatted}) ---`;
  if (kind === 'new_instance') return `--- ${title ? `ADDENDUM ${sequenceNumber ?? 1}: ${title.toUpperCase()}` : 'ADDITIONAL SYNOPTIC REPORT ADDED'} (Transmitted: ${formatted}) ---`;
  if (kind === 'corrected_with_addition') return `[CORRECTED RESULT WITH ADDITIONAL INFORMATION${title ? ` — ${title.toUpperCase()}` : ''} (Transmitted: ${formatted})]`;
  return `[AMENDED REPORT — CORRECTED: ${formatted}]`;
}

/** The workup as text lines (label: value unit), for an LIS that only takes text. */
export function synopticText(result: SynopticResultPayloadV1, changes: WorkupChange[]): string {
  const lines = result.synoptic_observations.map(o => `${o.label}: ${[Array.isArray(o.value) ? o.value.join(', ') : o.value, o.unit].filter(Boolean).join(' ')}`);
  if (changes.length) lines.push('', 'Changed in this version:', ...changes.map(c => `${c.label}: ${c.from || '—'} → ${c.to || '—'}`));
  return lines.join('\n');
}

export type AssistSynopticOutcome = 'notAssist' | 'notFound' | 'alreadySent' | 'held' | 'sent' | 'failed';

export interface PreparedAssistMessage {
  ok: true;
  payload: object;
  observations: SynopticObservation[];
  version: number;
  /** Batch 538: the stored document the message carries. */
  document?: { id: string; sha256?: string };
  /** Batch 751: the organ map sent with it (text in the message; a file to send after it). */
  organMap?: OrganMapForDelivery & { destination: string };
}

/** Batch 751: the map's plain lines under a heading (literal English, like the block's other headers). */
export function organMapTextBlock(lines: string[]): string {
  return [`--- ORGAN MAP (generated from the ${ORGAN_MAP_GENERATED_FROM}) ---`, ...lines].join('\n');
}

/**
 * Builds the LIS_SYNC message for one workup (also the dead-letter screen's retry). `version` and the
 * previous observations come from the queue; a held PDF returns { held }.
 */
export async function prepareAssistSynopticMessage(
  input: {
    caseId: string; instanceId: string; kind: LisSyncKind; version: number; previous?: SynopticObservation[]; signer: { id: string; name: string; signedAt: string }; sequenceNumber?: number;
    /** Batch 549: when the release happened (a rebuild passes the original); defaults to now. */
    releasedAt?: string;
    /** Batch 427: the site takes one PDF per accession; this workup's version is in that case PDF, sent separately. */
    combinedPdfDocumentId?: string;
    /** Batch 538: a retry's stored document. */
    reportDocumentId?: string;
  },
  deps: AssistSynopticDeps,
): Promise<PreparedAssistMessage | { ok: false; held?: string; reason: 'notFound' | 'notAssist' | 'held' }> {
  const c = await deps.getCase(input.caseId);
  if (!c) return { ok: false, reason: 'notFound' };
  if (c.reportingMode !== 'assist') return { ok: false, reason: 'notAssist' };
  const instance = (c.synopticReports ?? []).find(r => r.instanceId === input.instanceId);
  if (!instance) return { ok: false, reason: 'notFound' };
  const template = await deps.getTemplate(instance.templateId);
  const npi = input.signer.id ? await deps.getNpi(input.signer.id) : undefined;
  const result = buildSynopticResultPayload({
    mode: 'assist', caseData: c, instance, template,
    workup: { status: workupStatusFor(input.kind), version: input.version },
    signer: { id: input.signer.id, npi, signedAt: input.signer.signedAt },
    codeVersions: deps.codeVersions(),
    ...(input.combinedPdfDocumentId ? { pdfDocumentId: input.combinedPdfDocumentId } : {}),
  });
  const changes = input.kind === 'final' || input.kind === 'new_instance' ? [] : workupChanges(input.previous, result.synoptic_observations);
  const timestamp = deps.now();
  const embeddedHeader = embeddedLisHeader(input.kind, timestamp, input.sequenceNumber, instance.templateName);
  // Batch 751: the organ map, when the performing lab has asked for it (text in this message, a file after it).
  const mapSettings = deps.organMap ? await deps.organMap.settings(c).catch(() => null) : null;
  const map = mapSettings && mapSettings.mode !== 'off' ? await deps.organMap!.build(c, instance, mapSettings, input.signer.signedAt).catch(() => null) : null;
  const organMap = map ? { ...map, destination: mapSettings!.destination } : undefined;
  const message = {
    kind: input.kind, caseId: input.caseId, instanceId: input.instanceId, transactionStatusFlag: KIND_TO_FLAG[input.kind],
    embeddedHeader, fullPayloadText: `${embeddedHeader}\n\n${synopticText(result, changes)}${map ? `\n\n${organMapTextBlock(map.lines)}` : ''}`, timestamp, synopticResult: result,
    ...(map ? {
      organMap: {
        generatedFrom: ORGAN_MAP_GENERATED_FROM, mapType: map.mapType, lines: map.lines,
        ...(map.file ? { file: { fileName: map.file.fileName, contentType: map.file.contentType, sha256: map.file.sha256 } } : {}),
      },
    } : {}),
  };
  // Batch 427: in the combined mode the PDF goes once for the case (dispatchAssistCasePdf), not per workup.
  if (input.combinedPdfDocumentId) return { ok: true, version: input.version, observations: result.synoptic_observations, payload: message, ...(organMap ? { organMap } : {}) };
  const lang = await deps.reportLanguage(c);
  const accession = result.header.accession_number;
  const pdf = await messagePdf(() => deps.renderPdf(buildWorkupRenderPayload({
    result,
    caseHeader: {
      accession,
      patient: [c.patient?.lastName, c.patient?.firstName].filter(Boolean).join(', '),
      mrn: c.patient?.mrn ?? '',
      dob: lang.formatDob(c.patient?.dateOfBirth),
    },
    signerName: input.signer.name,
    signedAtDisplay: lang.formatDate(input.signer.signedAt),
    changes,
    language: lang.language,
    labels: lang.labels,
  })), { caseId: input.caseId, instanceId: input.instanceId, kind: input.kind, releasedAt: input.releasedAt ?? deps.now(), reportDocumentId: input.reportDocumentId }, deps);
  if (!pdf.pdfBase64) return { ok: false, reason: 'held', held: heldMessage(pdf.generationError ?? 'The workup PDF could not be made.') };
  return {
    ok: true,
    version: input.version,
    observations: result.synoptic_observations,
    ...(pdf.documentId ? { document: { id: pdf.documentId, ...(pdf.sha256 ? { sha256: pdf.sha256 } : {}) } } : {}),
    ...(organMap ? { organMap } : {}),
    payload: { ...message, workupPdf: { documentId: result.header.pdf_document_id, contentType: 'application/pdf', base64: pdf.pdfBase64 } },
  };
}

/** Queues and sends one workup to the LIS. */
export async function dispatchAssistSynopticResult(
  input: {
    caseId: string; instanceId: string; kind: LisSyncKind;
    /** Batch 549: `signedAt` is the sign-out time when the caller has it (a case release); otherwise now (a correction signed on the page). */
    signer: { id: string; name: string; signedAt?: string }; sequenceNumber?: number;
    /** Batch 427: the release sends the combined PDF once, after every workup. */
    skipCasePdf?: boolean;
  },
  deps: AssistSynopticDeps,
): Promise<{ outcome: AssistSynopticOutcome; queueEntryId?: string; version?: number; error?: string }> {
  const c = await deps.getCase(input.caseId);
  if (!c) return { outcome: 'notFound' };
  if (c.reportingMode !== 'assist') return { outcome: 'notAssist' };
  const prior = await deps.queue.getByCaseId(input.caseId);
  const entries = prior.ok ? prior.data : [];
  const mine = entries.filter(e => e.instanceId === input.instanceId && isWorkupMessage(e));
  if (input.kind === 'final' && mine.some(e => e.kind === 'final')) return { outcome: 'alreadySent' };
  const version = mine.length + 1;
  const previous = [...mine].reverse().find(e => e.sentObservations)?.sentObservations;
  const signer = { ...input.signer, signedAt: input.signer.signedAt || deps.now() };
  const combined = await deps.consolidatePdfs(c);
  const combinedPdfDocumentId = combined ? casePdfDocumentId(input.caseId, entries.filter(e => e.kind === 'case_pdf').length + 1) : undefined;
  const prepared = await prepareAssistSynopticMessage({ ...input, version, previous, signer, combinedPdfDocumentId }, deps);
  if (prepared.ok === false && prepared.reason !== 'held') return { outcome: prepared.reason };
  const organisationId = c.patient?.id ? await deps.organisationIdForPatient(c.patient.id) : undefined;
  const queued = await deps.queue.enqueue({
    caseId: input.caseId, instanceId: input.instanceId, kind: input.kind, organisationId: organisationId ?? '',
    workupVersion: version, signer, ...(prepared.ok ? { sentObservations: prepared.observations, ...documentFields(prepared.document) } : {}),
  });
  if (queued.ok === false) return { outcome: 'failed', error: (queued as { error?: string }).error };
  if (prepared.ok === false) {
    await deps.queue.markFailed(queued.data.id, { errorCode: 'DISPATCH_REJECTED', errorMessage: prepared.held ?? '', maxRetriesExceeded: false });
    return { outcome: 'held', queueEntryId: queued.data.id, version, error: prepared.held };
  }
  const sent = await deps.dispatch(queued.data.id, prepared.payload);
  if (combined && !input.skipCasePdf) await dispatchAssistCasePdf(input.caseId, input.signer, deps);
  // Batch 751: the organ map file follows its workup's message (its failure never touches the workup's outcome).
  if (prepared.organMap && (prepared.organMap.file || prepared.organMap.fileProblem)) {
    await dispatchOrganMapFile({ caseId: input.caseId, instanceId: input.instanceId, organisationId: organisationId ?? '', signer, map: prepared.organMap }, deps).catch(() => undefined);
  }
  if (sent.ok) { await deps.queue.markSent(queued.data.id); return { outcome: 'sent', queueEntryId: queued.data.id, version }; }
  await deps.queue.markFailed(queued.data.id, { errorCode: (sent.errorCode as any) ?? 'DISPATCH_REJECTED', errorMessage: sent.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
  return { outcome: 'failed', queueEntryId: queued.data.id, version, error: sent.error };
}

/**
 * Batch 427 (Pete: "Per-site PDF consolidation"). For a site whose LIS takes one PDF per accession: every
 * finalized workup on the case in one PDF (the renderer draws them in one document, so the pages run on),
 * as its own `case_pdf` message, resent whole as a new version whenever any workup is released again. Each
 * workup's structured result still goes in its own message and names this PDF's id. Held (Batch 392 rule)
 * when the PDF can't be made.
 */
export async function prepareAssistCasePdfMessage(
  input: { caseId: string; version: number; signer: { id: string; name: string; signedAt: string }; reportDocumentId?: string; releasedAt?: string },
  deps: AssistSynopticDeps,
): Promise<{ ok: true; payload: object; document?: { id: string; sha256?: string } } | { ok: false; reason: 'notFound' | 'notAssist' | 'nothingFinal' | 'held'; held?: string }> {
  const c = await deps.getCase(input.caseId);
  if (!c) return { ok: false, reason: 'notFound' };
  if (c.reportingMode !== 'assist') return { ok: false, reason: 'notAssist' };
  const finals = (c.synopticReports ?? []).filter(r => r.status === 'finalized');
  if (!finals.length) return { ok: false, reason: 'nothingFinal' };
  const all = await deps.queue.getByCaseId(input.caseId);
  const entries = all.ok ? all.data : [];
  const documentId = casePdfDocumentId(input.caseId, input.version);
  const npi = input.signer.id ? await deps.getNpi(input.signer.id) : undefined;
  const lang = await deps.reportLanguage(c);
  const workups: Parameters<typeof buildCombinedRenderPayload>[0]['workups'] = [];
  for (const inst of finals) {
    const sentForIt = entries.filter(e => e.instanceId === inst.instanceId && isWorkupMessage(e)).sort((a, b) => (a.workupVersion ?? 0) - (b.workupVersion ?? 0));
    const latest = sentForIt[sentForIt.length - 1];
    const before = sentForIt.length > 1 ? sentForIt[sentForIt.length - 2].sentObservations : undefined;
    const kind = latest?.kind ?? 'final';
    const result = buildSynopticResultPayload({
      mode: 'assist', caseData: c, instance: inst, template: await deps.getTemplate(inst.templateId),
      workup: { status: workupStatusFor(kind), version: latest?.workupVersion ?? 1 },
      signer: { id: latest?.signer?.id ?? input.signer.id, npi, signedAt: latest?.signer?.signedAt ?? input.signer.signedAt },
      codeVersions: deps.codeVersions(), pdfDocumentId: documentId,
    });
    const changes = kind === 'corrected' || kind === 'corrected_with_addition' ? workupChanges(before, result.synoptic_observations) : [];
    workups.push({ result, signerName: latest?.signer?.name ?? input.signer.name, signedAtDisplay: lang.formatDate(latest?.signer?.signedAt ?? input.signer.signedAt), changes });
  }
  const pdf = await messagePdf(() => deps.renderPdf(buildCombinedRenderPayload({
    workups,
    caseHeader: {
      accession: workups[0].result.header.accession_number,
      patient: [c.patient?.lastName, c.patient?.firstName].filter(Boolean).join(', '),
      mrn: c.patient?.mrn ?? '', dob: lang.formatDob(c.patient?.dateOfBirth),
    },
    documentId, language: lang.language, labels: lang.labels,
  })), { caseId: input.caseId, kind: 'case_pdf', releasedAt: input.releasedAt ?? deps.now(), reportDocumentId: input.reportDocumentId }, deps);
  if (!pdf.pdfBase64) return { ok: false, reason: 'held', held: heldMessage(pdf.generationError ?? 'The combined PDF could not be made.') };
  const timestamp = deps.now();
  const embeddedHeader = embeddedLisHeader('case_pdf', timestamp);
  return {
    ok: true,
    ...(pdf.documentId ? { document: { id: pdf.documentId, ...(pdf.sha256 ? { sha256: pdf.sha256 } : {}) } } : {}),
    payload: {
      kind: 'case_pdf', caseId: input.caseId, instanceId: '', transactionStatusFlag: 'A', embeddedHeader, timestamp,
      fullPayloadText: [embeddedHeader, ...workups.map(w => `\n${w.result.header.template.name ?? w.result.header.template.id}\n${synopticText(w.result, w.changes)}`)].join('\n'),
      casePdf: { documentId, contentType: 'application/pdf', base64: pdf.pdfBase64 },
      workups: workups.map(w => ({ pathscribe_report_id: w.result.header.pathscribe_report_id, workup_version: w.result.header.workup_version, workup_status: w.result.header.workup_status })),
    },
  };
}

/** Batch 427: queues and sends the case's combined PDF (a new version each time). */
export async function dispatchAssistCasePdf(
  caseId: string,
  signer: { id: string; name: string; signedAt?: string },
  deps: AssistSynopticDeps,
): Promise<{ outcome: AssistSynopticOutcome | 'nothingFinal'; queueEntryId?: string; version?: number; error?: string }> {
  const c = await deps.getCase(caseId);
  if (!c) return { outcome: 'notFound' };
  if (c.reportingMode !== 'assist') return { outcome: 'notAssist' };
  const prior = await deps.queue.getByCaseId(caseId);
  const version = (prior.ok ? prior.data : []).filter(e => e.kind === 'case_pdf').length + 1;
  const withTime = { ...signer, signedAt: signer.signedAt || deps.now() };
  const prepared = await prepareAssistCasePdfMessage({ caseId, version, signer: withTime }, deps);
  if (prepared.ok === false && prepared.reason !== 'held') return { outcome: prepared.reason };
  const organisationId = c.patient?.id ? await deps.organisationIdForPatient(c.patient.id) : undefined;
  const queued = await deps.queue.enqueue({ caseId, instanceId: '', kind: 'case_pdf', organisationId: organisationId ?? '', workupVersion: version, signer: withTime, ...(prepared.ok ? documentFields(prepared.document) : {}) });
  if (queued.ok === false) return { outcome: 'failed', error: (queued as { error?: string }).error };
  if (prepared.ok === false) {
    await deps.queue.markFailed(queued.data.id, { errorCode: 'DISPATCH_REJECTED', errorMessage: prepared.held ?? '', maxRetriesExceeded: false });
    return { outcome: 'held', queueEntryId: queued.data.id, version, error: prepared.held };
  }
  const sent = await deps.dispatch(queued.data.id, prepared.payload);
  if (sent.ok) { await deps.queue.markSent(queued.data.id); return { outcome: 'sent', queueEntryId: queued.data.id, version }; }
  await deps.queue.markFailed(queued.data.id, { errorCode: (sent.errorCode as any) ?? 'DISPATCH_REJECTED', errorMessage: sent.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
  return { outcome: 'failed', queueEntryId: queued.data.id, version, error: sent.error };
}

/** Every finalized workup of an Assist case, on release (Finalize, or the end of the release buffer). */
export async function dispatchAssistCaseRelease(
  caseId: string,
  signer: { id: string; name: string; signedAt?: string },
  deps: AssistSynopticDeps,
): Promise<{ instanceId: string; outcome: AssistSynopticOutcome }[]> {
  const c = await deps.getCase(caseId);
  if (!c || c.reportingMode !== 'assist') return [];
  // Batch 549 (open since Batch 538): the result carries the time the case was signed out, not the time the message
  // was built, when the signer is the pathologist who signed it out. Someone else releasing it ("release now") keeps
  // the time of release, so a person's id is never paired with another person's time. The stored document's
  // releasedAt is always the time of release (deps.now()).
  const finalized = c as { finalizedAt?: unknown; finalizedBy?: unknown };
  if (typeof finalized.finalizedAt === 'string' && finalized.finalizedAt && signer.id && signer.id === finalized.finalizedBy) {
    signer = { ...signer, signedAt: finalized.finalizedAt };
  }
  const out: { instanceId: string; outcome: AssistSynopticOutcome }[] = [];
  const combined = await deps.consolidatePdfs(c);
  for (const inst of (c.synopticReports ?? []).filter(r => r.status === 'finalized')) {
    out.push({ instanceId: inst.instanceId, outcome: (await dispatchAssistSynopticResult({ caseId, instanceId: inst.instanceId, kind: 'final', signer, skipCasePdf: true }, deps)).outcome });
  }
  // Batch 427: one combined PDF for the release, when the site takes one PDF per accession.
  if (combined && out.some(o => o.outcome !== 'alreadySent' && o.outcome !== 'notFound')) {
    out.push({ instanceId: '', outcome: (await dispatchAssistCasePdf(caseId, signer, deps)).outcome as AssistSynopticOutcome });
  }
  return out;
}

/** The dead-letter screen's retry of a queued Assist message: rebuilt from today's workup, at the version and with
 *  the signer it was queued with. A held PDF stays held; a message from before Batch 426 (no version) is version 1. */
export async function rebuildAssistSynopticMessage(entry: OutboundLisSyncQueueEntry, deps: AssistSynopticDeps): Promise<object | { held: string } | null> {
  if (entry.kind === 'case_pdf') {
    const p = await prepareAssistCasePdfMessage({ caseId: entry.caseId, version: entry.workupVersion ?? 1, signer: entry.signer ?? { id: '', name: '', signedAt: entry.queuedAt }, releasedAt: entry.queuedAt, ...(entry.reportDocumentId ? { reportDocumentId: entry.reportDocumentId } : {}) }, deps);
    if (p.ok === true) return p.payload;
    const f = p as { reason: string; held?: string };
    return f.reason === 'held' ? { held: f.held ?? '' } : null;
  }
  if (entry.kind === 'organ_map') return rebuildOrganMapFileMessage(entry, deps);
  const all = await deps.queue.getByCaseId(entry.caseId);
  const earlier = (all.ok ? all.data : []).filter(e => e.instanceId === entry.instanceId && isWorkupMessage(e) && e.id !== entry.id && (e.workupVersion ?? 0) < (entry.workupVersion ?? 1));
  const previous = [...earlier].reverse().find(e => e.sentObservations)?.sentObservations;
  const prepared = await prepareAssistSynopticMessage({
    caseId: entry.caseId, instanceId: entry.instanceId, kind: entry.kind, version: entry.workupVersion ?? 1, previous,
    signer: entry.signer ?? { id: '', name: '', signedAt: entry.queuedAt }, releasedAt: entry.queuedAt,
    ...(entry.reportDocumentId ? { reportDocumentId: entry.reportDocumentId } : {}),
    combinedPdfDocumentId: (await deps.consolidatePdfs(await deps.getCase(entry.caseId))) ? casePdfDocumentId(entry.caseId, (all.ok ? all.data : []).filter(e => e.kind === 'case_pdf').length || 1) : undefined,
  }, deps);
  if (prepared.ok === true) return prepared.payload;
  const failed = prepared as { reason: string; held?: string };
  return failed.reason === 'held' ? { held: failed.held ?? '' } : null;
}

// ── Batch 751: the organ map file (spec section 12.3) ───────────────────────────────────────────────────────────────

/** The organ_map message: the file, what it is, and where the interface engine is to put it. */
function organMapFilePayload(caseId: string, instanceId: string, timestamp: string, map: OrganMapForDelivery & { destination: string }): object | null {
  if (!map.file) return null;
  return {
    kind: 'organ_map', caseId, instanceId, transactionStatusFlag: 'A', timestamp, destination: map.destination,
    organMapFile: { ...map.file, mapType: map.mapType, fingerprint: map.fingerprint, generatedFrom: ORGAN_MAP_GENERATED_FROM },
  };
}

/** Queues and sends one organ map file; a file that couldn't be drawn is queued as held, for retry. Audited either way. */
export async function dispatchOrganMapFile(
  input: { caseId: string; instanceId: string; organisationId: string; signer: { id: string; name: string; signedAt: string }; map: OrganMapForDelivery & { destination: string } },
  deps: AssistSynopticDeps,
): Promise<{ outcome: 'sent' | 'failed' | 'held'; queueEntryId?: string }> {
  const { map } = input;
  const record = { fileName: map.file?.fileName ?? '', ...(map.file ? { sha256: map.file.sha256 } : {}), fingerprint: map.fingerprint, mapType: map.mapType, destination: map.destination };
  const queued = await deps.queue.enqueue({ caseId: input.caseId, instanceId: input.instanceId, kind: 'organ_map', organisationId: input.organisationId, signer: input.signer, organMapFile: record });
  if (queued.ok === false) return { outcome: 'failed' };
  const what = `${map.mapType} map for synoptic ${input.instanceId}`;
  const payload = organMapFilePayload(input.caseId, input.instanceId, deps.now(), map);
  if (!payload) {
    const why = map.fileProblem ?? 'The organ map file could not be drawn.';
    await deps.queue.markFailed(queued.data.id, { errorCode: 'DISPATCH_REJECTED', errorMessage: heldMessage(why), maxRetriesExceeded: false });
    deps.organMap?.audit({ event: 'Organ Map File Delivery Failed', detail: `${what}: ${why}`, caseId: input.caseId });
    return { outcome: 'held', queueEntryId: queued.data.id };
  }
  const sent = await deps.dispatch(queued.data.id, payload);
  if (sent.ok) {
    await deps.queue.markSent(queued.data.id);
    deps.organMap?.audit({ event: 'Organ Map File Sent', detail: `${what}: ${record.fileName} (SHA-256 ${(record.sha256 ?? '').slice(0, 12)}, fingerprint ${map.fingerprint.slice(0, 12)}) to ${map.destination}`, caseId: input.caseId });
    return { outcome: 'sent', queueEntryId: queued.data.id };
  }
  await deps.queue.markFailed(queued.data.id, { errorCode: (sent.errorCode as OutboundLisSyncQueueEntry['errorCode']) ?? 'DISPATCH_REJECTED', errorMessage: sent.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
  deps.organMap?.audit({ event: 'Organ Map File Delivery Failed', detail: `${what}: ${record.fileName} to ${map.destination}: ${sent.error ?? 'unknown dispatch failure'}`, caseId: input.caseId });
  return { outcome: 'failed', queueEntryId: queued.data.id };
}

/** The outbound queue's retry of an organ map file: drawn again from the workup's final answers, under the same file
 *  name (the result message names it). Held again when it still can't be drawn; null when there is no map now. */
export async function rebuildOrganMapFileMessage(entry: OutboundLisSyncQueueEntry, deps: AssistSynopticDeps): Promise<object | { held: string } | null> {
  if (!deps.organMap) return null;
  const c = await deps.getCase(entry.caseId);
  const instance = (c?.synopticReports ?? []).find(r => r.instanceId === entry.instanceId);
  if (!c || !instance) return null;
  const settings = await deps.organMap.settings(c);
  if (settings.mode !== 'textAndFile') return null;
  const map = await deps.organMap.build(c, instance, settings, entry.signer?.signedAt ?? entry.queuedAt).catch(() => null);
  if (!map) return null;
  if (!map.file) return { held: heldMessage(map.fileProblem ?? 'The organ map file could not be drawn.') };
  const fileName = entry.organMapFile?.fileName || map.file.fileName;
  return organMapFilePayload(entry.caseId, entry.instanceId, deps.now(), { ...map, file: { ...map.file, fileName }, destination: entry.organMapFile?.destination || settings.destination });
}
