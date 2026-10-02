// src/pages/SynopticReportPage/modals/PreAnalyticDateGateModal.tsx
// ─────────────────────────────────────────────────────────────
// Blocks case sign-out when a specimen is missing its required
// collection and/or laboratory-receipt date/time — real, per direct
// guidance's own cross-jurisdiction compliance research (UKAS ISO
// 15189 Clause 7.2, CAP/CLIA § 493.1241, RCPath, EU IVDR/ISO 15189,
// IANZ AS ISO 15189:2022, KAZA/KSP/KSLM, NATA/NPAAC — every real
// jurisdiction PathScribe targets is a hard block here, never merely
// advisory; see resolvePreAnalyticDateGateConfig.ts for the full,
// per-country citation/label/disclaimer text). Same real "hard block,
// not a warning, with a genuine last-resort override" shape as
// FixativeTimeGateModal — two legitimate ways to resolve each missing
// date independently:
//   1. Enter the actual documented date/time.
//   2. Confirm it truly isn't recoverable — the jurisdiction's own
//      designated administrative-override label is applied, a
//      mandatory report disclaimer follows, and a real, OPEN
//      SpecimenDeficiency (CAPA) record is raised — deliberately left
//      open, not auto-closed, since this is a genuine Pre-Analytic
//      Non-Conformity warranting real review, not just a documentation
//      fix (see def-missing-preanalytic-date's own doc comment).
// Collection and receipt are independently required — a specimen can
// be missing either one, both, or neither; only the genuinely missing
// field(s) are shown per specimen.
//
// i18n note: `config.standardReference` and
// `config.administrativeOverrideLabel` are real, resolved per-country
// regulatory citation/label text (data, sourced from
// resolvePreAnalyticDateGateConfig.ts) — interpolated into translated
// sentences, never translated themselves. `s.label`/`s.description`
// are likewise real specimen data.
//
// Batch 383 (PS-359): what is still required comes from the organisation's
// Field Requirements (both dates and the override comment are locked, per
// the standards above). The decisions (which dates a specimen still needs,
// when a row is resolved, the resolutions saved) live in
// services/signoutGates/preAnalyticGate.ts. The modal shows "Still required:
// …" and Continue can be said ("continue date gate", PREANALYTIC_GATE_CONTINUE).
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import type { PreAnalyticDateGateConfig } from '@/services/billing/resolvePreAnalyticDateGateConfig';
import {
  actionRegistryService, buildPreAnalyticResolutions, emptyPreAnalyticRow, preAnalyticGateMissing, preAnalyticRowUsesOverride, reportFieldRequired,
  type PreAnalyticDateGateSpecimen, type PreAnalyticDateResolution, type PreAnalyticRowState,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';

export type { PreAnalyticDateGateSpecimen, PreAnalyticDateResolution };

interface Props {
  specimens: PreAnalyticDateGateSpecimen[];
  /** Real, resolved per-country config (resolvePreAnalyticDateGateConfig)
   *  for the case's own site/organisation — drives the exact
   *  administrative-override label and standard citation shown here.
   *  Resolved once at the call site, not re-resolved per specimen. */
  config: PreAnalyticDateGateConfig;
  onContinue: (resolutions: PreAnalyticDateResolution[]) => void;
  onCancel: () => void;
}

export const PreAnalyticDateGateModal: React.FC<Props> = ({ specimens, config, onContinue, onCancel }) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('report');
  const [rows, setRows] = useState<Record<string, PreAnalyticRowState>>(
    Object.fromEntries(specimens.map(s => [s.specimenId, emptyPreAnalyticRow()]))
  );

  const patchRow = (id: string, patch: Partial<PreAnalyticRowState>) =>
    setRows(prev => ({ ...prev, [id]: { ...(prev[id] ?? emptyPreAnalyticRow()), ...patch } }));

  const missing = preAnalyticGateMissing(specimens, rows, requirements);
  const allResolved = missing.length === 0;
  const star = (id: string) => reportFieldRequired(requirements, id) && <span className="ps-conf-required">*</span>;

  const handleContinue = () => {
    if (!allResolved) return;
    onContinue(buildPreAnalyticResolutions(specimens, rows));
  };

  // Voice/keyboard "continue date gate": the same Continue, with the same check.
  const continueRef = useRef(handleContinue);
  continueRef.current = handleContinue;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'PREANALYTIC_GATE_CONTINUE') continueRef.current();
  }), []);

  const fieldRow = (
    s: PreAnalyticDateGateSpecimen,
    row: PreAnalyticRowState,
    which: 'collected' | 'received',
    label: string
  ) => {
    const required = which === 'collected' ? s.missingCollectedAt : s.missingReceivedAt;
    if (!required) return null;
    const field = row[which];
    return (
      <div className="ps-fixgate-row-fields" key={which}>
        <span className="ps-fixgate-field-label">{label} {star(which === 'collected' ? 'preAnalyticCollectedAt' : 'preAnalyticReceivedAt')}</span>
        {field.mode !== 'override' ? (
          <>
            <input
              type="datetime-local"
              className="ps-input-dark"
              value={field.mode === 'time' ? field.value : ''}
              onChange={e => patchRow(s.specimenId, { [which]: { mode: 'time', value: e.target.value } } as Partial<PreAnalyticRowState>)}
            />
            <button
              className="ps-btn-secondary ps-fixgate-unrecoverable-btn"
              onClick={() => patchRow(s.specimenId, { [which]: { mode: 'override' } } as Partial<PreAnalyticRowState>)}
            >
              {t('preAnalyticDateGateModal.notRecoverableApply', { label: config.administrativeOverrideLabel })}
            </button>
          </>
        ) : (
          <>
            <span className="ps-fixgate-unrecoverable-badge">
              {t('preAnalyticDateGateModal.administrativeOverrideBadge', { label: config.administrativeOverrideLabel })}
            </span>
            <button className="ps-btn-secondary" onClick={() => patchRow(s.specimenId, { [which]: { mode: 'unset' } } as Partial<PreAnalyticRowState>)}>
              {t('caseTeamModal.dropZone.undoButton')}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide">
        <div className="ps-ms-header">⚠ {t('preAnalyticDateGateModal.header')}</div>
        <div className="ps-ms-body ps-fixgate-body">
          <p className="ps-fixgate-intro">
            {t('preAnalyticDateGateModal.intro', { standardReference: config.standardReference })}
          </p>

          {specimens.map(s => {
            const row = rows[s.specimenId] ?? emptyPreAnalyticRow();
            return (
              <div key={s.specimenId} className="ps-fixgate-row">
                <div className="ps-fixgate-row-title">
                  {t('preAnalyticDateGateModal.specimenRowTitle', { label: s.label, description: s.description })}
                </div>
                {fieldRow(s, row, 'collected', t('preAnalyticDateGateModal.collectedLabel'))}
                {fieldRow(s, row, 'received', t('preAnalyticDateGateModal.receivedLabel'))}
                {preAnalyticRowUsesOverride(row) && (
                  <div className="ps-fixgate-row-fields">
                    <span className="ps-fixgate-field-label">{t('preAnalyticDateGateModal.overrideCommentLabel')} {star('preAnalyticOverrideComment')}</span>
                    <input
                      type="text"
                      className="ps-input-dark ps-fixgate-comment-input"
                      placeholder={t('preAnalyticDateGateModal.commentPlaceholder')}
                      value={row.comment}
                      onChange={e => patchRow(s.specimenId, { comment: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.report.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onCancel}>{t('preAnalyticDateGateModal.cancelButton')}</button>
          <button className="ps-ms-btn-apply" onClick={handleContinue} disabled={!allResolved}>
            {t('preAnalyticDateGateModal.continueButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
