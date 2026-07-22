import React from 'react';

interface LogoutWarningModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onLogout: () => void;
}

const LogoutWarningModal: React.FC<LogoutWarningModalProps> = ({ isOpen, onClose, onLogout }) => {
  if (!isOpen) return null;
  return (
    <div className="ps-overlay" tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="ps-modal-dark" style={{ width: 400, textAlign: 'center' }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <span className="ps-modal-dark-title">Unsaved Data</span>
        <p className="ps-modal-dark-body">
          You have an active session with unsaved changes. Logging out now will discard your current progress.
        </p>
        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch" style={{ flexDirection: 'column' }}>
          <button className="ps-btn-primary" onClick={onClose} autoFocus style={{ width: '100%' }}>
            ← Return to Page
          </button>
          <button className="ps-btn-red" onClick={onLogout} style={{ width: '100%' }}>
            Log Out & Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutWarningModal;
