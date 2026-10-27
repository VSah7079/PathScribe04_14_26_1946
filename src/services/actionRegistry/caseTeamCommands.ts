// src/services/actionRegistry/caseTeamCommands.ts
// Batch 664: voice phrases and hotkey of Add Collaborator, in their own file because mockActionRegistryService.ts is over
// 1,000 lines and may not grow. Appended to SEED_ACTIONS there; Spanish phrases are in spanishVoiceTriggers.ts. The spoken
// name travels with the command as `transcript` (TRANSCRIPT_EVENT_ACTIONS). All phrases except English are machine translated
// and need review by a native speaker (docs/product/PHRASE_REVIEW_LIST.md).
import type { SystemAction } from './IActionRegistryService';
import { ACTION_MAP, type ActionId } from '../../constants/systemActions';

export const CASE_TEAM_SEED_ACTIONS: SystemAction[] = [
  {
    id: 'ADD_COLLABORATOR', label: 'Add Collaborator', category: 'SYNOPTIC',
    shortcut: 'Ctrl+Alt+Shift+0', internalKey: ACTION_MAP['caseTeam.addCollaborator' as ActionId]?.internalKey ?? 'F37+PS002',
    voiceTriggers: ['add collaborator', 'add a collaborator', 'invite collaborator'],
    voiceTriggersByLanguage: {
      fr: ['ajouter collaborateur', 'ajouter un collaborateur', 'inviter un collaborateur'],
      de: ['kollaborator hinzufügen', 'mitarbeiter hinzufügen', 'kollaborator einladen'],
      nl: ['samenwerker toevoegen', 'collaborator toevoegen', 'samenwerker uitnodigen'],
      ko: ['협업자 추가', '공동 작업자 추가', '협업자 초대'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
];
