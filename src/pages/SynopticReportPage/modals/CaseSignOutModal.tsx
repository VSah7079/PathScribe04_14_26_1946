import React from 'react';

interface CaseSignOutModalProps {
  show: boolean;
  overlayStyle?: React.CSSProperties;
  accession: string;
  signOutUser: string;
  signOutPassword: string;
  signOutError: string;
  onClose: () => void;
  onUserChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  background: 'rgba(255,255,255,0.05)',
  border: `2px solid ${hasError ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
  color: '#e2e8f0',
});

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#cbd5e1',
  display: 'block', marginBottom: 4,
};

const CaseSignOutModal: React.FC<CaseSignOutModalProps> = ({
  show, accession, signOutUser, signOutPassword, signOutError,
  onClose, onUserChange, onPasswordChange, onConfirm,
}) => {
  if (!show) return null;

  return (
    <div data-capture-hide="true" className="ps-overlay" style={{ zIndex: 22000 }}>
      <div className="ps-modal-dark" style={{ textAlign: 'center', width: 'min(480px, 90vw)' }}>

        <div style={{ fontSize: 44, marginBottom: 4 }}>✍️</div>

        <div className="ps-modal-dark-header" style={{ justifyContent: 'center' }}>
          <span className="ps-modal-dark-title">Sign Out Case</span>
        </div>

        <p className="ps-modal-dark-body" style={{ textAlign: 'center' }}>
          All synoptic reports for <strong data-phi="accession">Case {accession}</strong> have been finalized.
        </p>
        <p className="ps-modal-dark-hint" style={{ textAlign: 'center' }}>
          Enter your username and password to sign out this case from PathScribe.
        </p>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              autoFocus
              value={signOutUser}
              onChange={e => onUserChange(e.target.value)}
              placeholder="Your username"
              style={inputStyle(!!signOutError)}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={signOutPassword}
              onChange={e => onPasswordChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onConfirm()}
              placeholder="Your password"
              style={inputStyle(!!signOutError)}
            />
          </div>
          {signOutError && (
            <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{signOutError}</p>
          )}
        </div>

        <div className="ps-modal-dark-footer" style={{ justifyContent: 'stretch' }}>
          <button className="ps-btn-ghost-dark" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#047857', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#065f46'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#047857'; }}
          >
            ✍️ Sign Out Case
          </button>
        </div>

      </div>
    </div>
  );
};

export default CaseSignOutModal;
