// src/components/ErrorBoundary/ErrorBoundary.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 502 (PS-472): a render error never blanks the app.
//
// Three placements:
//   • scope="app"   — around <App /> (main.tsx): the last line of defence.
//   • scope="route" — around the page inside AppShell (RouteErrorBoundary):
//     every page, so the nav bar and drawers survive a page crash. Resets when
//     the address changes.
//   • scope="panel" — around the organ map and synoptic panels on the report
//     page, so a map crash doesn't take down the report.
//
// Unsaved work: a boundary can't keep a crashed screen's in-memory state. The
// recovery screen never claims nothing was lost: it says saved work is safe
// and unsaved changes on that screen may have been lost, and says so firmly
// when the app-wide unsaved-changes flag was set at the moment of the crash.
// (The report page's own draft cache may offer to restore a draft when the
// page reopens.)
//
// The crash is reported, scrubbed of patient data, through
// services/errorReporting (console + the in-app Error Log); the screen shows
// the report's reference. No patient identifier appears on the screen.
// Rendering only: what a report contains is decided in services.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { DirtyStateContext } from '@/contexts/DirtyStateContext';
import { tabDataStorage } from '@/services/browserData/dataStorage';
import { clientErrorReporter } from '@/services/errorReporting/clientErrorReporterInstance';
import { CrashTestError, crashTestRequested } from '@/services/errorReporting/crashTest';
import { deploymentInstance } from '@/services/deployment/deploymentInstance';

export type ErrorBoundaryScope = 'app' | 'route' | 'panel';

export interface ErrorBoundaryProps {
  scope: ErrorBoundaryScope;
  /** Names the boundary in reports and crash tests: 'app', 'route', 'panel:organ-map'. */
  name: string;
  /** A change clears the error (the route boundary passes the address). */
  resetKey?: string;
  /** For tests: where reports go (default: the app's reporter). */
  report?: (error: unknown, boundary: string) => string | null;
  /** Called when the boundary starts or stops showing its recovery screen (the shell uses it to show the nav bar). */
  onErrorChange?: (crashed: boolean) => void;
  children: React.ReactNode;
}

interface State { error: unknown; reference: string | null; hadUnsavedChanges: boolean; resetKey?: string }

const crashTestsEnabled = (): boolean => import.meta.env.DEV || deploymentInstance.role === 'validation';

/** Throws on render when QA asked for this boundary's crash test. */
const CrashTestProbe: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => {
  if (typeof window !== 'undefined' && crashTestRequested(window.location.search, name, crashTestsEnabled())) throw new CrashTestError(name);
  return <>{children}</>;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  static contextType = DirtyStateContext;
  declare context: React.ContextType<typeof DirtyStateContext>;
  state: State = { error: null, reference: null, hadUnsavedChanges: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error ?? new Error('Unknown render error') };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, reference: null, hadUnsavedChanges: false, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: unknown): void {
    const report = this.props.report ?? ((e, b) => clientErrorReporter.report(e, 'render', b));
    const reference = report(error, this.props.name);
    this.setState({ reference, hadUnsavedChanges: !!this.context?.isDirty });
    this.props.onErrorChange?.(true);
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: State): void {
    if (prevState.error && !this.state.error) this.props.onErrorChange?.(false);
  }

  private reset = () => this.setState({ error: null, reference: null, hadUnsavedChanges: false });

  render() {
    if (this.state.error) {
      return <ErrorBoundaryFallback scope={this.props.scope} reference={this.state.reference} hadUnsavedChanges={this.state.hadUnsavedChanges} onTryAgain={this.reset} />;
    }
    return <CrashTestProbe name={this.props.name}>{this.props.children}</CrashTestProbe>;
  }
}

export const ErrorBoundaryFallback: React.FC<{ scope: ErrorBoundaryScope; reference: string | null; hadUnsavedChanges: boolean; onTryAgain: () => void }> = ({ scope, reference, hadUnsavedChanges, onTryAgain }) => {
  const { t } = useTranslation();
  const back = scope === 'panel' ? null : previousPagePath();
  if (scope === 'panel') {
    return (
      <div className="ps-error-boundary ps-error-boundary--panel" role="alert">
        <div className="ps-error-boundary-title">{t('errorBoundary.panel.title')}</div>
        <p className="ps-error-boundary-text">{t('errorBoundary.panel.body')}</p>
        {reference && <p className="ps-error-boundary-reference">{t('errorBoundary.reference', { reference })}</p>}
        <div className="ps-error-boundary-actions">
          <button type="button" className="ps-conf-btn-primary" onClick={onTryAgain}>{t('errorBoundary.tryAgain')}</button>
        </div>
      </div>
    );
  }
  return (
    <div className={`ps-error-boundary ps-error-boundary--${scope}`} role="alert">
      <div className="ps-error-boundary-card">
        <h1 className="ps-error-boundary-heading">{t('errorBoundary.title')}</h1>
        <p className="ps-error-boundary-text">{t(scope === 'app' ? 'errorBoundary.appBody' : 'errorBoundary.body')}</p>
        <p className={`ps-error-boundary-text${hadUnsavedChanges ? ' ps-error-boundary-text--warning' : ''}`}>
          {t(hadUnsavedChanges ? 'errorBoundary.unsavedLost' : 'errorBoundary.unsavedMaybeLost')}
        </p>
        {reference && <p className="ps-error-boundary-reference">{t('errorBoundary.reference', { reference })}</p>}
        <div className="ps-error-boundary-actions">
          <button type="button" className="ps-conf-btn-primary" onClick={onTryAgain}>{t('errorBoundary.tryAgain')}</button>
          {/* A full page load: whatever broke this screen's state is left behind. */}
          <button type="button" className="ps-conf-btn-secondary" onClick={() => window.location.assign(back ?? '/worklist')}>{t(back ? 'errorBoundary.backToPrevious' : 'errorBoundary.backToWorklist')}</button>
        </div>
      </div>
    </div>
  );
};

const PATH_KEY = 'ps.pagePath';
/** Batch 686: the page before this one, kept for the length of the browser tab (tabDataStorage), so the error screen can go back to it. */
export function rememberPagePath(pathname: string): void {
  try {
    const cur = JSON.parse(tabDataStorage.getItem(PATH_KEY) ?? 'null') as { current?: string; previous?: string } | null;
    if (cur?.current === pathname) return;
    tabDataStorage.setItem(PATH_KEY, JSON.stringify({ current: pathname, previous: cur?.current }));
  } catch { /* storage unavailable: the error screen falls back to the worklist */ }
}
export function previousPagePath(): string | null {
  try {
    const cur = JSON.parse(tabDataStorage.getItem(PATH_KEY) ?? 'null') as { current?: string; previous?: string } | null;
    return cur?.previous && cur.previous !== cur.current && cur.previous.startsWith('/') ? cur.previous : null;
  } catch { return null; }
}

/** The page inside AppShell: one boundary, cleared when the address changes. */
export const RouteErrorBoundary: React.FC<{ pathname: string; onErrorChange?: (crashed: boolean) => void; children: React.ReactNode }> = ({ pathname, onErrorChange, children }) => {
  React.useEffect(() => { rememberPagePath(pathname); }, [pathname]);
  return (
  <ErrorBoundary scope="route" name="route" resetKey={pathname} onErrorChange={onErrorChange}>{children}</ErrorBoundary>
  );
};
