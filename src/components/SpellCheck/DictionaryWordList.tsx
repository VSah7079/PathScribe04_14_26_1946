// src/components/SpellCheck/DictionaryWordList.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 432: a spelling dictionary's words, with add and remove. Used for
// "My dictionary" (the signed-in person's own words, from the profile menu)
// and a facility's dictionary (Facility configuration → Spelling). The
// dictionary service decides who may change which (owner only; facility:
// config:facilities:manage) and returns a refusal code shown here.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomWordEntry, CustomWordRefusal } from '@/services/spellcheck/customDictionaryRules';
import type { CustomWordResult } from '@/services/spellcheck/ICustomDictionaryService';

interface Props {
  list: () => Promise<CustomWordResult<CustomWordEntry[]>>;
  add: (word: string) => Promise<CustomWordResult<CustomWordEntry[]>>;
  remove: (word: string) => Promise<CustomWordResult<CustomWordEntry[]>>;
  /** Shown when the list is empty. */
  emptyText: string;
}

const REFUSAL_KEY: Record<CustomWordRefusal, string> = {
  EMPTY: 'dictionaryWordList.refusal.empty',
  NOT_A_WORD: 'dictionaryWordList.refusal.notAWord',
  TOO_LONG: 'dictionaryWordList.refusal.tooLong',
  NOT_PERMITTED: 'dictionaryWordList.refusal.notPermitted',
  NOT_FOUND: 'dictionaryWordList.refusal.notFound',
};

export const DictionaryWordList: React.FC<Props> = ({ list, add, remove, emptyText }) => {
  const { t } = useTranslation();
  const [words, setWords] = useState<CustomWordEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => { const r = await list(); if (r.ok) setWords(r.data); }, [list]);
  useEffect(() => { void load(); }, [load]);

  const apply = async (result: Promise<CustomWordResult<CustomWordEntry[]>>) => {
    const r = await result;
    if (r.ok === false) { setError(t(REFUSAL_KEY[r.code])); return false; }
    setWords(r.data); setError(null); return true;
  };

  return (
    <div className="ps-dictionary-words">
      <div className="ps-dictionary-words-add">
        <input className="ps-conf-input" value={draft} placeholder={t('dictionaryWordList.addPlaceholder')}
          aria-label={t('dictionaryWordList.addPlaceholder')}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={async e => { if (e.key === 'Enter' && (await apply(add(draft)))) setDraft(''); }} />
        <button className="ps-conf-btn-secondary" onClick={async () => { if (await apply(add(draft))) setDraft(''); }}>{t('dictionaryWordList.addButton')}</button>
      </div>
      {error && <div className="ps-dictionary-words-error" role="alert">{error}</div>}
      {words.length === 0 ? (
        <div className="ps-dictionary-words-empty">{emptyText}</div>
      ) : (
        <ul className="ps-dictionary-words-list">
          {words.map(w => (
            <li key={w.word} className="ps-dictionary-words-item">
              <span className="ps-dictionary-words-word">{w.word}</span>
              <span className="ps-dictionary-words-meta">{t('dictionaryWordList.addedBy', { name: w.addedBy.userName, when: new Date(w.addedAt).toLocaleDateString() })}</span>
              <button className="ps-dictionary-words-remove" aria-label={t('dictionaryWordList.removeAria', { word: w.word })} onClick={() => void apply(remove(w.word))}>
                {t('common.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DictionaryWordList;
