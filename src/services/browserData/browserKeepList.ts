// src/services/browserData/browserKeepList.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 525 (PS-485): the only things PathScribe keeps in browser storage when
// an API server is configured, and the start-up clean-up that removes the
// rest. None of them is patient data.
//
//   preferences  — ps_ui_* (utils/uiPreferences.ts) and the language;
//   workstation  — which scan station, OR terminal and display profile this
//                  computer is, its foot pedal, its companion window
//                  positions (utils/workstationSettings.ts);
//   session      — the minimal signed-in profile (auth/sessionProfile.ts),
//                  the one-session-per-user markers, the signing and
//                  sign-in lockout markers, the SSO sign-in state;
//   public data  — the PubMed headline cache (published literature).
//
// Everything else found in localStorage or sessionStorage on a server
// deployment is a copy left by the demo or an older version (cases, drafts,
// patient history, case masks, cytology QC assignments …) and is removed at
// start-up (removeBrowserDataCopies, called from main.tsx).
// ─────────────────────────────────────────────────────────────────────────────
import { dataMayPersistInBrowser } from './browserDataPolicy';

export interface KeepList { keys: readonly string[]; prefixes: readonly string[] }

export const LOCAL_KEEP: KeepList = {
  keys: [
    'pathscribe_language',                     // i18n/config.ts
    'pathscribe-user',                         // auth/sessionProfile.ts (minimal form on a server deployment)
    'pathscribe_footpedal_bindings',           // hooks/useFootPedal.ts
    'pathscribe_current_display_profile_id',   // hooks/useCurrentDisplayProfile.ts
    'pathscribe_current_scan_station_id',      // hooks/useCurrentScanStation.ts, utils/effectiveScanStation.ts
    'pathscribe_scan_station_prompted',        // hooks/useCurrentScanStation.ts
    'pathscribe_current_or_terminal_id',       // hooks/useCurrentOrTerminal.ts
  ],
  prefixes: [
    'ps_ui_',                                  // utils/uiPreferences.ts
    'ps-companion-window-geometry-',           // hooks/useCompanionWindow.ts
    'pathscribe_active_session_',              // session/sessionSupersedeService.ts
    'pathscribe_signing_lock_',                // auth/authSessionInstance.ts
    'pathscribe.sso',                          // auth/sso/ssoClient.ts (sign-in state)
    'pathscribe_pubmed_ticker_',               // research/pubmedResearchFeedService.ts (public literature)
  ],
};

export const SESSION_KEEP: KeepList = {
  keys: [
    'pathscribe:desktopViewOverride',          // utils/deviceDetection.ts
    'pathscribe_signing_confirmed_session',    // auth/authSessionInstance.ts
    'pathscribe_own_session_id',               // session/sessionSupersedeService.ts
    'pathscribe_show_superseded_notice',       // session/sessionSupersedeService.ts
    'ps_biometric_session',                    // biometric (this tab's verification marker)
    'ps_worklist_branch',                      // utils/uiPreferences.ts session flags (worklist filter for this tab)
    'ps_worklist_context',                     //   ″
    'ps_drawer_open',                          //   ″ (navigation drawer)
    'ps_reopen_messages',                      //   ″ (reopen the messages panel)
    'ps_voice_ai_available',                   //   ″ (contexts/VoiceProvider.tsx)
  ],
  prefixes: ['pathscribe.sso'],                // auth/sso/ssoClient.ts (tokens, this tab only)
};

export function isKept(key: string, list: KeepList): boolean {
  return list.keys.includes(key) || list.prefixes.some(p => key.startsWith(p));
}

/** The keys in a storage area that are not on the keep list (pure). */
export function keysToRemove(keys: readonly string[], list: KeepList): string[] {
  return keys.filter(k => !isKept(k, list));
}

function keysOf(area: Storage): string[] {
  const out: string[] = [];
  for (let i = 0; i < area.length; i++) { const k = area.key(i); if (k !== null) out.push(k); }
  return out;
}

/**
 * On a server deployment, removes every key that isn't on the keep list from
 * localStorage and sessionStorage; returns how many. In the demo it does
 * nothing (the demo's data lives there).
 */
export function removeBrowserDataCopies(
  areas: { local?: Storage | null; session?: Storage | null } = { local: safe('local'), session: safe('session') },
  mayKeepData: boolean = dataMayPersistInBrowser(),
): number {
  if (mayKeepData) return 0;
  let removed = 0;
  for (const [area, list] of [[areas.local, LOCAL_KEEP], [areas.session, SESSION_KEEP]] as const) {
    if (!area) continue;
    try {
      for (const key of keysToRemove(keysOf(area), list)) { area.removeItem(key); removed++; }
    } catch { /* storage blocked: nothing to remove */ }
  }
  return removed;
}

function safe(kind: 'local' | 'session'): Storage | null {
  try { return (kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage) ?? null; } catch { return null; }
}
