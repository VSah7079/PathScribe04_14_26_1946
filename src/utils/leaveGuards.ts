// src/utils/leaveGuards.ts
// Batch 758 (Pete, Nov 1, 2026: "Add a prompt if the session logs out or closes with items remaining in the bench
// buffer"): screens register what would be left behind if the user signed out now (slides on the Microtome bench not
// yet in a rack, say). Sign-out (hooks/useLogout.ts) asks before going on while any is registered. Held in memory for
// this tab only; nothing is stored.

type LeaveWarning = () => string | null;

const guards = new Map<string, LeaveWarning>();

/** Registers (or replaces) a warning; returns the function that removes it. */
export function registerLeaveGuard(id: string, warning: LeaveWarning): () => void {
  guards.set(id, warning);
  return () => { if (guards.get(id) === warning) guards.delete(id); };
}

/** The warnings that apply now (empty when nothing would be left behind). */
export function leaveWarnings(): string[] {
  const out: string[] = [];
  for (const warning of guards.values()) {
    const text = warning();
    if (text) out.push(text);
  }
  return out;
}

/** Whether to go on signing out: yes when nothing would be left behind, otherwise the user's answer to `ask`. */
export function mayLeave(ask: (message: string) => boolean): boolean {
  const warnings = leaveWarnings();
  return warnings.length === 0 || ask(warnings.join('\n\n'));
}
