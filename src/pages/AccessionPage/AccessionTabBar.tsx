// src/pages/AccessionPage/AccessionTabBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Accession screen's tab buttons, moved out of AccessionPage.tsx (Batch 721,
// CLAUDE.md rule 10) when the two-column layout was added.
//
// One window: a single bar with Case & Patient, Specimens, and (Outside/Contract
// intake only) Outside Patient Data.
// Wide window (two columns): the same buttons sit over their columns. Case &
// Patient heads the left column. Specimens, and Outside Patient Data when
// offered, head the right column.
// Real fix kept from the original: the Outside Patient Data tab exists only for
// Outside/Contract Case intake.
// ─────────────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next';
import './accessionColumns.css';
import { isAccessionTabActive, type AccessionTab } from '@/services/accessioning/resolveAccessionPanels';

interface Props {
  tab: AccessionTab;
  twoColumn: boolean;
  showOutsideTab: boolean;
  filledSpecimenCount: number;
  onSelect: (tab: AccessionTab) => void;
}

export function AccessionTabBar({ tab, twoColumn, showOutsideTab, filledSpecimenCount, onSelect }: Props) {
  const { t } = useTranslation();
  const cls = (b: AccessionTab, extra = '') =>
    `ps-tab-btn ${extra} ${isAccessionTabActive(b, tab, twoColumn) ? 'active' : ''}`.replace(/\s+/g, ' ').trim();

  const caseBtn = (
    <button className={cls('case')} onClick={() => onSelect('case')}>{t('accessionPage.tabs.casePatient')}</button>
  );
  const specimensBtn = (
    <button className={cls('specimens')} onClick={() => onSelect('specimens')}>
      {t('accessionPage.tabs.specimens')} {filledSpecimenCount ? `(${filledSpecimenCount})` : ''}
    </button>
  );
  const outsideBtn = showOutsideTab ? (
    <button className={cls('outside_patient', 'ps-accession-outside-tab-btn')} onClick={() => onSelect('outside_patient')}>
      ℹ {t('accessionPage.tabs.outsidePatientData')}
    </button>
  ) : null;

  if (!twoColumn) {
    return <div className="ps-tab-bar ps-accession-tabs">{caseBtn}{specimensBtn}{outsideBtn}</div>;
  }
  return (
    <div className="ps-accession-columns ps-accession-columns--heads">
      <div className="ps-tab-bar ps-accession-tabs">{caseBtn}</div>
      <div className="ps-tab-bar ps-accession-tabs">{specimensBtn}{outsideBtn}</div>
    </div>
  );
}
