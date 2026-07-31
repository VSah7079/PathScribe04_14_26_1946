import React from 'react';
import '../../../pathscribe.css';

interface CaseSignOutModalProps {
  show: boolean;
  accession: string;
  signOutUser: string;
  signOutPassword: string;
  signOutError: string;
  onClose: () => void;
  onUserChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  /** True when this case was released by a resident and is now
   *  genuinely being countersigned, not just a routine sign-out. */
  isCountersign?: boolean;
  residentName?: string;
  countersignFeedback?: string;
  onCountersignFeedbackChange?: (value: string) => void;
}

const CaseSignOutModal: React.FC<CaseSignOutModalProps> = ({
  show, accession, signOutUser, signOutPassword, signOutError,
  onClose, onUserChange, onPasswordChange, onConfirm,
  isCountersign, residentName, countersignFeedback, onCountersignFeedbackChange,
}) => {
  if (!show) return null;

  return (
    <div data-capture-hide="true" className="ps-overlay">
      <div className="ps-modal-dark ps-modal-dark--sm ps-modal-dark--centered">

        <div className="ps-modal-dark-emoji">{isCountersign ? '🎓' : '✍️'}</div>

        <div className="ps-modal-dark-header ps-modal-dark-header--center">
          <span className="ps-modal-dark-title">{isCountersign ? 'Countersign Case' : 'Sign Out Case'}</span>
        </div>

        <p className="ps-modal-dark-body ps-modal-dark-body--center">
          {isCountersign
            ? <>Released by <strong className="ps-text-light">{residentName ?? 'the resident'}</strong> for your countersign — <strong className="ps-text-light" data-phi="accession">Case {accession}</strong>.</>
            : <>All synoptic reports for <strong className="ps-text-light" data-phi="accession">Case {accession}</strong> have been finalized.</>}
        </p>
        <p className="ps-modal-dark-hint ps-modal-dark-hint--center">
          Enter your username and password to sign out this case from PathScribe.
        </p>

        {isCountersign && (
          <div className="ps-conf-form-field" style={{ marginBottom: 12 }}>
            <label className="ps-modal-dark-label">Feedback for {residentName ?? 'the resident'} — optional</label>
            <textarea
              className="ps-conf-input ps-conf-textarea"
              value={countersignFeedback ?? ''}
              onChange={e => onCountersignFeedbackChange?.(e.target.value)}
              placeholder="Targeted feedback — captured here at countersign, not a separate note later."
            />
          </div>
        )}

        <div className="ps-modal-dark-fields">
          <div>
            <label className="ps-modal-dark-label">Username</label>
            <input
              type="text"
              autoFocus
              value={signOutUser}
              onChange={e => onUserChange(e.target.value)}
              placeholder="Your username"
              className={`ps-modal-dark-input${signOutError ? ' ps-modal-dark-input--error' : ''}`}
            />
          </div>
          <div>
            <label className="ps-modal-dark-label">Password</label>
            <input
              type="password"
              value={signOutPassword}
              onChange={e => onPasswordChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onConfirm()}
              placeholder="Your password"
              className={`ps-modal-dark-input${signOutError ? ' ps-modal-dark-input--error' : ''}`}
            />
          </div>
          {signOutError && <p className="ps-modal-dark-field-error">{signOutError}</p>}
        </div>

        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch">
          <button className="ps-btn-ghost-dark ps-modal-dark-footer__flex-btn" onClick={onClose}>Cancel</button>
          <button onClick={onConfirm} className="ps-btn-green ps-modal-dark-footer__flex-btn">✍️ Sign Out Case</button>
        </div>

      </div>
    </div>
  );
};

export default CaseSignOutModal;
