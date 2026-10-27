// src/services/voice/reportDraftVoiceActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the Report Draft's spoken commands ("go to section two", "dictate gross description", "save draft"...).
// They used to sit in SynopticReportPage as an inline list handed to `actionRegistryService.registerAction?.()`, a
// method the registry does not have, so none of them ever registered (Alt+1..9 worked because it is a key listener).
// Now they are plain data, registered through `registerTransientActions` for as long as the Report Draft is open
// (pages/SynopticReportPage/hooks/useReportDraftVoiceActions.ts).
//
// Eligible on the report screen (VOICE_CONTEXT.SYNOPTIC). A phrase that another report-screen command already owns is
// left to that command, not repeated here ("dictate gross" and "dictate diagnosis" belong to Enter Gross and Enter
// Diagnosis, which now move dictation into the section themselves; reportDraftVoiceActions.test.ts fails on a clash).
// fr, de, nl, ko and es are machine translated and are on docs/product/PHRASE_REVIEW_LIST.md for native review.
// ─────────────────────────────────────────────────────────────────────────────
import type { TransientActionDefinition } from '../actionRegistry/transientActions';
import { VOICE_CONTEXT } from '../../constants/systemActions';

export const REPORT_DRAFT_CATEGORY = VOICE_CONTEXT.SYNOPTIC;

/** The events the Report Draft editors and the report page listen for. */
export const ORCH_EVENT = {
  jump: 'PATHSCRIBE_ORCH_JUMP_SECTION',
  next: 'PATHSCRIBE_ORCH_NEXT_SECTION',
  prev: 'PATHSCRIBE_ORCH_PREV_SECTION',
  generate: 'PATHSCRIBE_ORCH_GENERATE_REPORT',
  regenAll: 'PATHSCRIBE_ORCH_REGEN_ALL',
  dictate: 'PATHSCRIBE_ORCH_DICTATE_SECTION',
  dark: 'PATHSCRIBE_ORCH_TOGGLE_DARK',
  tab: 'PATHSCRIBE_ORCH_SHOW_TAB',
} as const;

/** A section a dictation command points at: the kind of section, or its place in the list when the kind is not found. */
export type DictationSectionKind = 'admin' | 'gross' | 'microscopic' | 'synoptic' | 'diagnosis';

type Langs = NonNullable<TransientActionDefinition['byLanguage']>;
const def = (
  id: string, label: string, phrases: string[], byLanguage: Langs,
  event: string, detail?: unknown,
): TransientActionDefinition => ({ id, label, category: REPORT_DRAFT_CATEGORY, phrases, byLanguage, dispatch: { event, detail } });

const dictateSection = (n: number, en: string[], l: Langs): TransientActionDefinition =>
  def(`ORCH_DICTATE_SECTION_${n}`, `Dictate section ${n}`, en, l, ORCH_EVENT.dictate, { sectionIndex: n - 1 });

const dictateKind = (id: string, label: string, kind: DictationSectionKind, index: number, en: string[], l: Langs) =>
  def(id, label, en, l, ORCH_EVENT.dictate, { kind, sectionIndex: index });

