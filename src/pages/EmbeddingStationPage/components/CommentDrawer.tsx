// src/pages/EmbeddingStationPage/components/CommentDrawer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-285's own "Unified Comment Drawer: grossing notes +
// embedding-specific observations." Self-contained copy for this
// folder (not a shared import from MicrotomyWorkstationPage) — same
// real ps-overlay/ps-modal-dark modal convention, under this page's
// own ps-embedding-* prefix. Deliberately simpler than the Microtomy
// equivalent: embedding-station comments are plain block notes with
// no "prints on label" concept (addEmbeddingBlockComment has no such
// field — see that function's own doc comment), so there's no print
// toggle here.
//
// Batch 401 (PS-359): what "Add Comment" needs comes from the organisation's
// Field Requirements (page "embedding"): the comment text is locked. The drawer
// stars the label, shows "Still required: …", keeps Add off until it is filled,
// and "add comment" by voice (EMBEDDING_ADD_COMMENT) acts exactly as the button.
// The comment times are shown in the user's locale.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MaterialComment } from '@/types/case/MaterialComment';
import { actionRegistryService, embeddingCommentMissing, embeddingFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatDateTime } from '@/utils/formatDate';
import { formatList } from '@/utils/formatList';

export interface CommentDrawerProps {
  title: string;
  comments: MaterialComment[];
  onSubmit: (text: string) => void;
  onClose: () => void;
  requirements: readonly ResolvedFieldRequirement[];
}

const CommentDrawer: React.FC<CommentDrawerProps> = ({ title, comments, onSubmit, onClose, requirements }) => {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('');
  const missing = embeddingCommentMissing(text, requirements);
  const canAdd = missing.length === 0;

  const add = () => { if (!canAdd) return; onSubmit(text.trim()); setText(''); };
  const addRef = useRef(add);
  addRef.current = add;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'EMBEDDING_ADD_COMMENT') addRef.current();
  }), []);

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>
        <div className="ps-batch-modal-header">
          <div className="ps-batch-modal-title">{title}</div>
        </div>
        <div className="ps-batch-modal-body">
          <ul className="ps-embedding-comment-list">
            {comments.length === 0 && <li className="ps-embedding-comment-item">{t('embeddingStation.comments.empty')}</li>}
            {comments.map(c => (
              <li key={c.id} className="ps-embedding-comment-item">
                {c.text}
                <div className="ps-embedding-comment-meta">{t('embeddingStation.comments.meta', { author: c.authorName, when: formatDateTime(c.createdAt, i18n.language) })}</div>
              </li>
            ))}
          </ul>
          <label className="ps-embedding-field-label" htmlFor="embedding-comment-text">
            {t('embeddingStation.comments.label')}{embeddingFieldRequired(requirements, 'commentText') && <span className="ps-conf-required"> *</span>}
          </label>
          <div className="ps-embedding-comment-input-row">
            <textarea id="embedding-comment-text"
              className="ps-embedding-comment-textarea" value={text}
              placeholder={t('embeddingStation.comments.placeholder') ?? ''}
              onChange={e => setText(e.target.value)}
            />
          </div>
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.embedding.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
        <div className="ps-batch-modal-footer">
          <button className="ps-btn-secondary" onClick={onClose}>{t('common.close')}</button>
          <button className="ps-btn-primary" disabled={!canAdd} onClick={add}>
            {t('embeddingStation.comments.add')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentDrawer;
