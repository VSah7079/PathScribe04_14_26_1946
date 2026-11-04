// src/constants/worklistRowActionGroup.ts
// Batch 663: the Worklist's row-by-name commands, as their own group so systemActions.ts (over 1,000 lines) does not grow.
// Spread into ACTION_GROUPS through addedActionGroups.ts.
//   table.goToRow          "go to row 7": move the highlight to that row of the list as shown (Alt+7). A view command.
//   table.openByAccession  "open accession A26-4660": highlight and open that case, only when exactly one matches (Alt+8).
// Rules and tests: services/worklist/rowCommands.ts. Phrases: services/actionRegistry/worklistRowCommands.ts.
import type { ActionGroup } from './systemActions';

export type WorklistRowActionId = 'table.goToRow' | 'table.openByAccession';

export const WORKLIST_ROW_ACTION_GROUP: ActionGroup = {
  id: 'worklist_rows',
  title: 'Worklist Rows',
  actions: [
    { id: 'table.goToRow', label: 'Go to Row', internalKey: 'F15+PS048' },
    { id: 'table.openByAccession', label: 'Open Case by Accession', internalKey: 'F15+PS049' },
  ],
};
