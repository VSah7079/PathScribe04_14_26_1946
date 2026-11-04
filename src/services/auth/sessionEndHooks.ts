// src/services/auth/sessionEndHooks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539): things held for the signed-in user in this window that
// must go when the session ends (sign-out, or a session taken over), so the
// next person at a shared bench workstation never sees them. authSession
// calls runSessionEndHooks from endSession; the export service registers its
// reset here. A leaf module, so neither side imports the other.
// ─────────────────────────────────────────────────────────────────────────────
const hooks = new Set<() => void>();

export function onSessionEnd(hook: () => void): () => void {
  hooks.add(hook);
  return () => { hooks.delete(hook); };
}

export function runSessionEndHooks(): void {
  for (const h of [...hooks]) {
    try { h(); } catch { /* one hook failing never stops the sign-out */ }
  }
}