export const REPORT_DRAFT_VOICE_ACTIONS: readonly TransientActionDefinition[] = [
  def('ORCH_OPEN_DRAFT', 'Open Report Draft', ['open report draft', 'show report draft', 'go to draft'], {
    fr: ['ouvrir le brouillon du rapport', 'afficher le brouillon du rapport'], de: ['berichtsentwurf öffnen', 'berichtsentwurf anzeigen'],
    nl: ['conceptverslag openen', 'conceptverslag tonen'], ko: ['보고서 초안 열기', '보고서 초안 표시'], es: ['abrir borrador del informe', 'mostrar borrador del informe'],
  }, ORCH_EVENT.tab, { tab: 'draft' }),
  def('ORCH_OPEN_REPORT', 'Open Full Report', ['open full report', 'show full report', 'view report'], {
    fr: ['ouvrir le rapport complet', 'afficher le rapport complet'], de: ['vollständigen bericht öffnen', 'vollständigen bericht anzeigen'],
    nl: ['volledig verslag openen', 'volledig verslag tonen'], ko: ['전체 보고서 열기', '전체 보고서 표시'], es: ['abrir informe completo', 'mostrar informe completo'],
  }, ORCH_EVENT.tab, { tab: 'report' }),
  def('ORCH_OPEN_SEQUENCER', 'Open Sequencer', ['open sequencer', 'show sequencer', 'synoptic fields'], {
    fr: ['ouvrir le séquenceur', 'afficher le séquenceur'], de: ['sequenzer öffnen', 'sequenzer anzeigen'],
    nl: ['sequencer openen', 'sequencer tonen'], ko: ['시퀀서 열기', '시퀀서 표시'], es: ['abrir secuenciador', 'mostrar secuenciador'],
  }, ORCH_EVENT.tab, { tab: 'sequencer' }),
  def('ORCH_GENERATE', 'Generate Report Draft', ['generate report', 'generate narrative', 'create report'], {
    fr: ['générer le rapport', 'générer le texte'], de: ['bericht erstellen', 'text generieren'],
    nl: ['verslag genereren', 'tekst genereren'], ko: ['보고서 생성', '서술문 생성'], es: ['generar informe', 'generar texto'],
  }, ORCH_EVENT.generate),
  def('ORCH_REGEN', 'Regenerate All Sections', ['regenerate report', 'regenerate all', 'redo report'], {
    fr: ['régénérer le rapport', 'tout régénérer'], de: ['bericht neu erstellen', 'alles neu generieren'],
    nl: ['verslag opnieuw genereren', 'alles opnieuw genereren'], ko: ['보고서 재생성', '전체 재생성'], es: ['regenerar informe', 'regenerar todo'],
  }, ORCH_EVENT.regenAll),
  def('ORCH_NEXT_SECTION', 'Next Section', ['next section', 'go to next section'], {
    fr: ['section suivante', 'aller à la section suivante'], de: ['nächster abschnitt', 'zum nächsten abschnitt'],
    nl: ['volgende sectie', 'naar de volgende sectie'], ko: ['다음 섹션', '다음 섹션으로 이동'], es: ['sección siguiente', 'ir a la sección siguiente'],
  }, ORCH_EVENT.next),
  def('ORCH_PREV_SECTION', 'Previous Section', ['previous section', 'prior section'], {
    fr: ['section précédente', 'aller à la section précédente'], de: ['vorheriger abschnitt', 'zum vorherigen abschnitt'],
    nl: ['vorige sectie', 'naar de vorige sectie'], ko: ['이전 섹션', '이전 섹션으로 이동'], es: ['sección anterior', 'ir a la sección anterior'],
  }, ORCH_EVENT.prev),
  def('ORCH_SECTION_1', 'Go to section 1', ['go to section one', 'section one', 'first section'], {
    fr: ['aller à la section un', 'section un', 'première section'], de: ['gehe zu abschnitt eins', 'abschnitt eins', 'erster abschnitt'],
    nl: ['ga naar sectie een', 'sectie een', 'eerste sectie'], ko: ['섹션 1로 이동', '섹션 1', '첫 번째 섹션'], es: ['ir a la sección uno', 'sección uno', 'primera sección'],
  }, ORCH_EVENT.jump, { index: 0 }),
  def('ORCH_SECTION_2', 'Go to section 2', ['go to section two', 'section two', 'second section'], {
    fr: ['aller à la section deux', 'section deux', 'deuxième section'], de: ['gehe zu abschnitt zwei', 'abschnitt zwei', 'zweiter abschnitt'],
    nl: ['ga naar sectie twee', 'sectie twee', 'tweede sectie'], ko: ['섹션 2로 이동', '섹션 2', '두 번째 섹션'], es: ['ir a la sección dos', 'sección dos', 'segunda sección'],
  }, ORCH_EVENT.jump, { index: 1 }),
  def('ORCH_SECTION_3', 'Go to section 3', ['go to section three', 'section three', 'third section'], {
    fr: ['aller à la section trois', 'section trois', 'troisième section'], de: ['gehe zu abschnitt drei', 'abschnitt drei', 'dritter abschnitt'],
    nl: ['ga naar sectie drie', 'sectie drie', 'derde sectie'], ko: ['섹션 3으로 이동', '섹션 3', '세 번째 섹션'], es: ['ir a la sección tres', 'sección tres', 'tercera sección'],
  }, ORCH_EVENT.jump, { index: 2 }),
  def('ORCH_SECTION_4', 'Go to section 4', ['go to section four', 'section four', 'fourth section'], {
    fr: ['aller à la section quatre', 'section quatre', 'quatrième section'], de: ['gehe zu abschnitt vier', 'abschnitt vier', 'vierter abschnitt'],
    nl: ['ga naar sectie vier', 'sectie vier', 'vierde sectie'], ko: ['섹션 4로 이동', '섹션 4', '네 번째 섹션'], es: ['ir a la sección cuatro', 'sección cuatro', 'cuarta sección'],
  }, ORCH_EVENT.jump, { index: 3 }),
  dictateKind('ORCH_DICTATE_ADMIN', 'Dictate Administrative Header', 'admin', 0, ['dictate administrative', 'dictate admin', 'dictate clinical header', 'dictate header'], {
    fr: ['dicter l’en-tête administratif', 'dicter l’en-tête clinique'], de: ['verwaltungskopf diktieren', 'klinischen kopf diktieren'],
    nl: ['administratieve kop dicteren', 'klinische kop dicteren'], ko: ['행정 머리글 구술', '임상 머리글 구술'], es: ['dictar encabezado administrativo', 'dictar encabezado clínico'],
  }),
  dictateKind('ORCH_DICTATE_GROSS', 'Dictate Gross Description Section', 'gross', 1, ['dictate gross description', 'dictate specimen', 'dictate macroscopic'], {
    fr: ['dicter la description macroscopique', 'dicter le prélèvement'], de: ['makroskopische beschreibung diktieren', 'untersuchungsmaterial diktieren'],
    nl: ['macroscopische beschrijving dicteren', 'materiaal dicteren'], ko: ['육안 기술 구술', '검체 구술'], es: ['dictar descripción macroscópica', 'dictar la muestra'],
  }),
  dictateKind('ORCH_DICTATE_SYNOPTIC', 'Dictate Synoptic Summary', 'synoptic', 2, ['dictate synoptic', 'dictate synoptic summary', 'dictate summary'], {
    fr: ['dicter le résumé synoptique', 'dicter le synoptique'], de: ['synoptische zusammenfassung diktieren', 'synopse diktieren'],
    nl: ['synoptische samenvatting dicteren', 'synopsis dicteren'], ko: ['종합 요약 구술', '시놉틱 구술'], es: ['dictar resumen sinóptico', 'dictar sinóptico'],
  }),
  dictateKind('ORCH_DICTATE_DIAGNOSIS', 'Dictate Final Diagnosis Section', 'diagnosis', 3, ['dictate ancillary', 'dictate final diagnosis', 'dictate conclusion'], {
    fr: ['dicter le diagnostic final', 'dicter la conclusion'], de: ['enddiagnose diktieren', 'schlussfolgerung diktieren'],
    nl: ['einddiagnose dicteren', 'conclusie dicteren'], ko: ['최종 진단 구술', '결론 구술'], es: ['dictar diagnóstico final', 'dictar conclusión'],
  }),
  dictateSection(1, ['dictate section one', 'dictate first section'], {
    fr: ['dicter la section un', 'dicter la première section'], de: ['abschnitt eins diktieren', 'ersten abschnitt diktieren'],
    nl: ['sectie een dicteren', 'eerste sectie dicteren'], ko: ['섹션 1 구술', '첫 번째 섹션 구술'], es: ['dictar sección uno', 'dictar primera sección'],
  }),
  dictateSection(2, ['dictate section two', 'dictate second section'], {
    fr: ['dicter la section deux', 'dicter la deuxième section'], de: ['abschnitt zwei diktieren', 'zweiten abschnitt diktieren'],
    nl: ['sectie twee dicteren', 'tweede sectie dicteren'], ko: ['섹션 2 구술', '두 번째 섹션 구술'], es: ['dictar sección dos', 'dictar segunda sección'],
  }),
  dictateSection(3, ['dictate section three', 'dictate third section'], {
    fr: ['dicter la section trois', 'dicter la troisième section'], de: ['abschnitt drei diktieren', 'dritten abschnitt diktieren'],
    nl: ['sectie drie dicteren', 'derde sectie dicteren'], ko: ['섹션 3 구술', '세 번째 섹션 구술'], es: ['dictar sección tres', 'dictar tercera sección'],
  }),
  dictateSection(4, ['dictate section four', 'dictate fourth section'], {
    fr: ['dicter la section quatre', 'dicter la quatrième section'], de: ['abschnitt vier diktieren', 'vierten abschnitt diktieren'],
    nl: ['sectie vier dicteren', 'vierde sectie dicteren'], ko: ['섹션 4 구술', '네 번째 섹션 구술'], es: ['dictar sección cuatro', 'dictar cuarta sección'],
  }),
  def('ORCH_DARK_MODE', 'Toggle Dark Mode', ['dark mode', 'toggle dark mode', 'night mode'], {
    fr: ['mode sombre', 'basculer le mode sombre', 'mode nuit'], de: ['dunkelmodus', 'dunkelmodus umschalten', 'nachtmodus'],
    nl: ['donkere modus', 'donkere modus wisselen', 'nachtmodus'], ko: ['다크 모드', '다크 모드 전환', '야간 모드'], es: ['modo oscuro', 'alternar modo oscuro', 'modo nocturno'],
  }, ORCH_EVENT.dark),
];
