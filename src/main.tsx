// src/main.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d, readiness review §9 item 1): one build serves
// every deployment. Before anything else loads, the app reads the deployment's
// /config.json (services/runtimeConfig/loadRuntimeConfig.ts). Then it starts
// (startApp.tsx, everything main.tsx did before), or, if config.json breaks a
// rule, it shows what is wrong instead of starting wrongly.
// Batch 557: with an API server, its /api/config is read too (settings and
// where it keeps its data), and merged under config.json's own values.
// docs/architecture/RUNTIME_CONFIG.md.
// ─────────────────────────────────────────────────────────────────────────────
import { loadRuntimeConfig } from './services/runtimeConfig/loadRuntimeConfig';
import { setRuntimeSettings, setServerHosting } from './services/runtimeConfig/runtimeEnv';

const config = await loadRuntimeConfig(
  (url, init) => fetch(url, init),
  `${import.meta.env.BASE_URL}config.json`,
  {
    demoBuild: __DEMO_TOOLS__,
    buildApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    buildAuthMode: import.meta.env.VITE_AUTH_MODE,
    isProduction: import.meta.env.PROD,
  },
);

if (config.problems.length) {
  const { showRuntimeConfigError } = await import('./startRuntimeConfigError');
  showRuntimeConfigError(config.problems);
} else {
  setRuntimeSettings(config.values);
  // Batch 557: where the deployment keeps its data, from the API server's /api/config.
  setServerHosting(config.hosting);
  if (config.server === 'unavailable') console.warn('[config] The PathScribe server\'s /api/config did not answer; starting with config.json alone.');
  await import('./startApp');
}
