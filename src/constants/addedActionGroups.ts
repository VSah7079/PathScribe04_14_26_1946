// src/constants/addedActionGroups.ts
// Groups added after the main list, each in its own file so systemActions.ts (over 1,000 lines) does not grow.
// Spread into ACTION_GROUPS there (Batch 619 Outbound Queue, Batch 637 results and registry, Batch 645 Lockbox Drop-Off, Batch 762 Requisition Inbox, Batch 763 Stain & Scan QC).
import { OUTBOUND_QUEUE_ACTION_GROUP } from './outboundQueueActionGroup';
import { RESULT_REGISTRY_ACTION_GROUP } from './resultRegistryActionGroup';
import { LOCKBOX_ACTION_GROUP } from './lockboxActionGroup';
import { PATIENT_BANNER_ACTION_GROUP } from './patientBannerActionGroup';
import { WORKLIST_ROW_ACTION_GROUP } from './worklistRowActionGroup';
import { CASE_TEAM_ACTION_GROUP } from './caseTeamActionGroup';
import { GROSSING_BENCH_ACTION_GROUP } from './grossingBenchActionGroup';
import { REQUISITION_ACTION_GROUP } from './requisitionActionGroup';
import { STAIN_QC_ACTION_GROUP } from './stainQcActionGroup';
export type { ResultRegistryActionId } from './resultRegistryActionGroup';
export type { LockboxActionId } from './lockboxActionGroup';
export type { PatientBannerActionId } from './patientBannerActionGroup';
export type { WorklistRowActionId } from './worklistRowActionGroup';
export type { CaseTeamActionId } from './caseTeamActionGroup';
export type { GrossingBenchActionId } from './grossingBenchActionGroup';
export type { RequisitionActionId } from './requisitionActionGroup';
export type { StainQcActionId } from './stainQcActionGroup';

export const ADDED_ACTION_GROUPS = [OUTBOUND_QUEUE_ACTION_GROUP, RESULT_REGISTRY_ACTION_GROUP, LOCKBOX_ACTION_GROUP, PATIENT_BANNER_ACTION_GROUP, WORKLIST_ROW_ACTION_GROUP, CASE_TEAM_ACTION_GROUP, GROSSING_BENCH_ACTION_GROUP, REQUISITION_ACTION_GROUP, STAIN_QC_ACTION_GROUP];
