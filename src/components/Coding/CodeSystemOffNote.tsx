// Batch 614 (PS-762): the inline note a coding screen shows when the Code Systems setting has switched a system off,
// so the screen says why a picker or field is missing instead of silently leaving it out.
import React from 'react';
import { useTranslation } from 'react-i18next';

export const CodeSystemOffNote: React.FC<{ systems: readonly string[] }> = ({ systems }) => {
  const { t } = useTranslation();
  if (systems.length === 0) return null;
  const names = systems.map(s => t(`codeSystemsPolicy.names.${s}`, { defaultValue: s })).join(', ');
  return (
    <div className="ps-code-system-off-note" role="note" data-testid="code-system-off-note">
      {t('codeSystemsPolicy.offNote', { count: systems.length, systems: names })}
    </div>
  );
};
