// src/pages/CytologyWorklistPage/components/CytologySearchSelect.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The screening page's searchable pick lists (moved out of
// CytologyScreeningPage.tsx in Batch 386, and their text translated). With
// ~100 dictionary entries in some sections, an always-visible listbox doesn't
// scale; typing narrows to a short match list instead.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';
import type { CytologyCategorySelection } from '@/types/cytology/CytologyReviewRecord';
import { pressable } from '@/utils/a11y/pressable';

const entryText = (o: CytologyCategoryEntry) => (o.abbreviation ? `${o.abbreviation} — ${o.label}` : o.label);
const searchText = (o: CytologyCategoryEntry) => (o.abbreviation ? `${o.abbreviation} ${o.label}` : o.label).toLowerCase();

/** A field's label, with an optional hint and a "*" when the organisation requires it. */
export function CytologyFieldLabel({ text, hint, required }: { text: string; hint?: string; required?: boolean }) {
  return (
    <label className="ps-cytoscreen-field-label">
      {text}{required && <span className="ps-conf-required"> *</span>}{hint && <span className="ps-cytoscreen-field-label-hint">{hint}</span>}
    </label>
  );
}

export function SingleSearchSelect({ options, value, comment, onChange, onCommentChange, placeholder }: {
  options: CytologyCategoryEntry[];
  value: string;
  comment: string;
  onChange: (id: string) => void;
  onCommentChange: (comment: string) => void;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const selected = options.find(o => o.id === value);
  const matches = query.trim() ? options.filter(o => searchText(o).includes(query.toLowerCase())).slice(0, 8) : [];

  if (selected) {
    return (
      <div className="ps-cytosearch-selected-wrap">
        <div className="ps-cytosearch-selected-row">
          <span className="ps-cytosearch-selected-text">{selected.description ?? entryText(selected)}</span>
          <button onClick={() => onChange('')} className="ps-cytosearch-remove-btn" aria-label={t('cytologyScreening.search.remove')}>×</button>
        </div>
        <input value={comment} onChange={e => onCommentChange(e.target.value)} placeholder={t('cytologyScreening.search.commentPlaceholder')}
          className="ps-cytosearch-comment-input" />
      </div>
    );
  }
  return (
    <div className="ps-cytosearch-query-wrap">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
        className="ps-cytosearch-query-input" />
      {matches.length > 0 && (
        <div className="ps-cytosearch-dropdown">
          {matches.map(o => (
            <div key={o.id} {...pressable(() => { onChange(o.id); setQuery(''); })} className="ps-cytosearch-dropdown-item">
              {entryText(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MultiSearchSelect({ options, selections, onChange, placeholder, categoryLabel }: {
  options: CytologyCategoryEntry[];
  selections: CytologyCategorySelection[];
  onChange: (next: CytologyCategorySelection[]) => void;
  placeholder: string;
  categoryLabel: (id: string) => string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const selectedIds = new Set(selections.map(s => s.categoryId));
  const matches = query.trim()
    ? options.filter(o => !selectedIds.has(o.id) && searchText(o).includes(query.toLowerCase())).slice(0, 8)
    : [];

  const add = (categoryId: string) => { onChange([...selections, { categoryId }]); setQuery(''); };
  const remove = (categoryId: string) => onChange(selections.filter(s => s.categoryId !== categoryId));
  const setComment = (categoryId: string, comment: string) => onChange(selections.map(s => s.categoryId === categoryId ? { ...s, comment } : s));

  return (
    <div className="ps-cytosearch-selected-wrap">
      {selections.map(s => (
        <div key={s.categoryId} className="ps-cytosearch-multi-item-wrap">
          <div className="ps-cytosearch-selected-row">
            <span className="ps-cytosearch-selected-text">{categoryLabel(s.categoryId)}</span>
            <button onClick={() => remove(s.categoryId)} className="ps-cytosearch-remove-btn" aria-label={t('cytologyScreening.search.remove')}>×</button>
          </div>
          <input value={s.comment ?? ''} onChange={e => setComment(s.categoryId, e.target.value)} placeholder={t('cytologyScreening.search.commentPlaceholder')}
            className="ps-cytosearch-comment-input" />
        </div>
      ))}
      <div className="ps-cytosearch-query-wrap--nested">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
          className="ps-cytosearch-query-input" />
        {matches.length > 0 && (
          <div className="ps-cytosearch-dropdown">
            {matches.map(o => (
              <div key={o.id} {...pressable(() => add(o.id))} className="ps-cytosearch-dropdown-item">
                {entryText(o)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
