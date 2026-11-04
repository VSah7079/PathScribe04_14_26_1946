// src/constants/stainQcActionGroup.ts
// Batch 763: the Post-Stain / Pre-Distribution QC checkpoint's actions (Slide Distribution), as their own group so
// systemActions.ts (over 1,000 lines) does not grow. Spread into ACTION_GROUPS through addedActionGroups.ts. Access
// control is the capabilities (authorization/stainQcCapabilities.ts); a role's grant here records whether the role may
// use the command. None has a phrase or hotkey: each is a deliberate decision on a run or an image picked first
// (services/actionRegistry/permissionOnlyActions.ts). Superadmin gets them all (services/roles/actionSeeds.ts).
//
//   stainQc.signOffRun       sign off a staining run (every slide passed, or failed ones marked)   stain:qc:sign-off
//   stainQc.failSlide        mark a slide of a run failed, with re-stain or re-cut and a reason     stain:qc:sign-off
//   stainQc.overrideVendor   sign off a run that waits for its stainer's own sign-off               stain:qc:override
//   stainQc.releaseImage     release a scanned image to the pathologist                             scan:image-qc:sign-off
//   stainQc.rescanImage      send a scanned image back to be scanned again, with a reason           scan:image-qc:sign-off
import type { ActionGroup } from './systemActions';

export type StainQcActionId =
  | 'stainQc.signOffRun' | 'stainQc.failSlide' | 'stainQc.overrideVendor' | 'stainQc.releaseImage' | 'stainQc.rescanImage';

export const STAIN_QC_ACTION_GROUP: ActionGroup = {
  id: 'stain_qc',
  title: 'Stain & Scan QC',
  actions: [
    { id: 'stainQc.signOffRun', label: 'Sign Off a Staining Run', internalKey: 'F40+PS001' },
    { id: 'stainQc.failSlide', label: 'Fail a Slide at QC', internalKey: 'F40+PS002' },
    { id: 'stainQc.overrideVendor', label: "Sign Off Instead of the Stainer", internalKey: 'F40+PS003' },
    { id: 'stainQc.releaseImage', label: 'Release a Scanned Image', internalKey: 'F40+PS004' },
    { id: 'stainQc.rescanImage', label: 'Send an Image Back to Be Scanned Again', internalKey: 'F40+PS005' },
  ],
};
