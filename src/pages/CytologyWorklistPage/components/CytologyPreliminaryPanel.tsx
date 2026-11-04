// src/pages/CytologyWorklistPage/components/CytologyPreliminaryPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 533 (Pete, Oct 12, 2026). On the Cytology screening page, before a
// specimen is signed out: "Send urgent preliminary" (cytology:preliminary:release;
// the button only greys out, the service checks it), and inline, not in a
// window (click economy): the quick-pick reason, an optional note and Send.
// Below, the preliminaries already sent for the specimen. The note is stored
// data and shown as entered.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CYTOLOGY_PRELIMINARY_REASONS, type CytologyPreliminaryReason } from '@/services';
import { formatDateTime } from '@/utils/formatDate';
import type { CytologyPreliminaryRelease } from '@/types/cytology/CytologyPreliminaryRelease';

interface Props {
  caseId: string | undefined;
  available: boolean;
  sent: readonly CytologyPreliminaryRelease[];
  open: boolean;
  reason: CytologyPreliminaryReason | null;
  note: string;
  signatureNeeded: boolean;
  sending: boolean;
  onStart: () => void;
  onReason: (r: CytologyPreliminaryReason) => void;
  onNote: (n: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

export const CytologyPreliminaryPanel: React.FC<Props> = ({ caseId, available, sent, open, reason, note, signatureNeeded, sending, onStart, onReason, onNote, onSend, onCancel }) => {
  const { t, i18n } = useTranslation();
  if (!available && sent.length === 0) return null;
  return (
    <div className="ps-cytoscreen-prelim">
      {available && !open && (
        <CapabilityButton capability="cytology:preliminary:release" context={{ caseId }} className="ps-cytoscreen-revision-btn" onClick={onStart}>
          {t('cytologyPreliminary.startBtn')}
        </CapabilityButton>
      )}
      {available && open && (
        <div className="ps-cytoscreen-prelim-form" role="group" aria-label={t('cytologyPreliminary.title')}>
          <div className="ps-cytoscreen-prelim-title">{t('cytologyPreliminary.title')}</div>
          <p className="ps-cytoscreen-prelim-hint">{t('cytologyPreliminary.hint')}</p>
          <div className="ps-cytoscreen-prelim-reasons" role="radiogroup" aria-label={t('cytologyPreliminary.reasonLabel')}>
            {CYTOLOGY_PRELIMINARY_REASONS.map(r => (
              <button key={r} type="button" role="radio" aria-checked={reason === r}
                className={`ps-cytoscreen-prelim-chip${reason === r ? ' ps-cytoscreen-prelim-chip--on' : ''}`}
                onClick={() => onReason(r)}>
                {t(`cytologyPreliminary.reasons.${r}`)}
              </button>
            ))}
          </div>
          <input className="ps-conf-input ps-cytoscreen-prelim-note" value={note} onChange={e => onNote(e.target.value)}
            placeholder={t('cytologyPreliminary.notePlaceholder')} aria-label={t('cytologyPreliminary.noteLabel')} />
          <div className="ps-cytoscreen-prelim-actions">
            <button type="button" className="ps-cytoscreen-signout-btn ps-cytoscreen-signout-btn--ready" disabled={!reason || sending} onClick={onSend}>
              {sending ? t('cytologyPreliminary.sending') : t(signatureNeeded ? 'cytologyPreliminary.signAndSend' : 'cytologyPreliminary.send')}
            </button>
            <button type="button" className="ps-conf-btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      {sent.length > 0 && (
        <ul className="ps-cytoscreen-revision-history-list">
          {sent.map(p => (
            <li key={p.id}>
              {t('cytologyPreliminary.history', { name: p.releasedBy.userName, date: formatDateTime(p.releasedAt, i18n.language), reason: t(`cytologyPreliminary.reasons.${p.reason}`) })}
              {p.note ? ` ${t('cytologyPreliminary.historyNote', { note: p.note })}` : ''}
              {p.recalled ? ` ${t('cytologyPreliminary.recalledTag')}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
