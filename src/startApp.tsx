// src/startApp.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d): what main.tsx did before. main.tsx now reads
// the deployment's config.json first and loads this module only afterwards, so
// every service reads the deployment's settings (services/runtimeConfig/) when
// it is created. Nothing here changed apart from the move.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Batch 503 (PS-474): Inter, self-hosted (was a Google Fonts @import in index.css).
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './index.css'
import './pathscribe.css';
// Pretendard (Korean text) is loaded by index.html from public/fonts/pretendard/
// (Batch 393 follow-up: no npm package needed).
import './i18n/config';
import { signingCallbackProvider } from './services/auth/sso/ssoClient';
import { removeRetiredBrowserKeys } from './services/browserCleanup/retiredBrowserKeys';
import { removeBrowserDataCopies } from './services/browserData/browserKeepList';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { clientErrorReporter } from './services/errorReporting/clientErrorReporterInstance';
import { installGlobalErrorHandlers } from './services/errorReporting/clientErrorReporter';
import { installSelectAutoWidth } from './utils/selectAutoWidth';

// Batch 431: remove browser copies the app no longer uses (old AI draft
// copies hold report text; see the service's header).
removeRetiredBrowserKeys();
// Batch 525 (PS-485): on a server deployment, no data copies stay in this browser.
removeBrowserDataCopies();

// Batch 502 (PS-472): errors no error boundary sees (event handlers, timers,
// rejected promises) are reported too, scrubbed of patient data.
installGlobalErrorHandlers(window, clientErrorReporter);

// Batch 580 (PS-62): where the styled dropdown list is drawn, each dropdown keeps the width of its widest option.
installSelectAutoWidth(document);

// Real, per direct follow-up on testing PS-239's own real endpoint
// with mock data — see services/mockInterfaceEngine/
// mockInterfaceEngineSettings.ts's own header for the full account.
// Real, deliberate double-gate: import.meta.env.DEV (Vite's own real,
// build-time flag — false in a real production build, so this whole
// branch is dead code there, never shipped) AND a separate, explicit,
// persisted "enabled" flag defaulting to OFF — never active by
// accident even in a real local dev session.
if (import.meta.env.DEV) {
  import('./services').then(({ getMockInterfaceEngineSettings }) => {
    if (getMockInterfaceEngineSettings().enabled) {
      import('./mocks/browser').then(({ mockInterfaceEngineWorker }) => {
        mockInterfaceEngineWorker.start({ onUnhandledRequest: 'bypass' });
      });
    }
  });
}

// Batch 344: the signature-confirmation popup returns here
// (/auth/signing/<provider>). It only hands the identity provider's answer
// back to the window that opened it, which then closes it. The app itself
// never starts in the popup: its session code would otherwise treat the
// popup as a second tab of the same session.
const signingProvider = signingCallbackProvider(window.location.pathname);
if (signingProvider) {
  void import('./services/auth/authSessionInstance')
    .then(m => m.signerConfirmation.completePopup(signingProvider, window.location.href))
    .catch(e => console.error('[signing] could not return the confirmation to PathScribe', e));
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {/* Batch 502 (PS-472): the last line of defence; each page and the report page's panels have their own. */}
      <ErrorBoundary scope="app" name="app">
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
