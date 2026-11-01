// src/components/Config/Protocols/DemoChecklistCopyRefused.tsx
// Batch 755a (Pete, Oct 31, 2026): shown instead of the editor when a Duplicate or New Version would start from a
// demonstration checklist (its wording is never copied until a pathologist has reviewed it).
import React from 'react';
import { useTranslation } from 'react-i18next';

export const DemoChecklistCopyRefused: React.FC<{ name: string; onBack: () => void }> = ({ name, onBack }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-syned-loading-screen">
      <div className="ps-conf-card">
        <div className="ps-conf-card-title">{t('demoChecklists.copyRefusedTitle')}</div>
        <p className="ps-conf-card-description">{t('demoChecklists.copyRefusedBody', { name })}</p>
        <button className="ps-conf-btn-secondary" onClick={onBack}>{t('demoChecklists.copyRefusedBack')}</button>
      </div>
    </div>
  );
};
