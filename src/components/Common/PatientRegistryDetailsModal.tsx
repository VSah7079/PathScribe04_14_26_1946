// src/components/Common/PatientRegistryDetailsModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 425 (Pete and his developer: "post-accession identifier editing
// modal"). A case's patient's national identifiers and registry opt-outs,
// edited after accessioning: from the Registry Exceptions worklist, so a
// submission held for a missing or failed identifier can be fixed and resent.
// Saving needs patient:national-identifier:record (identifiers; an A08 goes
// to the interface engine) and patient:registry-consent:record (opt-outs),
// checked in their services. Presentation only: the hook and
// services/patients/patientRegistryDetails.ts do the work.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import '@/pathscribe.css';
import type { Jurisdiction } from '@/types/systemConfig';
import { NationalIdentifierFields } from './NationalIdentifierFields';
import { RegistryConsentFields } from './RegistryConsentFields';
import { CapabilityButton } from './CapabilityButton';
import { usePatientRegistryDetailsEditor } from '@/hooks/usePatientRegistryDetailsEditor';
import { LoadingState } from '@/components/Common/LoadingState';

interface Props {
  caseId: string | null;
  jurisdiction: Jurisdiction | undefined;
  user: { id: string; name: string } | null | undefined;
  onClose: () => void;
  onSaved: () => void;
}

export const PatientRegistryDetailsModal: React.FC<Props> = ({ caseId, jurisdiction, user, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { loaded, draft, setDraft, saving, save } = usePatientRegistryDetailsEditor(caseId, user);
  if (!caseId) return null;

  const onSave = async () => {
    const r = await save();
    if (!r) return;
    if (r.outcome === 'saved') toast.success(t('patientRegistryDetails.saved'));
    else if (r.outcome === 'unchanged') toast.info(t('patientRegistryDetails.unchanged'));
    else toast.warning(t(`patientRegistryDetails.${r.outcome}`));
    if (r.outcome !== 'refused') onSaved();
    onClose();
  };

  return (
    <div className="ps-overlay ps-overlay--confirm" role="dialog" aria-modal="true" aria-label={t('patientRegistryDetails.title')}>
      <div className="ps-modal-dark ps-modal-sm ps-patient-registry-modal">
        <span className="ps-modal-dark-title">{t('patientRegistryDetails.title')}</span>
        <p className="ps-modal-dark-body">
          {t('patientRegistryDetails.caseLabel')} <span data-phi="accession">{caseId}</span>
        </p>
        <p className="ps-regx-muted">{t('patientRegistryDetails.note')}</p>
        {!loaded || !draft ? <LoadingState variant="inline" className="ps-regx-muted" label={t('patientRegistryDetails.loading')} /> : (
          <div className="ps-patient-registry-fields">
            <NationalIdentifierFields jurisdiction={jurisdiction} values={draft.nationalIds} disabled={saving}
              onChange={(system, value) => setDraft({ ...draft, nationalIds: { ...draft.nationalIds, [system]: value } })} />
            <RegistryConsentFields {...draft.consent} disabled={saving} onChange={consent => setDraft({ ...draft, consent })} />
          </div>
        )}
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onClose}>{t('common.cancel')}</button>
          <CapabilityButton capability="patient:national-identifier:record" className="ps-btn-amber" disabled={!loaded || saving} onClick={onSave}>
            {t(saving ? 'patientRegistryDetails.saving' : 'patientRegistryDetails.save')}
          </CapabilityButton>
        </div>
      </div>
    </div>
  );
};

export default PatientRegistryDetailsModal;
