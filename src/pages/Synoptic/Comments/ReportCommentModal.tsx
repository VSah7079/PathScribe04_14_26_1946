<<<<<<< HEAD
import React from 'react';
import '../../../pathscribe.css';
import PathScribeEditor from '../../../components/Editor/PathScribeEditor';
import { CommentModalShell } from './CommentModalShell';
=======
import React, { useState } from 'react';
import '../../../pathscribe.css';
import PathScribeEditor from '../../../components/Editor/PathScribeEditor';
import { CommentModalShell } from './CommentModalShell';
import type { CaseComment } from '../../../types/case/CaseComment';
>>>>>>> upstream/main

interface ReportCommentModalProps {
  specimenName: string;     // full breadcrumb string, e.g. "Left Breast Mastectomy › Breast — Invasive Carcinoma"
  specimenId: string;
<<<<<<< HEAD
  content: string;
  isFinalized: boolean;
  onChange: (html: string) => void;
  onClose: () => void;
}

const ReportCommentModal: React.FC<ReportCommentModalProps> = ({
  specimenName, specimenId, content, isFinalized, onChange, onClose,
}) => {
  const isEmpty = !content || content === '<p></p>';
  // Use first breadcrumb segment as the modal title, rest as context
  const parts = specimenName.split(' › ');
  const titleName = parts[0] ?? specimenName;
=======
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
  specimenName, specimenId, comments, isFinalized, currentUserId: _currentUserId, currentUserName, onAddComment, onClose,
  // _currentUserId: same as CaseCommentModal.tsx — genuine prop, no
  // authorship-permission consumer built yet.
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

>>>>>>> upstream/main
  return (
    <CommentModalShell
      title={`💬 ${titleName}`}
      subtitle={
<<<<<<< HEAD
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {parts.length > 1 && <span style={{ color: '#94a3b8' }}>{parts.slice(1).join(' › ')}</span>}
          {isFinalized
            ? <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#94a3b8', fontWeight: 600 }}>🔒 Finalized — read only</span>
            : isEmpty
              ? <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>No comment yet — start typing below</span>
              : <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>✓ Comment saved — click to edit</span>
=======
        <div className="ps-cmnt-subtitle-row">
          {parts.length > 1 && <span className="ps-cmnt-subtitle-context">{parts.slice(1).join(' › ')}</span>}
          {isFinalized
            ? <span className="ps-cmnt-status-finalized">🔒 Finalized — read only</span>
            : <span className="ps-cmnt-status-saved">{comments.length} comment{comments.length === 1 ? '' : 's'}</span>
>>>>>>> upstream/main
          }
        </div>
      }
      onClose={onClose}
      editorMode
      footerLeft="Sent to LIS on finalization. Protocol-defined fields are in the Tumor, Margins & Biomarkers tabs."
    >
<<<<<<< HEAD
      <PathScribeEditor
        key={`modal-report-comment-${specimenId}`}
        content={content}
        placeholder={`Start typing your report comment for ${titleName}…`}
        onChange={onChange}
        minHeight="480px"
        readOnly={isFinalized}
        showRulerDefault={true}
        macros={[]}
        approvedFonts={['Arial', 'Times New Roman', 'Calibri', 'Courier New']}
      />
=======
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
            minHeight="220px"
            theme="dark"
            allowThemeToggle
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
>>>>>>> upstream/main
    </CommentModalShell>
  );
};

<<<<<<< HEAD
// ─── CaseCommentModal ─────────────────────────────────────────────────────────

=======
>>>>>>> upstream/main
export { ReportCommentModal };
export type { ReportCommentModalProps };
