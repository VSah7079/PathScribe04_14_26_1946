// src/pages/MicrotomyWorkstationPage/components/BlockLockoutBanner.tsx
// Batch 758 (Pete, Nov 1, 2026: "Active Block Lockout"): shown inline, not as a window, when the tech scans the next
// block (or presses Scan next) while labels of this block have not been scanned back. Each waiting slide can be recut
// (a new label) or voided in one click; scanning the labels clears it too. Presentation only:
// hooks/useMicrotomyWorkstation.ts decides and records.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WaitingLabel } from '@/services/material/slideLabelCheck';
import './BlockLockoutBanner.css';

interface Props {
  block: string;
  labels: readonly WaitingLabel[];
  onRecut: (stainId: string) => void;
  onVoid: (stainId: string) => void;
  onContinue: () => void;
  onStay: () => void;
}

const BlockLockoutBanner: React.FC<Props> = ({ block, labels, onRecut, onVoid, onContinue, onStay }) => {
  const { t } = useTranslation();
  if (labels.length === 0) return null;
  return (
    <div className="ps-block-lockout" role="alert">
      <p className="ps-block-lockout-title">{t('microtomyWorkstation.lockout.title', { count: labels.length, block })}</p>
      <p className="ps-block-lockout-text">{t('microtomyWorkstation.lockout.body')}</p>
      <ul className="ps-block-lockout-list" data-phi="accession">
        {labels.map(l => (
          <li key={l.stainId} className="ps-block-lockout-row">
            <span className="ps-block-lockout-slide">{l.slideId}</span>
            <button type="button" className="ps-btn-secondary" onClick={() => onRecut(l.stainId)}>{t('microtomyWorkstation.lockout.recut')}</button>
            <button type="button" className="ps-btn-secondary" onClick={() => onVoid(l.stainId)}>{t('microtomyWorkstation.lockout.void')}</button>
          </li>
        ))}
      </ul>
      <div className="ps-block-lockout-actions">
        <button type="button" className="ps-btn-secondary" onClick={onContinue}>{t('microtomyWorkstation.lockout.continue')}</button>
        <button type="button" className="ps-btn-secondary" onClick={onStay}>{t('microtomyWorkstation.lockout.stay')}</button>
      </div>
    </div>
  );
};

export default BlockLockoutBanner;
