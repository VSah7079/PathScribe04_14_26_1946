// deploy/security-headers/securityHeaders.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Batch 503 (PS-474): the ONE definition of PathScribe's browser security
// headers. Every hosting option's config (nginx, IIS / Azure App Service,
// Azure Static Web Apps, Azure Front Door, Vercel for the demo) is generated
// from this by scripts/generate-security-headers.mjs, so they can't drift.
// Plain JavaScript (no build step), so a hospital's IT can run the generator.
//
// Why each directive is what it is: deploy/security-headers/README.md.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {{ connect?: string[]; hub?: string[]; formAction?: string[]; frame?: string[]; img?: string[]; https?: boolean; workstationBridges?: boolean; terminologyViaServer?: boolean }} DeploymentOrigins */

const uniq = list => [...new Set(list.filter(Boolean))];

/** Origins every deployment talks to from the browser (public reference data). */
export const PUBMED_ORIGINS = [
  'https://eutils.ncbi.nlm.nih.gov',     // PubMed research feed (no key since Batch 499)
];

/**
 * Batch 617 (PS-488): the NLM clinical tables (ICD-10-CM, ICD-11, LOINC look-ups). The demonstration calls
 * them from the browser. A deployment with the PathScribe API server sets "terminologyViaServer": true in its
 * origins file: the server makes those calls (docs/architecture/TERMINOLOGY_PROXY_API.md), so the browser
 * policy no longer names the host.
 */
export const TERMINOLOGY_PUBLIC_ORIGINS = [
  'https://clinicaltables.nlm.nih.gov',
];

export const PUBLIC_REFERENCE_ORIGINS = [...PUBMED_ORIGINS, ...TERMINOLOGY_PUBLIC_ORIGINS];

/**
 * Batch 546 (finding F4): the workstation print bridges, which listen on the
 * user's own computer (loopback only, never the network):
 *   - the PathScribe workstation agent: wss:// for printing and https:// for
 *     the scale, on its three standard ports (AGENT_PORTS,
 *     src/utils/labels/pathscribeAgent/agentProtocol.ts). An agent moved to
 *     another port (a printer profile's agentPort) needs that origin added
 *     under `connect` in the deployment's origins file.
 *   - QZ Tray 2.2: its secure ports on its two host names (qz-tray.js
 *     connectConfig). Its plain ws:// ports would be mixed content on an
 *     https page, so they're listed only for a deployment on plain http.
 * Without these the browser blocked both bridges. A deployment with neither
 * sets "workstationBridges": false.
 */
export const WORKSTATION_BRIDGE_ORIGINS = [
  ...[9100, 9101, 9102].flatMap(p => [`wss://127.0.0.1:${p}`, `https://127.0.0.1:${p}`]),
  ...['localhost', 'localhost.qz.io'].flatMap(h => [8181, 8282, 8383, 8484].map(p => `wss://${h}:${p}`)),
];

/** An origin as CSP wants it: scheme://host[:port], no path. A wss:// origin is kept (SignalR). */
export function originOf(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/^(https?|wss?):$/.test(u.protocol)) return null;
    return `${u.protocol}//${u.host}`;
  } catch { return null; }
}

/**
 * Batch 547 (PS-539 phase 2d): the addresses in a deployment's config.json
 * (deploy/runtime-config/) that the browser calls, by where the policy needs
 * them. `node scripts/generate-security-headers.mjs <origins.json> <outDir>
 * --runtime-config <config.json>` adds them, so an address set in config.json
 * is never blocked by the policy. A path on this site needs nothing.
 */
export const RUNTIME_CONFIG_ORIGIN_KEYS = {
  connect: [
    'VITE_API_BASE_URL', 'VITE_REPORT_PDF_ENDPOINT', 'VITE_INTERFACE_RECEIVER_ENDPOINT',
    'VITE_AI_PROXY_URL', 'VITE_AI_MANAGED_ENDPOINT', 'VITE_AI_CUSTOM_ENDPOINT',
    'VITE_NLM_BASE_URL', 'VITE_CPT_PROXY_URL', 'VITE_ICD10_PROXY_URL',
    'VITE_ENHANCEMENT_REQUEST_URL',   // the website the enhancement requests are delivered to
    'VITE_ERROR_MONITORING_DSN',   // Batch 590 (PS-469): the monitoring ingest origin (the key in the address is dropped)
    'VITE_AUTH_MICROSOFT_AUTHORITY', 'VITE_AUTH_GOOGLE_AUTHORITY', 'VITE_AUTH_OIDC_AUTHORITY',
  ],
  hub: ['VITE_LIVE_UPDATES_HUB_URL'],
  formAction: ['VITE_AUTH_MICROSOFT_AUTHORITY', 'VITE_AUTH_GOOGLE_AUTHORITY', 'VITE_AUTH_OIDC_AUTHORITY'],
};

