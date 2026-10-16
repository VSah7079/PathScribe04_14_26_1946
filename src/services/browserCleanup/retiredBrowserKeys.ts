// src/services/browserCleanup/retiredBrowserKeys.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: browser copies the app no longer uses, removed once at start-up
// so they don't linger on shared workstations.
//
//   • ps_orch_sections_<caseId>: AI draft report sections. The case record is
//     now the only copy (Pete: a browser copy could override a newer save made
//     at another workstation). These held report text, so they go.
//   • ps_state_<templateId>: the reviewer page's own copy of a template's
//     lifecycle state; the template service's status is the one record.
//   • pathscribe_pool_access_requested, pathscribe_ped_requested,
//     pathscribe_orch_requested: "access already requested" markers, kept per
//     computer. The badges now come from the person's own access requests.
//   • pathscribe_mock_fppe_assignments: the retired legacy FPPE assignment
//     store (Batch 515, PS-124). FPPE assignments live in the QA supervision
//     service; nothing reads this copy any more.
//
// Settings that moved to a per-person or lab-wide service are NOT listed here:
// their services read the old value once and carry it over.
// ─────────────────────────────────────────────────────────────────────────────

export const RETIRED_BROWSER_KEYS: readonly string[] = [
  'pathscribe_pool_access_requested',
  'pathscribe_ped_requested',
  'pathscribe_orch_requested',
  'pathscribe_mock_fppe_assignments',
];

export const RETIRED_BROWSER_KEY_PREFIXES: readonly string[] = [
  'ps_orch_sections_',
  'ps_state_',
];

/** Removes the retired keys from a storage area; returns how many it removed. */
export function removeRetiredBrowserKeys(storage: Storage | undefined = safeLocalStorage()): number {
  if (!storage) return 0;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      if (RETIRED_BROWSER_KEYS.includes(key) || RETIRED_BROWSER_KEY_PREFIXES.some(p => key.startsWith(p))) doomed.push(key);
    }
    for (const key of doomed) storage.removeItem(key);
    return doomed.length;
  } catch {
    return 0; // storage blocked: nothing to clean
  }
}

function safeLocalStorage(): Storage | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}
