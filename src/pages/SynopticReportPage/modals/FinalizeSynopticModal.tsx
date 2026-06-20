import React from 'react';
type SynopticReport = any;

interface FinalizeSynopticModalProps {
  show: boolean;
  overlayStyle?: React.CSSProperties;
  activeSynoptic: SynopticReport | null;
  finalizePassword: string;
  finalizeError: string;
  finalizeAndNext: boolean;
  onClose: () => void;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

const FinalizeSynopticModal: React.FC<FinalizeSynopticModalProps> = ({
  show, activeSynoptic, finalizePassword, finalizeError,
  finalizeAndNext, onClose, onPasswordChange, onConfirm,
}) => {
  if (!show) return null;

  return (
    <div data-capture-hide="true" className="ps-overlay" style={{ zIndex: 22000 }}>
      <div className="ps-modal-dark ps-modal-dark--narrow ps-modal-dark--centered">

        <div className="ps-modal-dark-emoji">🔒</div>

        <div className="ps-modal-dark-header ps-modal-dark-header--center">
          <span className="ps-modal-dark-title">
            Finalize {activeSynoptic?.title ?? 'Synoptic Report'}
          </span>
        </div>

        <p className="ps-modal-dark-body ps-modal-dark-body--center">
          Finalizing this report locks it for editing and creates an audit entry.
          <br />Enter your password to confirm.
        </p>

        <input
          type="password"
          autoFocus
          value={finalizePassword}
          onChange={e => onPasswordChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm()}
          placeholder="Your password"
          className={"ps-modal-dark-input" + (finalizeError ? " ps-modal-dark-input--error" : "")}
        />

        {finalizeError && (
          <p className="ps-modal-dark-field-error">
            {finalizeError}
          </p>
        )}

        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch">
          <button className="ps-btn-ghost-dark ps-modal-dark-footer__flex-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="ps-btn-primary ps-modal-dark-footer__flex-btn"
          >
            🔒 Confirm &amp; Finalize{finalizeAndNext ? ' →' : ''}
          </button>
        </div>

      </div>
    </div>
  );
};

export default FinalizeSynopticModal;
