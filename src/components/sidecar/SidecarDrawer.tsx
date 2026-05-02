// PathScribe — SidecarDrawer
// Single component, two layout modes controlled by the layoutMode prop:
//
//   overlay — absolute positioning, slides over the worklist (Phase II)
//   docked  — relative positioning, pushes report columns (Phase III)
//
// Internally: Navigator pane (left 30%) + Display pane (right 70%).
// State (selected flag, open/closed) lives in SidecarContext so it
// persists across route changes.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { resultService, flagService, caseService } from '@/services';
import { useNavigate } from 'react-router-dom';
import { Flag } from '@/services/flags/IFlagService';
import { ComputationalResult } from '@/types/smarttag.types';
import { useSidecar, SidecarLayoutMode } from '@/contexts/SidecarContext';
import SidecarNavigator from './SidecarNavigator';
import SidecarDisplay   from './SidecarDisplay';
import { COMP_EVENT, COMP_AUDIT } from '@/constants/computationalActions';
import { useAuditLog } from '@/components/Audit/useAuditLog';

// ─── Keyframe injection ───────────────────────────────────────────────────────

const STYLE_ID = 'ps-sidecar-keyframes';

function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id    = STYLE_ID;
  style.textContent = `
    @keyframes ps-sidecar-in  { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes ps-sidecar-out { from { opacity: 1; transform: translateX(0);    } to { opacity: 0; transform: translateX(12px); } }
  `;
  document.head.appendChild(style);
}

// ─── Close button ─────────────────────────────────────────────────────────────

const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Close sidecar"
    style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--msg-muted)', padding: '2px 6px',
      borderRadius: 4, lineHeight: 1, fontSize: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--msg-text)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--msg-muted)'; }}
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </button>
);

// ─── Layout config ────────────────────────────────────────────────────────────

interface LayoutStyle {
  container: React.CSSProperties;
  width:     number | string;
}

