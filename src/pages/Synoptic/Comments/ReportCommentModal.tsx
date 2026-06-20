import React from 'react';
import '../../../pathscribe.css';
import PathScribeEditor from '../../../components/Editor/PathScribeEditor';
import { CommentModalShell } from './CommentModalShell';

interface ReportCommentModalProps {
  specimenName: string;     // full breadcrumb string, e.g. "Left Breast Mastectomy › Breast — Invasive Carcinoma"
  specimenId: string;
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
  return (
    <CommentModalShell
      title={`💬 ${titleName}`}
      subtitle={
        <div className="ps-cmnt-subtitle-row">
          {parts.length > 1 && <span className="ps-cmnt-subtitle-context">{parts.slice(1).join(' › ')}</span>}
          {isFinalized
            ? <span className="ps-cmnt-status-finalized">🔒 Finalized — read only</span>
            : isEmpty
              ? <span className="ps-cmnt-status-empty">No comment yet — start typing below</span>
              : <span className="ps-cmnt-status-saved">✓ Comment saved — click to edit</span>
          }
        </div>
      }
      onClose={onClose}
      editorMode
      footerLeft="Sent to LIS on finalization. Protocol-defined fields are in the Tumor, Margins & Biomarkers tabs."
    >
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
    </CommentModalShell>
  );
};

// ─── CaseCommentModal ─────────────────────────────────────────────────────────

export { ReportCommentModal };
export type { ReportCommentModalProps };
