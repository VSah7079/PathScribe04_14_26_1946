/**
 * ConfigurationPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level configuration page, accessible from the Home screen nav tile.
 * Voice context: CONFIGURATION — tab navigation commands active while here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuditLog } from '../components/Audit/useAuditLog';
import { useIsAdmin, useIsSuperAdmin } from '../contexts/AuthContext';

import { VOICE_CONTEXT } from '../constants/systemActions';
import AITab         from '../components/Config/AI/index';
import ModelsTab     from '../components/Config/Models/index';
import ProtocolsTab  from '../components/Config/Protocols/index';
import StaffTab      from '../components/Config/Staff/StaffTab';
import SystemTab     from '../components/Config/System/index';
import CytologyTab   from '../components/Config/Cytology/index';
import TATConfigSection from '../components/Config/System/TATConfigSection';
import MacrosTab     from '../components/Config/Macros/index';
import VoiceSettings from '../components/Voice/VoiceSettings';
import { ActionsTab }  from '../components/Config/Actions/ActionsTab';
// Batch 527 (PS-486): the demo reset is built in only in the demo build (__DEMO_TOOLS__).
const DemoResetTab = __DEMO_TOOLS__ ? React.lazy(() => import('../components/Config/System/DemoResetTab')) : null;
import ReportTemplatesSection    from '../components/TemplateBuilder/ReportTemplatesSection';
import ValidationStudiesSection from '../components/ValidationStudies/ValidationStudiesSection';
import ConfigSearchBar from '../components/Config/Search/ConfigSearchBar';
import { resetConfigScroll } from '../utils/resetConfigScroll';
import { ConfigDirtyGuardContext } from '../components/Config/configDirtyGuardContext';
import { createConfigDirtyRegistry } from '../services/configDirty/configDirtyRegistry';
import { onConfigWritten } from '../services/authorization/guardConfigWrites';
import { useConfigEditTracking } from '../hooks/useConfigEditTracking';
import { useDirtyState } from '../contexts/DirtyStateContext';
import ConfirmModal from '../components/Common/ConfirmModal';
import '../pathscribe.css';
import ConfigRefusalBanner from '../components/Config/ConfigRefusalBanner';
import ConfigSectionGate from '../components/Config/ConfigSectionGate';
import { CONFIG_TABS, type ConfigTabId } from '../constants/configSearchIndex';
import { actionRegistryService } from '@/services';
import { LoadingState } from '@/components/Common/LoadingState';

// ── Admin permission check ────────────────────────────────────────────────────
// Validation Studies tab is only visible to admin-tier roles. useIsAdmin/
// useIsSuperAdmin now come from AuthContext.tsx — file-by-file cleanup
// sweep: this page used to carry its own local copy of both (already fixed,
// per its own prior history, to read useAuth() rather than an independent
// localStorage.getItem('pathscribe-user') + JSON.parse); Config/AI/index.tsx
// carried a second, real-bug-prone copy of the same check. Both now share
// one implementation.
// Batch 431: one list of tabs, shared with the Configuration search.
const VALID_TABS = CONFIG_TABS;
type TabId = ConfigTabId;

const TAB_LABEL_KEYS: Record<TabId, string> = {
  actions:    'configuration.tabs.actions',
  ai:         'configuration.tabs.ai',
  macros:     'configuration.tabs.macros',
  templates:  'configuration.tabs.templates',
  staff:      'configuration.tabs.staff',
  protocols:  'configuration.tabs.protocols',
  system:     'configuration.tabs.system',
  cytology:   'configuration.tabs.cytology',
  tat:        'configuration.tabs.tat',
  validation: 'configuration.tabs.validation',
  voice:      'configuration.tabs.voice',
  // Pinned last deliberately, not alphabetized — a reset/destructive
  // action, same convention as keeping "Delete Account" separate from
  // an alphabetized settings list rather than letting it land wherever
  // "D" happens to sort.
  demo:       'configuration.tabs.demo',
};
const TAB_ORDER: TabId[] = ['actions', 'ai', 'macros', 'templates', 'staff', 'protocols', 'system', 'cytology', 'tat', 'validation', 'voice', ...(__DEMO_TOOLS__ ? ['demo' as TabId] : [])];

function getTabFromSearch(search: string): TabId {
  const t = new URLSearchParams(search).get('tab') as TabId | null;
  // Real fix, per direct report: "The Config page opens up on the 2nd
  // tab. I would say it should either open on the first tab or the
  // System Tab." Defaulted to 'ai' (Config's own 2nd tab) purely
  // because it happened to be first in VALID_TABS after Action
  // Registry — never a deliberate landing-page choice. 'system' now,
  // since that's genuinely where most real, active admin work in this
  // app lives (Scan Stations, Cassette Routing Rules, Cassette
  // Colors, Protocols, and everything else built under it this
  // session) — a plain /configuration visit should land where an
  // admin actually needs to be most often, not wherever the tab list
  // happened to order things.
  return t && (VALID_TABS as readonly string[]).includes(t) && TAB_ORDER.includes(t) ? t : 'system';
}

const ConfigurationPage: React.FC = () => {
  const { t }      = useTranslation();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { log }    = useAuditLog();

  const [activeTab,   setActiveTab]   = useState<TabId>(() => getTabFromSearch(location.search));
  const [isLoaded,    setIsLoaded]    = useState(false);
  const isAdmin      = useIsAdmin();
  const isSuperAdmin = useIsSuperAdmin();

  useEffect(() => { setActiveTab(getTabFromSearch(location.search)); }, [location.search]);
  useEffect(() => { const t = setTimeout(() => setIsLoaded(true), 100); return () => clearTimeout(t); }, []);

  // ── PS-128: unsaved changes anywhere on the page ───────────────────────────
  // Batch 309 guarded only switching tabs, and only for Macros. Batch 437:
  // every editor counts (services/configDirty/configDirtyRegistry.ts) —
  // inline forms report their exact state through ConfigDirtyGuardContext,
  // and edits in any editor dialog are noticed here (useConfigEditTracking).
  // The page tells the app-wide guard, so the logo, breadcrumbs, nav bar,
  // header search and Sign Out ask before leaving too; closing or reloading
  // the browser tab gets the browser's own warning.
  const [pageDirty, setPageDirty] = useState(false);
  const pageDirtyRef = useRef(false);
  useEffect(() => { pageDirtyRef.current = pageDirty; }, [pageDirty]);
  const registry = useMemo(() => createConfigDirtyRegistry(dirty => { pageDirtyRef.current = dirty; setPageDirty(dirty); }), []);
  const pageRootRef = useRef<HTMLDivElement>(null);
  // Batch 438: closing a dialog with unsaved edits from outside it (a click
  // on its backdrop, or Escape) asks first; Discard replays the close.
  const [outsideClose, setOutsideClose] = useState<{ dialog: object; replay: () => void } | null>(null);
  const handleOutsideClose = useCallback((dialog: object, replay: () => void) => setOutsideClose({ dialog, replay }), []);
  useConfigEditTracking(pageRootRef, registry, handleOutsideClose);
  const handleOutsideCloseDiscard = () => {
    const pending = outsideClose;
    setOutsideClose(null);
    if (!pending) return;
    registry.forgetDialog(pending.dialog);
    pending.replay();
    // A dialog that doesn't close on Escape is still open with its edits:
    // it stays unsaved, so leaving the page still asks.
    setTimeout(() => { if ((pending.dialog as Element).isConnected) registry.dialogEdited(pending.dialog); }, 0);
  };
  useEffect(() => onConfigWritten(() => registry.configSaved()), [registry]);

  const { setDirty: setAppDirty, pendingPath, confirmNavigate, cancelNavigate } = useDirtyState();
  useEffect(() => { setAppDirty(pageDirty); }, [pageDirty, setAppDirty]);
  useEffect(() => () => setAppDirty(false), [setAppDirty]);
  useEffect(() => {
    if (!pageDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pageDirty]);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);

  // The real navigation actions, unchanged from before this fix — pulled out
  // so both the "just go" path and the "confirm first" path call the exact
  // same code.
  const performNavigateToTab = useCallback((tabId: TabId, withScrollReset: boolean, section?: string) => {
    // Batch 431: the section rides in the address too, so the Cytology and
    // Synoptic Library tabs (which read ?section=) open on it as well.
    navigate(`/configuration?tab=${tabId}${section ? `&section=${encodeURIComponent(section)}` : ''}`);
    log('navigate_tab', { tabId });
    if (withScrollReset) {
      // Real fix, per direct report: switching tabs used to leave
      // scroll position wherever it was on the previous tab, hiding
      // the new tab's own add button and column headers until manually
      // scrolled up. See utils/resetConfigScroll.ts's own header for
      // why this needs a direct container lookup rather than a prop.
      resetConfigScroll();
    }
    if (section) {
      // Real, per direct report ("the top level search in config
      // found the entry, but when clicked on, it did not go to
      // the setting"): same real PATHSCRIBE_SYSTEM_NAVIGATE event
      // AppShell.tsx's own config-link chat messages already
      // dispatch, same setTimeout delay reasoning — the System
      // tab's own component needs to actually mount (and its
      // event listener attach) after this navigation's state
      // update, before this event can be caught.
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('PATHSCRIBE_SYSTEM_NAVIGATE', { detail: { section } }));
      }, 150);
    }
  }, [navigate, log]);

  // Runs a navigation now, or after "Discard changes" when anything is unsaved.
  const guardNavigation = useCallback((action: () => void) => {
    if (pageDirtyRef.current) {
      pendingNavRef.current = action;
      setShowDiscardConfirm(true);
    } else {
      action();
    }
  }, []);

  const guardedNavigateToTab = useCallback((tabId: TabId, withScrollReset: boolean, section?: string) => {
    guardNavigation(() => performNavigateToTab(tabId, withScrollReset, section));
  }, [guardNavigation, performNavigateToTab]);

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false);
    registry.clearAll();
    const perform = pendingNavRef.current;
    pendingNavRef.current = null;
    perform?.();
  };

  const handleDiscardCancel = () => {
    setShowDiscardConfirm(false);
    pendingNavRef.current = null;
  };

  // ── Voice: set context on mount ─────────────────────────────────────────────
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.CONFIGURATION);
    return () => actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: tab navigation listeners ────────────────────────────────────────
  useEffect(() => {
    const tabIds = VALID_TABS as readonly TabId[];

    const nextTab = () => {
      setActiveTab(current => {
        const idx = tabIds.indexOf(current);
        const next = tabIds[Math.min(idx + 1, tabIds.length - 1)];
        guardedNavigateToTab(next, false);
        // Stay on the current tab until a pending discard-confirm resolves;
        // performNavigateToTab (via the effect above) is what actually
        // advances activeTab once the navigation really happens.
        return pageDirtyRef.current ? current : next;
      });
    };

    const prevTab = () => {
      setActiveTab(current => {
        const idx = tabIds.indexOf(current);
        const prev = tabIds[Math.max(idx - 1, 0)];
        guardedNavigateToTab(prev, false);
        return pageDirtyRef.current ? current : prev;
      });
    };

    window.addEventListener('PATHSCRIBE_NEXT_TAB',     nextTab);
    window.addEventListener('PATHSCRIBE_PREVIOUS_TAB', prevTab);
    return () => {
      window.removeEventListener('PATHSCRIBE_NEXT_TAB',     nextTab);
      window.removeEventListener('PATHSCRIBE_PREVIOUS_TAB', prevTab);
    };
  }, [guardedNavigateToTab]);

  const handleTabChange = (tabId: TabId) => guardedNavigateToTab(tabId, true);

  const dirtyGuardContextValue = useMemo(() => ({
    setDirty: (dirty: boolean) => registry.report('legacy', dirty),
    report: registry.report,
    guard: guardNavigation,
  }), [registry, guardNavigation]);

  // Leaving Configuration (logo, breadcrumb, nav bar, header search) with
  // unsaved changes: the app-wide guard holds the address until this answers.
  const handleLeaveConfirm = () => { registry.clearAll(); confirmNavigate(); };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ai':        return <ConfigSectionGate section="tab:ai"><AITab ModelsPanel={ModelsTab} /></ConfigSectionGate>;
      case 'protocols': return <ConfigSectionGate section="tab:protocols"><ProtocolsTab /></ConfigSectionGate>;
      case 'staff':     return <StaffTab />;
      case 'system':    return <SystemTab />;
      case 'cytology':  return <CytologyTab />;
      case 'tat':       return <ConfigSectionGate section="tab:tat"><TATConfigSection /></ConfigSectionGate>;
      case 'actions':   return <ConfigSectionGate section="tab:actions"><ActionsTab /></ConfigSectionGate>;
      case 'macros':    return <MacrosTab />;
      case 'voice':     return <VoiceSettings />;
      case 'templates':  return <ConfigSectionGate section="tab:templates"><ReportTemplatesSection /></ConfigSectionGate>;
      case 'validation': return isAdmin
        ? <ConfigSectionGate section="tab:validation"><ValidationStudiesSection isSuperAdmin={isSuperAdmin} /></ConfigSectionGate>
        : <div className="ps-cfgpage-locked">
            <div className="ps-cfgpage-locked-icon">🔒</div>
            <div className="ps-cfgpage-locked-title">{t('configuration.adminRequiredTitle')}</div>
            <div className="ps-cfgpage-locked-sub">{t('configuration.adminRequiredSub')}</div>
          </div>;
      case 'demo':      return DemoResetTab ? <React.Suspense fallback={null}><DemoResetTab /></React.Suspense> : null;
      default:          return null;
    }
  };

  if (!isLoaded) return <LoadingState label={t('configuration.loading')} />;

  return (
    <div className="ps-cfgpage-shell" ref={pageRootRef}>

      {/* Batch 428: a refused change names the missing permission. */}
      <ConfigRefusalBanner />

      {/* ── Header + Tab bar — full width, never scrolls ── */}
      <div className="ps-cfgpage-header">
        <div className="ps-cfgpage-title-block">
          <h1 className="ps-cfgpage-title">{t('configuration.title')}</h1>
          <p className="ps-cfgpage-subtitle">{t('configuration.subtitle')}</p>
          <ConfigSearchBar onNavigate={(tabId, section) => guardedNavigateToTab(tabId, true, section)} />
        </div>

        <div className="ps-cfgpage-tabbar">
          {TAB_ORDER.filter(tabId => {
            if (tabId === 'validation') return isAdmin; // admin, pathologist-admin, superadmin
            return true;
          }).map(tabId => (
            <button
              key={tabId}
              onClick={() => handleTabChange(tabId)}
              className={`ps-cfgpage-tab-btn${activeTab === tabId ? ' ps-cfgpage-tab-btn--active' : ''}`}
            >
              {t(TAB_LABEL_KEYS[tabId])}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content — FULL WIDTH so scrollbar lands at viewport edge ── */}
      <div className="ps-cfgpage-scroll">
        {/* Inner content: full width, padding on sides */}
        <div className="ps-cfgpage-inner">
          <ConfigDirtyGuardContext.Provider value={dirtyGuardContextValue}>
            {renderActiveTab()}
          </ConfigDirtyGuardContext.Provider>
        </div>
      </div>

      {/* ── PS-128: discard-unsaved-changes confirmation ── */}
      <ConfirmModal
        show={showDiscardConfirm}
        title={t('configuration.dirtyGuard.title')}
        message={t('configuration.dirtyGuard.message')}
        confirmLabel={t('configuration.dirtyGuard.discardButton')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDiscardConfirm}
        onCancel={handleDiscardCancel}
        aboveDialogs
      />

      {/* ── Batch 438: closing a dialog from outside with unsaved edits ── */}
      <ConfirmModal
        show={!!outsideClose}
        title={t('configuration.dirtyGuard.title')}
        message={t('configuration.dirtyGuard.dialogMessage')}
        confirmLabel={t('configuration.dirtyGuard.discardButton')}
        cancelLabel={t('configuration.dirtyGuard.keepEditing')}
        onConfirm={handleOutsideCloseDiscard}
        onCancel={() => setOutsideClose(null)}
        aboveDialogs
      />

      {/* ── PS-128: leaving Configuration with unsaved changes ── */}
      <ConfirmModal
        show={!!pendingPath}
        title={t('configuration.dirtyGuard.title')}
        message={t('configuration.dirtyGuard.message')}
        confirmLabel={t('configuration.dirtyGuard.discardButton')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleLeaveConfirm}
        onCancel={cancelNavigate}
        aboveDialogs
      />
    </div>
  );
};

export default ConfigurationPage;
