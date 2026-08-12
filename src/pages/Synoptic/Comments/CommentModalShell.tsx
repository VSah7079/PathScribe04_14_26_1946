<<<<<<< HEAD
import React, { useState, useRef, useEffect } from 'react';
import '../../../pathscribe.css';

=======
import React from 'react';
import '../../../pathscribe.css';

// Shared by both Case and Specimen comment modals -- one remembered
// position for "the comment dialog" generally, not split per-context.
// Same persistence pattern already used for the EMR companion window:
// load on mount, save on drag-end, clamp against the CURRENT viewport
// (not just whatever was true when it was last dragged) so it can never
// get stranded off-screen if the window/monitor changes.
const STORAGE_KEY = 'ps-cmnt-modal-pos';

interface Pos { x: number; y: number; }

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    // Offset is from viewport center. Clamp so the modal's header stays
    // reachable even if this position was saved on a larger screen.
    const maxX = window.innerWidth  * 0.35;
    const maxY = window.innerHeight * 0.35;
    return {
      x: Math.min(Math.max(parsed.x, -maxX), maxX),
      y: Math.min(Math.max(parsed.y, -maxY), maxY),
    };
  } catch {
    return null;
  }
}

function savePos(pos: Pos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch { /* ignore quota errors */ }
}

>>>>>>> upstream/main
const CommentModalShell: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
<<<<<<< HEAD
  editorMode?: boolean;  // removes body padding so ruler renders flush
}> = ({ title, subtitle, onClose, children, footerLeft, editorMode }) => {
  // ── Drag state ────────────────────────────────────────────────────────────
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const dragging = React.useRef(false);
  const dragStart = React.useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking the close button
=======
  editorMode?: boolean;
}> = ({ title, subtitle, onClose, children, footerLeft, editorMode }) => {
  const [pos, setPos] = React.useState<Pos | null>(() => loadPos());
  const dragging   = React.useRef(false);
  const dragStart  = React.useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onHeaderMouseDown = (e: React.MouseEvent) => {
>>>>>>> upstream/main
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragging.current = true;
    const current = pos ?? { x: 0, y: 0 };
    dragStart.current = { mx: e.clientX, my: e.clientY, px: current.x, py: current.y };
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
<<<<<<< HEAD
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // When pos is null the modal sits centred via flexbox (default).
  // Once dragged, we switch to absolute positioning.
=======
      setPos({ x: dragStart.current.px + (e.clientX - dragStart.current.mx), y: dragStart.current.py + (e.clientY - dragStart.current.my) });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setPos(p => { if (p) savePos(p); return p; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

>>>>>>> upstream/main
  const isPositioned = pos !== null;

  return (
    <div
      data-capture-hide="true"
<<<<<<< HEAD
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        background: isPositioned ? 'transparent' : 'rgba(0,0,0,0.55)',
        backdropFilter: isPositioned ? 'none' : 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Once dragging has started, pointer events on the backdrop are off
        // so the backdrop-click-to-close doesn't fire while repositioning
        pointerEvents: 'auto',
      }}
    >
      {/* Invisible full-screen close layer — only active before first drag */}
      {!isPositioned && (
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      )}

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: isPositioned ? 'fixed' : 'relative',
          ...(isPositioned
            ? {
                left: `calc(50% + ${pos!.x}px)`,
                top:  `calc(50% + ${pos!.y}px)`,
                transform: 'translate(-50%, -50%)',
              }
            : {}),
          width: '75vw', height: '85vh',
          background: 'white', borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1,
          // Smooth drop shadow when dragging for depth feel
          transition: dragging.current ? 'none' : 'box-shadow 0.2s',
        }}
      >
        {/* Header — drag handle */}
        <div
          onMouseDown={onHeaderMouseDown}
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexShrink: 0,
            cursor: 'grab',
            background: '#f8fafc',
            borderRadius: '16px 16px 0 0',
            userSelect: 'none',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: subtitle ? '4px' : 0 }}>
              {/* Drag grip dots */}
              <span style={{ color: '#cbd5e1', fontSize: '14px', letterSpacing: '1px', flexShrink: 0 }}>⠿</span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
            </div>
            {subtitle && <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '22px' }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px', lineHeight: 1, padding: '2px 0 0 16px', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#475569'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: editorMode ? '0' : '20px 24px', display: 'flex', flexDirection: 'column', gap: editorMode ? '0' : '16px' }}>
=======
      className={`ps-cmnt-overlay${isPositioned ? '' : ' ps-cmnt-overlay--dimmed'}`}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="ps-cmnt-modal"
        style={isPositioned ? {
          position: 'fixed',
          left: `calc(50% + ${pos!.x}px)`,
          top:  `calc(50% + ${pos!.y}px)`,
          transform: 'translate(-50%, -50%)',
        } : { position: 'relative' }}
      >
        {/* Header */}
        <div className="ps-cmnt-header" onMouseDown={onHeaderMouseDown}>
          <div className="ps-cmnt-header-left">
            <div className="ps-cmnt-header-title-row">
              <span className="ps-cmnt-grip">⠿</span>
              <h3 className="ps-cmnt-title">{title}</h3>
            </div>
            {subtitle && <div className="ps-cmnt-subtitle">{subtitle}</div>}
          </div>
          <button className="ps-cmnt-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className={editorMode ? 'ps-cmnt-body--editor' : 'ps-cmnt-body'}>
>>>>>>> upstream/main
          {children}
        </div>

        {/* Footer */}
<<<<<<< HEAD
        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#f8fafc' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '60%' }}>{footerLeft}</div>
          <button
            onClick={onClose}
            style={{ padding: '8px 22px', background: '#0891B2', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0e7490'}
            onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}
          >Save</button>
=======
        <div className="ps-cmnt-footer">
          <div className="ps-cmnt-footer-note">{footerLeft}</div>
          <button className="ps-cmnt-save-btn" onClick={onClose}>Save</button>
>>>>>>> upstream/main
        </div>
      </div>
    </div>
  );
};

<<<<<<< HEAD
// ─── ReportCommentModal ───────────────────────────────────────────────────────

=======
>>>>>>> upstream/main
export { CommentModalShell };
