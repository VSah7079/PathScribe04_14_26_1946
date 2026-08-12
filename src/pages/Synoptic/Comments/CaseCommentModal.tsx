<<<<<<< HEAD
import React from 'react';
import '../../../pathscribe.css';
import PathScribeEditor from '../../../components/Editor/PathScribeEditor';
import { CommentModalShell } from './CommentModalShell';
import { ROLE_META } from '../synopticTypes';
import type { CaseRole } from '../synopticTypes';

interface CaseCommentModalProps {
  accession: string;
  caseComments: Partial<Record<CaseRole, string>>;
  onChangeAttending: (html: string) => void;
  onClose: () => void;
}

const CaseCommentModal: React.FC<CaseCommentModalProps> = ({
  accession,
  caseComments,
  onChangeAttending,
  onClose,
}) => (
  <CommentModalShell
    title="📋 Case Comment"
    subtitle={<>Case {accession} — applies to the entire case, not tied to any specimen</>}
    onClose={onClose}
    footerLeft="TODO: Role Dictionary — will show your role's editable comment and other roles read-only."
  >

    {/* ── Attending (editable) ── */}
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 10px',
            borderRadius: '10px',
            background: ROLE_META.attending.bg,
            color: ROLE_META.attending.color,
            border: `1px solid ${ROLE_META.attending.border}`,
          }}
        >
          {ROLE_META.attending.label}
        </span>

        <span style={{ fontSize: '11px', color: '#94a3b8' }}>— your comment</span>

        {(!caseComments?.attending || caseComments.attending === '<p></p>')
          ? (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: '#fef3c7',
                color: '#92400e',
                fontWeight: 600,
              }}
            >
              No comment yet — start typing below
            </span>
          )
          : (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: '#d1fae5',
                color: '#065f46',
                fontWeight: 600,
              }}
            >
              ✓ Comment saved — click to edit
            </span>
          )}
      </div>

      <PathScribeEditor
        key="modal-case-comment-attending"
        content={caseComments?.attending ?? ''}
        placeholder="Enter attending pathologist case comment…"
        onChange={onChangeAttending}
        minHeight="320px"
        showRulerDefault={true}
        macros={[]}
        approvedFonts={['Arial', 'Times New Roman', 'Calibri', 'Courier New']}
      />
    </div>

    {/* ── Resident (read-only collapsible) ── */}
    <OtherRoleComment
      meta={ROLE_META.resident}
      content={caseComments?.resident ?? ''}
      hasContent={!!(caseComments?.resident && caseComments.resident !== '<p></p>')}
    />

  </CommentModalShell>
);

/* ────────────────────────────────────────────────────────────────
   OtherRoleComment Component
   Read-only collapsible panel showing another role's case comment.
   ──────────────────────────────────────────────────────────────── */

interface OtherRoleCommentProps {
  meta: { label: string; color: string; bg: string; border: string };
  content: string;
  hasContent: boolean;
}

const OtherRoleComment: React.FC<OtherRoleCommentProps> = ({
  meta,
  content,
  hasContent,
}) => (
  <div style={{ marginTop: '24px' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 10px',
          borderRadius: '10px',
          background: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.border}`,
        }}
      >
        {meta.label}
      </span>

      <span style={{ fontSize: '11px', color: '#94a3b8' }}>— read-only</span>

      {!hasContent && (
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: '#fee2e2',
            color: '#991b1b',
            fontWeight: 600,
          }}
        >
          No comment from this role
        </span>
      )}
    </div>

    {hasContent && (
      <div
        style={{
          border: `1px solid ${meta.border}`,
          background: meta.bg,
          padding: '12px',
          borderRadius: '6px',
          fontSize: '13px',
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )}
  </div>
);

export { CaseCommentModal };
export type { CaseCommentModalProps };
=======
import React, { useState } from 'react';
import '../../../pathscribe.css';
import PathScribeEditor from '../../../components/Editor/PathScribeEditor';
import { CommentModalShell } from './CommentModalShell';
import type { CaseComment } from '../../../types/case/CaseComment';

interface CaseCommentModalProps {
  accession: string;
  comments: CaseComment[];
  currentUserId: string;
  currentUserName: string;
  onAddComment: (text: string) => void;
  onClose: () => void;
}

const formatTimestamp = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    });
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

const CaseCommentModal: React.FC<CaseCommentModalProps> = ({
  accession, comments, currentUserId: _currentUserId, currentUserName, onAddComment, onClose,
  // _currentUserId: genuine prop, no consumer yet — no delete/edit-own-
  // comment logic exists in this modal at all today (checked). Likely
  // intended for a future authorship permission check ("can this user
  // edit/delete their own comment"), not dead code to remove.
}) => {
  const [draft, setDraft] = useState('');
  const isDraftEmpty = !draft.trim() || draft === '<p></p>';

  const handlePost = () => {
    if (isDraftEmpty) return;
    onAddComment(draft);
    setDraft('');
  };

  // Newest first — the most relevant thing when opening a case is the
  // latest update, not the oldest. Each entry still shows its own
  // timestamp, so chronological order is never ambiguous.
  const sorted = [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <CommentModalShell
      title="📋 Case Comment"
      subtitle={<>Case {accession} — applies to the entire case, not tied to any specimen</>}
      onClose={onClose}
      footerLeft={`${comments.length} comment${comments.length === 1 ? '' : 's'} on this case`}
    >
      {/* ── New comment composer ── */}
      <div className="ps-cmnt-thread-composer">
        <div className="ps-cmnt-role-header">
          <span className="ps-cmnt-thread-author">{currentUserName}</span>
          <span className="ps-cmnt-role-note">— new comment</span>
        </div>
        <PathScribeEditor
          key="modal-case-comment-composer"
          content={draft}
          placeholder="Add a comment — visible to everyone who opens this case…"
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

      {/* ── Existing thread — append-only, nothing here is ever edited or
          deleted once posted. Each entry is its own record: real author,
          real timestamp, never silently overwritten by a later save. ── */}
      <div className="ps-cmnt-thread-list">
        {sorted.length === 0 && (
          <div className="ps-cmnt-thread-empty">No comments yet on this case.</div>
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

export { CaseCommentModal };
export type { CaseCommentModalProps };
>>>>>>> upstream/main
