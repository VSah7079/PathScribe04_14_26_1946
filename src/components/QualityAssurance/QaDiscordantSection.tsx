// src/components/QualityAssurance/QaDiscordantSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 625 (PS-118): the part of a review that only a discordant outcome asks for (delta,
// severity with its patient-impact hint, root cause, the explanation for "other", and the
// narrative comment). It was written out twice, in the live Discordance window at sign-out
// (pages/SynopticReportPage/modals/DiscordanceReconciliationModal.tsx) and in the generic QA
// review form (QaReviewCaptureForm.tsx); now both render this one component, so a change to
// the wording, the options or the severity hints lands in both. It decides nothing: which
// fields are required comes from the caller (the organisation's Field Requirements at
// sign-out, validateQaReviewSubmission for the generic form), passed in as `mark` and `errors`.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import type { QaDiscordanceDelta, QaDiscordanceRootCause, QaDiscordanceSeverity } from '@/types/quality/QaActivityRecord';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';

export interface DiscordantValues {
  delta: QaDiscordanceDelta | '';
  severity: QaDiscordanceSeverity | '';
  rootCause: QaDiscordanceRootCause | '';
  rootCauseNote: string;
  comments: string;
}

/** The five fields, as the caller's requirement ids and as the keys of `errors`. */
export type DiscordantField = keyof DiscordantValues;

/** Wording that differs between the sign-out window (frozen-section phrasing) and the generic form. */
export interface DiscordantWording {
  delta: Record<QaDiscordanceDelta, string>;
  rootCause: Record<QaDiscordanceRootCause, string>;
  commentPlaceholder: string;
}

const SEVERITY_LABEL_KEY: Record<QaDiscordanceSeverity, string> = {
  low: 'discordanceReconciliationModal.severity.low',
  medium: 'discordanceReconciliationModal.severity.medium',
  high: 'discordanceReconciliationModal.severity.high',
};

export const FROZEN_WORDING: DiscordantWording = {
  delta: {
    upgrade: 'discordanceReconciliationModal.delta.upgrade',
    downgrade: 'discordanceReconciliationModal.delta.downgrade',
    minor_variance: 'discordanceReconciliationModal.delta.minorVariance',
  },
  rootCause: {
    sampling_error: 'discordanceReconciliationModal.rootCause.samplingError',
    interpretation_error: 'discordanceReconciliationModal.rootCause.interpretationError',
    technical_artifact: 'discordanceReconciliationModal.rootCause.technicalArtifact',
    other: 'clientEditorModal.general.other',
  },
  commentPlaceholder: 'discordanceReconciliationModal.commentPlaceholder',
};

export const GENERIC_WORDING: DiscordantWording = {
  delta: {
    upgrade: 'qaReviewCaptureForm.delta.upgrade',
    downgrade: 'qaReviewCaptureForm.delta.downgrade',
    minor_variance: 'discordanceReconciliationModal.delta.minorVariance',
  },
  rootCause: {
    sampling_error: 'qaReviewCaptureForm.rootCause.samplingError',
    interpretation_error: 'discordanceReconciliationModal.rootCause.interpretationError',
    technical_artifact: 'qaReviewCaptureForm.rootCause.technicalArtifact',
    other: 'clientEditorModal.general.other',
  },
  commentPlaceholder: 'qaReviewCaptureForm.commentsPlaceholder',
};

interface Props {
  /** Prefix of the element ids (`discordance` gives `discordance-delta`). */
  idPrefix: string;
  values: DiscordantValues;
  onChange: (patch: Partial<DiscordantValues>) => void;
  wording: DiscordantWording;
  /** A "required" mark for a field, or nothing. */
  mark?: (field: DiscordantField) => React.ReactNode;
  /** A message under a field (shown by the caller once it chooses to show errors). */
  errors?: Partial<Record<DiscordantField, string>>;
  /** Extra class on the inputs (the generic form fills the width; the sign-out window keeps its own look). */
  inputClass?: string;
}

