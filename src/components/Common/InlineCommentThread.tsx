// src/components/Common/InlineCommentThread.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reviewers' comments on one question of a template under review (the
// template review screen, TemplateRenderer.tsx).
//
// Batch 579 (PS-63 follow-up, "the reviewer screen needs polish"): dark, like
// the rest of the screen (it was white); the comment box is labelled with the
// question it belongs to and has an Add button as well as Enter; adding and
// resolving go through services/templates/templateReviewWork.ts, which saves
// and audits them (this component used to build the audit entries itself).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { logEvent } from '../../audit/auditLogger';
import {
  addTemplateQuestionComment, getTemplateQuestionComments, toggleTemplateQuestionComment,
  type TemplateCommentDeps, type TemplateQuestionComment,
} from '@/services/templates/templateReviewWork';

interface InlineCommentThreadProps {
  questionId: string;
  templateId: string;
  /** The question's own label, so the comment box says which question it is for. */
  questionLabel?: string;
  currentUser: string;
  /** Batch 579: the audit log, passed in for tests. */
  deps?: TemplateCommentDeps;
}

const defaultDeps: TemplateCommentDeps = { log: event => logEvent(event) };

export const InlineCommentThread: React.FC<InlineCommentThreadProps> = ({ questionId, templateId, questionLabel, currentUser, deps = defaultDeps }) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<TemplateQuestionComment[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setComments(getTemplateQuestionComments(templateId, questionId));
  }, [templateId, questionId]);

  const add = () => {
    const next = addTemplateQuestionComment({ templateId, questionId, author: currentUser, text: draft }, deps);
    if (!next) return;
    setComments(next);
    setDraft('');
  };

  const label = questionLabel
    ? t('inlineCommentThread.addCommentLabel', { question: questionLabel })
    : t('inlineCommentThread.addCommentPlaceholder');

  return (
    <div className="ps-inlinecomment-wrap">
      {comments.length > 0 && (
        <ul className="ps-inlinecomment-list">
          {comments.map(c => (
            <li key={c.id} className={`ps-inlinecomment-row${c.resolved ? ' ps-inlinecomment-row--resolved' : ''}`}>
              <div className="ps-inlinecomment-text">
                <strong>{c.author}</strong>{t('inlineCommentThread.authorSeparator')}{c.text}
                {c.resolved && <span className="ps-inlinecomment-resolved-badge">{t('inlineCommentThread.resolvedBadge')}</span>}
              </div>
              <button
                type="button"
                onClick={() => setComments(toggleTemplateQuestionComment({ templateId, questionId, commentId: c.id, user: currentUser }, deps))}
                className="ps-inlinecomment-resolve-btn"
              >
                {c.resolved ? t('inlineCommentThread.reopenButton') : t('inlineCommentThread.resolveButton')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="ps-inlinecomment-add">
        <input
          type="text"
          aria-label={label}
          placeholder={t('inlineCommentThread.addCommentPlaceholder')}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="ps-inlinecomment-input"
        />
        <button type="button" className="ps-inlinecomment-add-btn" onClick={add} disabled={!draft.trim()}>
          {t('inlineCommentThread.addButton')}
        </button>
      </div>
    </div>
  );
};
