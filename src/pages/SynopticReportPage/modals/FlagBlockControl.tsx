// src/pages/SynopticReportPage/modals/FlagBlockControl.tsx
// ───────────────────────────────────────────────────────────────────────────
// Batch 610 (#11, tier 3 of docs/product/BLOCK_DELETION.md). On an amended report a
// pathologist or Quality Manager marks a block Invalidated or Superseded. This is a
// flag only: the block is not deleted and its status does not change. Needs
// material:block:flag-amended (the button greys out without it; the service checks
// again). The reasons and the rule that Other needs a note are in services/material/blockDeletion.ts.
// ───────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { BLOCK_FLAG_REASON_CODES } from '@/services/material/blockDeletion';
import type { HistologyBlock } from '@/types/case/Specimen';
import { formatDateTime } from '@/utils/formatDate';

interface Props {
  block: HistologyBlock;
  onFlag: (kind: 'invalidated' | 'superseded', reasonCode: string, note: string) => void;
}

export const FlagBlockControl: React.FC<Props> = ({ block, onFlag }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'invalidated' | 'superseded'>('invalidated');
  const [reasonCode, setReasonCode] = useState<string>(BLOCK_FLAG_REASON_CODES[0]);
  const [note, setNote] = useState('');
  const f = block.amendmentFlag;

  if (block.status === 'Deleted' || block.status === 'Invalidated' || block.status === 'Cancelled') return null;
  const canConfirm = reasonCode !== 'other' || note.trim().length > 0;

  return (
    <div className="ps-fixgate-intro ps-blockstain-cancel-form" data-testid={`flag-block-${block.id}`}>
      {f && (
        <div role="status">
          <strong>{t(`blockDeletion.flag.current.${f.kind}`)}</strong>{' '}
          {t('blockDeletion.flag.currentLine', {
            reason: t(`blockDeletion.flagReasons.${f.reasonCode}`, { defaultValue: f.reasonCode }),
            who: f.flaggedByName, when: formatDateTime(f.flaggedAt, i18n.language),
          })}
          {f.note ? ` ${t('blockDeletion.control.noteLine', { note: f.note })}` : ''}
        </div>
      )}
      {!open ? (
        <CapabilityButton capability="material:block:flag-amended" className="ps-blockstain-cancel-block-btn" onClick={() => setOpen(true)}>
          {t(f ? 'blockDeletion.flag.changeButton' : 'blockDeletion.flag.button')}
        </CapabilityButton>
      ) : (
        <>
          <label className="ps-conf-label" htmlFor={`flag-kind-${block.id}`}>{t('blockDeletion.flag.kindLabel')}</label>
          <select id={`flag-kind-${block.id}`} className="ps-conf-select" value={kind} onChange={e => setKind(e.target.value as 'invalidated' | 'superseded')}>
            <option value="invalidated">{t('blockDeletion.flag.kind.invalidated')}</option>
            <option value="superseded">{t('blockDeletion.flag.kind.superseded')}</option>
          </select>
          <label className="ps-conf-label" htmlFor={`flag-reason-${block.id}`}>{t('blockDeletion.flag.reasonLabel')}</label>
          <select id={`flag-reason-${block.id}`} className="ps-conf-select" value={reasonCode} onChange={e => setReasonCode(e.target.value)}>
            {BLOCK_FLAG_REASON_CODES.map(code => <option key={code} value={code}>{t(`blockDeletion.flagReasons.${code}`)}</option>)}
          </select>
          <input
            className="ps-conf-input ps-blockstain-other-detail-input"
            aria-label={t('blockDeletion.control.noteLabel')}
            placeholder={t('blockDeletion.control.notePlaceholder')}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <p>{t('blockDeletion.flag.notDeleted')}</p>
          <div className="ps-blockstain-confirm-row">
            <button type="button" disabled={!canConfirm} onClick={() => { if (canConfirm) { onFlag(kind, reasonCode, note); setOpen(false); setNote(''); } }}
              className={`ps-blockstain-danger-confirm-btn${canConfirm ? ' ps-blockstain-danger-confirm-btn--enabled' : ''}`}>
              {t('blockDeletion.flag.confirmButton')}
            </button>
            <button type="button" onClick={() => { setOpen(false); setNote(''); }} className="ps-blockstain-nevermind-btn">{t('blockStainEditorModal.nevermindButton')}</button>
          </div>
        </>
      )}
    </div>
  );
};
