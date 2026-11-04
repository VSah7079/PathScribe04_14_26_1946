// src/components/Workstation/WrongCaseScanBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.3): the inline warning when a scanned
// cassette, block or slide belongs to another case. Two choices: Set it aside
// (the usual answer) or Continue anyway (audited). Presentation only:
// hooks/useWrongCaseScanCheck.ts holds the flag and records the choice.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WrongCaseScan, WrongCaseChoice } from '@/services/stationScans/wrongCaseScan';
import './ScanTrailPanel.css';

const WrongCaseScanBanner: React.FC<{ flag: WrongCaseScan | null; onChoose: (c: WrongCaseChoice) => void }> = ({ flag, onChoose }) => {
  const { t } = useTranslation();
  if (!flag) return null;
  return (
    <div className="ps-wrong-case-banner" role="alert">
      <p className="ps-wrong-case-text" data-phi="accession">{t('wrongCaseScan.message', { item: flag.itemId, itemCase: flag.itemAccession, openCase: flag.openAccession })}</p>
      <div className="ps-wrong-case-actions">
        <button type="button" className="ps-btn-primary" onClick={() => onChoose('setAside')}>{t('wrongCaseScan.setAside')}</button>
        <button type="button" className="ps-btn-secondary" onClick={() => onChoose('continued')}>{t('wrongCaseScan.continue')}</button>
      </div>
    </div>
  );
};

export default WrongCaseScanBanner;
