// src/components/Common/DraftRecoveryModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 of the Inactivity Timeout & Draft Recovery spec (see PRIORITY_FIXES.md).
//
// Deliberately simpler than the original spec's wireframe (Section 4C),
// which shows a full field-by-field diff with individual checkboxes per
// changed field. That requires knowing the specific field schema of
// whatever's being restored — reasonable once this is wired into a real
// page, but genuinely separate, additional complexity from the core
// cache/restore mechanism itself. This first pass is whole-draft
// restore-or-discard; the diff UI is a real, worthwhile upgrade for later,
// not dropped, just sequenced after the simpler version is proven.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

interface DraftRecoveryModalProps {
  savedAt:     string;
  onRestore:   () => void;
  onDiscard:   () => void;
}

const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({ savedAt, onRestore, onDiscard }) => {
  const savedDate = new Date(savedAt);
  const formatted = savedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' at ' + savedDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="ps-overlay" style={{ zIndex: 50000 }}>
      <div className="ps-modal-dark" style={{ width: 440, textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </div>
        <span className="ps-modal-dark-title">Unsaved Draft Found</span>
        <p className="ps-modal-dark-body">
          We recovered changes from your previous session, saved {formatted}.
          Would you like to restore them?
        </p>
        <div className="ps-modal-dark-footer">
          <button className="ps-btn-ghost-dark" onClick={onDiscard}>Discard Draft</button>
          <button className="ps-btn-primary" onClick={onRestore} autoFocus>Restore</button>
        </div>
      </div>
    </div>
  );
};

export default DraftRecoveryModal;
