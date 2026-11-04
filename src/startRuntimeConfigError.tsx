// src/startRuntimeConfigError.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d): shown instead of the app when the deployment's
// config.json can't be read or breaks a rule (main.tsx). Loads only the
// translations and styles, no service.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './pathscribe.css';
import './i18n/config';
import { RuntimeConfigErrorScreen } from './components/RuntimeConfigError/RuntimeConfigErrorScreen';
import type { RuntimeConfigProblem } from './services/runtimeConfig/runtimeSettings';

export function showRuntimeConfigError(problems: RuntimeConfigProblem[]): void {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RuntimeConfigErrorScreen problems={problems} />
    </React.StrictMode>,
  );
}
