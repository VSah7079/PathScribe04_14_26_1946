// src/pages/SynopticReportPage/components/EditConflictDialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 458 (PS-71): the report page's Edit Conflict dialog, shown when a
// save is refused because someone else saved the case after this page loaded
// it. Keep working, View changes (which parts differ from the saved version,
// and which "Save mine anyway" would replace), Use their version, and Save
// mine anyway (case:edit-conflict:override: Pathologist, Admin, Lab
// Director). A change to the finalized report allows only Use their version.
// Batch 577: "Use their version" (was "Reload their version") takes the saved
// case up in place, discarding this page's unsaved changes, without a reload.
// Renders and dispatches: the rows come from services/cases/caseWrite.ts
// caseConflictRows, and the overwrite is checked and audited there.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import type { ConflictRow } from '@/services';

const K = 'synopticReportPage.concurrency';

export const EditConflictDialog: React.FC<{
  actualVersion: number;
  blockOverride: boolean;
  /** null until View changes is chosen. */
  rows: ConflictRow[] | null;
  onKeepWorking: () => void;
  onViewChanges: () => void;
  /** Batch 577: show the saved case in place, discarding this page's unsaved changes. */
  onUseTheirs: () => void;
  /** True while their version is being read: every choice is disabled meanwhile, so none can race it. */
  busy?: boolean;
  onSaveMine: () => void;
}> = ({ actualVersion, blockOverride, rows, onKeepWorking, onViewChanges, onUseTheirs, busy = false, onSaveMine }) => {
  const { t } = useTranslation();
  return (
    <div data-capture-hide="true" className="ps-overlay">
      <div className="ps-modal-dark ps-modal-dark--sm ps-modal-dark--centered" role="dialog" aria-label={t(`${K}.title`)}>
        <div className="ps-modal-dark-emoji">⚠️</div>
        <div className="ps-modal-dark-header ps-modal-dark-header--center">
          <span className="ps-modal-dark-title">{t(`${K}.title`)}</span>
        </div>
        <p className="ps-modal-dark-body ps-modal-dark-body--center">
          {t(`${K}.body`, { version: actualVersion })}{' '}
          {blockOverride ? t(`${K}.finalizedBlocked`) : t(`${K}.notLostYet`)}
        </p>
        {!blockOverride && <p className="ps-modal-dark-hint ps-modal-dark-hint--center">{t(`${K}.hint`)}</p>}
        {rows && (
          <div className="ps-conflict-changes">
            <div className="ps-conflict-changes-title">{t(`${K}.changesTitle`)}</div>
            {rows.length === 0
              ? <p className="ps-conflict-changes-empty">{t(`${K}.changesNone`)}</p>
              : (
                <table className="ps-conflict-changes-table">
                  <thead>
                    <tr><th>{t(`${K}.colPart`)}</th><th>{t(`${K}.colOnSave`)}</th></tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.field}>
                        <td>{t(`${K}.parts.${row.field}`)}</td>
                        <td className={row.overwritten ? 'ps-conflict-changes-replaced' : 'ps-conflict-changes-kept'}>
                          {t(row.overwritten ? `${K}.replacedByYours` : `${K}.keptAsSaved`)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}
        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch ps-modal-dark-footer--stretch-stacked">
          <button type="button" className="ps-btn-ghost-dark" onClick={onKeepWorking} disabled={busy}>{t(`${K}.keepWorking`)}</button>
          {!rows && <button type="button" className="ps-btn-ghost-dark" onClick={onViewChanges} disabled={busy}>{t(`${K}.viewChanges`)}</button>}
          <button type="button" className="ps-btn-ghost-dark" onClick={onUseTheirs} disabled={busy} aria-busy={busy}>{t(`${K}.useTheirs`)}</button>
          {!blockOverride && (
            <CapabilityButton capability="case:edit-conflict:override" className="ps-btn-amber" onClick={onSaveMine} disabled={busy}>
              {t(`${K}.saveMine`)}
            </CapabilityButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditConflictDialog;
