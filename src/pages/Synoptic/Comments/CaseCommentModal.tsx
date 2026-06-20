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
  accession, caseComments, onChangeAttending, onClose,
}) => (
  <CommentModalShell
    title="📋 Case Comment"
    subtitle={<>Case {accession} — applies to the entire case, not tied to any specimen</>}
    onClose={onClose}
    footerLeft="TODO: Role Dictionary — will show your role's editable comment and other roles read-only."
  >
    {/* ── Attending (editable) ── */}
    <div>
      <div className="ps-cmnt-role-header">
        <span
          className="ps-cmnt-badge"
          style={{ background: ROLE_META.attending.bg, color: ROLE_META.attending.color, border: `1px solid ${ROLE_META.attending.border}` }}
        >
          {ROLE_META.attending.label}
        </span>
        <span className="ps-cmnt-role-note">— your comment</span>
        {(!caseComments?.attending || caseComments.attending === '<p></p>')
          ? <span className="ps-cmnt-status-empty">No comment yet — start typing below</span>
          : <span className="ps-cmnt-status-saved">✓ Comment saved — click to edit</span>
        }
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
    <div className="ps-cmnt-other-wrap">
      <div className="ps-cmnt-role-header">
        <span
          className="ps-cmnt-badge"
          style={{ background: ROLE_META.resident.bg, color: ROLE_META.resident.color, border: `1px solid ${ROLE_META.resident.border}` }}
        >
          {ROLE_META.resident.label}
        </span>
        <span className="ps-cmnt-role-note">— read-only</span>
        {!(caseComments?.resident && caseComments.resident !== '<p></p>') && (
          <span className="ps-cmnt-status-none">No comment from this role</span>
        )}
      </div>
      {caseComments?.resident && caseComments.resident !== '<p></p>' && (
        <div
          style={{ border: `1px solid ${ROLE_META.resident.border}`, background: ROLE_META.resident.bg, padding: '12px', borderRadius: '6px', fontSize: '13px' }}
          dangerouslySetInnerHTML={{ __html: caseComments.resident }}
        />
      )}
    </div>
  </CommentModalShell>
);

export { CaseCommentModal };
export type { CaseCommentModalProps };
