// src/hooks/usePreviewChannel.ts
// ─────────────────────────────────────────────────────────────────────────────
// BroadcastChannel hook for live report preview sync.
//
// The draft editor (sender) broadcasts orchSections + caseData on every change.
// The preview window (receiver) listens and re-renders.
//
// Usage — sender (SynopticReportPage):
//   const { broadcast, openPreviewWindow, isPreviewOpen } = usePreviewChannel(caseId);
//   useEffect(() => { broadcast(orchSections, caseData); }, [orchSections]);
//
// Usage — receiver (ReportPreviewPage):
//   const { sections, caseData, lastUpdated } = usePreviewChannel(caseId, true);
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type { OrchestratorSection } from '@/pages/SynopticReportPage/components/OrchestratorSectionEditor';
import type { Case } from '@/types/case/Case';

export interface PreviewMessage {
  type:        'SECTIONS_UPDATE' | 'PING' | 'PONG' | 'CLOSE' | 'GEOMETRY';
  caseId:      string;
  sections?:   OrchestratorSection[];
  caseData?:   Case | null;
  geometry?:   { width: number; height: number; left: number; top: number };
  timestamp:   number;
}

const CHANNEL_PREFIX = 'ps_report_preview_';

interface SenderResult {
  broadcast:        (sections: OrchestratorSection[], caseData: Case | null) => void;
  openPreviewWindow:(caseId: string) => void;
  isPreviewOpen:    boolean;
}

interface ReceiverResult {
  sections:    OrchestratorSection[];
  caseData:    Case | null;
  lastUpdated: Date | null;
  isConnected: boolean;
}

// ── Window geometry helpers ──────────────────────────────────────────────────
const GEOMETRY_KEY = 'ps_preview_window_geometry';

interface WindowGeometry {
  width: number;
  height: number;
  left: number;
  top: number;
}

function saveGeometry(g: WindowGeometry) {
  // Validate before saving — ignore zero/invalid values
  if (g.width < 200 || g.height < 200) return;
  try { localStorage.setItem(GEOMETRY_KEY, JSON.stringify(g)); } catch { /* ignore */ }
}

// Called by sender to snapshot window geometry directly
function snapshotWindowGeometry(win: Window): WindowGeometry | null {
  try {
    return {
      width:  win.outerWidth  || 960,
      height: win.outerHeight || 1100,
      left:   win.screenX     ?? (win as any).screenLeft ?? 100,
      top:    win.screenY     ?? (win as any).screenTop  ?? 60,
    };
  } catch { return null; }
}

function loadGeometry(): WindowGeometry {
  const defaults: WindowGeometry = { width: 960, height: 1100, left: 100, top: 60 };
  try {
    const stored = localStorage.getItem(GEOMETRY_KEY);
    if (!stored) return defaults;
    const g = JSON.parse(stored) as WindowGeometry;

    // Clamp to visible screen — handles second-monitor-at-home scenario.
    // If stored position would be off-screen, reset to safe defaults.
    const screenW = window.screen.width  || 1920;
    const screenH = window.screen.height || 1080;
    // Allow positions up to 4× screen width to support wide multi-monitor setups.
    // Only clamp if position is truly unreachable (would be invisible on any config).
    const safeLeft = (g.left > -(screenW * 2) && g.left < screenW * 4) ? g.left : 100;
    const safeTop  = (g.top  > -100           && g.top  < screenH * 2) ? g.top  : 60;
    const safeW    = Math.min(Math.max(g.width,  600), screenW);
    const safeH    = Math.min(Math.max(g.height, 600), screenH);

    return { width: safeW, height: safeH, left: safeLeft, top: safeTop };
  } catch { return defaults; }
}

function buildWindowFlags(g: WindowGeometry): string {
  return `width=${g.width},height=${g.height},left=${g.left},top=${g.top},resizable=yes,scrollbars=yes`;
}

// ── Single preview window name — ensures only one preview exists at a time ───
// Using a fixed name means window.open() reuses the same window across cases.
// When caseId changes, we navigate the existing window to the new case URL.
const PREVIEW_WINDOW_NAME = 'ps_report_preview';

// Session-level flag — if popups are blocked once, don't keep trying.
// Resets on full page reload. Stored in sessionStorage so it persists
// across case navigation without persisting across browser sessions.
const POPUP_BLOCKED_KEY = 'ps_preview_popup_blocked';

function isPopupBlocked(): boolean {
  return sessionStorage.getItem(POPUP_BLOCKED_KEY) === 'true';
}
function markPopupBlocked(): void {
  sessionStorage.setItem(POPUP_BLOCKED_KEY, 'true');
}

