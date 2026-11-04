// src/services/actionRegistry/requisitionVoiceCommands.ts
// Batch 762: the Requisition Inbox's voice phrase and hotkey, in its own file because mockActionRegistryService.ts is
// over 1,000 lines and may not grow. Appended to SEED_ACTIONS there; Spanish (Castilian, formal) phrases are in
// spanishVoiceTriggers.ts. All phrases except English are machine translated and need review by a native speaker.
//
//   REQUISITION_RUN_NOW   REQUISITIONS (only on the Requisition Inbox)   Alt+G ("go"; Alt+R is the always-on Routing Rules)
// Its Role Dictionary entry has the same internalKey (constants/requisitionActionGroup.ts).
import type { SystemAction } from './IActionRegistryService';
import { ACTION_MAP, type ActionId } from '../../constants/systemActions';
import { REQUISITION_VOICE_CONTEXT } from '../../constants/requisitionActionGroup';

const key = (id: string, fallback: string) => ACTION_MAP[id as ActionId]?.internalKey ?? fallback;

export const REQUISITION_SEED_ACTIONS: SystemAction[] = [
  {
    id: 'REQUISITION_RUN_NOW', label: 'Run Requisition Ingestion Now', category: REQUISITION_VOICE_CONTEXT,
    shortcut: 'Alt+G', internalKey: key('requisition.runNow', 'F39+PS002'),
    voiceTriggers: ['run ingestion now', 'read the requisition scans', 'check for new requisitions'],
    voiceTriggersByLanguage: {
      fr: ['lancer l’intégration', 'lire les bons scannés', 'vérifier les nouveaux bons'],
      de: ['import jetzt ausführen', 'auftragsscans lesen', 'neue auftragsscheine prüfen'],
      nl: ['nu inlezen', 'aanvraagscans lezen', 'nieuwe aanvraagbonnen controleren'],
      ko: ['지금 수집 실행', '요청서 스캔 읽기', '새 요청서 확인'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
];
