// src/components/Config/System/ReactiveChangesPolicyCard.tsx
// Batch 626 (PS-163): the lab's choice for a negative GYN case with reactive cellular changes: may a
// cytotechnologist sign it out, or does a pathologist review it? The rule is services/cytology/
// reactiveChangesPolicy.ts; saving needs config:cytology-categories:manage, checked by the category service.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cytologyCategoryService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { reactiveChangesSetting, reactiveChangesUpdates } from '@/services/cytology/reactiveChangesPolicy';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';
import '@/pathscribe.css';
import './ReactiveChangesPolicyCard.css';

const K = 'cytologyCategoriesSection.reactive';

interface Props { entries: readonly CytologyCategoryEntry[]; onChanged: () => void }

const ReactiveChangesPolicyCard: React.FC<Props> = ({ entries, onChanged }) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const setting = reactiveChangesSetting(entries);
  if (setting === 'none') return null;

  const apply = async (requirePathologist: boolean) => {
    const results = await Promise.all(
      reactiveChangesUpdates(entries, requirePathologist).map(u => cytologyCategoryService.update(u.id, u.changes)),
    );
    setFailed(results.some(r => !r.ok));
    onChanged();
  };

  return (
    <div className="ps-cytcat-reactive-card">
      <div className="ps-cytcat-reactive-title">{t(`${K}.title`)}</div>
      <p className="ps-cytcat-reactive-hint">{t(`${K}.hint`)}</p>
      <p className="ps-cytcat-reactive-status" role="status">{t(`${K}.status.${setting}`)}</p>
      <div className="ps-cytcat-reactive-actions">
        {setting !== 'cytotechnologist' && (
          <CapabilityButton capability="config:cytology-categories:manage" className="ps-cytcat-btn-toolbar" onClick={() => { void apply(false); }}>
            {t(`${K}.allowCytotechnologist`)}
          </CapabilityButton>
        )}
        {setting !== 'pathologist' && (
          <CapabilityButton capability="config:cytology-categories:manage" className="ps-cytcat-btn-toolbar" onClick={() => { void apply(true); }}>
            {t(`${K}.requirePathologist`)}
          </CapabilityButton>
        )}
      </div>
      <p className="ps-cytcat-reactive-hint">{t(`${K}.appliesToNew`)}</p>
      {failed && <p className="ps-cytcat-reactive-problem" role="alert">{t(`${K}.failed`)}</p>}
    </div>
  );
};

export default ReactiveChangesPolicyCard;
