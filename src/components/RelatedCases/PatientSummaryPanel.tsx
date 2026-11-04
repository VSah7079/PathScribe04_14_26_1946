// src/components/RelatedCases/PatientSummaryPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (Pete, Oct 18, 2026: "go with patient summary print"): the Patient summary, reached
// from the patient history view. The user chooses from this patient's released cases (the same
// picker the sign-out view uses), and prints a sheet that lists them in date order with their
// diagnoses and source accessions. The sheet says on its face that it is a summary and not a
// signed report. Printing needs `patient:summary:print` and is audited.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { RelatedCasePicker } from './RelatedCasePicker';
import { RelatedCaseList } from './RelatedCaseList';
import { formatDateTime } from '@/utils/formatDate';
import { authorisePatientSummaryPrint, summaryCases } from '@/services/relatedCases/patientSummary';
import type { RelatedCaseSnapshot } from '@/services/relatedCases/relatedCaseTypes';

interface Props {
  patientId: string;
  patientName: string;
  mrn: string;
  dateOfBirth: string;
  currentCaseId?: string;
}

export const PatientSummaryPanel: React.FC<Props> = ({ patientId, patientName, mrn, dateOfBirth, currentCaseId }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [chosen, setChosen] = useState<RelatedCaseSnapshot[]>([]);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<'notPermitted' | 'nothingChosen' | null>(null);

  const print = async () => {
    const res = await authorisePatientSummaryPrint({
      patientId, currentCaseId: currentCaseId ?? null, chosen, user: user?.name ?? 'Unknown',
    });
    if (!res.ok) { setError(res.reason); return; }
    setError(null);
    setPrinting(true);
  };

  // Open the print dialog once the sheet is on the page; take it away afterwards.
  useEffect(() => {
    if (!printing) return;
    document.body.classList.add('ps-summary-printing');
    const done = () => { document.body.classList.remove('ps-summary-printing'); setPrinting(false); };
    window.addEventListener('afterprint', done, { once: true });
    const timer = window.setTimeout(() => window.print(), 50);
    return () => { window.clearTimeout(timer); window.removeEventListener('afterprint', done); document.body.classList.remove('ps-summary-printing'); };
  }, [printing]);

  const ordered = summaryCases(chosen);

  return (
    <section className="ps-patient-summary">
      <RelatedCasePicker
        patientId={patientId}
        currentCaseId={currentCaseId}
        chosen={chosen}
        onChange={setChosen}
        allowSelectAll
        hint={t('relatedCases.summary.hint')}
      />
      <div className="ps-patient-summary__actions">
        <span className="ps-modal-dark-hint">{t('relatedCases.summary.selected', { count: chosen.length })}</span>
        <button type="button" className="ps-btn-ghost-teal" disabled={chosen.length === 0} onClick={() => { void print(); }}>
          {t('relatedCases.summary.print')}
        </button>
      </div>
      {error && <p className="ps-conf-error-text" role="alert">{t(error === 'notPermitted' ? 'relatedCases.errors.notPermittedPrint' : 'relatedCases.errors.nothingChosen')}</p>}
      {printing && createPortal(
        <div className="ps-summary-print-root">
          <h1 className="ps-summary-print-title">{t('relatedCases.summary.sheetTitle')}</h1>
          <p className="ps-summary-print-notice">{t('relatedCases.summary.sheetNotice')}</p>
          <p className="ps-summary-print-patient">
            <span data-phi="name">{patientName}</span>
            {' '}
            <span>{t('relatedCases.summary.mrnLabel')}</span>{' '}<span data-phi="mrn">{mrn}</span>
            {' '}
            <span>{t('relatedCases.summary.dobLabel')}</span>{' '}<span data-phi="dob">{dateOfBirth}</span>
          </p>
          <p className="ps-summary-print-compiled">
            {t('relatedCases.summary.compiled', { when: formatDateTime(new Date().toISOString(), i18n.language), name: user?.name ?? '' })}
          </p>
          <RelatedCaseList cases={ordered} />
        </div>,
        document.body,
      )}
    </section>
  );
};
