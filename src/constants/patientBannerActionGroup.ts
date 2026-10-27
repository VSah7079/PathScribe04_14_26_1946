// src/constants/patientBannerActionGroup.ts
// Batch 662: the patient banner's actions, as their own group so systemActions.ts (over 1,000 lines) does not grow.
// Spread into ACTION_GROUPS through addedActionGroups.ts.
//
//   banner.showNhsStatus   open the NHS number status explanation on the case banner (report screen, Ctrl+Alt+Shift+9).
//                          A view command: it reads, it changes nothing. The badge listens in components/Common/NhsNumberBadge.tsx.
// Voice phrases and hotkey: services/actionRegistry/patientBannerCommands.ts and spanishVoiceTriggers.ts.
import type { ActionGroup } from './systemActions';

export type PatientBannerActionId = 'banner.showNhsStatus';

export const PATIENT_BANNER_ACTION_GROUP: ActionGroup = {
  id: 'patient_banner',
  title: 'Patient Banner',
  actions: [{ id: 'banner.showNhsStatus', label: 'Show NHS Number Status', internalKey: 'F37+PS001' }],
};
