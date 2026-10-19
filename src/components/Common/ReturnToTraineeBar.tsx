// src/components/Common/ReturnToTraineeBar.tsx
// Batch 608 (#32, #84): on a case released for countersign (a cytology
// specimen, or an autopsy report), the attending can Return to Trainee with
// required feedback; once returned, the trainee sees the feedback in a banner.
// Surgical cases use the sign-out panel's own Return to Trainee (useSignOutWorkflow).

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { countersignService } from '@/services';
import { returnCaseToTrainee } from '@/services/cases/returnCaseToTrainee';
import { returnCaseToTraineeDeps } from '@/services/cases/returnCaseToTraineeDeps';
import type { CountersignRecord } from '@/types/case/CountersignRecord';

interface Props {
  caseId: string;
  /** A cytology specimen's ID; absent for an autopsy report (one record per case). */
  specimenId?: string;
  /** The specimen to wait for before loading (a cytology page with no specimen chosen yet). */
  requireSpecimen?: boolean;
  user: { id: string; name: string } | null;
  /** Reload the case after a return. */
  onReturned: () => void | Promise<void>;
}

export function ReturnToTraineeBar({ caseId, specimenId, requireSpecimen, user, onReturned }: Props) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<CountersignRecord | null>(null);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRequired, setShowRequired] = useState(false);

  const load = useCallback(async () => {
    if (requireSpecimen && !specimenId) { setRecord(null); return; }
    const r = specimenId ? await countersignService.getForSpecimen(caseId, specimenId) : await countersignService.getForCase(caseId);
    setRecord(r.ok ? r.data : null);
  }, [caseId, specimenId, requireSpecimen]);
  useEffect(() => { void load(); }, [load]);

  if (!record || !user) return null;

  if (record.status === 'returned') {
    return (
      <div className="ps-cyto-return-banner" role="status">
        <strong>{t('cytologyReturn.bannerTitle', { name: record.attendingName ?? '' })}</strong>
        <span>{record.attendingFeedback}</span>
      </div>
    );
  }
  if (record.status !== 'pending' || record.residentId === user.id) return null;

  const submit = async () => {
    if (requireSpecimen && !specimenId) return;
    if (!feedback.trim()) { setShowRequired(true); return; }
    setBusy(true);
    try {
      const result = await returnCaseToTrainee({ caseId, specimenId, attending: user, feedback }, returnCaseToTraineeDeps);
      if (result.outcome === 'returned') {
        toast.success(t('cytologyReturn.returned', { name: result.record.residentName }));
        setFeedback('');
        await load();
        await onReturned();
      } else {
        toast.error(t(`cytologyReturn.error.${result.outcome}`));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ps-cyto-return-bar">
      <label className="ps-conf-label" htmlFor="cyto-return-feedback">{t('cytologyReturn.feedbackLabel')}</label>
      <textarea id="cyto-return-feedback" className="ps-conf-input" rows={2} value={feedback}
        onChange={e => { setFeedback(e.target.value); setShowRequired(false); }} />
      {showRequired && <span className="ps-conf-hint" role="alert">{t('cytologyReturn.feedbackRequired')}</span>}
      <button type="button" className="ps-conf-btn-secondary" disabled={busy} onClick={() => void submit()}>{t('cytologyReturn.button')}</button>
    </div>
  );
}
