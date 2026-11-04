// src/pages/SynopticReportPage/modals/VersionHistoryModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real fix: closes two real, related gaps found while building Phase 5
// of the Patient/Encounter Management Subsystem (PatientEncounterSnapshot).
// Before this, ReportVersionRecord's real history (version number,
// trigger, who signed, the real generated PDF, and now the real,
// immutable patient/encounter snapshot) was write-only from the UI's
// perspective - reportVersionService.create() was called from three
// real places in SynopticReportPage.tsx, but nothing anywhere ever
// read it back for a human to see. Read-only, matching the established
// DeficiencyHistoryModal pattern exactly (same modal shell, same
// "raised and resolved, read-only" framing applied here as "signed and
// recorded, read-only").
//
// i18n note: `v.createdBy.userName`, `v.generationError`,
// `s.encounterClass`/`.encounterStatus`/`.facility`/`.attendingProvider`/
// ward/room/bed are all real snapshot/version data, never translated.
// `TRIGGER_LABEL_KEY` below is this file's own on-screen-only
// translation-key map for the `trigger` field.
//
// Batch 538 (Pete: what is shown must be exactly what was sent): a "Documents
// sent" section lists the case's released report documents
// (services/reportDocuments/), each with its SHA-256, and "View as sent" opens
// the stored bytes themselves: every channel sent exactly these. A document
// whose bytes no longer match its hash is refused, not shown.
//
// Batch 558: a version's own PDF is read the same way (reportVersionPdf.ts):
// checked against its SHA-256, and through the API server for a version the
// server holds. A note says when the server's list of versions couldn't be read.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/formatDate';
import { formatDate } from '@/utils/formatDate';
import type { TFunction } from 'i18next';
import '../../../pathscribe.css';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { PatientEncounterSnapshot } from '@/types/reports/PatientEncounterSnapshot';
import { recordDocumentOutput, checkReportPrint, DOCUMENT_DESTINATION, reportDocumentService, reportVersionPdfReader, sentDocumentProblem, shortHash, versionHasPdf, versionPdfProblem, type ReportDocument, type SentDocumentProblem, type VersionPdfProblem } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';

interface Props {
  versions: ReportVersionRecord[];
  /** Batch 495: the case's facility, for the report:case-report:print check. */
  facilityId?: string | null;
  /** Batch 538: the case, for its released report documents. */
  caseId?: string;
  /** Batch 558: the API server's list of versions couldn't be read, so this list may be incomplete. */
  versionsPartial?: boolean;
  onClose: () => void;
}


const TRIGGER_LABEL_KEY: Record<string, string> = {
  initial_signout: 'versionHistoryModal.trigger.initialSignout',
  amendment: 'versionHistoryModal.trigger.amendment',
};

/** Real, honest field list - only genuinely present snapshot fields
 *  are shown; a version created before this field existed (or where
 *  capture failed) shows the real, honest "not available" message
 *  below instead, never a grid of blanks. */
function snapshotFields(s: PatientEncounterSnapshot, t: TFunction, lang: string): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [
    { label: t('reportPreviewRenderer.fieldPatient'), value: `${s.lastName}, ${s.firstName}` },
    { label: t('reportPreviewRenderer.fieldMrn'), value: s.mrn },
    { label: t('reportPreviewRenderer.fieldDob'), value: formatDate(s.dateOfBirth, lang) },
  ];
  if (s.encounterNumber) fields.push({ label: t('versionHistoryModal.snapshotField.encounterNumber'), value: s.encounterNumber });
  if (s.encounterClass) fields.push({ label: t('versionHistoryModal.snapshotField.encounterClass'), value: s.encounterClass });
  if (s.encounterStatus) fields.push({ label: t('versionHistoryModal.snapshotField.encounterStatus'), value: s.encounterStatus });
  if (s.facility) fields.push({ label: t('searchPage.sections.facility'), value: s.facility });
  const location = [s.ward, s.room, s.bed].filter(Boolean).join(' / ');
  if (location) fields.push({ label: t('disposalReport.columns.location'), value: location });
  if (s.attendingProvider) fields.push({ label: t('countersignTurnaroundTab.headers.attending'), value: s.attendingProvider });
  return fields;
}

