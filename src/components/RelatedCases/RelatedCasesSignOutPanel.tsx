// src/components/RelatedCases/RelatedCasesSignOutPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (Pete, Oct 18, 2026): the related cases part of the sign-out view. It tells the
// signer, inline, that this patient has other released cases; lists them with the physicians tied
// to each; lets the signer choose which to include (none are ticked); and shows the chosen
// reports in full, as they will print and be sent. Choosing is the pathologist's decision.
//
// What is chosen is saved at once (services/relatedCases/relatedCaseAttachments.ts) so the
// report preview and the PDF carry it; signing out fixes it.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RelatedCasePicker } from './RelatedCasePicker';
import { RelatedCaseList } from './RelatedCaseList';
import { RestrictedCasesNotice } from '@/components/PatientHistory/RestrictedCasesNotice';
import {
  getRelatedCaseAttachment, setRelatedCases, subscribeRelatedCaseAttachments,
} from '@/services/relatedCases/relatedCaseAttachments';
import type { RelatedCaseSnapshot } from '@/services/relatedCases/relatedCaseTypes';

interface Props {
  caseId: string;
  patientId: string | undefined;
  facilityId?: string | null;
  user: string;
}

export const RelatedCasesSignOutPanel: React.FC<Props> = ({ caseId, patientId, facilityId, user }) => {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<RelatedCaseSnapshot[]>(() => getRelatedCaseAttachment(caseId)?.cases ?? []);
  const [frozen, setFrozen] = useState<boolean>(() => !!getRelatedCaseAttachment(caseId)?.frozenAt);
  const [error, setError] = useState<'notPermitted' | 'frozen' | 'tooMany' | null>(null);

  useEffect(() => {
    const sync = () => {
      const a = getRelatedCaseAttachment(caseId);
      setChosen(a?.cases ?? []);
      setFrozen(!!a?.frozenAt);
    };
    sync();
    return subscribeRelatedCaseAttachments(sync);
  }, [caseId]);

  const change = async (next: RelatedCaseSnapshot[]) => {
    setChosen(next);
    const res = await setRelatedCases({ caseId, facilityId, cases: next, user });
    if (!res.ok) { setError(res.reason); setChosen(getRelatedCaseAttachment(caseId)?.cases ?? []); } else setError(null);
  };

  return (
    <div className="ps-related-signout">
      <RelatedCasePicker
        patientId={patientId}
        currentCaseId={caseId}
        chosen={chosen}
        onChange={next => { void change(next); }}
        disabled={frozen}
        hint={frozen ? t('relatedCases.signout.frozenHint') : t('relatedCases.signout.hint')}
      />
      {patientId && <RestrictedCasesNotice patientId={patientId} caseId={caseId} />}
      {error && <p className="ps-conf-error-text" role="alert">{t(`relatedCases.errors.${error}`)}</p>}
      {chosen.length > 0 && (
        <div className="ps-related-signout__preview">
          <strong>{t('relatedCases.signout.attachedTitle', { count: chosen.length })}</strong>
          <p className="ps-modal-dark-hint">{t('relatedCases.layout.notice')}</p>
          <RelatedCaseList cases={chosen} />
        </div>
      )}
    </div>
  );
};
