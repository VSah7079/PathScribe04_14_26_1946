// src/components/ClinicalHistory/CaseClinicalHistoryBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 530 (Pete, Oct 11, 2026): the case's clinical history, on the report
// page, the Cytology Workspace and the grossing screen, until sign-out.
//   • No clinical information at all (no indication, no history): "Mismatch
//     check deferred: no clinical information provided", the same notice for
//     every specialty. Intake was never blocked for it.
//   • Otherwise one line with the number of coded entries.
//   • "Add clinical history" / "Edit" opens the same coded picker Accession
//     uses (ClinicalHistoryEntryPanel), for the case-level entries; Save
//     records them (recordClinicalHistoryAfterAccession: needs
//     case:clinical-history:record, audited, refused once signed out).
// One line, no window (rule 8).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clinicalHistoryAfterAccessionService, specimenDictionaryService, caseSignedOut } from '@/services';
import { caseHasClinicalInformation, caseSpecimenTypeNames } from '@/services/clinical/clinicalMismatchInputs';
import ClinicalHistoryEntryPanel from '@/pages/AccessionPage/ClinicalHistory/ClinicalHistoryEntryPanel';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import type { Case } from '@/types/case/Case';
import type { RecordedClinicalHistoryEntry } from '@/types/clinicalHistory/RecordedClinicalHistoryEntry';
import '@/pathscribe.css';

const K = 'caseClinicalHistory';

interface Props {
  caseData: Case;
  /** The saved entries and the case's new version. */
  onSaved: (clinicalHistory: RecordedClinicalHistoryEntry[], version: number) => void;
}

export const CaseClinicalHistoryBar: React.FC<Props> = ({ caseData, onSaved }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RecordedClinicalHistoryEntry[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    specimenDictionaryService.getAll()
      .then(r => { if (r.ok) setTypes(caseSpecimenTypeNames(caseData, r.data)); })
      .catch(() => {});
  }, [editing, caseData]);

  if (caseSignedOut(caseData.status)) return null;
  const entries = caseData.order?.clinicalHistory ?? [];
  const hasInfo = caseHasClinicalInformation(caseData);

  const open = () => { setDraft(entries); setError(null); setEditing(true); };
  const save = async () => {
    setBusy(true); setError(null);
    const res = await clinicalHistoryAfterAccessionService.record(caseData.id, draft).catch(() => ({ ok: false as const, reason: 'conflict' as const }));
    setBusy(false);
    if (res.ok === false) {
      if (res.reason === 'noChange') { setEditing(false); return; }
      setError(t(`${K}.errors.${res.reason}`));
      return;
    }
    setEditing(false);
    onSaved(res.clinicalHistory, res.version);
  };

  return (
    <div className={`ps-case-clinhist${hasInfo ? '' : ' ps-case-clinhist--deferred'}`} role="status">
      <div className="ps-case-clinhist__row">
        <span className="ps-case-clinhist__text">
          {!hasInfo ? t(`${K}.deferred`) : entries.length ? t(`${K}.summary`, { count: entries.length }) : t(`${K}.summaryNone`)}
        </span>
        {!editing && (
          <CapabilityButton capability="case:clinical-history:record" context={{ caseId: caseData.id }} className="ps-conf-btn-secondary" onClick={open}>
            {entries.length ? t(`${K}.edit`) : t(`${K}.add`)}
          </CapabilityButton>
        )}
      </div>
      {editing && (
        <div className="ps-case-clinhist__editor">
          <ClinicalHistoryEntryPanel
            specimenTypes={types}
            targets={[{ id: 'case', label: t(`${K}.caseTarget`), entries: draft }]}
            onChangeTarget={(_id, next) => setDraft(next)}
            requestedCategory={null}
          />
          {error && <div className="ps-conf-error-text" role="alert">{error}</div>}
          <div className="ps-case-clinhist__actions">
            <button type="button" className="ps-conf-btn-secondary" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
            <CapabilityButton capability="case:clinical-history:record" context={{ caseId: caseData.id }} className="ps-conf-btn-primary" disabled={busy} onClick={() => { void save(); }}>
              {t(`${K}.save`)}
            </CapabilityButton>
          </div>
        </div>
      )}
    </div>
  );
};
