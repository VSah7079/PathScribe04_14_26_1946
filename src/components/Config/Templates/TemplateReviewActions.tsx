import React, { useState } from "react";
import '../../../pathscribe.css';

export const TemplateReviewActions: React.FC = () => {
  const [status, setStatus] = useState<"pending"|"approved"|"changes"|"rejected">("pending");
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment]     = useState("");

  const statusClass = `ps-tmpl-status-badge ps-tmpl-status-badge--${status}`;
  const statusLabel = { pending: 'Pending Review', approved: 'Approved', changes: 'Needs Changes', rejected: 'Rejected' }[status];

  return (
    <div className="ps-tmpl-actions-bar">
      <span className={statusClass}>{statusLabel}</span>
      <div className="ps-tmpl-action-btns">
        <button className="ps-tmpl-btn-approve" onClick={() => setStatus('approved')}>Approve</button>
        <button className="ps-tmpl-btn-changes" onClick={() => { setStatus('changes'); setShowModal(true); }}>Needs Changes</button>
        <button className="ps-tmpl-btn-reject"  onClick={() => { setStatus('rejected'); setShowModal(true); }}>Reject</button>
      </div>
      {showModal && (
        <div className="ps-tmpl-comment-overlay">
          <div className="ps-tmpl-comment-modal">
            <h3 className="ps-tmpl-comment-title">Reviewer Comment</h3>
            <textarea className="ps-tmpl-comment-textarea" value={comment} onChange={e => setComment(e.target.value)} />
            <div className="ps-tmpl-comment-footer">
              <button className="ps-btn-ghost-dark" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ps-btn-primary" onClick={() => { console.log('Comment:', comment); setShowModal(false); setComment(''); }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
