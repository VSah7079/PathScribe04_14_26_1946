// src/constants/lockboxActionGroup.ts
// Batch 645: the Lockbox Drop-Off screen's actions, as their own group so systemActions.ts (over 1,000 lines) does not grow
// (CLAUDE.md rule 10). Spread into ACTION_GROUPS through addedActionGroups.ts.
//
//   lockbox.open               Go to Lockbox Drop-Off (Go to prefix, Alt+Shift+Z). Needs screen:lockbox-drop-off:open to land.
//   lockbox.focusScan          move the cursor back to the scan field                    (screen action, Alt+S)
//   lockbox.markUrgent         arm or clear Urgent for the next drop                      (screen action, Alt+G)
//   lockbox.showDropOff        switch to the Drop-Off tab                                 (screen action, Alt+D)
//   lockbox.showFolder         switch to the Overnight folder tab (lockbox:folder:review) (screen action, Alt+M)
//   lockbox.markAccessioned    deliberate click on a folder row (lockbox:folder:review): no voice phrase or hotkey
//   lockbox.resolvePlaceholder deliberate click, needs the real number typed (lockbox:placeholder:resolve): no voice phrase or hotkey
// The last two are classified in services/actionRegistry/permissionOnlyActions.ts. Voice phrases and hotkeys:
// services/actionRegistry/lockboxVoiceCommands.ts and spanishVoiceTriggers.ts. The screen listens in
// pages/LockboxDropOffPage/hooks/useLockboxActionEvents.ts.
import type { ActionGroup } from './systemActions';

export type LockboxActionId =
  | 'lockbox.open' | 'lockbox.focusScan' | 'lockbox.markUrgent' | 'lockbox.showDropOff' | 'lockbox.showFolder'
  | 'lockbox.markAccessioned' | 'lockbox.resolvePlaceholder';

/** The context the screen sets with actionRegistryService.setCurrentContext while it is open. */
export const LOCKBOX_VOICE_CONTEXT = 'LOCKBOX';

export const LOCKBOX_ACTION_GROUP: ActionGroup = {
  id: 'lockbox_drop_off',
  title: 'Lockbox Drop-Off',
  actions: [
    { id: 'lockbox.open', label: 'Go to Lockbox Drop-Off', internalKey: 'F36+PS001' },
    { id: 'lockbox.focusScan', label: 'Focus the Lockbox Scan Field', internalKey: 'F36+PS002' },
    { id: 'lockbox.markUrgent', label: 'Mark the Next Lockbox Drop Urgent', internalKey: 'F36+PS003' },
    { id: 'lockbox.showDropOff', label: 'Show Lockbox Drop-Off', internalKey: 'F36+PS004' },
    { id: 'lockbox.showFolder', label: 'Show the Overnight Folder', internalKey: 'F36+PS005' },
    { id: 'lockbox.markAccessioned', label: 'Mark a Lockbox Specimen Accessioned', internalKey: 'F36+PS006' },
    { id: 'lockbox.resolvePlaceholder', label: 'Link a Lockbox Placeholder to its Order', internalKey: 'F36+PS007' },
  ],
};