/** A deployment's origins with its config.json's addresses added. */
export function originsWithRuntimeConfig(origins = {}, runtimeConfig = {}) {
  const pick = keys => keys.map(k => runtimeConfig[k]).filter(v => typeof v === 'string' && /^https?:\/\//.test(v));
  return {
    ...origins,
    connect: uniq([...(origins.connect ?? []), ...pick(RUNTIME_CONFIG_ORIGIN_KEYS.connect)]),
    hub: uniq([...(origins.hub ?? []), ...pick(RUNTIME_CONFIG_ORIGIN_KEYS.hub)]),
    formAction: uniq([...(origins.formAction ?? []), ...pick(RUNTIME_CONFIG_ORIGIN_KEYS.formAction)]),
  };
}

/** The Content-Security-Policy value for a deployment. */
export function contentSecurityPolicy(origins = {}) {
  // The SignalR hub (live updates) needs both its https:// form (negotiate) and
  // its wss:// form (the WebSocket). The only other WebSocket origins are the
  // loopback workstation bridges (WORKSTATION_BRIDGE_ORIGINS) and any listed
  // under `connect`.
  const hub = (origins.hub ?? []).map(originOf).filter(Boolean).flatMap(o =>
    o.startsWith('https://') ? [o, `wss://${o.slice(8)}`] : o.startsWith('http://') ? [o, `ws://${o.slice(7)}`] : [o]);
  // On plain http (https: false) QZ Tray uses its insecure ws:// ports instead.
  const qzInsecure = origins.https === false
    ? ['localhost', 'localhost.qz.io'].flatMap(h => [8182, 8283, 8384, 8485].map(p => `ws://${h}:${p}`)) : [];
  const bridges = origins.workstationBridges === false ? [] : [...WORKSTATION_BRIDGE_ORIGINS, ...qzInsecure];
  const connect = uniq(['\'self\'', ...PUBMED_ORIGINS, ...(origins.terminologyViaServer === true ? [] : TERMINOLOGY_PUBLIC_ORIGINS), ...(origins.connect ?? []).map(originOf), ...hub, ...bridges]);
  const directives = [
    ['default-src', ['\'self\'']],
    // No inline script, no eval. 'wasm-unsafe-eval' only lets WebAssembly compile
    // (the spell checker, Hunspell); it does not allow eval() or new Function().
    ['script-src', ['\'self\'', '\'wasm-unsafe-eval\'']],
    // 'unsafe-inline' for STYLES only: sanitised report HTML keeps text-align
    // style attributes, the rich-text editor sets style attributes, and the print
    // windows write a <style> block. Style injection can't run script.
    ['style-src', ['\'self\'', '\'unsafe-inline\'']],
    ['img-src', uniq(['\'self\'', 'data:', 'blob:', ...(origins.img ?? []).map(originOf)])],
    ['font-src', ['\'self\'', 'data:']],
    ['connect-src', uniq(connect)],
    ['worker-src', ['\'self\'', 'blob:']],
    ['frame-src', uniq(['\'self\'', 'blob:', ...(origins.frame ?? []).map(originOf)])],
    ['frame-ancestors', ['\'none\'']],
    ['form-action', uniq(['\'self\'', ...(origins.formAction ?? []).map(originOf)])],
    ['base-uri', ['\'self\'']],
    ['object-src', ['\'none\'']],
    ['manifest-src', ['\'self\'']],
  ];
  const parts = directives.map(([name, values]) => `${name} ${values.join(' ')}`);
  if (origins.https !== false) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/** The full header set, as [name, value] pairs, in a fixed order. */
export function securityHeaders(origins = {}) {
  const headers = [
    ['Content-Security-Policy', contentSecurityPolicy(origins)],
    ['X-Content-Type-Options', 'nosniff'],
    // Legacy partner of frame-ancestors 'none', for older browsers.
    ['X-Frame-Options', 'DENY'],
    // Addresses can carry case ids and search text; send none to other sites.
    ['Referrer-Policy', 'no-referrer'],
    // Camera (grossing photos), microphone (dictation) and screen capture
    // (enhancement-request screenshots) for PathScribe itself; everything else off.
    ['Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), interest-cohort=()'],
    ['Cross-Origin-Resource-Policy', 'same-origin'],
  ];
  if (origins.https !== false) headers.splice(1, 0, ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains']);
  return headers;
}
