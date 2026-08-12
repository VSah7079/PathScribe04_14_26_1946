// src/components/Common/SessionSupersededNotice.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown on LoginPage.tsx after a same-browser session-supersede logout —
// not on ProtectedRoute.tsx itself, since that component unmounts and
// redirects to /login the moment logout() runs, giving no time for a modal
// rendered there to actually be seen. LoginPage.tsx checks for the real
// marker this leaves behind (see AuthContext.tsx's logout wiring) and
// renders this once, on arrival.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import '@/pathscribe.css';

interface SessionSupersededNoticeProps {
  onDismiss: () => void;
}

const SessionSupersededNotice: React.FC<SessionSupersededNoticeProps> = ({ onDismiss }) => (
  <div className="ps-overlay">
    <div className="ps-modal-dark ps-modal-sm">
      <span className="ps-modal-dark-title" style={{ display: 'block', marginBottom: 10 }}>
        Signed out — logged in elsewhere
      </span>
      <p className="ps-modal-dark-body" style={{ marginBottom: 24 }}>
        You were signed out here because this account was signed in from another tab or window on this
        browser. Any unsaved work in this tab was preserved — sign back in and it'll be offered for review
        on the case you were working on.
      </p>
      <div className="ps-modal-dark-footer">
        <button type="button" className="ps-btn-amber" onClick={onDismiss}>
          OK
        </button>
      </div>
    </div>
  </div>
);

export default SessionSupersededNotice;
