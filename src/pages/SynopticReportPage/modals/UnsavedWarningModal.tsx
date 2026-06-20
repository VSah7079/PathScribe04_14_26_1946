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
import React from 'react';
import '@/pathscribe.css';

interface UnsavedWarningModalProps {
  show:            boolean;
  overlayStyle?:   React.CSSProperties;
  dirtySections?:  string[];           // which sections have unsaved changes
  onSaveAndLeave?: () => void;         // save draft then navigate
  onConfirm:       () => void;         // discard and navigate
  onCancel:        () => void;         // stay on page
}

const UnsavedWarningModal: React.FC<UnsavedWarningModalProps> = ({
  show, overlayStyle, dirtySections = [], onSaveAndLeave, onConfirm, onCancel,
}) => {
  if (!show) return null;

  const hasSections = dirtySections.length > 0;

  return (
    <div
      data-capture-hide="true"
      className="ps-overlay"
      style={{ zIndex: 40000, ...overlayStyle }}
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
      </div>
    </div>
  );
};

export default UnsavedWarningModal;
