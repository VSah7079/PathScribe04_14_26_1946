// src/services/actionRegistry/lockboxVoiceCommands.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the voice phrases and hotkeys of Lockbox Drop-Off, in their own file because mockActionRegistryService.ts is over
// 1,000 lines and may not grow. Appended to SEED_ACTIONS there; Spanish (Castilian, formal) phrases are in spanishVoiceTriggers.ts.
// All phrases except English are machine translated and need review by a native speaker (docs/product/PHRASE_REVIEW_LIST.md).
//
//   OPEN_LOCKBOX_DROP_OFF    NAVIGATION (always on)  Alt+Shift+Z, or Alt+J then Shift+Z   navigation is done in LockboxNavigation
//   LOCKBOX_*                LOCKBOX (only on the screen, setCurrentContext(LOCKBOX_VOICE_CONTEXT))   Alt+S, Alt+G, Alt+D, Alt+M
// Each id has a Role Dictionary entry with the same internalKey (constants/lockboxActionGroup.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { SystemAction } from './IActionRegistryService';
import { ACTION_MAP, type ActionId } from '../../constants/systemActions';
import { LOCKBOX_VOICE_CONTEXT } from '../../constants/lockboxActionGroup';

const key = (id: string, fallback: string) => ACTION_MAP[id as ActionId]?.internalKey ?? fallback;

export const LOCKBOX_SEED_ACTIONS: SystemAction[] = [
  {
    id: 'OPEN_LOCKBOX_DROP_OFF', label: 'Go to Lockbox Drop-Off', category: 'NAVIGATION',
    shortcut: 'Alt+Shift+Z', internalKey: key('lockbox.open', 'F36+PS001'),
    voiceTriggers: ['open lockbox drop-off', 'go to lockbox drop-off', 'open lockbox', 'lockbox drop-off'],
    voiceTriggersByLanguage: {
      fr: ['ouvrir le dépôt lockbox', 'aller au dépôt lockbox', 'dépôt lockbox'],
      de: ['lockbox-einwurf öffnen', 'zum lockbox-einwurf', 'lockbox-einwurf'],
      nl: ['lockbox-afgifte openen', 'naar lockbox-afgifte', 'lockbox-afgifte'],
      ko: ['락박스 접수 열기', '락박스 접수로 이동', '락박스 접수'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'LOCKBOX_FOCUS_SCAN', label: 'Focus the Lockbox Scan Field', category: LOCKBOX_VOICE_CONTEXT,
    shortcut: 'Alt+S', internalKey: key('lockbox.focusScan', 'F36+PS002'),
    voiceTriggers: ['focus the scan field', 'lockbox scan field', 'ready to scan'],
    voiceTriggersByLanguage: {
      fr: ['champ de scan', 'activer le champ de scan', 'prêt à scanner'],
      de: ['scanfeld fokussieren', 'scanfeld', 'bereit zum scannen'],
      nl: ['scanveld activeren', 'scanveld', 'klaar om te scannen'],
      ko: ['스캔 입력란 선택', '스캔 입력란', '스캔 준비'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'LOCKBOX_MARK_URGENT', label: 'Mark the Next Lockbox Drop Urgent', category: LOCKBOX_VOICE_CONTEXT,
    shortcut: 'Alt+G', internalKey: key('lockbox.markUrgent', 'F36+PS003'),
    voiceTriggers: ['mark drop urgent', 'next drop urgent', 'urgent drop'],
    voiceTriggersByLanguage: {
      fr: ['marquer le dépôt urgent', 'prochain dépôt urgent', 'dépôt urgent'],
      de: ['einwurf als dringend markieren', 'nächster einwurf dringend', 'dringender einwurf'],
      nl: ['afgifte als urgent markeren', 'volgende afgifte urgent', 'urgente afgifte'],
      ko: ['접수 긴급 표시', '다음 접수 긴급', '긴급 접수'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'LOCKBOX_SHOW_DROP_OFF', label: 'Show Lockbox Drop-Off', category: LOCKBOX_VOICE_CONTEXT,
    shortcut: 'Alt+D', internalKey: key('lockbox.showDropOff', 'F36+PS004'),
    voiceTriggers: ['show drop-off', 'drop-off tab', 'show lockbox scan'],
    voiceTriggersByLanguage: {
      fr: ['afficher le dépôt', 'onglet dépôt', 'afficher le scan lockbox'],
      de: ['einwurf anzeigen', 'reiter einwurf', 'lockbox-scan anzeigen'],
      nl: ['afgifte tonen', 'tabblad afgifte', 'lockbox-scan tonen'],
      ko: ['접수 탭 보기', '접수 탭', '락박스 스캔 보기'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
  {
    id: 'LOCKBOX_SHOW_FOLDER', label: 'Show the Overnight Folder', category: LOCKBOX_VOICE_CONTEXT,
    shortcut: 'Alt+M', internalKey: key('lockbox.showFolder', 'F36+PS005'),
    voiceTriggers: ['show overnight folder', 'overnight folder', 'open overnight folder'],
    voiceTriggersByLanguage: {
      fr: ['afficher le dossier de nuit', 'dossier de nuit', 'ouvrir le dossier de nuit'],
      de: ['nachtordner anzeigen', 'nachtordner', 'nachtordner öffnen'],
      nl: ['nachtmap tonen', 'nachtmap', 'nachtmap openen'],
      ko: ['야간 폴더 보기', '야간 폴더', '야간 폴더 열기'],
    },
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  },
];
