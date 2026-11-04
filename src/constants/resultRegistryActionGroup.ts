// src/constants/resultRegistryActionGroup.ts
// Batch 637: the person-facing actions added by Batches 621-636 that the roles list did not yet name (the sweep after Batch 617).
// Its own file so systemActions.ts (over 1,000 lines) does not grow (CLAUDE.md rule 10). Each follows a capability:
//   hpvResult.*            cytology:hpv-result:record-manual   (Batch 630)
//   csms.*                 cytology:csms-eligibility:verify    (Batch 636)
//   historyExtraction.*    ai:history-extraction:run / flag    (Batch 621)
//   registryBatch.makeFile registry:batch-file:generate        (Batch 620)
// None has a voice phrase or hotkey: each needs a case or result picked on screen first, or is a deliberate click
// (services/actionRegistry/permissionOnlyActions.ts). Configuration screens are not listed: they are reached through
// their own screen capability, as in Batch 617.
import type { ActionGroup } from './systemActions';

export type ResultRegistryActionId =
  | 'hpvResult.recordManual' | 'hpvResult.approveManual' | 'hpvResult.rejectManual'
  | 'csms.verifyEligibility' | 'csms.recordNotEligible'
  | 'historyExtraction.run' | 'historyExtraction.flag'
  | 'registryBatch.makeFile';

export const RESULT_REGISTRY_ACTION_GROUP: ActionGroup = {
  id: 'result_registry',
  title: 'HPV Results, CSMS Eligibility, AI History Reading & Registry Files',
  actions: [
    { id: 'hpvResult.recordManual', label: 'Record an hrHPV Result by Hand', internalKey: 'F35+PS001' },
    { id: 'hpvResult.approveManual', label: 'Approve a Manual hrHPV Entry', internalKey: 'F35+PS002' },
    { id: 'hpvResult.rejectManual', label: 'Reject a Manual hrHPV Entry', internalKey: 'F35+PS003' },
    { id: 'csms.verifyEligibility', label: 'Mark CSMS Eligibility Verified', internalKey: 'F35+PS004' },
    { id: 'csms.recordNotEligible', label: 'Record Not Eligible for CSMS', internalKey: 'F35+PS005' },
    { id: 'historyExtraction.run', label: 'Run the AI Reading of a Historical Report', internalKey: 'F35+PS006' },
    { id: 'historyExtraction.flag', label: 'Flag an AI Reading as Wrong', internalKey: 'F35+PS007' },
    { id: 'registryBatch.makeFile', label: 'Make a Registry Batch File', internalKey: 'F35+PS008' },
  ],
};