function layoutStyle(mode: SidecarLayoutMode, width: number): LayoutStyle {
  if (mode === 'overlay') {
    return {
      container: {
        position:  'absolute',
        top:       0,
        right:     0,
        height:    '100%',
        zIndex:    200,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      },
      width,
    };
  }
  // docked — sits in the grid, pushes columns
  return {
    container: {
      position:   'relative',
      height:     '100%',
      flexShrink: 0,
      borderLeft: '1px solid var(--msg-border)',
    },
    width,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** All active Computational flags for the current case. */
  computationalFlags: Flag[];

  /** Width of the drawer in px. Defaults: 760 overlay, 640 docked. */
  width?: number;

  /**
   * Optional callback — fired when SidecarDisplay receives a result.
   * Used by SynopticLayout to keep SynopticSidebar status dots live
   * without independent fetches per sidebar row.
   */
  onResultLoaded?: (flagId: string, result: ComputationalResult) => void;
}

// ─── SidecarDrawer ────────────────────────────────────────────────────────────

const SidecarDrawer: React.FC<Props> = ({ computationalFlags, width, onResultLoaded: onResultLoadedProp }) => {
  const { isOpen, layoutMode, selectedFlag, caseId, caseFlags: contextCaseFlags, selectFlag, close } = useSidecar();
  const { log } = useAuditLog();

  // Case-specific computational flags — fetched from services when drawer opens
  const [activeFlags, setActiveFlags] = useState<Flag[]>([]);
  const navigate = useNavigate();

  const drawerRef  = useRef<HTMLDivElement>(null);
  const [visible, setVisible]  = useState(false);
  const [animate, setAnimate]  = useState<'in' | 'out' | 'none'>('none');

  // Results for all flags — populated upfront so Navigator dots show live status.
  const [results, setResults] = useState<Record<string, ComputationalResult | null>>({});

  const handleResultLoaded = useCallback((flagId: string, result: ComputationalResult) => {
    setResults(prev => ({ ...prev, [flagId]: result }));
    onResultLoadedProp?.(flagId, result);
  }, [onResultLoadedProp]);

  // Seed Navigator immediately with the selected flag while the full list loads
  useEffect(() => {
    if (selectedFlag) setActiveFlags(prev => prev.find(f => f.id === selectedFlag.id) ? prev : [selectedFlag]);
  }, [selectedFlag]);

  // Fetch the case's applied flags, match against flag definitions to get
  // only the computational flags actually ordered for this case.
  useEffect(() => {
    if (!caseId || !isOpen) return;
    log(COMP_AUDIT.USE_SIDECAR_OPENED, { caseId, flagId: selectedFlag?.id, source: 'click' });
    Promise.all([
      caseService.getCase(caseId),   // returns Case | undefined directly
      flagService.getAll(),           // returns ServiceResult<Flag[]>
    ]).then(([caseData, flagResult]) => {
      if (!caseData || !flagResult.ok) return;

      // Collect all lisCode values from the case's applied flags
      const lisCodes = new Set<string>();
      const addCode  = (f: any) => { if (f?.lisCode) lisCodes.add(f.lisCode); };

      ((caseData as any).caseFlags     ?? []).forEach(addCode);
      ((caseData as any).specimenFlags ?? []).forEach(addCode);
      ((caseData as any).specimens     ?? []).forEach((sp: any) =>
        (sp.specimenFlags ?? sp.flags ?? []).forEach(addCode)
      );

      const allFlags  = flagResult.data;
      const compFlags = allFlags.filter(f =>
        f.tagClass === 'COMPUTATIONAL' &&
        f.status   === 'Active'        &&
        f.lisCode  && lisCodes.has(f.lisCode)
      );

      // Always include the currently selected flag even if lookup misses
      const selected = selectedFlag;
      if (selected && !compFlags.find(f => f.id === selected.id)) {
        compFlags.unshift(selected);
      }

      setActiveFlags(compFlags.length > 0 ? compFlags : computationalFlags);
    }).catch(() => {});
  }, [caseId, isOpen]);

  // Voice: read result aloud when triggered
  React.useEffect(() => {
    const readResult = () => {
      if (!selectedFlag || !window.speechSynthesis) return;
      const result = results[selectedFlag.id];
      if (!result?.data) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${selectedFlag.name}: no result available yet.`));
        return;
      }
      const lines = Object.entries(result.data)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join('. ');
      const u = new SpeechSynthesisUtterance(`${selectedFlag.name}. ${lines}`);
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      log(COMP_AUDIT.USE_RESULT_READ_ALOUD, { caseId, flagId: selectedFlag.id });
    };
    const nextAssay = () => {
      if (!activeFlags.length) return;
      const idx = activeFlags.findIndex(f => f.id === selectedFlag?.id);
      const next = activeFlags[idx + 1];
      if (next) selectFlag(next);
    };
    const prevAssay = () => {
      if (!activeFlags.length) return;
      const idx = activeFlags.findIndex(f => f.id === selectedFlag?.id);
      const prev = activeFlags[idx - 1];
      if (prev) selectFlag(prev);
    };
    window.addEventListener(COMP_EVENT.READ_RESULT, readResult);
    window.addEventListener(COMP_EVENT.NEXT_ASSAY,  nextAssay);
    window.addEventListener(COMP_EVENT.PREV_ASSAY,  prevAssay);
    return () => {
      window.removeEventListener(COMP_EVENT.READ_RESULT, readResult);
      window.removeEventListener(COMP_EVENT.NEXT_ASSAY,  nextAssay);
      window.removeEventListener(COMP_EVENT.PREV_ASSAY,  prevAssay);
    };
  }, [selectedFlag, results, activeFlags, caseId]);

  // Fetch all flag results when drawer opens so Navigator dots have colour data.
  // Only runs in overlay mode — docked mode fetches via SidecarDisplay individually.
  useEffect(() => {
    if (!isOpen || layoutMode !== 'overlay' || !caseId || activeFlags.length === 0) return;
    activeFlags.forEach(flag => {
      const sourceId = flag.dataSource?.sourceId;
      if (!sourceId) return;
      resultService.getResult(sourceId, caseId)
        .then(result => setResults(prev => ({ ...prev, [flag.id]: result })))
        .catch(() => {});
    });
  }, [isOpen, layoutMode, caseId, activeFlags]);

  // Inject keyframes once.
  useEffect(() => { injectKeyframes(); }, []);

  // Manage open/close animation.
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setAnimate('in');
    } else if (visible) {
      setAnimate('out');
      const t = setTimeout(() => setVisible(false), 180);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Overlay mode: scroll auto-dismiss (keeps UX clean during scroll)
  useEffect(() => {
    if (!isOpen || layoutMode !== 'overlay') return;
    const handleScroll = () => { log(COMP_AUDIT.USE_SIDECAR_CLOSED, { caseId }); close(); };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, layoutMode, close]);

  if (!visible || !caseId) return null;

  const resolvedWidth = width ?? (layoutMode === 'overlay' ? 760 : 640);
  const ls = layoutStyle(layoutMode, resolvedWidth);

  return (
    <>
      {/* Backdrop — sits behind the drawer, captures outside clicks.
          Stops propagation so the row click never fires when dismissing. */}
      {layoutMode === 'overlay' && (
        <div
          aria-hidden="true"
          onClick={e => { e.stopPropagation(); log(COMP_AUDIT.USE_SIDECAR_CLOSED, { caseId }); close(); }}
          style={{
            position: 'fixed',
            inset:    0,
            zIndex:   199,
          }}
        />
      )}
      <div
        ref={drawerRef}
        role="complementary"
        aria-label="Computational data sidecar"
        style={{ zIndex: 200,
        ...ls.container,
        width:           resolvedWidth,
        display:         'flex',
        flexDirection:   'column',
        background:      'var(--ps-navy-left, #0b1120)',
        border:          '0.5px solid var(--msg-border)',
        borderRadius:    layoutMode === 'overlay' ? '8px 0 0 8px' : 0,
        overflow:        'hidden',
        animation:       animate === 'in'
          ? 'ps-sidecar-in  0.18s ease forwards'
          : animate === 'out'
          ? 'ps-sidecar-out 0.18s ease forwards'
          : 'none',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        padding:       '10px 12px 10px 14px',
        borderBottom:  '1px solid rgba(30, 41, 59, 0.9)',
        flexShrink:    0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {layoutMode === 'docked' && selectedFlag ? (
            // Docked: show the selected flag name as the header — sidebar
            // already provides the full list context.
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
              {selectedFlag.name}
            </span>
          ) : (
            <>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--msg-muted)' }}>
                Computational data
              </span>
              <span style={{
                fontSize: 10, fontWeight: 500,
                background:      'var(--msg-surface)',
                color: 'var(--msg-muted)',
                padding: '1px 6px', borderRadius: 99,
                border: '1px solid var(--msg-border)',
              }}>
                Quick peek
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Case link pill — visible in overlay mode so the pathologist can
              navigate directly into the case without closing and returning to
              the worklist first. Matches the .ps-case-link pattern used in
              the messaging drawer. */}
          {caseId && layoutMode === 'overlay' && (
            <button
              className="ps-case-link"
              onClick={() => {
                close();
                navigate(`/case/${caseId}/synoptic`);
              }}
              title={`Open case ${caseId}`}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Open case
            </button>
          )}
          <CloseButton onClick={() => { log(COMP_AUDIT.USE_SIDECAR_CLOSED, { caseId }); close(); }} />
        </div>
      </div>

      {/* ── Body: Navigator + Display ──────────────────────────────────────────
           Overlay (worklist): Navigator shown — pathologist picks the flag here.
           Docked (synoptic):  Navigator hidden — the sidebar already shows the
                               flag list. Display pane takes full width so the
                               result data has maximum breathing room.           */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {layoutMode === 'overlay' && (
          <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid rgba(30,41,59,0.9)', overflowY: 'auto' }}>
            <SidecarNavigator
              flags={activeFlags}
              results={results}
              selectedFlag={selectedFlag}
              onSelect={(flag) => {
                selectFlag(flag);
                log(COMP_AUDIT.USE_RESULT_VIEWED, {
                  caseId, flagId: flag.id, flagName: flag.name,
                  status: results[flag.id]?.status ?? 'PENDING'
                });
              }}
            />
          </div>
        )}

        {selectedFlag ? (
          <SidecarDisplay
            key={selectedFlag.id}    // remount when flag changes to reset scroll
            flag={selectedFlag}
            caseId={caseId}
            onResultLoaded={handleResultLoaded}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: 'var(--msg-muted)', padding: 24, textAlign: 'center',
          }}>
            Select a data source on the left.
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default SidecarDrawer;
