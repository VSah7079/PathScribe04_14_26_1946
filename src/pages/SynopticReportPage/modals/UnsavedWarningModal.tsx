<<<<<<< HEAD
// src/pages/SynopticReportPage/modals/UnsavedWarningModal.tsx

=======
/**
 * UnsavedWarningModal.tsx
 * src/pages/SynopticReportPage/modals/UnsavedWarningModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown when the user tries to navigate away from a case with unsaved changes.
 *
 * Three options:
 *   Save & Leave   — saves draft and navigates
 *   Discard & Leave — discards changes and navigates
 *   Stay           — cancels navigation, returns to case
 * ─────────────────────────────────────────────────────────────────────────────
 */
>>>>>>> upstream/main
import React from 'react';
import '@/pathscribe.css';

interface UnsavedWarningModalProps {
<<<<<<< HEAD
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  overlayStyle?: React.CSSProperties;
}

const UnsavedWarningModal: React.FC<UnsavedWarningModalProps> = ({
  show, onConfirm, onCancel, overlayStyle,
}) => {
  if (!show) return null;

  return (
    <div className="ps-overlay" style={{ zIndex: 25000, ...overlayStyle }}>
      <div className="ps-modal-dark">

        <div className="ps-modal-dark-header">
          <svg width="36" height="34" viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <polygon points="20,2 38,34 2,34" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round" />
            <text x="20" y="29" textAnchor="middle" fontSize="17" fontWeight="900" fill="#1c1007" fontFamily="Arial, sans-serif">!</text>
          </svg>
          <span className="ps-modal-dark-title">Unsaved Changes</span>
        </div>

        <p className="ps-modal-dark-body">
          You have unsaved changes to this synoptic report. If you leave now your edits will be lost.
        </p>
        <p className="ps-modal-dark-hint">
          Use <strong>Save Draft</strong> at the bottom of the page to preserve your work.
        </p>

        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onCancel}>
            Stay on Page
          </button>
          <button type="button" className="ps-btn-amber" onClick={onConfirm}>
            Leave Without Saving
          </button>
        </div>

=======
  show:            boolean;
  dirtySections?:  string[];           // which sections have unsaved changes
  onSaveAndLeave?: () => void;         // save draft then navigate
  onConfirm:       () => void;         // discard and navigate
  onCancel:        () => void;         // stay on page
}

const UnsavedWarningModal: React.FC<UnsavedWarningModalProps> = ({
  show, dirtySections = [], onSaveAndLeave, onConfirm, onCancel,
}) => {
  if (!show) return null;

  const hasSections = dirtySections.length > 0;

  return (
    <div
      data-capture-hide="true"
      className="ps-overlay"
      style={{ zIndex: 9500 }}
      onClick={onCancel}
    >
      <div
        className="ps-modal-dark ps-modal-dark--narrow ps-modal-dark--centered"
        onClick={e => e.stopPropagation()}
      >
        <div className="ps-modal-dark-emoji">⚠️</div>

        <div className="ps-modal-dark-header ps-modal-dark-header--center">
          <span className="ps-modal-dark-title">Unsaved Changes</span>
        </div>

        <p className="ps-modal-dark-body ps-modal-dark-body--center">
          You have unsaved changes that will be lost if you leave now.
        </p>

        {/* Dirty section list */}
        {hasSections && (
          <div className="ps-unsaved-sections">
            {dirtySections.map(s => (
              <div key={s} className="ps-unsaved-section-row">
                <span className="ps-unsaved-section-dot">●</span>
                <span className="ps-unsaved-section-label">{s}</span>
              </div>
            ))}
          </div>
        )}

        <div className="ps-modal-dark-footer ps-modal-dark-footer--col">
          {/* Save & Leave — primary action */}
          {onSaveAndLeave && (
            <button
              className="ps-btn-primary ps-modal-dark-footer__flex-btn"
              onClick={onSaveAndLeave}
            >
              💾 Save Draft & Leave
            </button>
          )}

          {/* Discard & Leave */}
          <button
            className="ps-btn-ghost-dark ps-modal-dark-footer__flex-btn ps-unsaved-discard-btn"
            onClick={onConfirm}
          >
            Discard & Leave
          </button>

          {/* Stay */}
          <button
            className="ps-btn-secondary ps-modal-dark-footer__flex-btn"
            onClick={onCancel}
          >
            Stay on Page
          </button>
        </div>
>>>>>>> upstream/main
      </div>
    </div>
  );
};

export default UnsavedWarningModal;
