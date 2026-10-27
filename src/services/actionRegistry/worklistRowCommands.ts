// src/services/actionRegistry/worklistRowCommands.ts
// Batch 663: voice phrases and hotkeys of the Worklist's row-by-name commands, in their own file because
// mockActionRegistryService.ts is over 1,000 lines and may not grow. Appended to SEED_ACTIONS there; Spanish phrases are in
// spanishVoiceTriggers.ts. All phrases except English are machine translated and need review by a native speaker
// (docs/product/PHRASE_REVIEW_LIST.md). The spoken number or accession travels with the command as `transcript`
// (TRANSCRIPT_EVENT_ACTIONS); "open case" alone stays Open Selected, so the accession command says "accession".
import type { SystemAction } from './IActionRegistryService';
import { VOICE_CONTEXT, ACTION_MAP, type ActionId } from '../../constants/systemActions';

/** Commands that carry what was said to the screen: `PATHSCRIBE_<id>` with detail { transcript }. */
export const TRANSCRIPT_EVENT_ACTIONS: ReadonlySet<string> = new Set(['TABLE_FILTER_PHYSICIAN', 'TABLE_GO_TO_ROW', 'TABLE_OPEN_ACCESSION', 'ADD_COLLABORATOR', 'EDIT_FIELD']);

const key = (id: string, fallback: string) => ACTION_MAP[id as ActionId]?.internalKey ?? fallback;

export const WORKLIST_ROW_SEED_ACTIONS: SystemAction[] = [
  {
    id: 'TABLE_GO_TO_ROW', label: 'Go to Row', category: VOICE_CONTEXT.WORKLIST,
    shortcut: 'Alt+7', internalKey: key('table.goToRow', 'F15+PS048'),
    voiceTriggers: ['go to row', 'jump to row', 'row number'],
    voiceTriggersByLanguage: {
      fr: ['aller à la ligne', 'ligne numéro', 'passer à la ligne'],
      de: ['gehe zu zeile', 'zu zeile springen', 'zeile nummer'],
      nl: ['ga naar rij', 'spring naar rij', 'rij nummer'],
      ko: ['행으로 이동', '행 번호', '번 행으로 이동'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'TABLE_OPEN_ACCESSION', label: 'Open Case by Accession', category: VOICE_CONTEXT.WORKLIST,
    shortcut: 'Alt+8', internalKey: key('table.openByAccession', 'F15+PS049'),
    voiceTriggers: ['open accession', 'go to accession', 'open case number'],
    voiceTriggersByLanguage: {
      fr: ["ouvrir l'accession", "aller à l'accession", 'ouvrir le dossier numéro'],
      de: ['akzession öffnen', 'zu akzession gehen', 'fallnummer öffnen'],
      nl: ['accessie openen', 'ga naar accessie', 'zaaknummer openen'],
      ko: ['접수번호 열기', '접수번호로 이동', '증례 번호 열기'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
];
