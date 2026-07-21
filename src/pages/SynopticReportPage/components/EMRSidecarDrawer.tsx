// src/pages/SynopticReportPage/components/EMRSidecarDrawer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Replaces EMRSidecarModal.tsx (the earlier floating/draggable version) --
// this now matches the app's established drawer convention (see
// .ps-drawer / .ps-msg-drawer in pathscribe.css), sliding in from the
// right edge rather than floating as a movable window. Chosen over the
// "try window.open(), fall back to embedded" hybrid: a drawer, like the
// modal before it, is fundamentally clipped to the browser's own
// viewport either way, so second-monitor dragging was never actually on
// the table once a drawer was the target UX -- this is a deliberate,
// confirmed trade of that capability for a cleaner, more familiar
// interaction consistent with Messages/Notes elsewhere in the app.
//
// TWO IMPORTANT DESIGN DECISIONS, WORKING TOGETHER:
//
// 1. ALWAYS MOUNTED. This component renders its content unconditionally
//    -- `isOpen` only controls a CSS transform (slid on/off screen) and
//    pointer-events, never an early `return null`. Today, with
//    MockEMRPage's hardcoded synthetic data, this has no real benefit.
//    It matters once real EMR integration exists: SMART on FHIR auth has
//    genuine latency (redirect, authenticate, token exchange), and
//    unmounting on every close would mean re-authenticating on every
//    single open. Staying mounted keeps a future real session warm
//    across opens within the same case.
//
// 2. THE INNER CONTENT IS KEYED ON patientId. This is the structural
//    guarantee against ever showing a stale/wrong patient's data: React
//    treats a changed `key` as a completely different element, and is
//    REQUIRED to fully unmount the old instance and mount a fresh one --
//    not a convention that well-behaved code needs to honor, a hard
//    guarantee enforced by React itself. This is what makes decision #1
//    safe: the OUTER drawer shell can stay warm indefinitely, while the
//    INNER content is forcibly, completely reset the instant the patient
//    changes, with zero possibility of old state leaking through no
//    matter how complex the real embedded content becomes later.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import MockEMRPage from '@/pages/MockEMRPage';

interface EMRSidecarDrawerProps {
  isOpen:    boolean;
  patientId: string;
  onClose:   () => void;
}

const EMRSidecarDrawer: React.FC<EMRSidecarDrawerProps> = ({ isOpen, patientId, onClose }) => {
  return (
    <>
      {/* Backdrop -- unlike the drawer itself, safe to conditionally
          render, since it has no state worth preserving while closed. */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', top: 70, right: 0, bottom: 0, left: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1199,
          }}
        />
      )}

      {/* Drawer shell -- ALWAYS rendered. Visibility is purely CSS. */}
      <div
        style={{
          position: 'fixed', top: 70, right: 0, bottom: 0,
          width: 'min(70vw, 1400px)',
          background: '#0b1120',
          borderLeft: '1px solid rgba(148,163,184,0.4)',
          zIndex: 1200,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isOpen ? 'auto' : 'none',
          boxShadow: isOpen ? '-8px 0 32px rgba(0,0,0,0.4)' : 'none',
        }}
        aria-hidden={!isOpen}
      >
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(51,65,85,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🌐 EMR Sidecar
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer', padding: '2px 8px', lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {/* key={patientId} -- see file header. This is what makes it
              safe for the drawer shell above to stay mounted forever. */}
          <MockEMRPage key={patientId} patientId={patientId} />
        </div>
      </div>
    </>
  );
};

export default EMRSidecarDrawer;
