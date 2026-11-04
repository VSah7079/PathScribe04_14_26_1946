// src/pages/SynopticReportPage/modals/DeleteBlockControl.tsx
// ───────────────────────────────────────────────────────────────────────────
// Batch 588 (Pete, Oct 16 2026): "Delete this block" in the block and stain editor.
// A soft delete of a block still in process: the block stays on the case, marked
// Deleted, with who, when and why. Needs material:block:delete-in-process (the
// button greys out without it; the service checks again). Billing is told through
// a billing deficiency that billing staff review under Quality Assurance → Financials.
//
// The reason list and "other needs a note" are services/material/blockDeletion.ts;
// this component renders and dispatches. Cancelling a block (a wrong piece in a
// block) is a different action: CancelBlockControl.
// ───────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { BLOCK_DELETION_REASON_CODES, blockDeletionInputMissing } from '@/services/material/blockDeletion';
import type { HistologyBlock } from '@/types/case/Specimen';
import { formatDateTime } from '@/utils/formatDate';

interface Props {
  block: HistologyBlock;
  onDelete: (reasonCode: string, note: string) => void;
  /** Batch 610 (#11): 'signed_out' once the case is signed out: the block is marked Invalidated and a different capability applies. */
  tier?: 'in_process' | 'signed_out';
}

export const DeleteBlockControl: React.FC<Props> = ({ block, onDelete, tier = 'in_process' }) => {
  const signedOut = tier === 'signed_out';
  const { t, i18n } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [reasonCode, setReasonCode] = useState<string>(BLOCK_DELETION_REASON_CODES[0]);
  const [note, setNote] = useState('');

  if ((block.status === 'Deleted' || block.status === 'Invalidated') && block.deletion) {
    const d = block.deletion;
    return (
      <div className="ps-fixgate-intro ps-blockstain-cancelled-block">
        <div className="ps-blockstain-cancelled-block-title">{t(block.status === 'Invalidated' ? 'blockDeletion.control.invalidatedTitle' : 'blockDeletion.control.deletedTitle')}</div>
        <div>{t('blockDeletion.control.reasonLine', { reason: t(`blockDeletion.reasons.${d.reasonCode}`) })}</div>
        {d.note && <div>{t('blockDeletion.control.noteLine', { note: d.note })}</div>}
        <div>{t('blockDeletion.control.byLine', { who: d.deletedByName, when: formatDateTime(d.deletedAt, i18n.language) })}</div>
        <div>{d.releasedCodes.length ? t('blockDeletion.control.releasedLine', { codes: d.releasedCodes.join(', ') }) : t('blockDeletion.control.noCodesReleased')}</div>
      </div>
    );
  }
  if (block.status === 'Cancelled' || block.status === 'Deleted' || block.status === 'Invalidated') return null;

  if (!confirming) {
    return (
      <CapabilityButton capability={signedOut ? 'material:block:delete-signed-out' : 'material:block:delete-in-process'} className="ps-blockstain-cancel-block-btn" onClick={() => setConfirming(true)}>
        {t(signedOut ? 'blockDeletion.control.invalidateButton' : 'blockDeletion.control.deleteButton')}
      </CapabilityButton>
    );
  }

  const canConfirm = blockDeletionInputMissing(reasonCode, note) === null;
  return (
    <div className="ps-fixgate-intro ps-blockstain-cancel-form">
      <label className="ps-conf-label" htmlFor={`delete-reason-${block.id}`}>{t(signedOut ? 'blockDeletion.control.invalidateReasonFieldLabel' : 'blockDeletion.control.reasonFieldLabel')}</label>
      <select id={`delete-reason-${block.id}`} className="ps-conf-select" value={reasonCode} onChange={e => setReasonCode(e.target.value)}>
        {BLOCK_DELETION_REASON_CODES.map(code => <option key={code} value={code}>{t(`blockDeletion.reasons.${code}`)}</option>)}
      </select>
      <input
        className="ps-conf-input ps-blockstain-other-detail-input"
        aria-label={t('blockDeletion.control.noteLabel')}
        placeholder={t('blockDeletion.control.notePlaceholder')}
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="ps-blockstain-confirm-row">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => canConfirm && onDelete(reasonCode, note)}
          className={`ps-blockstain-danger-confirm-btn${canConfirm ? ' ps-blockstain-danger-confirm-btn--enabled' : ''}`}
        >
          {t(signedOut ? 'blockDeletion.control.invalidateConfirmButton' : 'blockDeletion.control.confirmButton')}
        </button>
        <button type="button" onClick={() => { setConfirming(false); setReasonCode(BLOCK_DELETION_REASON_CODES[0]); setNote(''); }} className="ps-blockstain-nevermind-btn">
          {t('blockStainEditorModal.nevermindButton')}
        </button>
      </div>
    </div>
  );
};