const ROOT_CAUSES: QaDiscordanceRootCause[] = ['sampling_error', 'interpretation_error', 'technical_artifact', 'other'];
const DELTAS: QaDiscordanceDelta[] = ['upgrade', 'downgrade', 'minor_variance'];
const SEVERITIES: QaDiscordanceSeverity[] = ['low', 'medium', 'high'];

export const QaDiscordantSection: React.FC<Props> = ({ idPrefix, values, onChange, wording, mark, errors, inputClass = '' }) => {
  const { t } = useTranslation();
  const error = (f: DiscordantField) => errors?.[f] && <p className="ps-intraop-gate-note ps-intraop-gate-note--critical">{errors[f]}</p>;
  const placeholder = <option value="">{t('discordanceReconciliationModal.selectPlaceholder')}</option>;
  return (
    <div className="ps-intraop-action-block">
      <div className="ps-conf-form-field">
        <label className="ps-conf-label" htmlFor={`${idPrefix}-delta`}>{t('discordanceReconciliationModal.deltaLabel')} {mark?.('delta')}</label>
        <select id={`${idPrefix}-delta`} className={`ps-conf-select ${inputClass}`} value={values.delta} onChange={e => onChange({ delta: e.target.value as QaDiscordanceDelta | '' })}>
          {placeholder}
          {DELTAS.map(d => <option key={d} value={d}>{t(wording.delta[d])}</option>)}
        </select>
        {error('delta')}
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label" htmlFor={`${idPrefix}-severity`}>{t('discordanceReconciliationModal.severityLabel')} {mark?.('severity')}</label>
        <select id={`${idPrefix}-severity`} className={`ps-conf-select ${inputClass}`} value={values.severity} onChange={e => onChange({ severity: e.target.value as QaDiscordanceSeverity | '' })}>
          {placeholder}
          {SEVERITIES.map(s => <option key={s} value={s}>{t(SEVERITY_LABEL_KEY[s])}</option>)}
        </select>
        {/* Patient-impact definitions, so two pathologists apply the tiers the same way. */}
        {values.severity && (
          <p className={`ps-intraop-gate-note${values.severity === 'high' ? ' ps-intraop-gate-note--critical' : ''}`}>
            {t(`discordanceReconciliationModal.severityHint.${values.severity}`)}
          </p>
        )}
        {error('severity')}
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label" htmlFor={`${idPrefix}-root-cause`}>{t('discordanceReconciliationModal.rootCauseLabel')} {mark?.('rootCause')}</label>
        <select id={`${idPrefix}-root-cause`} className={`ps-conf-select ${inputClass}`} value={values.rootCause} onChange={e => onChange({ rootCause: e.target.value as QaDiscordanceRootCause | '' })}>
          {placeholder}
          {ROOT_CAUSES.map(r => <option key={r} value={r}>{t(wording.rootCause[r])}</option>)}
        </select>
        {error('rootCause')}
      </div>
      {values.rootCause === 'other' && (
        <div className="ps-conf-form-field">
          <label className="ps-conf-label">{t('discordanceReconciliationModal.explainLabel')} {mark?.('rootCauseNote')}</label>
          <input aria-label={t('discordanceReconciliationModal.explainLabel')} className={`ps-conf-input ${inputClass}`} value={values.rootCauseNote} onChange={e => onChange({ rootCauseNote: e.target.value })} placeholder={t('discordanceReconciliationModal.explainPlaceholder')} />
          {error('rootCauseNote')}
        </div>
      )}
      <div className="ps-conf-form-field">
        <label className="ps-conf-label" htmlFor={`${idPrefix}-comments`}>{t('discordanceReconciliationModal.commentLabel')} {mark?.('comments')}</label>
        <SpellCheckedTextarea id={`${idPrefix}-comments`} className={`ps-conf-input ps-conf-textarea ${inputClass}`} value={values.comments} onChange={e => onChange({ comments: e.target.value })} placeholder={t(wording.commentPlaceholder)} />
        {error('comments')}
      </div>
    </div>
  );
};
