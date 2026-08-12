import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
<<<<<<< HEAD
=======
import { useNavigate } from 'react-router-dom';
>>>>>>> upstream/main
import '../../pathscribe.css';
import { useAuth } from '../../contexts/AuthContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { EnhancementRequestButton } from '../EnhancementRequest/EnhancementRequestButton';
import { loadEnhancementConfig } from '../../services/enhancementRequestService';
import { VoiceToggleButton } from '../Voice/VoiceToggleButton';
<<<<<<< HEAD
import { VoiceCommandOverlay } from '../Voice/VoiceCommandOverlay';
import { VoiceMissPrompt } from '../Voice/VoiceMissPrompt';

const VOICE_SHOW_SUCCESS = import.meta.env.DEV;

const EXTERNAL_LINKS = [
  { name: 'CAP Cancer Protocols',         url: 'https://www.cap.org/protocols/cancer-protocols-templates' },
  { name: 'WHO Classification of Tumours',url: 'https://tumourclassification.iarc.who.int/' },
  { name: 'PathologyOutlines',            url: 'https://www.pathologyoutlines.com/' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
=======
import CaseSearchBar from '../Search/CaseSearchBar';
import { VoiceCommandOverlay } from '../Voice/VoiceCommandOverlay';
import { VoiceMissPrompt } from '../Voice/VoiceMissPrompt';
import { isConstrainedMobileDevice, hasDesktopViewOverride, clearDesktopViewOverride } from '../../utils/deviceDetection';
import { useCompanionWindow } from '@hooks/useCompanionWindow';

const VOICE_SHOW_SUCCESS = import.meta.env.DEV;

// Consolidated with Home.tsx's former ResourcesModal quickLinks — that
// list had drifted into its own separate URLs for CAP/WHO (a real bug:
// two independently-maintained "same link" lists that diverged over
// time) and included two placeholder Systems links (Hospital LIS/Lab
// Management, both dead `#` hrefs) that never went anywhere. This is
// now the one canonical list. UpToDate folded in from that list;
// PathologyOutlines/CAP/WHO keep whichever of the two prior URLs was
// more specific rather than a generic landing page.
const EXTERNAL_LINKS = [
  { name: 'CAP Cancer Protocols',          url: 'https://www.cap.org/protocols/cancer-protocols-templates' },
  { name: 'WHO Classification of Tumours', url: 'https://tumourclassification.iarc.who.int/' },
  { name: 'PathologyOutlines',             url: 'https://www.pathologyoutlines.com/' },
  { name: 'UpToDate',                      url: 'https://www.uptodate.com/' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

>>>>>>> upstream/main
function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/'))     return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ''}`;
  if (ua.includes('Chrome/'))  return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ''}`;
  if (ua.includes('Firefox/')) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ''}`;
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ''}`;
  return 'Unknown';
}

function getOSInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows NT 10')) return 'Windows 10/11';
  if (ua.includes('Windows'))       return 'Windows';
  if (ua.includes('Mac OS X'))      return `macOS ${ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? ''}`;
  if (ua.includes('Linux'))         return 'Linux';
  if (ua.includes('Android'))       return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

<<<<<<< HEAD
// ── System Info Modal ─────────────────────────────────────────────────────────
interface SystemInfoModalProps { onClose: () => void; }

const SystemInfoModal: React.FC<SystemInfoModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied]         = useState(false);
  const [anthropicOk, setAnthropicOk] = useState<boolean | null>(null);
  const [geminiOk, setGeminiOk]     = useState<boolean | null>(null);

  const aiProvider   = import.meta.env.VITE_AI_PROVIDER   ?? 'anthropic';
  const aiModel      = import.meta.env.VITE_AI_MODEL      ?? 'claude-sonnet-4-20250514';
  const aiDevMode    = import.meta.env.VITE_AI_DEV_MODE   === 'true';
  const geminiKey    = import.meta.env.VITE_GEMINI_API_KEY ?? '';
  const envMode      = import.meta.env.MODE ?? 'development';
  const buildDate    = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  // Live connectivity checks
  useEffect(() => {
    // Anthropic — lightweight models list ping
    fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': import.meta.env.VITE_AI_API_KEY ?? '', 'anthropic-version': '2023-06-01' }
    }).then(r => setAnthropicOk(r.ok)).catch(() => setAnthropicOk(false));

    // Gemini — just check key is set
    setGeminiOk(!!geminiKey);
  }, []);

  const StatusDot: React.FC<{ ok: boolean | null }> = ({ ok }) => (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 7,
      background: ok === null ? '#475569' : ok ? '#22c55e' : '#EF4444',
      boxShadow: ok === null ? 'none' : ok ? '0 0 6px #22c55e' : '0 0 6px #EF4444',
    }} />
  );

  const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, textAlign: 'right',
        maxWidth: '60%' }}>{value}</span>
    </div>
  );

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em',
      color: '#0891B2', marginTop: 20, marginBottom: 4 }}>{children}</div>
  );
=======
// ── System Info Modal sub-components ─────────────────────────────────────────

const StatusDot: React.FC<{ ok: boolean | null }> = ({ ok }) => (
  <span className={`ps-sysinfo-status-dot${ok === true ? ' ps-sysinfo-status-dot--ok' : ok === false ? ' ps-sysinfo-status-dot--error' : ''}`} />
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="ps-sysinfo-row">
    <span className="ps-sysinfo-row-label">{label}</span>
    <span className="ps-sysinfo-row-value">{value}</span>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ps-sysinfo-section">{children}</div>
);

// ── System Info Modal ─────────────────────────────────────────────────────────

interface SystemInfoModalProps { onClose: () => void; }

export const SystemInfoModal: React.FC<SystemInfoModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [copied,     setCopied]     = useState(false);
  const [structuredMessagesOk, setStructuredMessagesOk] = useState<boolean | null>(null);
  const [structuredContentOk,   setStructuredContentOk]   = useState<boolean | null>(null);

  const aiProvider = import.meta.env.VITE_AI_PROVIDER   ?? 'structured_messages';
  const aiModel    = import.meta.env.VITE_AI_MODEL       ?? 'claude-sonnet-4-6';
  const aiDevMode  = import.meta.env.VITE_AI_DEV_MODE   === 'true';
  const geminiKey  = import.meta.env.VITE_GEMINI_API_KEY ?? '';
  const envMode    = import.meta.env.MODE ?? 'development';
  const buildDate  = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': import.meta.env.VITE_AI_API_KEY ?? '', 'anthropic-version': '2023-06-01' }
    }).then(r => setStructuredMessagesOk(r.ok)).catch(() => setStructuredMessagesOk(false));
    setStructuredContentOk(!!geminiKey);
  }, [geminiKey]);
>>>>>>> upstream/main

  const handleCopy = () => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const text = [
<<<<<<< HEAD
      `PathScribe AI v0.9.0 — Support Report`,
      `Generated: ${now}`,
      `─────────────────────────────────────`,
      `USER`,
      `  Name:     [redacted — provide separately if requested]`,
      `  Role:     ${user?.role ?? 'Unknown'}`,
      `  ID:       [redacted — provide separately if requested]`,
      `  Voice:    ${user?.voiceProfile ?? 'Unknown'}`,
=======
      `PathScribe AI v${__APP_VERSION__} — Support Report`,
      `Generated: ${now}`,
      `─────────────────────────────────────`,
      `USER`,
      `  Role:     ${user?.role ?? 'Unknown'}`,
      `  Voice:    ${user?.voiceProfile ?? 'Unknown'}`,
      `  (Name/ID redacted — provide separately if requested)`,
>>>>>>> upstream/main
      ``,
      `APP`,
      `  Product:  PathScribe AI`,
      `  Company:  ForMedrix`,
      `  Version:  0.9.0`,
      `  Build:    ${buildDate}`,
      `  Env:      ${envMode}`,
      ``,
      `AI PROVIDER`,
      `  Provider: ${aiProvider}`,
      `  Model:    ${aiModel}`,
      `  Mode:     ${aiDevMode ? 'Dev (direct API)' : 'Proxy'}`,
      `  Voice AI: ${geminiKey ? 'Gemini active' : 'Local only'}`,
      ``,
      `SYSTEM`,
      `  Browser:  ${getBrowserInfo()}`,
      `  OS:       ${getOSInfo()}`,
      `  Screen:   ${window.screen.width}×${window.screen.height}`,
      `  Language: ${navigator.language}`,
      ``,
      `API STATUS`,
<<<<<<< HEAD
      `  Anthropic: ${anthropicOk === null ? 'Checking...' : anthropicOk ? '✅ Connected' : '❌ Failed'}`,
      `  Gemini:    ${geminiOk ? '✅ Configured' : '⚠️  Not configured'}`,
=======
      `  Anthropic: ${structuredMessagesOk === null ? 'Checking...' : structuredMessagesOk ? '✅ Connected' : '❌ Failed'}`,
      `  Gemini:    ${structuredContentOk ? '✅ Configured' : '⚠️  Not configured'}`,
>>>>>>> upstream/main
      `─────────────────────────────────────`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

<<<<<<< HEAD
  return (
    <div className="fm-overlay" onClick={onClose}>
      <div className="ps-research-modal" style={{ width: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
           onClick={e => e.stopPropagation()}>

=======
  const modal = (
    <div className="fm-overlay" onClick={onClose}>
      <div
        className="ps-research-modal"
        style={{ width: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
>>>>>>> upstream/main
        {/* Header */}
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">ForMedrix · PathScribe AI</div>
            <div className="fm-title-row">
              <h2 className="fm-title">System Information</h2>
<<<<<<< HEAD
              <span className="fm-active-badge">v0.9.0</span>
            </div>
          </div>
          <button className="ps-close-btn" onClick={onClose} aria-label="Close" style={{ display:"flex", alignItems:"center", justifyContent:"center", width:28, height:28, background:"transparent", border:"none", borderRadius:6, color:"#64748b", cursor:"pointer", padding:0, flexShrink:0, appearance:"none", WebkitAppearance:"none" }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 20px' }}>

          <SectionLabel>User</SectionLabel>
          <Row label="Name"         value={user?.name ?? '—'} />
          <Row label="Role"         value={<span style={{ textTransform: 'capitalize' }}>{user?.role ?? '—'}</span>} />
          <Row label="User ID"      value={<span style={{ fontFamily: 'monospace', fontSize: 12, color: '#38bdf8' }}>{user?.id ?? '—'}</span>} />
          <Row label="Voice Profile" value={user?.voiceProfile ?? '—'} />

          <SectionLabel>Application</SectionLabel>
          <Row label="Product"      value="PathScribe AI" />
          <Row label="Company"      value="ForMedrix" />
          <Row label="Version"      value={<span style={{ color: '#38bdf8', fontWeight: 700 }}>0.9.0</span>} />
          <Row label="Build"        value={buildDate} />
          <Row label="Environment"  value={
            <span style={{ color: envMode === 'production' ? '#22c55e' : '#f59e0b', fontWeight: 700, textTransform: 'capitalize' }}>
              {envMode}
            </span>
          } />

          <SectionLabel>AI Provider</SectionLabel>
          <Row label="Provider"     value={<span style={{ textTransform: 'capitalize' }}>{aiProvider}</span>} />
          <Row label="Model"        value={<span style={{ fontFamily: 'monospace', fontSize: 12, color: '#38bdf8' }}>{aiModel}</span>} />
          <Row label="API Mode"     value={
            <span style={{ color: aiDevMode ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
              {aiDevMode ? '⚠ Dev — direct API calls' : 'Proxy'}
            </span>
          } />
          <Row label="Voice AI"     value={
            <span style={{ color: geminiKey ? '#22c55e' : '#64748b' }}>
              {geminiKey ? '✓ Gemini active' : 'Local only'}
            </span>
          } />

          <SectionLabel>Browser & System</SectionLabel>
          <Row label="Browser"      value={getBrowserInfo()} />
          <Row label="OS"           value={getOSInfo()} />
          <Row label="Resolution"   value={`${window.screen.width} × ${window.screen.height}`} />
          <Row label="Language"     value={navigator.language} />

          <SectionLabel>API Connectivity</SectionLabel>
          <Row label="Anthropic"    value={<span><StatusDot ok={anthropicOk} />{anthropicOk === null ? 'Checking…' : anthropicOk ? 'Connected' : 'Failed'}</span>} />
          <Row label="Gemini"       value={<span><StatusDot ok={geminiOk} />{geminiOk ? 'Configured' : 'Not configured'}</span>} />
          <Row label="NLM Terminology" value={<span><StatusDot ok={true} />Available</span>} />
          <Row label="Secure Email" value={<span><StatusDot ok={null} />Not wired (stub)</span>} />

        </div>

        {/* Footer */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid rgba(51,65,85,0.9)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--ps-grad-header), #0b1120' }}>
          <span style={{ fontSize: 12, color: '#475569' }}>
            ⚠ Name & ID redacted. Share only with PathScribe support via secure channel.
          </span>
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(8,145,178,0.1)',
            border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(8,145,178,0.3)',
            borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
            color: copied ? '#22c55e' : '#38bdf8', fontSize: 13, fontWeight: 700,
            transition: 'all 0.2s', fontFamily: 'inherit'
          }}>
=======
              <span className="fm-active-badge">v{__APP_VERSION__}</span>
            </div>
          </div>
          <button className="ps-close-btn" onClick={onClose} aria-label="Close" title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="ps-sysinfo-body">
          <SectionLabel>User</SectionLabel>
          <Row label="Name"          value={user?.name ?? '—'} />
          <Row label="Role"          value={user?.role ?? '—'} />
          <Row label="User ID"       value={<code>{user?.id ?? '—'}</code>} />
          <Row label="Voice Profile" value={user?.voiceProfile ?? '—'} />

          <SectionLabel>Application</SectionLabel>
          <Row label="Product"     value="PathScribe AI" />
          <Row label="Company"     value="ForMedrix" />
          <Row label="Version"     value="0.9.0" />
          <Row label="Build"       value={buildDate} />
          <Row label="Environment" value={envMode} />

          <SectionLabel>AI Provider</SectionLabel>
          <Row label="Provider" value={aiProvider} />
          <Row label="Model"    value={<code>{aiModel}</code>} />
          <Row label="API Mode" value={aiDevMode ? '⚠ Dev — direct API calls' : 'Proxy'} />
          <Row label="Voice AI" value={geminiKey ? '✓ Gemini active' : 'Local only'} />

          <SectionLabel>Browser &amp; System</SectionLabel>
          <Row label="Browser"    value={getBrowserInfo()} />
          <Row label="OS"         value={getOSInfo()} />
          <Row label="Resolution" value={`${window.screen.width} × ${window.screen.height}`} />
          <Row label="Language"   value={navigator.language} />

          <SectionLabel>API Connectivity</SectionLabel>
          <Row label="Anthropic"       value={<><StatusDot ok={structuredMessagesOk} />{structuredMessagesOk === null ? 'Checking…' : structuredMessagesOk ? 'Connected' : 'Failed'}</>} />
          <Row label="Gemini"          value={<><StatusDot ok={structuredContentOk} />{structuredContentOk ? 'Configured' : 'Not configured'}</>} />
          <Row label="NLM Terminology" value={<><StatusDot ok={true} />Available</>} />
          <Row label="Secure Email"    value={<><StatusDot ok={null} />Not wired (stub)</>} />
        </div>

        {/* Footer */}
        <div className="ps-sysinfo-footer">
          <span className="ps-sysinfo-footer-hint">
            ⚠ Name &amp; ID redacted. Share only with PathScribe support.
          </span>
          <button
            onClick={handleCopy}
            className={`ps-sysinfo-copy-btn${copied ? ' ps-sysinfo-copy-btn--copied' : ''}`}
          >
>>>>>>> upstream/main
            {copied
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy to Clipboard</>
            }
          </button>
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
};

// ── NavBar ────────────────────────────────────────────────────────────────────
=======

  // Portal to document.body so it renders outside the nav stacking context
  return ReactDOM.createPortal(modal, document.body);
};

// ── NavBar ────────────────────────────────────────────────────────────────────

>>>>>>> upstream/main
interface NavBarProps {
  onLogoClick:    () => void;
  onLogout:       () => void;
  onProfileClick: () => void;
<<<<<<< HEAD
  logoHeight?:    string;
}

const NavBar: React.FC<NavBarProps> = ({ onLogoClick, onLogout, onProfileClick, logoHeight = '32px' }) => {
  const { user }                          = useAuth();
  const { unreadCount, hasUrgent, setPortalOpen } = useMessaging();
  const [linksOpen, setLinksOpen]         = useState(false);
  const [sysInfoOpen, setSysInfoOpen]     = useState(false);
  const qaEnabled = loadEnhancementConfig().qaEnabled;

  const userInitials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('')
=======
}

const NavBar: React.FC<NavBarProps> = ({ onLogoClick, onLogout, onProfileClick }) => {
  const { user }                                   = useAuth();
  const { unreadCount, hasUrgent, setPortalOpen } = useMessaging();
  const messagesLabel = unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages';
  const [linksOpen, setLinksOpen]                 = useState(false);
  // Reference material, not patient context: closeOnUnmount is false so
  // navigating to another page doesn't shut a protocol page the user is
  // still reading — same reasoning and same hook as PubMedTicker.tsx's
  // companion window.
  const { openCompanion } = useCompanionWindow({
    windowName: 'PathScribeClinicalLinksRef',
    preferredWidth: 900,
    preferredHeight: 800,
    closeOnUnmount: false,
  });
  // Once a launch has been blocked, stop intercepting clicks and let the
  // anchor behave normally — same reasoning as PubMedTicker.tsx.
  const [linksPopupBlocked, setLinksPopupBlocked] = useState(false);

  const handleClinicalLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (linksPopupBlocked) return; // let the anchor work
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    // preventDefault has to happen synchronously, before openCompanion is
    // awaited — the click gesture is spent by the time the promise settles.
    event.preventDefault();

    void openCompanion(url).then((result) => {
      if (result !== 'blocked') return;
      setLinksPopupBlocked(true);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };
  const [sysInfoOpen, setSysInfoOpen]             = useState(false);
  const qaEnabled = loadEnhancementConfig().qaEnabled;
  const navigate = useNavigate();
  // Real fix for a genuine, reported gap: setDesktopViewOverride() had no
  // way back. isConstrainedMobileDevice is checked once (the device's own
  // characteristic, not something that changes mid-session, matching the
  // pattern already established elsewhere); hasDesktopViewOverride reads
  // fresh on every render since it's cheap and needs to reflect the real,
  // current session state, not a stale snapshot from mount.
  const [isMobileDevice] = useState(() => isConstrainedMobileDevice());
  const showSwitchBack = isMobileDevice && hasDesktopViewOverride();

  const userInitials = user?.name
    ? (() => { const p = user.name.split(' ').filter(Boolean); return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0]?.[0]?.toUpperCase() ?? '?'; })()
>>>>>>> upstream/main
    : 'DSJ';

  useEffect(() => {
    const openEnhancement = () => document.querySelector<HTMLElement>('[data-voice-target="enhancement-request"] button')?.click();
    const openFeedback    = () => document.querySelector<HTMLElement>('[data-voice-target="testing-feedback"] button')?.click();
    window.addEventListener('PATHSCRIBE_HOME_OPEN_ENHANCEMENT_REQUEST', openEnhancement);
    window.addEventListener('PATHSCRIBE_HOME_OPEN_TESTING_FEEDBACK',    openFeedback);
    return () => {
      window.removeEventListener('PATHSCRIBE_HOME_OPEN_ENHANCEMENT_REQUEST', openEnhancement);
      window.removeEventListener('PATHSCRIBE_HOME_OPEN_TESTING_FEEDBACK',    openFeedback);
    };
  }, []);

<<<<<<< HEAD
=======
  const handleAvatarClick = () => {
    // Badge modal (aboutOpen) is shown by AppShell via onProfileClick.
    // SystemInfoModal opens only from within the badge modal — do NOT open both at once.
    onProfileClick();
  };

  const linksModal = linksOpen && ReactDOM.createPortal(
    <div className="fm-overlay" onClick={() => setLinksOpen(false)}>
      <div className="ps-research-modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">External Resources</div>
            <h2 className="fm-title">Clinical Links</h2>
          </div>
          <button className="ps-close-btn" onClick={() => setLinksOpen(false)} aria-label="Close" title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div>
          {EXTERNAL_LINKS.map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
              onClick={e => handleClinicalLinkClick(e, link.url)}
              className="ps-clinical-link">
              {link.name}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          ))}
        </div>
        <div className="ps-clinical-links-footer">
          <button className="fm-btn-cancel" onClick={() => setLinksOpen(false)}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );

>>>>>>> upstream/main
  return (
    <>
      <nav className="ps-nav">
        {/* Left */}
        <div className="ps-nav-left">
<<<<<<< HEAD
          <img src="/pathscribe-logo-dark.svg" alt="PathScribe AI"
            style={{ height: logoHeight, cursor: 'pointer' }} onClick={onLogoClick} />
=======
          <img
            src="/pathscribe-logo-clean.svg"
            alt="PathScribe"
            className="ps-nav-logo"
            onClick={onLogoClick}
          />
>>>>>>> upstream/main
          <div className="ps-nav-divider" />
          <span data-voice-target="enhancement-request"><EnhancementRequestButton /></span>
          {qaEnabled && <span data-voice-target="testing-feedback"><EnhancementRequestButton mode="qa" /></span>}
        </div>

<<<<<<< HEAD
        {/* Right */}
        <div className="ps-nav-right">

          {/* User badge — opens system info modal */}
          <div onClick={() => setSysInfoOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 600 }}>
                {user?.name || 'Dr. Sarah Johnson'}
              </div>
              <div style={{ color: '#0891B2', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                MD, FCAP
              </div>
=======
        {/* Centre — case search */}
        <div className="ps-nav-centre">
          <CaseSearchBar compact />
        </div>

        {/* Right */}
        <div className="ps-nav-right">

          {/* Real fix: the only way back from "Switch to Full Desktop
              View" - only shown when it would actually mean something
              (a constrained device that's currently overridden into the
              desktop UI), not to every user. */}
          {showSwitchBack && (
            <button
              type="button"
              className="ps-nav-btn"
              onClick={() => { clearDesktopViewOverride(); navigate('/intraop-queue'); }}
              title="Switch back to Focused Mode"
              style={{ fontSize: 12, width: 'auto', padding: '0 10px', whiteSpace: 'nowrap' }}
            >
              Focused Mode
            </button>
          )}

          {/* User avatar — opens system info + fires onProfileClick */}
          <div
            className="ps-nav-user-info"
            onClick={handleAvatarClick}
            role="button"
            tabIndex={0}
            aria-label="Account and system information"
            title="Account and system information"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAvatarClick(); } }}
          >
            <div className="ps-nav-user-text">
              <div className="ps-nav-user-name">{user?.name || 'Dr. Sarah Johnson'}</div>
              <div className="ps-nav-user-role">MD, FCAP</div>
>>>>>>> upstream/main
            </div>
            <div className="ps-nav-avatar">{userInitials}</div>
          </div>

          <div className="ps-nav-divider" />

          {/* Voice */}
<<<<<<< HEAD
          <div onMouseDown={e => e.preventDefault()} style={{ display: 'flex', alignItems: 'center' }}>
=======
          <div onMouseDown={e => e.preventDefault()}>
>>>>>>> upstream/main
            <VoiceToggleButton />
          </div>

          {/* Messages */}
          <button type="button" className="ps-nav-btn" onMouseDown={e => e.preventDefault()}
            onClick={() => setPortalOpen(true)}
<<<<<<< HEAD
            style={{ position: 'relative', border: 'none', color: hasUrgent ? '#FF453A' : '#94a3b8' }}>
=======
            aria-label={messagesLabel}
            title={messagesLabel}
            style={{ color: hasUrgent ? '#FF453A' : undefined }}>
>>>>>>> upstream/main
            <div style={{ position: 'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {unreadCount > 0 && <div className="ps-nav-badge">{unreadCount}</div>}
            </div>
          </button>

          {/* Clinical Links */}
          <button type="button" className="ps-nav-btn" onMouseDown={e => e.preventDefault()}
<<<<<<< HEAD
            onClick={() => setLinksOpen(true)} style={{ border: 'none', color: '#94a3b8' }}>
=======
            onClick={() => setLinksOpen(true)} aria-label="Clinical Links" title="Clinical Links">
>>>>>>> upstream/main
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>

          {/* Logout */}
<<<<<<< HEAD
          <button type="button" className="ps-nav-btn" onClick={onLogout}
            style={{ border: 'none', color: '#94a3b8' }}>
=======
          <button type="button" className="ps-nav-btn" onClick={onLogout} aria-label="Log out" title="Log out">
>>>>>>> upstream/main
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

<<<<<<< HEAD
      {/* System Info Modal — portalled to document.body, outside nav context */}
      {sysInfoOpen && <SystemInfoModal onClose={() => setSysInfoOpen(false)} />}

      {/* Clinical Links Modal — portalled to document.body, outside nav context */}
      {linksOpen && (
        <div className="fm-overlay" onClick={() => setLinksOpen(false)}>
          <div className="ps-research-modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
            <div className="ps-research-header">
              <div>
                <div className="fm-eyebrow">External Resources</div>
                <h2 className="fm-title">Clinical Links</h2>
              </div>
              <button className="ps-close-btn" onClick={() => setLinksOpen(false)} aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {EXTERNAL_LINKS.map(link => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 24px', color: '#e2e8f0', fontSize: 14, textDecoration: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,145,178,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {link.name}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              ))}
            </div>
            <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(51,65,85,0.9)',
              display: 'flex', justifyContent: 'flex-end' }}>
              <button className="fm-btn-cancel" onClick={() => setLinksOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
=======
      {sysInfoOpen && <SystemInfoModal onClose={() => setSysInfoOpen(false)} />}
      {linksModal}
>>>>>>> upstream/main

      <VoiceCommandOverlay showSuccess={VOICE_SHOW_SUCCESS} />
      <VoiceMissPrompt />
    </>
  );
};

export default NavBar;
