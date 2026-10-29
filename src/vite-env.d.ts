/// <reference types="vite/client" />
/** Semantic version string from package.json, injected by vite.config.ts define. */
declare const __APP_VERSION__: string;

// Real, direct follow-up (PS-61): all 22 real VITE_* env vars actually read
// anywhere in src/ (confirmed via grep, not assumed — see this ticket's own
// history for the exact count) were previously untyped, so a typo'd or
// renamed var name compiled clean and silently read as undefined at
// runtime. Standard Vite pattern: augment ImportMetaEnv here so tsc catches
// that instead. Every one of these is genuinely optional at the type level
// (string | undefined) — every real call site already reads them
// defensively (?? 'default', === 'true', etc.), so typing them as
// non-optional would be dishonest and would just force new `!` assertions
// at each site instead of reflecting how they're actually used.
// Batch 444: no API key is ever a VITE_ variable. Anything named VITE_ is
// copied into the browser bundle, so the AI, Gemini and NCBI keys moved to
// the server side (vite.config.ts proxy in development, the API server in
// production; docs/architecture/AI_PROXY.md).
interface ImportMetaEnv {
  readonly VITE_AI_CUSTOM_ENDPOINT?: string;
  readonly VITE_AI_GATEWAY_REGION?: string;
  /** Batch 536 (PS-558): the hosting region of the AI service (all but model_gateway). */
  readonly VITE_AI_HOSTING_REGION?: string;
  readonly VITE_AI_MANAGED_DEPLOYMENT?: string;
  readonly VITE_AI_MANAGED_ENDPOINT?: string;
  readonly VITE_AI_MAX_TOKENS?: string;
  readonly VITE_AI_MODEL?: string;
  readonly VITE_AI_PROVIDER?: string;
  readonly VITE_AI_PROXY_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_VERSION?: string;
  // PS-60 (Batch 343): sign-in. See services/auth/authConfig.ts.
  readonly VITE_AUTH_GOOGLE_API_SCOPE?: string;
  readonly VITE_AUTH_GOOGLE_AUTHORITY?: string;
  readonly VITE_AUTH_GOOGLE_CLIENT_ID?: string;
  readonly VITE_AUTH_GOOGLE_LINK_BY_EMAIL?: string;
  readonly VITE_AUTH_GOOGLE_SCOPES?: string;
  readonly VITE_AUTH_MICROSOFT_API_SCOPE?: string;
  readonly VITE_AUTH_MICROSOFT_AUTHORITY?: string;
  readonly VITE_AUTH_MICROSOFT_CLIENT_ID?: string;
  readonly VITE_AUTH_MICROSOFT_LINK_BY_EMAIL?: string;
  readonly VITE_AUTH_MICROSOFT_SCOPES?: string;
  readonly VITE_AUTH_MODE?: string;
  /** Batch 456: "off" skips the Pwned Passwords check when a password is set (staffPasswords/passwordScreening.ts). */
  readonly VITE_PWNED_CHECK?: string;
  readonly VITE_AUTH_OIDC_API_SCOPE?: string;
  readonly VITE_AUTH_OIDC_AUTHORITY?: string;
  readonly VITE_AUTH_OIDC_CLIENT_ID?: string;
  readonly VITE_AUTH_OIDC_LINK_BY_EMAIL?: string;
  readonly VITE_AUTH_OIDC_SCOPES?: string;
  readonly VITE_BABAKHANI_EMAIL?: string;
  readonly VITE_CPT_PROXY_URL?: string;
  readonly VITE_ENHANCEMENT_EMAIL?: string;
  readonly VITE_ENHANCEMENT_REQUEST_URL?: string;
  /** Batch 590 (PS-469): where scrubbed crash reports go (public-key address); monitoring is off without it and VITE_ERROR_MONITORING_ENV. */
  readonly VITE_ERROR_MONITORING_DSN?: string;
  readonly VITE_ERROR_MONITORING_ENV?: string;
  readonly VITE_ICD10_PROXY_URL?: string;
  readonly VITE_INTERFACE_RECEIVER_ENDPOINT?: string;
  // PS-262 (Batch 342): the SignalR hub. See services/liveUpdates/liveUpdateService.ts.
  readonly VITE_LIVE_UPDATES_HUB_URL?: string;
  // Low-consequence by design (raises a public rate limit only); see services/research/README.md.
  readonly VITE_NLM_BASE_URL?: string;
  readonly VITE_REPORT_PDF_ENDPOINT?: string;
  readonly VITE_VOICE_ENABLED?: string;
  /** Batch 617 (PS-512): "false" turns biometric sign-in off for the whole deployment. See services/biometric/biometricDeploymentSwitch.ts. */
  readonly VITE_BIOMETRIC_SIGN_IN?: string;
  /** Batch 679: "documentation" (default) or "clinical_support". See services/regulatoryProfile/regulatoryProfile.ts. */
  readonly VITE_REGULATORY_PROFILE?: string;
  /** Batch 555: the recurring jobs the API server runs (comma-separated, MESSAGE_BUS_API.md §5); the browser stops standing in for those. */
  readonly VITE_SERVER_JOBS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Batch 527 (PS-486): true in the demo build (no API server); demo and developer screens are left out otherwise. */
declare const __DEMO_TOOLS__: boolean;
