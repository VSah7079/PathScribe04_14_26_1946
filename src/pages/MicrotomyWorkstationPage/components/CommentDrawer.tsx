// src/pages/MicrotomyWorkstationPage/components/CommentDrawer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-284's own "3. Comment Systems: Unified Comment Drawer,
// badge showing active comment count." Reuses ps-overlay/ps-modal-dark
// — the same real modal convention GrossingScreenPage's own confirm
// dialogs and BlockStainEditorModal already use — rather than a new,
// bespoke slide-out panel treatment.
//
// Batch 388 (PS-359): what "Add Comment" needs comes from the organisation's
// Field Requirements (page "microtomy"): the comment text is locked. The drawer
// stars the label, shows "Still required: …", keeps Add off until it is filled,
// and "add comment" by voice (MICROTOMY_ADD_COMMENT) acts exactly as the button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MaterialComment } from '@/types/case/MaterialComment';
import { actionRegistryService, microtomyCommentMissing, microtomyFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatDateTime } from '@/utils/formatDate';
import { formatList } from '@/utils/formatList';

export interface CommentDrawerProps {
  title: string;
  comments: MaterialComment[];
  showPrintToggle: boolean;
  onSubmit: (text: string, printsOnLabel: boolean) => void;
  onClose: () => void;
  requirements: readonly ResolvedFieldRequirement[];
}

const CommentDrawer: React.FC<CommentDrawerProps> = ({ title, comments, showPrintToggle, onSubmit, onClose, requirements }) => {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('');
  const [printsOnLabel, setPrintsOnLabel] = useState(false);
  const missing = microtomyCommentMissing(text, requirements);
  const canAdd = missing.length === 0;

  const add = () => { if (!canAdd) return; onSubmit(text.trim(), printsOnLabel); setText(''); };
  const addRef = useRef(add);
  addRef.current = add;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'MICROTOMY_ADD_COMMENT') addRef.current();
  }), []);

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>
        <div className="ps-batch-modal-header">
          <div className="ps-batch-modal-title">{title}</div>
        </div>
        <div className="ps-batch-modal-body">
          <ul className="ps-microtomy-comment-list">
            {comments.length === 0 && <li className="ps-microtomy-comment-item">{t('microtomyWorkstation.comments.empty')}</li>}
            {comments.map(c => (
              <li key={c.id} className="ps-microtomy-comment-item">
                {c.text}
                <div className="ps-microtomy-comment-meta">{t('microtomyWorkstation.comments.meta', { author: c.authorName, when: formatDateTime(c.createdAt, i18n.language) })}</div>
              </li>
            ))}
          </ul>
          <label className="ps-label" htmlFor="microtomy-comment-text">
            {t('microtomyWorkstation.comments.label')}{microtomyFieldRequired(requirements, 'commentText') && <span className="ps-conf-required"> *</span>}
          </label>
          <div className="ps-microtomy-comment-input-row">
            <textarea id="microtomy-comment-text"
              className="ps-microtomy-comment-textarea" value={text}
              placeholder={t('microtomyWorkstation.comments.placeholder') ?? ''}
              onChange={e => setText(e.target.value)}
            />
          </div>
          {showPrintToggle && (
            <label className="ps-microtomy-checkbox-label ps-mt-8">
              <input type="checkbox" checked={printsOnLabel} onChange={e => setPrintsOnLabel(e.target.checked)} />
              {t('microtomyWorkstation.comments.printOnLabel')}
            </label>
          )}
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.microtomy.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
        <div className="ps-batch-modal-footer">
          <button className="ps-btn-secondary" onClick={onClose}>{t('common.close')}</button>
          <button className="ps-btn-primary" disabled={!canAdd} onClick={add}>
            {t('microtomyWorkstation.comments.add')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentDrawer;
