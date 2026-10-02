// src/pages/SynopticReportPage/modals/FixativeTimeGateModal.tsx
// ─────────────────────────────────────────────────────────────
// Blocks case sign-out when a specimen whose dictionary entry has
// requireFixativeTimeBeforeSignout is missing its fixation time —
// cold-ischemia/fixation timing tracked per CAP/ASCO biomarker guidance
// (breast ER/PR/HER2, etc.). Hard block, not a warning — per the design
// decision this was built from — with three legitimate ways to resolve
// each specimen:
//   1. Enter the actual documented time.
//   2. Enter a professional estimate (surgical suite failed to document
//      it) — permanently flagged wherever this time is later shown, not
//      presented as a verified fact.
//   3. Confirm no time or estimate is possible at all — the true
//      last-resort override, audited same as the other two.
// No preliminary-report escape valve yet (not built) — this modal is
// the entire interim safety valve until that exists.
//
// i18n note: `s.label`/`s.description` are real specimen data, never
// translated.
//
// Batch 383 (PS-359): what is still required comes from the organisation's
// Field Requirements (the fixation time is locked, CAP/ASCO; a comment on
// the "no time is possible" path is an optional switch). The decisions
// (when a specimen is resolved, the resolutions saved) live in
// services/signoutGates/fixativeGate.ts. The modal shows "Still required: …"
// and Continue can be said ("continue fixation gate", FIXATIVE_GATE_CONTINUE).
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import {
  actionRegistryService, buildFixativeResolutions, fixativeGateMissing, reportFieldRequired,
  type FixativeGateSpecimen, type FixativeResolution, type FixativeRowState,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';

export type { FixativeGateSpecimen, FixativeResolution };

interface Props {
  specimens: FixativeGateSpecimen[];
  onContinue: (resolutions: FixativeResolution[]) => void;
  onCancel: () => void;
}

export const FixativeTimeGateModal: React.FC<Props> = ({ specimens, onContinue, onCancel }) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('report');
  const [rows, setRows] = useState<Record<string, FixativeRowState>>(
    Object.fromEntries(specimens.map(s => [s.specimenId, { mode: 'unset' as const }]))
  );

  const setRow = (id: string, row: FixativeRowState) => setRows(prev => ({ ...prev, [id]: row }));

  const missing = fixativeGateMissing(specimens, rows, requirements);
  const allResolved = missing.length === 0;
  const star = (id: string) => reportFieldRequired(requirements, id) && <span className="ps-conf-required">*</span>;

  const handleContinue = () => {
    if (!allResolved) return;
    onContinue(buildFixativeResolutions(specimens, rows));
  };

  // Voice/keyboard "continue fixation gate": the same Continue, with the same check.
  const continueRef = useRef(handleContinue);
  continueRef.current = handleContinue;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'FIXATIVE_GATE_CONTINUE') continueRef.current();
  }), []);

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide">
        <div className="ps-ms-header">⚠ {t('fixativeTimeGateModal.header')}</div>
        <div className="ps-ms-body ps-fixgate-body">
          <p className="ps-fixgate-intro">
            {t('fixativeTimeGateModal.intro')}
          </p>

          {specimens.map(s => {
            const row = rows[s.specimenId] ?? { mode: 'unset' as const };
            return (
              <div key={s.specimenId} className="ps-fixgate-row">
                <div className="ps-fixgate-row-title">
                  {t('fixativeTimeGateModal.specimenRowTitle', { label: s.label, description: s.description })}
                </div>

                {row.mode !== 'unrecoverable' && (
                  <div className="ps-fixgate-row-fields">
                    <span className="ps-fixgate-field-label">{t('fixativeTimeGateModal.timeLabel')} {star('fixationTime')}</span>
                    <input
                      type="datetime-local"
                      className="ps-input-dark"
                      value={row.mode === 'time' ? row.value : ''}
                      onChange={e => setRow(s.specimenId, { mode: 'time', value: e.target.value, estimated: row.mode === 'time' ? row.estimated : false })}
                    />
                    <label className="ps-accession-checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.mode === 'time' && row.estimated}
                        disabled={row.mode !== 'time' || !row.value}
                        onChange={e => row.mode === 'time' && setRow(s.specimenId, { ...row, estimated: e.target.checked })}
                      />
                      {t('accessionPage.specimens.processedAtEstimated')}
                    </label>
                  </div>
                )}

                {row.mode === 'unrecoverable' && (
                  <div className="ps-fixgate-row-fields">
                    <span className="ps-fixgate-field-label">{t('fixativeTimeGateModal.unrecoverableCommentLabel')} {star('fixationUnrecoverableComment')}</span>
                    <input
                      type="text"
                      className="ps-input-dark ps-fixgate-comment-input"
                      placeholder={t('fixativeTimeGateModal.unrecoverableCommentPlaceholder')}
                      value={row.comment}
                      onChange={e => setRow(s.specimenId, { mode: 'unrecoverable', comment: e.target.value })}
                    />
                  </div>
                )}

                <div className="ps-fixgate-row-actions">
                  {row.mode === 'unrecoverable' ? (
                    <>
                      <span className="ps-fixgate-unrecoverable-badge">{t('fixativeTimeGateModal.unrecoverableBadge')}</span>
                      <button className="ps-btn-secondary" onClick={() => setRow(s.specimenId, { mode: 'unset' })}>{t('caseTeamModal.dropZone.undoButton')}</button>
                    </>
                  ) : (
                    <button
                      className="ps-btn-secondary ps-fixgate-unrecoverable-btn"
                      onClick={() => setRow(s.specimenId, { mode: 'unrecoverable', comment: '' })}
                    >
                      {t('fixativeTimeGateModal.unrecoverableButton')}
                    </button>
                  )}
                </div>
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