/** Real, direct base64 → blob conversion, then the same real
 *  createObjectURL/window.open pattern the live print pipeline
 *  already uses (SynopticReportPage.tsx) - falls back to a direct
 *  download if the popup is blocked, same fallback the live pipeline
 *  already has. */
function openPdfBytes(pdfBase64: string, fileName: string): string {
  const byteChars = atob(pdfBase64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  // Batch 558: the PDF's memory is released once the new tab or download has had time to read it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  const win = window.open(url, '_blank');
  if (win) return DOCUMENT_DESTINATION.pdfInBrowser;
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  return DOCUMENT_DESTINATION.download(fileName);
}

/** Batch 538: a released document's stored bytes, exactly as sent; audited. */
async function openSentDocument(doc: ReportDocument): Promise<'ok' | SentDocumentProblem> {
  const res = await reportDocumentService.read(doc.id, 'view');
  if (res.ok === false) return sentDocumentProblem(res.error);
  const destination = openPdfBytes(res.data.pdfBase64, `${doc.caseId}-${doc.reportType.toLowerCase()}-${doc.sha256.slice(0, 8)}.pdf`);
  void recordDocumentOutput({
    action: 'render', document: 'report-document', documentId: doc.id, caseId: doc.caseId, destination, status: 'success', format: 'pdf',
  });
  return 'ok';
}

/**
 * Batch 558: a version's signed PDF, read through reportVersionPdfReader, so it
 * is checked against the version's SHA-256 (and, for a version the API server
 * holds, read through the API) before it is opened. 'ok', or why not.
 */
async function openVersionPdf(v: ReportVersionRecord): Promise<'ok' | VersionPdfProblem> {
  const res = await reportVersionPdfReader.read(v, 'view');
  if (res.ok === false) return versionPdfProblem(res.error);
  const destination = openPdfBytes(res.data.pdfBase64, `version-${v.versionNumber}.pdf`);
  // PS-282 (Batch 437): opening a stored version's PDF is audited.
  void recordDocumentOutput({
    action: 'render', document: 'report-version', documentId: v.caseId, version: v.versionNumber,
    caseId: v.caseId, destination, status: 'success', format: 'pdf',
  });
  return 'ok';
}

export const VersionHistoryModal: React.FC<Props> = ({ versions, facilityId = null, caseId, versionsPartial = false, onClose }) => {
  const { t, i18n } = useTranslation();
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ReportDocument[]>([]);
  // Batch 556: with the API server, the server's part of the list may not have been read.
  const [listPartial, setListPartial] = useState(false);
  useEffect(() => {
    if (!caseId) return;
    let live = true;
    void reportDocumentService.listByCase(caseId).then(r => {
      if (!live) return;
      if (r.ok) { setDocuments([...r.data].reverse()); setListPartial(!!r.meta?.partial); } else setListPartial(true);
    }).catch(() => { if (live) setListPartial(true); });
    return () => { live = false; };
  }, [caseId]);
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide">
        <div className="ps-ms-header">🕐 {t('versionHistoryModal.header')}</div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">
            {t('versionHistoryModal.intro', { count: versions.length })}
          </p>
          {versionsPartial && <p className="ps-verhist-pdf-error" role="status">{t('versionHistoryModal.versionsPartial')}</p>}
          {sorted.length === 0 && (
            <div className="ps-cmnt-thread-empty">{t('versionHistoryModal.emptyState')}</div>
          )}
          {sorted.map(v => {
            const snapshot = v.patientEncounterSnapshot;
            return (
              <div key={v.id} className="ps-verhist-item">
                <div className="ps-verhist-header">
                  <strong className="ps-verhist-version-label">{t('versionHistoryModal.versionLabel', { number: v.versionNumber })}</strong>
                  <span className={`ps-verhist-trigger ps-verhist-trigger--${v.trigger}`}>
                    {TRIGGER_LABEL_KEY[v.trigger] ? t(TRIGGER_LABEL_KEY[v.trigger]) : v.trigger}
                  </span>
                </div>
                <div className="ps-verhist-row">
                  <span className="ps-verhist-label">{t('versionHistoryModal.signedByLabel')}</span> {v.createdBy.userName} · {formatDateTime(v.createdAt, i18n.language)}
                </div>

                {snapshot ? (
                  <div className="ps-verhist-snapshot">
                    <div className="ps-verhist-snapshot-title">{t('versionHistoryModal.snapshotTitle')}</div>
                    <div className="ps-verhist-snapshot-grid">
                      {snapshotFields(snapshot, t, i18n.language).map(f => (
                        <div key={f.label}>
                          <span className="ps-verhist-snapshot-field-label">{f.label}: </span>
                          <span className="ps-verhist-snapshot-field-value" data-phi="true">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ps-verhist-snapshot-missing">
                    {t('versionHistoryModal.snapshotMissing')}
                  </div>
                )}

                {v.generationError && (
                  <div className="ps-verhist-pdf-error">{t('versionHistoryModal.generationErrorPrefix', { error: v.generationError })}</div>
                )}
                {versionHasPdf(v) && (
                  // Batch 495 (PS-283 §4.2.4): opening a stored version's PDF
                  // (which can then be printed) needs report:case-report:print.
                  // Batch 558: a version the API server holds is listed with its hash and read through the API.
                  <CapabilityButton
                    capability="report:case-report:print"
                    context={{ caseId: v.caseId, facilityId }}
                    className="ps-verhist-pdf-link"
                    onClick={() => {
                      setPdfError(null);
                      // Batch 516: a restricted (VIP/confidential) case says so.
                      void checkReportPrint({ caseId: v.caseId, facilityId }).then(async check => {
                        if (check !== 'allowed') { setPdfError(t(`reportPrint.${check}`)); return; }
                        const opened = await openVersionPdf(v).catch(() => 'open' as const);
                        if (opened === 'open') setPdfError(t('versionHistoryModal.pdfOpenError'));
                        else if (opened !== 'ok') setPdfError(t(`versionHistoryModal.pdfProblems.${opened}`));
                      });
                    }}
                  >
                    {t('versionHistoryModal.viewPdfButton')}
                  </CapabilityButton>
                )}
              </div>
            );
          })}
          {(documents.length > 0 || listPartial) && (
            <div className="ps-verhist-sent">
              <div className="ps-verhist-snapshot-title">{t('versionHistoryModal.sentDocuments.title')}</div>
              <p className="ps-fixgate-intro">{t('versionHistoryModal.sentDocuments.intro')}</p>
              {listPartial && <p className="ps-verhist-pdf-error" role="status">{t('versionHistoryModal.sentDocuments.listPartial')}</p>}
              {documents.map(d => (
                <div key={d.id} className="ps-verhist-sent-row">
                  <span>{t('versionHistoryModal.sentDocuments.line', {
                    type: t(`versionHistoryModal.sentDocuments.types.${d.reportType}`),
                    date: formatDateTime(d.releasedAt, i18n.language),
                    producer: t(`versionHistoryModal.sentDocuments.producers.${d.producedBy}`),
                  })}</span>
                  <code className="ps-verhist-hash" title={d.sha256}>{t('versionHistoryModal.sentDocuments.hash', { hash: shortHash(d.sha256) })}</code>
                  <CapabilityButton
                    capability="report:case-report:print"
                    context={{ caseId: d.caseId, facilityId }}
                    className="ps-verhist-pdf-link"
                    onClick={() => {
                      setPdfError(null);
                      void checkReportPrint({ caseId: d.caseId, facilityId }).then(async check => {
                        if (check !== 'allowed') { setPdfError(t(`reportPrint.${check}`)); return; }
                        const opened = await openSentDocument(d).catch(() => 'unavailable' as const);
                        if (opened !== 'ok') setPdfError(t(`versionHistoryModal.sentDocuments.${opened}`));
                      });
                    }}
                  >
                    {t('versionHistoryModal.sentDocuments.viewAsSent')}
                  </CapabilityButton>
                </div>
              ))}
            </div>
          )}
          {pdfError && <div className="ps-verhist-pdf-error">{pdfError}</div>}
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};
