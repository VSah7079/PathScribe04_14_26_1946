// src/pages/SynopticReportPage/modals/DiscordanceReconciliationModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fires at sign-out only when this case has a merged intraop specimen
// with a real frozen category set (not 'deferred' — no real frozen call
// was made, so there's nothing to reconcile against). Concordant is one
// click, nothing else to fill in. Discordant asks for Delta, Clinical
// Impact, Root Cause, AND a required narrative comment — the
// pathologist's own judgment on the structured fields, but ISO 15189/
// CAP audit expectations require an actual auditable explanation for a
// discordance too, not just a dropdown classification.
//
// draftedBy (optional): when the case has a resident/fellow on its
// participant team, this modal doubles as the Teaching & Onboarding
// feedback capture point — same reasoning as the rest of this feature's
// design: don't make the reviewer write a separate email critique later
// when the moment to capture it is right here at sign-out.
//
// PS-113, Stage 5. Writes only to qaActivityRecordService now — the old
// reconciliationService/ReconciliationRecord this modal used to
// dual-write to has been retired and deleted (first release, no real
// production history to preserve).
//
// Batch 625 (PS-118): the discordant fields (delta, severity, root cause, comment) are the shared
// QaDiscordantSection, the same component the generic QA review form uses.
//
// Batch 382 (PS-359): what each step needs comes from the organisation's
// Field Requirements (reportPageChecks.discordanceMissing; every field
// locked), and the record is built in services/quality/discordanceRecord.ts
// rather than here. The modal shows "Still required: …", marks required
// labels, and the save can be said ("record discordance", DISCORDANCE_RECORD).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import '../../../pathscribe.css';
import { useTranslation } from 'react-i18next';
import {
  actionRegistryService, buildDiscordanceRecord, discordanceMissing, discordanceStage, qaActivityRecordService, reportFieldRequired,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';
import type { FrozenCategory } from '@/types/intraop/IntraoperativeEntry';
import type { QaDiscordanceDelta, QaDiscordanceSeverity, QaDiscordanceRootCause } from '@/types/quality/QaActivityRecord';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';
import { QaDiscordantSection, FROZEN_WORDING, type DiscordantField } from '@/components/QualityAssurance/QaDiscordantSection';

// Which Field Requirements entry marks each field of the shared discordant section.
const REQUIREMENT_ID: Record<DiscordantField, string> = {
  delta: 'discordanceDelta', severity: 'discordanceSeverity', rootCause: 'discordanceRootCause',
  rootCauseNote: 'discordanceRootCauseNote', comments: 'discordanceComments',
};

// Real, persisted enum values stay as data; only the displayed label is
// translated (this sweep's usual LABEL_KEY pattern). CATEGORY_LABEL_KEY
// reuses the exact intraopQueue.specimenStep.category* keys already
// rendered for this same FrozenCategory enum elsewhere in the app.
const CATEGORY_LABEL_KEY: Record<FrozenCategory, string> = {
  benign: 'intraopQueue.specimenStep.categoryBenign',
  malignant: 'intraopQueue.specimenStep.categoryMalignant',
  atypical_suspicious: 'intraopQueue.specimenStep.categoryAtypical',
  deferred: 'intraopQueue.specimenStep.categoryDeferred',
};

interface Props {
  caseId: string;
  specimenId: string;
  caseType: string;
  frozenCategory: FrozenCategory;
  frozenDx: string;
  performedBy: { userId: string; userName: string };
  /** Who authored the original draft, if this case has a resident/
   *  fellow participant whose work is being reconciled — undefined for
   *  the common non-teaching path. See QaActivityRecord.draftedBy's
   *  own doc comment. */
  draftedBy?: { userId: string; userName: string };
  /** The case's own Case.subspecialtyId, passed through unchanged —
   *  see QaActivityRecord.subspecialtyId's own doc comment for why
   *  this is Subspecialty, not Department. */
  subspecialtyId?: string;
  onDone: () => void;
}

export const DiscordanceReconciliationModal: React.FC<Props> = ({ caseId, specimenId, caseType, frozenCategory, frozenDx, performedBy, draftedBy, subspecialtyId, onDone }) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('report');
  const [finalCategory, setFinalCategory] = useState<FrozenCategory | ''>('');
  const [finalDx, setFinalDx] = useState('');
  const [delta, setDelta] = useState<QaDiscordanceDelta | ''>('');
  const [severity, setSeverity] = useState<QaDiscordanceSeverity | ''>('');
  const [rootCause, setRootCause] = useState<QaDiscordanceRootCause | ''>('');
  const [rootCauseNote, setRootCauseNote] = useState('');
  const [comments, setComments] = useState('');
  const [attendingFeedback, setAttendingFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const isTeachingCase = !!draftedBy && draftedBy.userId !== performedBy.userId;
  const stage = discordanceStage(frozenCategory, finalCategory);
  const entry = { finalDiagnosis: finalDx, finalCategory, delta, severity, rootCause, rootCauseNote, comments, attendingFeedback };
  const missing = discordanceMissing(frozenCategory, entry, requirements);
  const required = (id: string) => reportFieldRequired(requirements, id);
  const star = (id: string) => required(id) && <span className="ps-conf-required">*</span>;

  const record = async () => {
    const payload = buildDiscordanceRecord(
      { caseId, specimenId, caseType, subspecialtyId, frozenCategory, frozenDx, recordedBy: performedBy, draftedBy },
      entry, requirements,
    );
    if (!payload || busy) return;
    setBusy(true);
    await qaActivityRecordService.create(payload);
    setBusy(false);
    onDone();
  };

  // Voice/keyboard "record discordance": the same button, with the same check.
  const recordRef = useRef(record);
  recordRef.current = record;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'DISCORDANCE_RECORD') void recordRef.current();
  }), []);

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">{t('discordanceReconciliationModal.header')}</div>
        <div className="ps-ms-body">
          {/* This modal only opens from the sign-out check in useSignOutWorkflow.ts (no manual
              trigger), once per non-deferred frozen specimen. The comparison is a category match
              (discordanceStage), not an AI result (Batch 652). */}
          <div className="ps-intraop-note ps-intraop-note--flagged">
            <span className="ps-intraop-note-label">⚖ {t('discordanceReconciliationModal.flaggedLabel')}</span>
            {t('discordanceReconciliationModal.flaggedBody')}
          </div>

          {isTeachingCase && (
            <div className="ps-intraop-note ps-intraop-note--teaching">
              <span className="ps-intraop-note-label">🎓 {t('discordanceReconciliationModal.teachingLabel')}</span>
              {t('discordanceReconciliationModal.teachingBody', { drafter: draftedBy!.userName, performer: performedBy.userName })}
            </div>
          )}

          <div className="ps-intraop-note">
            <span className="ps-intraop-note-label">{t('discordanceReconciliationModal.frozenSectionLabel', { category: t(CATEGORY_LABEL_KEY[frozenCategory]) })}</span>
            {frozenDx || t('discordanceReconciliationModal.noDxRecorded')}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t('discordanceReconciliationModal.finalDiagnosisLabel')} {star('discordanceFinalDiagnosis')}</label>
            <SpellCheckedTextarea className="ps-conf-input ps-conf-textarea" value={finalDx} onChange={e => setFinalDx(e.target.value)} placeholder={t('discordanceReconciliationModal.finalDiagnosisPlaceholder')} />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor="discordance-final-category">{t('discordanceReconciliationModal.finalCategoryLabel')} {star('discordanceFinalCategory')}</label>
            <select id="discordance-final-category" className="ps-conf-select" value={finalCategory} onChange={e => setFinalCategory(e.target.value as FrozenCategory | '')}>
              <option value="">{t('discordanceReconciliationModal.selectPlaceholder')}</option>
              <option value="benign">{t(CATEGORY_LABEL_KEY.benign)}</option>
              <option value="malignant">{t(CATEGORY_LABEL_KEY.malignant)}</option>
              <option value="atypical_suspicious">{t(CATEGORY_LABEL_KEY.atypical_suspicious)}</option>
            </select>
          </div>

          {stage === 'discordant' && (
            <p className="ps-intraop-gate-note">{t('discordanceReconciliationModal.categoryDiffersNote')}</p>
          )}

          {stage === 'discordant' && (
            <QaDiscordantSection
              idPrefix="discordance" wording={FROZEN_WORDING}
              values={{ delta, severity, rootCause, rootCauseNote, comments }}
              onChange={p => {
                if ('delta' in p) setDelta(p.delta!); if ('severity' in p) setSeverity(p.severity!);
                if ('rootCause' in p) setRootCause(p.rootCause!); if ('rootCauseNote' in p) setRootCauseNote(p.rootCauseNote!);
                if ('comments' in p) setComments(p.comments!);
              }}
              mark={field => star(REQUIREMENT_ID[field])}
            />
          )}

          {isTeachingCase && (
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">{t('discordanceReconciliationModal.feedbackLabel', { name: draftedBy!.userName })}</label>
              <SpellCheckedTextarea
                className="ps-conf-input ps-conf-textarea"
                value={attendingFeedback}
                onChange={e => setAttendingFeedback(e.target.value)}
                placeholder={t('discordanceReconciliationModal.feedbackPlaceholder')}
              />
            </div>
          )}
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.report.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-apply" disabled={busy || missing.length > 0} onClick={() => { void record(); }}>
            {stage === 'concordant' ? t('discordanceReconciliationModal.confirmConcordantButton') : t('discordanceReconciliationModal.recordDiscordantButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
