import React from 'react';
import '../../../pathscribe.css';

interface AmendmentModalProps {
  show: boolean;
  overlayStyle?: React.CSSProperties;
  amendmentMode: 'amendment' | 'addendum';
  amendmentText: string;
  activeSynopticTitle: string;
  onModeChange: (mode: 'amendment' | 'addendum') => void;
  onTextChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  triggeredBySynopticTitle?: string;
  prefillText?: string;
}

const AmendmentModal: React.FC<AmendmentModalProps> = ({
  show, amendmentMode, amendmentText, activeSynopticTitle,
  onModeChange, onTextChange, onClose, onSubmit,
  triggeredBySynopticTitle, prefillText,
}) => {
  React.useEffect(() => {
    if (show && prefillText && !amendmentText) onTextChange(prefillText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const isAmendment = amendmentMode === 'amendment';
  const canSubmit   = amendmentText.trim().length > 0;
  // Dynamic — depends on mode at runtime
  const accentColor = isAmendment ? '#d97706' : '#0891B2';

  return (
    <div data-capture-hide="true" className="ps-overlay" style={{ zIndex: 22000 }}>
      <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>

        {!triggeredBySynopticTitle && (
          <div className="ps-amendment-mode-row">
            {(['amendment', 'addendum'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                className={`ps-amendment-mode-btn${amendmentMode === mode ? ' active' : ''} ps-amendment-mode-btn--${mode}`}
              >
                {mode === 'amendment' ? '✏️ Amendment' : '📎 Addendum'}
              </button>
            ))}
          </div>
        )}

        {triggeredBySynopticTitle && (
          <div className="ps-amendment-deferred-banner">
            <span className="ps-amendment-deferred-icon">🧪</span>
            <div>
              <div className="ps-amendment-deferred-title">Deferred Synoptic Now Complete</div>
              <p className="ps-modal-dark-hint ps-modal-dark-hint--no-margin">
                <strong className="ps-text-light">{triggeredBySynopticTitle}</strong> was deferred at sign-out pending ancillary results.
                Review the pre-filled amendment text below, edit as needed, and actively submit to issue the amendment.
              </p>
            </div>
          </div>
        )}

        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">
            {isAmendment ? 'Amendment Request' : 'Addendum Request'}
          </span>
        </div>

        <p className="ps-modal-dark-body">
          {isAmendment
            ? 'An amendment is a corrective change to a finalized report. Describe the error and the correction required.'
            : 'An addendum is an official addition to a finalized report. Describe the reason for the addendum and any changes required.'
          }{' '}
          Applies to <strong className="ps-text-light">{activeSynopticTitle}</strong>.
        </p>

        <textarea
          autoFocus
          value={amendmentText}
          onChange={e => onTextChange(e.target.value)}
          placeholder={
            isAmendment
              ? 'Describe the error and the required correction…'
              : 'Describe the reason for the addendum and any changes required…'
          }
          rows={6}
          className="ps-amendment-textarea"
        />

        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch">
          <button className="ps-btn-ghost-dark ps-modal-dark-footer__flex-btn" onClick={onClose}>Cancel</button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={"ps-amendment-submit" + (canSubmit ? "" : " disabled")}
            style={{ background: canSubmit ? accentColor : undefined }}
          >
            {isAmendment ? '✏️ Submit Amendment' : '📎 Submit Addendum'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AmendmentModal;
