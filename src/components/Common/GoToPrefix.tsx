import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGoToPrefix } from '@/hooks/useGoToPrefix';

/**
 * Batch 602: the hint shown after the "Go to" key (Alt+J). Lists the always-on commands and the key that runs each.
 * Closes on Esc, on any other key, on a click away, or after a few seconds. It never takes focus.
 */
export const GoToPrefix: React.FC = () => {
  const { t } = useTranslation();
  const { open, entries, close } = useGoToPrefix();
  if (!open) return null;
  return (
    <div className="ps-goto-backdrop" onMouseDown={close} data-testid="goto-backdrop">
      <div className="ps-goto-panel" role="status" aria-live="polite" aria-label={t('goToPrefix.title')} onMouseDown={e => e.stopPropagation()}>
        <div className="ps-goto-title">{t('goToPrefix.title')}</div>
        <div className="ps-goto-hint">{t('goToPrefix.hint')}</div>
        <ul className="ps-goto-list">
          {entries.map(entry => (
            <li key={entry.command.id} className="ps-goto-row">
              <kbd className="ps-goto-key">{entry.display}</kbd>
              <span className="ps-goto-label">{entry.command.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
