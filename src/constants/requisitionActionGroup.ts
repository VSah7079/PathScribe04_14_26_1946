// src/constants/requisitionActionGroup.ts
// Batch 762 (Pete, Nov 2, 2026: "have the new capabilities been built into the Action list and available for role
// assignment?"): the Requisition Inbox's actions, as their own group so systemActions.ts (over 1,000 lines) does not
// grow. Spread into ACTION_GROUPS through addedActionGroups.ts. Access control is the capabilities
// (authorization/requisitionCapabilities.ts); a role's grant here records whether the role may use the command.
//
//   requisition.openInbox      Go to the Requisition Inbox (the Accession screen's button)   requisition:inbox:review
//   requisition.runNow         run ingestion now (screen action, Alt+G; voice)               requisition:ingestion:run
//   requisition.view           view a scanned requisition (a row picked first)               requisition:inbox:review
//   requisition.link           link a queued scan to a case (an accession scanned or typed)  requisition:inbox:resolve
//   requisition.discard        discard a queued scan with a reason (deliberate click)        requisition:inbox:resolve
//   requisition.openFromCase   show the case's requisition from the report header            case:requisition:view
// The ones with no phrase or hotkey are classified in services/actionRegistry/permissionOnlyActions.ts. Phrases:
// services/actionRegistry/requisitionVoiceCommands.ts and spanishVoiceTriggers.ts. The screen listens in
// hooks/useRequisitionActionEvents.ts.
import type { ActionGroup } from './systemActions';

export type RequisitionActionId =
  | 'requisition.openInbox' | 'requisition.runNow' | 'requisition.view' | 'requisition.link' | 'requisition.discard' | 'requisition.openFromCase';

/** The context the Requisition Inbox sets with actionRegistryService.setCurrentContext while it is open. */
export const REQUISITION_VOICE_CONTEXT = 'REQUISITIONS';

export const REQUISITION_ACTION_GROUP: ActionGroup = {
  id: 'requisition_inbox',
  title: 'Requisition Inbox',
  actions: [
    { id: 'requisition.openInbox', label: 'Go to the Requisition Inbox', internalKey: 'F39+PS001' },
    { id: 'requisition.runNow', label: 'Run Requisition Ingestion Now', internalKey: 'F39+PS002' },
    { id: 'requisition.view', label: 'View a Scanned Requisition', internalKey: 'F39+PS003' },
    { id: 'requisition.link', label: 'Link an Unmatched Requisition to a Case', internalKey: 'F39+PS004' },
    { id: 'requisition.discard', label: 'Discard an Unmatched Requisition', internalKey: 'F39+PS005' },
    { id: 'requisition.openFromCase', label: "Show the Case's Requisition", internalKey: 'F39+PS006' },
  ],
};
