import React from 'react';

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
    if (show && prefillText && !amendmentText) {
      onTextChange(prefillText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const isAmendment = amendmentMode === 'amendment';
  const canSubmit   = amendmentText.trim().length > 0;
  const accentColor = isAmendment ? '#d97706' : '#0891B2';

  return (
    <div data-capture-hide="true" className="ps-overlay" style={{ zIndex: 22000 }} onClick={onClose}>
      <div
        className="ps-modal-dark"
        style={{ width: 'min(540px, 90vw)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mode switch — hidden when triggered by deferred synoptic */}
        {!triggeredBySynopticTitle && (
          <div style={{ display: 'flex', gap: 8 }}>
            {(['amendment', 'addendum'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                style={{
                  padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', border: '1.5px solid',
                  background: amendmentMode === mode ? (mode === 'amendment' ? '#d97706' : '#0891B2') : 'transparent',
                  color:      amendmentMode === mode ? '#fff' : (mode === 'amendment' ? '#d97706' : '#0891B2'),
                  borderColor: mode === 'amendment' ? '#d97706' : '#0891B2',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'amendment' ? '✏️ Amendment' : '📎 Addendum'}
              </button>
            ))}
          </div>
        )}

        {/* Deferred synoptic context banner */}
        {triggeredBySynopticTitle && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)', borderRadius: 8,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🧪</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0891B2', marginBottom: 2 }}>
                Deferred Synoptic Now Complete
              </div>
              <p className="ps-modal-dark-hint" style={{ margin: 0 }}>
                <strong style={{ color: '#e2e8f0' }}>{triggeredBySynopticTitle}</strong> was deferred at sign-out pending ancillary results.
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
          Applies to <strong style={{ color: '#e2e8f0' }}>{activeSynopticTitle}</strong>.
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
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 8, fontSize: 13,
            lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box', outline: 'none',
            fontFamily: 'inherit', background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.15)', color: '#e2e8f0',
          }}
        />

        <div className="ps-modal-dark-footer" style={{ justifyContent: 'stretch' }}>
          <button className="ps-btn-ghost-dark" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              fontWeight: 700, fontSize: 14,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? accentColor : 'rgba(255,255,255,0.08)',
              color: canSubmit ? '#fff' : '#475569',
              transition: 'background 0.15s',
            }}
          >
            {isAmendment ? '✏️ Submit Amendment' : '📎 Submit Addendum'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AmendmentModal;
