// src/components/Profile/MyDictionaryModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 432: "My dictionary": the words the signed-in person added to their own
// spelling dictionary, from the profile menu. Add and remove; only the owner
// can remove (checked by the dictionary service).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { customDictionaryService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import DictionaryWordList from '@/components/SpellCheck/DictionaryWordList';

export const MyDictionaryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const actor = { userId, userName: user?.name ?? userId };
  const list = useCallback(() => customDictionaryService.listPersonal(userId), [userId]);
  const add = useCallback((word: string) => customDictionaryService.addPersonal(userId, word, actor), [userId, actor.userName]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = useCallback((word: string) => customDictionaryService.removePersonal(userId, word), [userId]);
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark ps-modal-dark--profile-list" role="dialog" aria-label={t('profileMenu.myDictionary.title')} onClick={e => e.stopPropagation()}>
        <span className="ps-modal-dark-title">{t('profileMenu.myDictionary.title')}</span>
        <p className="ps-modal-dark-body">{t('profileMenu.myDictionary.intro')}</p>
        <DictionaryWordList list={list} add={add} remove={remove} emptyText={t('profileMenu.myDictionary.empty')} />
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default MyDictionaryModal;
