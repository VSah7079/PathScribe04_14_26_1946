/**
 * ConfigurationPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level configuration page, accessible from the Home screen nav tile.
 * Voice context: CONFIGURATION — tab navigation commands active while here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuditLog } from '../components/Audit/useAuditLog';
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../constants/systemActions';
import AITab         from '../components/Config/AI/index';
import ModelsTab     from '../components/Config/Models/index';
import ProtocolsTab  from '../components/Config/Protocols/index';
import StaffTab      from '../components/Config/Staff/StaffTab';
import SystemTab     from '../components/Config/System/index';
import MacrosTab     from '../components/Config/Macros/index';
import VoiceSettings from '../components/Voice/VoiceSettings';
import { ActionsTab }  from '../components/Config/Actions/ActionsTab';
import DemoResetTab    from '../components/Config/System/DemoResetTab';
import ReportTemplatesSection    from '../components/TemplateBuilder/ReportTemplatesSection';
import ValidationStudiesSection from '../components/ValidationStudies/ValidationStudiesSection';
import ConfigSearchBar from '../components/Config/Search/ConfigSearchBar';
import '../pathscribe.css';

// ── Admin permission check ────────────────────────────────────────────────────
// Validation Studies tab is only visible to admin/superadmin roles.
// Uses the same localStorage-based role check as AI Behavior tab.
function useIsAdmin(): boolean {
  try {
    const raw  = localStorage.getItem('pathscribe-user');
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return false;
    return ['admin', 'pathologist-admin', 'superadmin'].includes(user.role ?? '');
  } catch { return false; }
}

function useIsSuperAdmin(): boolean {
  try {
    const raw  = localStorage.getItem('pathscribe-user');
    const user = raw ? JSON.parse(raw) : null;
    return user?.role === 'superadmin';
  } catch { return false; }
}

const VALID_TABS = ['ai', 'protocols', 'staff', 'voice', 'system', 'actions', 'macros', 'templates', 'validation', 'demo'] as const;
type TabId = typeof VALID_TABS[number];

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'actions',    label: 'Action Registry'    },
  { id: 'ai',         label: 'AI Behavior'        },
  { id: 'macros',     label: 'Macros'             },
  { id: 'templates',  label: 'Report Templates'   },
  { id: 'staff',      label: 'Staff'              },
  { id: 'protocols',  label: 'Synoptic Library'   },
  { id: 'system',     label: 'System'             },
  { id: 'validation', label: 'Validation Studies' },
  { id: 'voice',      label: 'Voice'              },
  // Pinned last deliberately, not alphabetized — a reset/destructive
  // action, same convention as keeping "Delete Account" separate from
  // an alphabetized settings list rather than letting it land wherever
  // "D" happens to sort.
  { id: 'demo',       label: '⟳ Demo Reset'       },
];

function getTabFromSearch(search: string): TabId {
  const t = new URLSearchParams(search).get('tab') as TabId | null;
  return t && (VALID_TABS as readonly string[]).includes(t) ? t : 'ai';
}

const ConfigurationPage: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { log }    = useAuditLog();

  const [activeTab,   setActiveTab]   = useState<TabId>(() => getTabFromSearch(location.search));
  const [isLoaded,    setIsLoaded]    = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const isAdmin      = useIsAdmin();
  const isSuperAdmin = useIsSuperAdmin();

  useEffect(() => { setActiveTab(getTabFromSearch(location.search)); }, [location.search]);
  useEffect(() => { const t = setTimeout(() => setIsLoaded(true), 100); return () => clearTimeout(t); }, []);

  // ── Voice: set context on mount ─────────────────────────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.CONFIGURATION);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: tab navigation listeners ────────────────────────────────────────
  useEffect(() => {
    const tabIds = VALID_TABS as readonly TabId[];

    const nextTab = () => {
      setActiveTab(current => {
        const idx = tabIds.indexOf(current);
        const next = tabIds[Math.min(idx + 1, tabIds.length - 1)];
        navigate(`/configuration?tab=${next}`);
        log('navigate_tab', { tabId: next });
        return next;
      });
    };

    const prevTab = () => {
      setActiveTab(current => {
        const idx = tabIds.indexOf(current);
        const prev = tabIds[Math.max(idx - 1, 0)];
        navigate(`/configuration?tab=${prev}`);
        log('navigate_tab', { tabId: prev });
        return prev;
      });
    };

    window.addEventListener('PATHSCRIBE_NEXT_TAB',     nextTab);
    window.addEventListener('PATHSCRIBE_PREVIOUS_TAB', prevTab);
    return () => {
      window.removeEventListener('PATHSCRIBE_NEXT_TAB',     nextTab);
      window.removeEventListener('PATHSCRIBE_PREVIOUS_TAB', prevTab);
    };
  }, [navigate, log]);

  const handleTabChange = (tabId: TabId) => {
    navigate(`/configuration?tab=${tabId}`);
    log('navigate_tab', { tabId });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ai':        return <AITab ModelsPanel={ModelsTab} />;
      case 'protocols': return <ProtocolsTab />;
      case 'staff':     return <StaffTab />;
      case 'system':    return <SystemTab />;
      case 'actions':   return <ActionsTab />;
      case 'macros':    return <MacrosTab />;
      case 'voice':     return <VoiceSettings />;
      case 'templates':  return <ReportTemplatesSection />;
      case 'validation': return isAdmin
        ? <ValidationStudiesSection isSuperAdmin={isSuperAdmin} />
        : <div style={{ padding: '48px', textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Admin access required</div>
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '6px' }}>Validation Studies is available to administrators only.</div>
          </div>;
      case 'demo':      return <DemoResetTab />;
      default:          return null;
    }
  };

  if (!isLoaded) return <div style={{ padding: '24px', color: '#e2e8f0' }}>Loading configuration…</div>;

  return (
    <div style={{
      height:        '100%',
      width:         '100%',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
      color:         '#f1f5f9',
    }}>

      {/* ── Header + Tab bar — full width, never scrolls ── */}
      <div style={{
        width:      '100%',
        padding:    '32px 40px 0',
        boxSizing:  'border-box',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Configuration</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>Control AI behavior, templates, users, and system settings</p>
          <ConfigSearchBar onNavigate={tabId => handleTabChange(tabId)} />
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '0', borderBottom: '1px solid #1e293b' }}>
          {TAB_LABELS.filter(tab => {
            if (tab.id === 'validation') return isAdmin; // admin, pathologist-admin, superadmin
            return true;
          }).map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#e2e8f0'; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#94a3b8'; }}
              style={{
                padding: '9px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '13px', whiteSpace: 'nowrap' as const,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color:      activeTab === tab.id ? '#0891b2' : '#94a3b8',
                borderBottom: activeTab === tab.id ? '2px solid #0891b2' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content — FULL WIDTH so scrollbar lands at viewport edge ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%' }}>
        {/* Inner content: full width, padding on sides */}
        <div style={{
          padding:    '24px 40px 80px',
          boxSizing:  'border-box',
          width:      '100%',
        }}>
          {renderActiveTab()}
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showWarning && (
        <div className="ps-overlay" onClick={() => setShowWarning(false)}>
          <div className="ps-modal-dark" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <span className="ps-modal-dark-title">Unsaved Changes</span>
            <p className="ps-modal-dark-body">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="ps-modal-dark-footer">
              <button className="ps-btn-ghost-dark" onClick={() => setShowWarning(false)}>Stay</button>
              <button className="ps-btn-red" onClick={() => navigate('/')}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPage;
