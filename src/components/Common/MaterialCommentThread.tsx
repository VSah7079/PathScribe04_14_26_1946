// src/components/Common/MaterialCommentThread.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#10): a plain-text comments list with a one-line composer, for a
// block-level record (the matrix block editor's Details tab). Same look as the
// ordinary block's comments in BlockStainEditorModal: author in bold, when, then
// the text, shown as literal text (never as markup). Renders and dispatches:
// the comment itself is made in services/material/materialComments.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { MaterialComment } from '@/types/case/MaterialComment';
import { formatDateTime } from '@/utils/formatDate';

interface MaterialCommentThreadProps {
  comments: readonly MaterialComment[] | undefined;
  /** Called with the text typed; the caller makes the comment and saves it. */
  onAdd: (text: string) => void;
  /** Id prefix for the composer's label, so two threads on a page stay distinct. */
  idPrefix: string;
  /** False: the comments are shown but none can be added. */
  canAdd?: boolean;
}

const MaterialCommentThread: React.FC<MaterialCommentThreadProps> = ({ comments, onAdd, idPrefix, canAdd = true }) => {
  const { t, i18n } = useTranslation();
  const [value, setValue] = useState('');
  const list = comments ?? [];
  const submit = () => {
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  };
  return (
    <div className="ps-conf-form-field" data-testid="material-comment-thread">
      <label className="ps-conf-label" htmlFor={`${idPrefix}-comment`}>{t('materialComments.label')}</label>
      {list.length === 0 && <p className="ps-blockstain-comment-empty">{t('materialComments.empty')}</p>}
      {list.map(c => (
        <div key={c.id} className="ps-blockstain-comment-row">
          <Trans i18nKey="materialComments.meta" values={{ author: c.authorName, when: formatDateTime(c.createdAt, i18n.language) }} components={{ author: <strong className="ps-blockstain-comment-author" /> }} />
          <div className="ps-blockstain-comment-text">{c.text}</div>
        </div>
      ))}
      {canAdd && (
        <div className="ps-blockstain-comment-composer">
          <input
            id={`${idPrefix}-comment`}
            type="text"
            className="ps-conf-input"
            placeholder={t('materialComments.placeholder')}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          />
          <button type="button" className="ps-btn-small" disabled={!value.trim()} onClick={submit}>
            {t('materialComments.add')}
          </button>
        </div>
      )}
    </div>
  );
};

export default MaterialCommentThread;
