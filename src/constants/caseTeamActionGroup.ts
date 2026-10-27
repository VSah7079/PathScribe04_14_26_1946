// src/constants/caseTeamActionGroup.ts
// Batch 664: the case-team voice command, as its own group so systemActions.ts (over 1,000 lines) does not grow.
// Spread into ACTION_GROUPS through addedActionGroups.ts.
//   caseTeam.addCollaborator   "add collaborator Nguyen": add that staff member to the case team as a Consultant (Ctrl+Alt+Shift+0).
// Rules and tests: services/cases/collaboratorCommand.ts. Phrases: services/actionRegistry/caseTeamCommands.ts.
import type { ActionGroup } from './systemActions';

export type CaseTeamActionId = 'caseTeam.addCollaborator';

export const CASE_TEAM_ACTION_GROUP: ActionGroup = {
  id: 'case_team',
  title: 'Case Team',
  actions: [{ id: 'caseTeam.addCollaborator', label: 'Add Collaborator', internalKey: 'F37+PS002' }],
};
