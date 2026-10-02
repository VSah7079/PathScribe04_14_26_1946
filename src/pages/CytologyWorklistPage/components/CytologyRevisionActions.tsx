// src/pages/CytologyWorklistPage/components/CytologyRevisionActions.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 (Batch 390). Under the "signed out" banner of the Cytology screening
// page: the two things a signed-out report can still get, and what it already
// got. "Correct diagnosis" replaces what was reported; "Add addendum" adds to
// it and leaves the diagnosis standing. Each is a permission of its own
// (cytology:report:correct / cytology:report:addend, checked again in the
// release service); the buttons only grey out. The history lists each
// correction and addendum with who released it, when, and why. The reason is
// stored data and shown as entered.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';

export type CytologyRevisionMode = 'correction' | 'addendum';

interface Props {
  records: readonly CytologySignOutRecord[];
  activeMode: CytologyRevisionMode | null;
  onStart: (mode: CytologyRevisionMode) => void;
}

export const CytologyRevisionActions: React.FC<Props> = ({ records, activeMode, onStart }) => {
  const { t, i18n } = useTranslation();
  const history = records.filter(r => r.amendsRecordId || r.addsToRecordId).sort((a, b) => a.signedAt.localeCompare(b.signedAt));
  return (
    <div className="ps-cytoscreen-revision">
      <div className="ps-cytoscreen-revision-actions">
        <CapabilityButton capability="cytology:report:correct" className="ps-cytoscreen-revision-btn" disabled={activeMode !== null} onClick={() => onStart('correction')}>
          {t('cytologyRevision.correctBtn')}
        </CapabilityButton>
        <CapabilityButton capability="cytology:report:addend" className="ps-cytoscreen-revision-btn" disabled={activeMode !== null} onClick={() => onStart('addendum')}>
          {t('cytologyRevision.addendumBtn')}
        </CapabilityButton>
      </div>
      {history.length > 0 && (
        <div className="ps-cytoscreen-revision-history">
          <div className="ps-cytoscreen-revision-history-title">{t('cytologyRevision.history.title')}</div>
          <ul className="ps-cytoscreen-revision-history-list">
            {history.map(r => (
              <li key={r.id}>
                {t(r.amendsRecordId ? 'cytologyRevision.history.correction' : 'cytologyRevision.history.addendum', { name: r.signedBy.userName, date: formatDateTime(r.signedAt, i18n.language) })}
                {r.revisionReason ? ` ${t('cytologyRevision.history.reason', { reason: r.revisionReason })}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
