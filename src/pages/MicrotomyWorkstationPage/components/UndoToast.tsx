// src/pages/MicrotomyWorkstationPage/components/UndoToast.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (ws-6; Pete, Oct 24, 2026). Remove and Reprint act at once (the reason is the only click); a short Undo
// toast stays for MICROTOMY_UNDO_WINDOW_MS instead of an extra confirmation. The hook owns the timer and what Undo
// restores; this only shows the message and the button. After an Undo the same toast says what was undone.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MICROTOMY_REASON_KEYS } from '@/utils/microtomyOperations';
import type { UndoNotice } from '../hooks/useMicrotomyWorkstation';
import './UndoToast.css';

export interface UndoToastProps {
  notice: UndoNotice;
  onUndo: () => void;
  onClose: () => void;
}

const UndoToast: React.FC<UndoToastProps> = ({ notice, onUndo, onClose }) => {
  const { t } = useTranslation();
  const reasonKey = notice.reason ? MICROTOMY_REASON_KEYS[notice.reason as keyof typeof MICROTOMY_REASON_KEYS] : undefined;
  const reason = reasonKey ? t(`microtomyWorkstation.reasons.${reasonKey}`) : '';
  const canUndo = notice.kind === 'removed' || notice.kind === 'reprinted';
  return (
    <div className="ps-microtomy-undo-toast" role="status">
      <span className="ps-microtomy-undo-toast__text">{t(`microtomyWorkstation.undo.${notice.kind}`, { stain: notice.stainName, reason })}</span>
      {canUndo && <button type="button" className="ps-microtomy-undo-toast__btn" onClick={onUndo}>{t('microtomyWorkstation.undo.button')}</button>}
      <button type="button" className="ps-microtomy-undo-toast__close" aria-label={t('common.close')} onClick={onClose}>×</button>
    </div>
  );
};

export default UndoToast;
