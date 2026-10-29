// src/services/runtimeConfig/runtimeEnv.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d). The one place the app reads its deployment
// settings: `appEnv().VITE_X`. A value from /config.json (set once at start-up
// by main.tsx, before any service module loads) wins over the build's own
// VITE_X; with no config.json the build's values are used, as before.
//
// Each build-time variable is named here one by one (`import.meta.env.VITE_X`),
// never `import.meta.env` as a whole: Vite would otherwise copy every VITE_
// variable into the bundle (services/security/envExposure.guard.test.ts). They
// are read on each call, so tests that stub a variable still see it.
// ─────────────────────────────────────────────────────────────────────────────
import type { RuntimeSettings, ServerHosting } from './runtimeSettings';

let fromConfig: Readonly<RuntimeSettings> = Object.freeze({});
let hosting: Readonly<ServerHosting> = Object.freeze({});

/** Batch 557: called once, by main.tsx, with /api/config's hosting block. */
export function setServerHosting(value: ServerHosting | undefined): void {
  hosting = Object.freeze({ ...(value ?? {}) });
}

/** Batch 557: where the deployment keeps its data (database and file storage regions), from the API server. Empty in the demo. */
export function serverHosting(): Readonly<ServerHosting> {
  return hosting;
}

/** Called once, by main.tsx, with config.json's checked values. */
export function setRuntimeSettings(values: RuntimeSettings): void {
  fromConfig = Object.freeze({ ...values });
}

/** The settings that came from config.json (for the About / system information view). */
export function runtimeSettingsFromConfig(): Readonly<RuntimeSettings> {
  return fromConfig;
}

function buildTimeEnv(): ImportMetaEnv {
  return {
    VITE_AI_CUSTOM_ENDPOINT: import.meta.env.VITE_AI_CUSTOM_ENDPOINT,
    VITE_AI_GATEWAY_REGION: import.meta.env.VITE_AI_GATEWAY_REGION,
    VITE_AI_HOSTING_REGION: import.meta.env.VITE_AI_HOSTING_REGION,
    VITE_AI_MANAGED_DEPLOYMENT: import.meta.env.VITE_AI_MANAGED_DEPLOYMENT,
    VITE_AI_MANAGED_ENDPOINT: import.meta.env.VITE_AI_MANAGED_ENDPOINT,
    VITE_AI_MAX_TOKENS: import.meta.env.VITE_AI_MAX_TOKENS,
    VITE_AI_MODEL: import.meta.env.VITE_AI_MODEL,
    VITE_AI_PROVIDER: import.meta.env.VITE_AI_PROVIDER,
    VITE_AI_PROXY_URL: import.meta.env.VITE_AI_PROXY_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    VITE_AUTH_GOOGLE_API_SCOPE: import.meta.env.VITE_AUTH_GOOGLE_API_SCOPE,
    VITE_AUTH_GOOGLE_AUTHORITY: import.meta.env.VITE_AUTH_GOOGLE_AUTHORITY,
    VITE_AUTH_GOOGLE_CLIENT_ID: import.meta.env.VITE_AUTH_GOOGLE_CLIENT_ID,
    VITE_AUTH_GOOGLE_LINK_BY_EMAIL: import.meta.env.VITE_AUTH_GOOGLE_LINK_BY_EMAIL,
    VITE_AUTH_GOOGLE_SCOPES: import.meta.env.VITE_AUTH_GOOGLE_SCOPES,
    VITE_AUTH_MICROSOFT_API_SCOPE: import.meta.env.VITE_AUTH_MICROSOFT_API_SCOPE,
    VITE_AUTH_MICROSOFT_AUTHORITY: import.meta.env.VITE_AUTH_MICROSOFT_AUTHORITY,
    VITE_AUTH_MICROSOFT_CLIENT_ID: import.meta.env.VITE_AUTH_MICROSOFT_CLIENT_ID,
    VITE_AUTH_MICROSOFT_LINK_BY_EMAIL: import.meta.env.VITE_AUTH_MICROSOFT_LINK_BY_EMAIL,
    VITE_AUTH_MICROSOFT_SCOPES: import.meta.env.VITE_AUTH_MICROSOFT_SCOPES,
    VITE_AUTH_MODE: import.meta.env.VITE_AUTH_MODE,
    VITE_PWNED_CHECK: import.meta.env.VITE_PWNED_CHECK,
    VITE_AUTH_OIDC_API_SCOPE: import.meta.env.VITE_AUTH_OIDC_API_SCOPE,
    VITE_AUTH_OIDC_AUTHORITY: import.meta.env.VITE_AUTH_OIDC_AUTHORITY,
    VITE_AUTH_OIDC_CLIENT_ID: import.meta.env.VITE_AUTH_OIDC_CLIENT_ID,
    VITE_AUTH_OIDC_LINK_BY_EMAIL: import.meta.env.VITE_AUTH_OIDC_LINK_BY_EMAIL,
    VITE_AUTH_OIDC_SCOPES: import.meta.env.VITE_AUTH_OIDC_SCOPES,
    VITE_BABAKHANI_EMAIL: import.meta.env.VITE_BABAKHANI_EMAIL,
    VITE_BIOMETRIC_SIGN_IN: import.meta.env.VITE_BIOMETRIC_SIGN_IN,
    VITE_REGULATORY_PROFILE: import.meta.env.VITE_REGULATORY_PROFILE,
    VITE_CPT_PROXY_URL: import.meta.env.VITE_CPT_PROXY_URL,
    VITE_ENHANCEMENT_EMAIL: import.meta.env.VITE_ENHANCEMENT_EMAIL,
    VITE_ENHANCEMENT_REQUEST_URL: import.meta.env.VITE_ENHANCEMENT_REQUEST_URL,
    VITE_ERROR_MONITORING_DSN: import.meta.env.VITE_ERROR_MONITORING_DSN,
    VITE_ERROR_MONITORING_ENV: import.meta.env.VITE_ERROR_MONITORING_ENV,
    VITE_ICD10_PROXY_URL: import.meta.env.VITE_ICD10_PROXY_URL,
    VITE_INTERFACE_RECEIVER_ENDPOINT: import.meta.env.VITE_INTERFACE_RECEIVER_ENDPOINT,
    VITE_LIVE_UPDATES_HUB_URL: import.meta.env.VITE_LIVE_UPDATES_HUB_URL,
    VITE_NLM_BASE_URL: import.meta.env.VITE_NLM_BASE_URL,
    VITE_REPORT_PDF_ENDPOINT: import.meta.env.VITE_REPORT_PDF_ENDPOINT,
    VITE_SERVER_JOBS: import.meta.env.VITE_SERVER_JOBS,
    VITE_VOICE_ENABLED: import.meta.env.VITE_VOICE_ENABLED,
  } as ImportMetaEnv;
}

/** The deployment's settings: config.json's values over the build's. */
export function appEnv(): ImportMetaEnv {
  return { ...buildTimeEnv(), ...fromConfig } as ImportMetaEnv;
}
