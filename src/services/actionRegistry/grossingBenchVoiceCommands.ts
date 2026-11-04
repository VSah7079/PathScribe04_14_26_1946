// src/services/actionRegistry/grossingBenchVoiceCommands.ts
// Batch 720: voice phrases and hotkeys of the Grossing screen's bench tools, in their own file because
// mockActionRegistryService.ts is over 1,000 lines and may not grow. Appended to SEED_ACTIONS there; Spanish phrases are in
// spanishVoiceTriggers.ts. All phrases except English are machine translated and need review (docs/product/PHRASE_REVIEW_LIST.md).
import type { SystemAction } from './IActionRegistryService';
import { ACTION_MAP, type ActionId } from '../../constants/systemActions';

const key = (id: string, fallback: string) => ACTION_MAP[id as ActionId]?.internalKey ?? fallback;

export const GROSSING_BENCH_SEED_ACTIONS: SystemAction[] = [
  {
    id: 'GROSSING_PRINT_CASSETTES', label: 'Print Cassettes', category: 'GROSSING',
    shortcut: 'Alt+Shift+1', internalKey: key('grossing.printCassettes', 'F38+PS001'),
    voiceTriggers: ['print cassettes', 'print the cassettes', 'print cassette labels'],
    voiceTriggersByLanguage: {
      fr: ['imprimer les cassettes', 'imprimer les étiquettes de cassettes', 'imprimer les cassettes du cas'],
      de: ['kassetten drucken', 'kassettenetiketten drucken', 'kassetten ausdrucken'],
      nl: ['cassettes afdrukken', 'cassettelabels afdrukken', 'cassettes printen'],
      ko: ['카세트 인쇄', '카세트 라벨 인쇄', '카세트 출력'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'GROSSING_TAKE_PHOTO', label: 'Take a Gross Photo', category: 'GROSSING',
    shortcut: 'Alt+Shift+2', internalKey: key('grossing.takePhoto', 'F38+PS002'),
    voiceTriggers: ['take a photo', 'gross photo', 'capture photo'],
    voiceTriggersByLanguage: {
      fr: ['prendre une photo', 'photo macroscopique', 'capturer la photo'],
      de: ['foto aufnehmen', 'makrofoto', 'foto erfassen'],
      nl: ['foto maken', 'macrofoto', 'foto vastleggen'],
      ko: ['사진 촬영', '육안 사진', '사진 캡처'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'GROSSING_ASSIGN_DECAL', label: 'Assign to Decalcification', category: 'GROSSING',
    shortcut: 'Alt+Shift+3', internalKey: key('grossing.assignDecal', 'F38+PS003'),
    voiceTriggers: ['send to decal', 'assign to decalcification', 'decal bench'],
    voiceTriggersByLanguage: {
      fr: ['envoyer à la décalcification', 'affecter à la décalcification', 'poste de décalcification'],
      de: ['zur entkalkung senden', 'der entkalkung zuweisen', 'entkalkungsplatz'],
      nl: ['naar decalcificatie sturen', 'toewijzen aan decalcificatie', 'decalcificatiebank'],
      ko: ['탈회로 보내기', '탈회 배정', '탈회 작업대'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'GROSSING_ADD_ON_ORDER', label: 'Open the Add-On Order Builder', category: 'GROSSING',
    shortcut: 'Alt+Shift+4', internalKey: key('grossing.addOnOrder', 'F38+PS004'),
    voiceTriggers: ['add-on order', 'open add-on builder', 'order add-ons'],
    voiceTriggersByLanguage: {
      fr: ['commande complémentaire', 'ouvrir le générateur de compléments', 'commander des compléments'],
      de: ['zusatzauftrag', 'zusatzauftrag-ersteller öffnen', 'zusatzaufträge bestellen'],
      nl: ['aanvullende bestelling', 'aanvullende bestelling openen', 'aanvullingen bestellen'],
      ko: ['추가 오더', '추가 오더 작성 열기', '추가 오더 주문'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
];
