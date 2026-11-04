// src/services/actionRegistry/patientBannerCommands.ts
// Batch 662: the voice phrases and hotkey of the patient banner, in their own file because mockActionRegistryService.ts is
// over 1,000 lines and may not grow. Appended to SEED_ACTIONS there; Spanish phrases are in spanishVoiceTriggers.ts.
// All phrases except English are machine translated and need review by a native speaker (docs/product/PHRASE_REVIEW_LIST.md).
import type { SystemAction } from './IActionRegistryService';
import { ACTION_MAP, type ActionId } from '../../constants/systemActions';

export const PATIENT_BANNER_SEED_ACTIONS: SystemAction[] = [
  {
    id: 'SHOW_NHS_STATUS', label: 'Show NHS Number Status', category: 'SYNOPTIC',
    shortcut: 'Ctrl+Alt+Shift+9', internalKey: ACTION_MAP['banner.showNhsStatus' as ActionId]?.internalKey ?? 'F37+PS001',
    voiceTriggers: ['NHS status', 'show NHS status', 'check NHS number', 'NHS number status'],
    voiceTriggersByLanguage: {
      fr: ['statut NHS', 'afficher le statut NHS', 'vérifier le numéro NHS'],
      de: ['NHS-Status', 'NHS-Status anzeigen', 'NHS-Nummer prüfen'],
      nl: ['NHS-status', 'NHS-status tonen', 'NHS-nummer controleren'],
      ko: ['NHS 상태', 'NHS 상태 표시', 'NHS 번호 확인'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
];
