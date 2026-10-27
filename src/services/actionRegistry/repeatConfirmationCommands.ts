// src/services/actionRegistry/repeatConfirmationCommands.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the voice commands that are hard to undo ask to be said twice ("confirm by repeating the phrase").
// The first time, nothing runs and the voice bar asks for the phrase again; saying the same command within the
// window (services/voice/voiceCommandRunner.ts) runs it; anything else, or silence, cancels it. A key press is
// already a deliberate act, so hotkeys are not affected.
//
// This is the declaration: a command is in the list, or it is not. Pete decides the list (docs/product/GUIDE_UPDATES.md,
// Batch 650). Commands that open their own confirmation window (Sign Out Case, Confirm Finalise, Discard Unsaved
// Changes, the delegation types) are NOT listed: a second spoken confirmation would be a second click for nothing
// (click economy). The record-leaving or deleting commands that run at once are listed.
// ─────────────────────────────────────────────────────────────────────────────
import type { SystemAction } from './IActionRegistryService';

export const CONFIRM_BY_REPEAT_ACTION_IDS: ReadonlySet<string> = new Set([
  'TABLE_DELETE',          // Delete Row (worklist)
  'MSG_DELETE',            // Delete Message
  'MSG_DELETE_ALL',        // Delete All Selected
  'RECALL_REPORT',         // Recall a released report
  'HOLD_RELEASE',          // Release Case From Hold
  'AUTOPSY_RELEASE_SUBMIT', // Release Autopsy Body
]);

export function withRepeatConfirmation(actions: SystemAction[]): SystemAction[] {
  return actions.map(a => (CONFIRM_BY_REPEAT_ACTION_IDS.has(a.id) ? { ...a, confirmByRepeat: true } : a));
}
