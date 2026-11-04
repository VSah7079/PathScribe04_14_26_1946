// src/components/Profile/MyVoiceCommandsModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 432: "My voice commands": phrases the system learned from the
// signed-in person (when they confirmed what an unrecognised phrase meant),
// from the profile menu. Each is the person's own (per person since Batch
// 432), so they can remove any of them.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { actionRegistryService } from '@/services';

export const MyVoiceCommandsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState(() => actionRegistryService.getLearnedMappings());
  const remove = (transcript: string) => {
    actionRegistryService.removeLearnedMapping(transcript);
    setMappings(actionRegistryService.getLearnedMappings());
  };
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark ps-modal-dark--profile-list" role="dialog" aria-label={t('profileMenu.myVoiceCommands.title')} onClick={e => e.stopPropagation()}>
        <span className="ps-modal-dark-title">{t('profileMenu.myVoiceCommands.title')}</span>
        <p className="ps-modal-dark-body">{t('profileMenu.myVoiceCommands.intro')}</p>
        {mappings.length === 0 ? (
          <div className="ps-dictionary-words-empty">{t('profileMenu.myVoiceCommands.empty')}</div>
        ) : (
          <ul className="ps-dictionary-words-list">
            {mappings.map(m => (
              <li key={m.transcript} className="ps-dictionary-words-item">
                <span className="ps-dictionary-words-word">“{m.transcript}”</span>
                <span className="ps-dictionary-words-meta">
                  {t('profileMenu.myVoiceCommands.runs', { action: actionRegistryService.getActionById(m.actionId)?.label ?? m.actionId, count: m.useCount })}
                </span>
                <button className="ps-dictionary-words-remove" aria-label={t('profileMenu.myVoiceCommands.removeAria', { phrase: m.transcript })} onClick={() => remove(m.transcript)}>
                  {t('common.remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default MyVoiceCommandsModal;
