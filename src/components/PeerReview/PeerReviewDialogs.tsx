// src/components/PeerReview/PeerReviewDialogs.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439): the peer review forms, shared by the report page's
// banner and the sign-out gate. Render and dispatch only: the checks are in
// services/quality/peerReviewRules.ts and run again in peerReviewService.ts.
//   PeerReviewRequestForm — choose the reviewer (never the signer), add a note
//   PeerReviewDialog      — the reviewer's read, the consensus step, withdraw
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  peerReviewService, peerReviewReadProblem, peerReviewResolutionProblem, peerReviewWithdrawProblem, peerReviewRequestProblem,
} from '@/services';
import type { PeerReviewRequest, PeerReviewTrigger, PersonRef } from '@/types/quality/PeerReview';
import type { QaDiscordanceSeverity } from '@/types/quality/QaActivityRecord';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import '@/pathscribe.css';

const K = 'peerReview';

export const PeerReviewRequestForm: React.FC<{
  caseId: string;
  accession?: string;
  trigger: PeerReviewTrigger;
  triggerDetail?: string;
  reviewers: PersonRef[];
  currentUserId: string;
  onDone: () => void;
  onCancel?: () => void;
}> = ({ caseId, accession, trigger, triggerDetail, reviewers, currentUserId, onDone, onCancel }) => {
  const { t } = useTranslation();
  const [reviewerId, setReviewerId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const problem = peerReviewRequestProblem([], { caseId, primaryPathologistId: currentUserId, reviewerId });
    if (problem) { setError(t(`${K}.errors.${problem}`)); return; }
    const reviewer = reviewers.find(r => r.userId === reviewerId);
    if (!reviewer) { setError(t(`${K}.errors.REVIEWER_REQUIRED`)); return; }
    const res = await peerReviewService.request({ caseId, accession, trigger, triggerDetail, reviewer, note });
    if (res.ok === false) { setError(t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.failed`) })); return; }
    onDone();
  };

  return (
    <div className="ps-peer-review__form">
      <div className="ps-conf-form-field">
        <label className="ps-conf-label" htmlFor="peer-reviewer">{t(`${K}.reviewerLabel`)} <span className="ps-conf-required">*</span></label>
        <select id="peer-reviewer" className="ps-conf-select" value={reviewerId} onChange={e => setReviewerId(e.target.value)}>
          <option value="">{t(`${K}.reviewerPlaceholder`)}</option>
          {reviewers.map(r => <option key={r.userId} value={r.userId}>{r.userName}</option>)}
        </select>
        <span className="ps-conf-field-hint">{t(`${K}.reviewerHint`)}</span>
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label" htmlFor="peer-request-note">{t(`${K}.noteLabel`)}</label>
        <textarea id="peer-request-note" className="ps-conf-input ps-peer-review__textarea" value={note} onChange={e => setNote(e.target.value)} placeholder={t(`${K}.notePlaceholder`)} />
      </div>
      {error && <div className="ps-conf-error-text">{error}</div>}
      <div className="ps-peer-review__actions">
        {onCancel && <button className="ps-ms-btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>}
        <CapabilityButton capability="case:peer-review:request" context={{ caseId }} className="ps-ms-btn-apply" onClick={() => { void submit(); }}>
          {t(`${K}.requestButton`)}
        </CapabilityButton>
      </div>
    </div>
  );
};

export type PeerReviewDialogMode = 'read' | 'resolve' | 'withdraw';

export const PeerReviewDialog: React.FC<{
  mode: PeerReviewDialogMode;
  request: PeerReviewRequest;
  currentUserId: string;
  onDone: () => void;
  onCancel: () => void;
}> = ({ mode, request, currentUserId, onDone, onCancel }) => {
  const { t } = useTranslation();
  const [agrees, setAgrees] = useState<'yes' | 'no' | ''>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [severity, setSeverity] = useState<QaDiscordanceSeverity | ''>('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<'consensus-reached' | 'unresolved' | ''>('');
  const [error, setError] = useState<string | null>(null);

  const fail = (code: string) => setError(t(`${K}.errors.${code}`, { defaultValue: t(`${K}.errors.failed`) }));

  const submit = async () => {
    if (mode === 'read') {
      if (!agrees) { fail('AGREEMENT_REQUIRED'); return; }
      const read = agrees === 'yes'
        ? { agrees: true as const, notes }
        : { agrees: false as const, diagnosis, severity: severity || undefined, notes };
      const problem = peerReviewReadProblem(request, currentUserId, read);
      if (problem) { fail(problem); return; }
      const res = await peerReviewService.recordRead(request.id, read);
      if (res.ok === false) { fail(res.error); return; }
    } else if (mode === 'resolve') {
      if (!result) { fail('RESULT_REQUIRED'); return; }
      const resolution = result === 'consensus-reached'
        ? { result, consensusDiagnosis: diagnosis, note: notes }
        : { result, note: notes };
      const problem = peerReviewResolutionProblem(request, currentUserId, resolution);
      if (problem) { fail(problem); return; }
      const res = await peerReviewService.resolve(request.id, resolution);
      if (res.ok === false) { fail(res.error); return; }
    } else {
      const problem = peerReviewWithdrawProblem(request, currentUserId, notes);
      if (problem) { fail(problem); return; }
      const res = await peerReviewService.withdraw(request.id, notes);
      if (res.ok === false) { fail(res.error); return; }
    }
    onDone();
  };

  const capability = mode === 'read' || (mode === 'resolve' && currentUserId === request.reviewer.userId)
    ? 'case:peer-review:record' as const
    : 'case:peer-review:request' as const;

  return (
    <div className="ps-ms-overlay ps-overlay--above-dialogs">
      <div className="ps-ms-modal ps-ms-modal--medium" role="dialog" aria-modal="true">
        <div className="ps-ms-header">{t(`${K}.dialog.${mode}Title`)}</div>
        <p className="ps-specreq-meta">
          <span data-phi="accession">{request.accession ?? request.caseId}</span> · {t(`${K}.dialog.parties`, { primary: request.primaryPathologist.userName, reviewer: request.reviewer.userName })}
        </p>
        {request.note && <p className="ps-specreq-meta">{t(`${K}.dialog.requestNote`, { note: request.note })}</p>}
        {mode === 'resolve' && (
          <p className="ps-specreq-meta">{t(`${K}.dialog.reviewerRead`, { name: request.reviewer.userName, diagnosis: request.reviewerDiagnosis ?? '', severity: t(`${K}.severity.${request.disagreementSeverity ?? 'medium'}`) })}</p>
        )}

        {mode === 'read' && (
          <>
            <div className="ps-peer-review__choices" role="radiogroup" aria-label={t(`${K}.dialog.agreeQuestion`)}>
              <span className="ps-conf-label">{t(`${K}.dialog.agreeQuestion`)}</span>
              <label className="ps-conf-toggle-label-row"><input type="radio" name="peer-agree" className="ps-conf-radio-input" checked={agrees === 'yes'} onChange={() => setAgrees('yes')} /><span className="ps-conf-option-text">{t(`${K}.dialog.agree`)}</span></label>
              <label className="ps-conf-toggle-label-row"><input type="radio" name="peer-agree" className="ps-conf-radio-input" checked={agrees === 'no'} onChange={() => setAgrees('no')} /><span className="ps-conf-option-text">{t(`${K}.dialog.disagree`)}</span></label>
            </div>
            {agrees === 'no' && (
              <>
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label" htmlFor="peer-dx">{t(`${K}.dialog.yourDiagnosis`)} <span className="ps-conf-required">*</span></label>
                  <input id="peer-dx" className="ps-conf-input" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                </div>
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label" htmlFor="peer-severity">{t(`${K}.dialog.severityLabel`)} <span className="ps-conf-required">*</span></label>
                  <select id="peer-severity" className="ps-conf-select" value={severity} onChange={e => setSeverity(e.target.value as QaDiscordanceSeverity | '')}>
                    <option value="">{t(`${K}.dialog.severityPlaceholder`)}</option>
                    {(['low', 'medium', 'high'] as const).map(s => <option key={s} value={s}>{t(`${K}.severity.${s}`)}</option>)}
                  </select>
                </div>
              </>
            )}
          </>
        )}

        {mode === 'resolve' && (
          <>
            <div className="ps-peer-review__choices" role="radiogroup" aria-label={t(`${K}.dialog.resultQuestion`)}>
              <span className="ps-conf-label">{t(`${K}.dialog.resultQuestion`)}</span>
              <label className="ps-conf-toggle-label-row"><input type="radio" name="peer-result" className="ps-conf-radio-input" checked={result === 'consensus-reached'} onChange={() => setResult('consensus-reached')} /><span className="ps-conf-option-text">{t(`${K}.result.consensus-reached`)}</span></label>
              <label className="ps-conf-toggle-label-row"><input type="radio" name="peer-result" className="ps-conf-radio-input" checked={result === 'unresolved'} onChange={() => setResult('unresolved')} /><span className="ps-conf-option-text">{t(`${K}.result.unresolved`)}</span></label>
            </div>
            {result === 'consensus-reached' && (
              <div className="ps-conf-form-field">
                <label className="ps-conf-label" htmlFor="peer-consensus">{t(`${K}.dialog.consensusDiagnosis`)} <span className="ps-conf-required">*</span></label>
                <input id="peer-consensus" className="ps-conf-input" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </div>
            )}
            {result === 'unresolved' && <p className="ps-conf-field-hint">{t(`${K}.dialog.unresolvedHint`)}</p>}
          </>
        )}

        <div className="ps-conf-form-field">
          <label className="ps-conf-label" htmlFor="peer-notes">
            {mode === 'withdraw' || result === 'unresolved' ? <>{t(`${K}.dialog.${mode === 'withdraw' ? 'withdrawReason' : 'unresolvedNote'}`)} <span className="ps-conf-required">*</span></> : t(`${K}.dialog.notes`)}
          </label>
          <textarea id="peer-notes" className="ps-conf-input ps-peer-review__textarea" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        {error && <div className="ps-conf-error-text">{error}</div>}
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>
          <CapabilityButton capability={capability} context={{ caseId: request.caseId }} className="ps-ms-btn-apply" onClick={() => { void submit(); }}>
            {t(`${K}.dialog.${mode}Button`)}
          </CapabilityButton>
        </div>
      </div>
    </div>
  );
};
