import React, { useState } from 'react';
import '../../../pathscribe.css';
import PathScribeEditor from '../../../components/Editor/PathScribeEditor';
import { CommentModalShell } from './CommentModalShell';
import type { CaseComment } from '../../../types/case/CaseComment';

interface ReportCommentModalProps {
  specimenName: string;     // full breadcrumb string, e.g. "Left Breast Mastectomy › Breast — Invasive Carcinoma"
  specimenId: string;
  comments: CaseComment[];
  isFinalized: boolean;
  currentUserId: string;
  currentUserName: string;
  onAddComment: (text: string) => void;
  onClose: () => void;
}

const formatTimestamp = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
};

const SYNC_LABELS: Record<NonNullable<CaseComment['syncStatus']>, string> = {
  pending: '⏳ Pending sync to LIS',
  sent: '↗ Sent to LIS',
  acknowledged: '✓ Acknowledged by LIS',
  failed: '⚠ Sync failed',
};

const OriginBadge: React.FC<{ comment: CaseComment }> = ({ comment }) => {
  if (comment.origin === 'lis') {
    return <span className="ps-cmnt-origin-badge ps-cmnt-origin-badge--lis">From LIS</span>;
  }
  return (
    <span className={`ps-cmnt-origin-badge ps-cmnt-origin-badge--pathscribe ps-cmnt-origin-badge--${comment.syncStatus ?? 'pending'}`}>
      {SYNC_LABELS[comment.syncStatus ?? 'pending']}
    </span>
  );
};

const ReportCommentModal: React.FC<ReportCommentModalProps> = ({
  specimenName, specimenId, comments, isFinalized, currentUserId, currentUserName, onAddComment, onClose,
}) => {
  const [draft, setDraft] = useState('');
  const isDraftEmpty = !draft.trim() || draft === '<p></p>';
  const parts = specimenName.split(' › ');
  const titleName = parts[0] ?? specimenName;

  const handlePost = () => {
    if (isDraftEmpty || isFinalized) return;
    onAddComment(draft);
    setDraft('');
  };

  const sorted = [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <CommentModalShell
      title={`💬 ${titleName}`}
      subtitle={
        <div className="ps-cmnt-subtitle-row">
          {parts.length > 1 && <span className="ps-cmnt-subtitle-context">{parts.slice(1).join(' › ')}</span>}
          {isFinalized
            ? <span className="ps-cmnt-status-finalized">🔒 Finalized — read only</span>
            : <span className="ps-cmnt-status-saved">{comments.length} comment{comments.length === 1 ? '' : 's'}</span>
          }
        </div>
      }
      onClose={onClose}
      editorMode
      footerLeft="Sent to LIS on finalization. Protocol-defined fields are in the Tumor, Margins & Biomarkers tabs."
    >
      {!isFinalized && (
        <div className="ps-cmnt-thread-composer">
          <div className="ps-cmnt-role-header">
            <span className="ps-cmnt-thread-author">{currentUserName}</span>
            <span className="ps-cmnt-role-note">— new comment</span>
          </div>
          <PathScribeEditor
            key={`modal-report-comment-composer-${specimenId}`}
            content={draft}
            placeholder={`Add a comment for ${titleName}…`}
            onChange={setDraft}
            minHeight="140px"
            showRulerDefault={false}
            macros={[]}
            approvedFonts={['Arial', 'Times New Roman', 'Calibri', 'Courier New']}
          />
          <button className="ps-cmnt-post-btn" onClick={handlePost} disabled={isDraftEmpty}>
            Post Comment
          </button>
        </div>
      )}

      <div className="ps-cmnt-thread-list">
        {sorted.length === 0 && (
          <div className="ps-cmnt-thread-empty">No comments yet on this specimen.</div>
        )}
        {sorted.map(c => (
          <div key={c.id} className="ps-cmnt-thread-item">
            <div className="ps-cmnt-role-header">
              <span className="ps-cmnt-thread-author">{c.authorName}</span>
              <span className="ps-cmnt-thread-timestamp">{formatTimestamp(c.createdAt)}</span>
              <OriginBadge comment={c} />
            </div>
            <div className="ps-cmnt-thread-text" dangerouslySetInnerHTML={{ __html: c.text }} />
          </div>
        ))}
      </div>
    </CommentModalShell>
  );
};

export { ReportCommentModal };
export type { ReportCommentModalProps };
