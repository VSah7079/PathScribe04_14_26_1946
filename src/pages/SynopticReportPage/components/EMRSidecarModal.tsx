// src/pages/SynopticReportPage/components/EMRSidecarModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the previous window.open()-based "EMR Sidecar" popup window.
// Two real problems with that approach: (1) some hospital/enterprise IT
// policies lock down popup windows more aggressively than a normal
// browser's own popup blocker, independent of it being tied to a direct
// user click; (2) it required its own reuse/refocus and auto-close-on-
// patient-change bookkeeping via a raw Window ref.
//
// Renders MockEMRPage directly as a normal React component -- NOT an
// iframe. The EMR content is same-origin and part of this same bundle,
// so there's no reason to pay for a second document/JS context the way
// an iframe would require; this is a straightforward modal render.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import MockEMRPage from '@/pages/MockEMRPage';

interface EMRSidecarModalProps {
  isOpen:    boolean;
  patientId: string;
  onClose:   () => void;
}

const EMRSidecarModal: React.FC<EMRSidecarModalProps> = ({ isOpen, patientId, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="ps-overlay" style={{ zIndex: 9000 }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="ps-modal-dark"
        style={{
          width: 'min(1100px, 92vw)',
          height: 'min(750px, 88vh)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🌐 EMR Sidecar
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', padding: '2px 8px', lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <MockEMRPage patientId={patientId} />
        </div>
      </div>
    </div>
  );
};

export default EMRSidecarModal;