// ── Sender hook (draft editor) ────────────────────────────────────────────────
export function usePreviewSender(caseId: string | null): SenderResult {
  const channelRef    = useRef<BroadcastChannel | null>(null);
  const windowRef     = useRef<Window | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    const ch = new BroadcastChannel(`${CHANNEL_PREFIX}${caseId}`);
    channelRef.current = ch;

    ch.onmessage = (e: MessageEvent<PreviewMessage>) => {
      if (e.data.type === 'PONG') setIsPreviewOpen(true);
      if (e.data.type === 'CLOSE') {
        setIsPreviewOpen(false);
        windowRef.current = null;
      }
      // Save geometry when preview window reports it
      if (e.data.type === 'GEOMETRY' && e.data.geometry) {
        saveGeometry(e.data.geometry);
      }
    };

    // Ping to check if preview window is already open
    ch.postMessage({ type: 'PING', caseId, timestamp: Date.now() } satisfies PreviewMessage);

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [caseId]);

  // Poll to detect window closed AND save geometry while open
  useEffect(() => {
    const interval = setInterval(() => {
      const win = windowRef.current;
      if (!win) return;
      if (win.closed) {
        // Save final geometry before losing reference
        setIsPreviewOpen(false);
        windowRef.current = null;
      } else {
        // Save current geometry while window is alive
        const geo = snapshotWindowGeometry(win);
        if (geo) saveGeometry(geo);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const broadcast = useCallback((sections: OrchestratorSection[], caseData: Case | null) => {
    if (!channelRef.current || !caseId) return;
    channelRef.current.postMessage({
      type: 'SECTIONS_UPDATE', caseId, sections, caseData, timestamp: Date.now(),
    } satisfies PreviewMessage);
  }, [caseId]);

  const openPreviewWindow = useCallback((id: string) => {
    // Don't auto-retry if popups were blocked this session.
    // User can still manually click the 📋 button to try again
    // (in case they've since allowed popups in browser settings).
    if (isPopupBlocked() && !id) return;
    const url = `/report-preview/${id}`;

    // If window exists and is open — navigate it to the new case (prevents two cases)
    if (windowRef.current && !windowRef.current.closed) {
      if (windowRef.current.location.pathname !== url) {
        windowRef.current.location.href = url;
      }
      windowRef.current.focus();
      setIsPreviewOpen(true);
      return;
    }

    // Open new window at remembered position/size, clamped to visible screen
    const geo = loadGeometry();
    const win = window.open(url, PREVIEW_WINDOW_NAME, buildWindowFlags(geo));
    if (win) {
      windowRef.current = win;
      setIsPreviewOpen(true);
      // Save geometry once window has settled (position available after ~500ms)
      setTimeout(() => {
        const g = snapshotWindowGeometry(win);
        if (g) saveGeometry(g);
      }, 600);
    } else {
      // window.open() returned null — popup blocked (Citrix/VDI or browser policy).
      // Mark so we don't keep auto-attempting on every case navigation.
      markPopupBlocked();
      window.dispatchEvent(new CustomEvent('PATHSCRIBE_PREVIEW_BLOCKED', {
        detail: { url }
      }));
    }
  }, []);

  return { broadcast, openPreviewWindow, isPreviewOpen };
}

// ── Receiver hook (preview window) ────────────────────────────────────────────
export function usePreviewReceiver(caseId: string | null): ReceiverResult {
  const [sections,    setSections]    = useState<OrchestratorSection[]>([]);
  const [caseData,    setCaseData]    = useState<Case | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!caseId) return;
    const ch = new BroadcastChannel(`${CHANNEL_PREFIX}${caseId}`);
    channelRef.current = ch;

    ch.onmessage = (e: MessageEvent<PreviewMessage>) => {
      const msg = e.data;
      if (msg.caseId !== caseId) return;

      if (msg.type === 'PING') {
        // Respond to sender to confirm we're alive
        ch.postMessage({ type: 'PONG', caseId, timestamp: Date.now() } satisfies PreviewMessage);
        setIsConnected(true);
      }

      if (msg.type === 'SECTIONS_UPDATE') {
        if (msg.sections) setSections(msg.sections);
        if (msg.caseData !== undefined) setCaseData(msg.caseData);
        setLastUpdated(new Date(msg.timestamp));
        setIsConnected(true);
      }
    };

    // Announce ourselves to any open sender
    ch.postMessage({ type: 'PONG', caseId, timestamp: Date.now() } satisfies PreviewMessage);

    // Notify sender on close
    const handleUnload = () => {
      ch.postMessage({ type: 'CLOSE', caseId, timestamp: Date.now() } satisfies PreviewMessage);
      ch.close();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      ch.postMessage({ type: 'CLOSE', caseId, timestamp: Date.now() } satisfies PreviewMessage);
      ch.close();
      channelRef.current = null;
    };
  }, [caseId]);

  return { sections, caseData, lastUpdated, isConnected };
}
