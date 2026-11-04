// src/services/templates/mohsStages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463 (Pete: "a PathScribe Mohs Synoptic Report that can be copied and
// customized like other Synoptics"): the Mohs stage question — the spec's
// SPATIAL_STAGE_CANVAS, field type 'spatialStageCanvas'.
//
// A Mohs case has stages; each stage's margin is mapped as 12 peripheral clock
// sectors and the deep margin. Every positive sector records its block (the
// histotech's cutting order: A, B, C…), its histology and perineural
// invasion (Pete: block + histology per positive sector — "Sector 2 → Block B
// → infiltrative BCC" traceability, mixed histologies in one stage, CAP/CLIA
// block traceability). Per stage: blocks cut and the excision time. A stage
// with no positive sector is clear.
//
// Batch 463b (Pete's dev note): no automatic block letter. Click order is not
// cutting order, so a newly positive sector is unassigned until its block is
// chosen from the stage's blocks (A… up to Blocks cut); the question is
// incomplete, and sign-out stops, while any positive sector has no block or a
// block the stage didn't cut (mohsBlockProblems).
//
// Storage: ordinary synoptic answers, keyed under the question's id (as the
// results grid), so storage, merging (PS-71), audit and versions are unchanged:
//   F__stages                       → number of stages
//   F__s1__positive                 → positive sector ids ['c12', 'deep', …]
//   F__s1__blocks, F__s1__time      → blocks cut, excision time (HH:MM)
//   F__s1__c12__block | __histology | __pni → per positive sector
// Every change is a pure function returning an answer patch (undefined =
// remove the key); the canvas and the checklist only dispatch them (spec:
// "Zero Map-Local State").
// ─────────────────────────────────────────────────────────────────────────────

export const MOHS_CLOCK_SECTORS = ['c12', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11'] as const;
export const MOHS_SECTORS = [...MOHS_CLOCK_SECTORS, 'deep'] as const;
export type MohsSectorId = typeof MOHS_SECTORS[number];
export const MOHS_MAX_STAGES = 8;
const BLOCK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

type Answers = Record<string, string | string[] | number | undefined>;
export type AnswerPatch = Record<string, string | string[] | undefined>;
/** A patch, or one built from the answers at the moment it is applied. */
export type AnswerPatchOrUpdate = AnswerPatch | ((answers: Record<string, string | string[]>) => AnswerPatch);

export interface MohsPositiveSector {
  sectorId: MohsSectorId;
  layer: 'peripheral' | 'deep';
  block?: string;
  histology?: string;
  perineural: boolean;
}

export interface MohsStage {
  number: number;
  positive: MohsPositiveSector[];
  blocks?: number;
  time?: string;
  /** No positive sector. */
  clear: boolean;
}

export const isMohsSector = (s: string): s is MohsSectorId => (MOHS_SECTORS as readonly string[]).includes(s);
export const mohsSectorLayer = (s: MohsSectorId): 'peripheral' | 'deep' => (s === 'deep' ? 'deep' : 'peripheral');
/** c12 → 12; deep → undefined. */
export const mohsSectorHour = (s: MohsSectorId): number | undefined => (s === 'deep' ? undefined : Number(s.slice(1)));

const key = (fieldId: string, ...parts: (string | number)[]) => [fieldId, ...parts].join('__');
const stageKey = (fieldId: string, stage: number, ...rest: string[]) => key(fieldId, `s${stage}`, ...rest);
const text = (v: unknown) => (v === undefined || v === null ? '' : Array.isArray(v) ? '' : String(v).trim());

export function mohsStageCount(fieldId: string, answers: Answers): number {
  const n = Number(text(answers[key(fieldId, 'stages')]));
  return Number.isInteger(n) && n > 0 ? Math.min(n, MOHS_MAX_STAGES) : 0;
}

function positiveIds(fieldId: string, stage: number, answers: Answers): MohsSectorId[] {
  const raw = answers[stageKey(fieldId, stage, 'positive')];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  // Clock order, then deep; anything unknown ignored.
  return MOHS_SECTORS.filter(s => list.includes(s));
}

/** The stages as recorded. */
export function readMohsStages(fieldId: string, answers: Answers): MohsStage[] {
  return Array.from({ length: mohsStageCount(fieldId, answers) }, (_, i) => {
    const n = i + 1;
    const positive = positiveIds(fieldId, n, answers).map(sectorId => {
      const block = text(answers[stageKey(fieldId, n, sectorId, 'block')]).toUpperCase();
      const histology = text(answers[stageKey(fieldId, n, sectorId, 'histology')]);
      return {
        sectorId, layer: mohsSectorLayer(sectorId),
        ...(block ? { block } : {}), ...(histology ? { histology } : {}),
        perineural: text(answers[stageKey(fieldId, n, sectorId, 'pni')]) === 'yes',
      };
    });
    const blocks = Number(text(answers[stageKey(fieldId, n, 'blocks')]));
    const time = text(answers[stageKey(fieldId, n, 'time')]);
    return {
      number: n, positive,
      ...(text(answers[stageKey(fieldId, n, 'blocks')]) !== '' && Number.isFinite(blocks) && blocks >= 0 ? { blocks } : {}),
      ...(time ? { time } : {}),
      clear: positive.length === 0,
    };
  });
}

/** The case is clear when its last stage is (and there is one). */
export function mohsCaseClear(stages: readonly MohsStage[]): boolean {
  return stages.length > 0 && stages[stages.length - 1].clear;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** A new stage, stamped with the time it was added. */
export function addMohsStage(fieldId: string, answers: Answers, now: Date): AnswerPatch {
  const n = mohsStageCount(fieldId, answers);
  if (n >= MOHS_MAX_STAGES) return {};
  return { [key(fieldId, 'stages')]: String(n + 1), [stageKey(fieldId, n + 1, 'time')]: hhmm(now) };
}

/** Every answer key a stage holds. */
function stageKeys(fieldId: string, stage: number, answers: Answers): string[] {
  const prefix = `${stageKey(fieldId, stage)}__`;
  return Object.keys(answers).filter(k => k.startsWith(prefix));
}

/** Removes the last stage and everything recorded for it. */
export function removeLastMohsStage(fieldId: string, answers: Answers): AnswerPatch {
  const n = mohsStageCount(fieldId, answers);
  if (!n) return {};
  const patch: AnswerPatch = { [key(fieldId, 'stages')]: n > 1 ? String(n - 1) : undefined };
  for (const k of stageKeys(fieldId, n, answers)) patch[k] = undefined;
  return patch;
}

/** The block letters a positive sector can take: A up to the stage's blocks cut
 *  (A–Z while blocks cut isn't recorded), plus a letter already given that is
 *  outside them, so it stays visible to be corrected. */
export function mohsBlockOptions(stage: Pick<MohsStage, 'blocks' | 'positive'>): string[] {
  const count = blocksCutLimit(stage) ?? BLOCK_LETTERS.length;
  const letters = BLOCK_LETTERS.slice(0, count).split('');
  for (const p of stage.positive) if (p.block && !letters.includes(p.block)) letters.push(p.block);
  return letters;
}

/** How many blocks a stage's letters may run to: its Blocks cut when entered and above 0
 *  (capped at 26); none (A–Z) otherwise. One rule for the choices and the check. */
function blocksCutLimit(stage: Pick<MohsStage, 'blocks'>): number | undefined {
  return stage.blocks !== undefined && stage.blocks > 0 ? Math.min(Math.floor(stage.blocks), BLOCK_LETTERS.length) : undefined;
}

export type MohsBlockProblem = { stage: number; sectorId: MohsSectorId; problem: 'unassigned' | 'notCut' };

/** A stage's block problem to tell the user: unassigned blocks first, then blocks not cut. */
export const mohsStageBlockProblem = (problems: readonly MohsBlockProblem[], stage: number): MohsBlockProblem['problem'] | undefined =>
  problems.some(x => x.stage === stage && x.problem === 'unassigned') ? 'unassigned' : problems.some(x => x.stage === stage) ? 'notCut' : undefined;

/** Positive sectors without a block, or with a block the stage didn't cut (beyond Blocks cut). */
export function mohsBlockProblems(fieldId: string, answers: Answers): MohsBlockProblem[] {
  return readMohsStages(fieldId, answers).flatMap(st => st.positive.flatMap((p): MohsBlockProblem[] => {
    if (!p.block) return [{ stage: st.number, sectorId: p.sectorId, problem: 'unassigned' }];
    // A block is one letter A–Z, within Blocks cut when that is entered.
    const index = /^[A-Z]$/.test(p.block) ? BLOCK_LETTERS.indexOf(p.block) : -1;
    const limit = blocksCutLimit(st);
    if (index < 0 || (limit !== undefined && index >= limit)) return [{ stage: st.number, sectorId: p.sectorId, problem: 'notCut' }];
    return [];
  }));
}

/**
 * Sets a sector positive or negative (spec ON_SECTOR_TOGGLE). Marking it
 * positive gives it the default histology (Pete: "default propagation" from
 * the tumour type, overridable per row) and, when one is given (a voice
 * command naming it), its block; otherwise the block stays unassigned for the
 * user to choose. Marking it negative removes what was recorded for it.
 */
export function setMohsSector(fieldId: string, answers: Answers, stage: number, sectorId: MohsSectorId, status: 'positive' | 'negative', defaultHistology?: string, block?: string): AnswerPatch {
  if (stage < 1 || stage > mohsStageCount(fieldId, answers)) return {};
  const current = positiveIds(fieldId, stage, answers);
  const isPositive = current.includes(sectorId);
  if ((status === 'positive') === isPositive) return {};
  if (status === 'positive') {
    const patch: AnswerPatch = {
      [stageKey(fieldId, stage, 'positive')]: MOHS_SECTORS.filter(s => s === sectorId || current.includes(s)),
    };
    if (block && /^[A-Za-z]$/.test(block.trim())) patch[stageKey(fieldId, stage, sectorId, 'block')] = block.trim().toUpperCase();
    if (defaultHistology?.trim()) patch[stageKey(fieldId, stage, sectorId, 'histology')] = defaultHistology.trim();
    return patch;
  }
  const remaining = current.filter(s => s !== sectorId);
  return {
    [stageKey(fieldId, stage, 'positive')]: remaining.length ? remaining : undefined,
    [stageKey(fieldId, stage, sectorId, 'block')]: undefined,
    [stageKey(fieldId, stage, sectorId, 'histology')]: undefined,
    [stageKey(fieldId, stage, sectorId, 'pni')]: undefined,
  };
}

export const toggleMohsSector = (fieldId: string, answers: Answers, stage: number, sectorId: MohsSectorId, defaultHistology?: string): AnswerPatch =>
  setMohsSector(fieldId, answers, stage, sectorId, positiveIds(fieldId, stage, answers).includes(sectorId) ? 'negative' : 'positive', defaultHistology);

/** The spec's SectorToggleEvent for a click on a stage canvas shape (s{n}_c12 … s{n}_deep). */
export interface MohsSectorToggleEvent { stageNumber: number; sectorId: MohsSectorId; layerType: 'PERIPHERAL' | 'DEEP'; newStatus: 'NEGATIVE' | 'POSITIVE' }
export function mohsSectorToggleEvent(stage: Pick<MohsStage, 'number' | 'positive'>, shapeId: string): MohsSectorToggleEvent | null {
  const sectorId = shapeId.replace(/^s\d+_/, '');
  if (!isMohsSector(sectorId)) return null;
  return {
    stageNumber: stage.number, sectorId, layerType: sectorId === 'deep' ? 'DEEP' : 'PERIPHERAL',
    newStatus: stage.positive.some(p => p.sectorId === sectorId) ? 'NEGATIVE' : 'POSITIVE',
  };
}

/** A sector's shape id on the stage canvas is pressed when the sector is positive. */
export const mohsShapePositive = (stage: Pick<MohsStage, 'positive'>, shapeId: string) => stage.positive.some(p => shapeId.endsWith(`_${p.sectorId}`));

/** Marks a whole stage clear (spec onClearStage): no positive sector left. */
export function clearMohsStage(fieldId: string, answers: Answers, stage: number): AnswerPatch {
  const patch: AnswerPatch = {};
  for (const s of positiveIds(fieldId, stage, answers)) Object.assign(patch, setMohsSector(fieldId, answers, stage, s, 'negative'));
  if (Object.keys(patch).length) patch[stageKey(fieldId, stage, 'positive')] = undefined;
  return patch;
}

/** A positive sector's block, histology or perineural invasion; a stage's blocks or time. */
export function setMohsSectorDetail(fieldId: string, stage: number, sectorId: MohsSectorId, field: 'block' | 'histology' | 'pni', value: string | boolean): AnswerPatch {
  const v = field === 'pni' ? (value ? 'yes' : undefined) : String(value).trim() ? (field === 'block' ? String(value).trim().toUpperCase().slice(0, 1) : String(value)) : undefined;
  return { [stageKey(fieldId, stage, sectorId, field)]: v };
}
export function setMohsStageDetail(fieldId: string, stage: number, field: 'blocks' | 'time', value: string): AnswerPatch {
  return { [stageKey(fieldId, stage, field)]: value.trim() ? value.trim() : undefined };
}

/** Applies a patch to answers (undefined removes the key); a function is given the answers first. */
export function applyAnswerPatch<A extends Record<string, unknown>>(answers: A, patchOrUpdate: AnswerPatchOrUpdate): A {
  const patch = typeof patchOrUpdate === 'function' ? patchOrUpdate(answers as unknown as Record<string, string | string[]>) : patchOrUpdate;
  const next: Record<string, unknown> = { ...answers };
  for (const [k, v] of Object.entries(patch)) { if (v === undefined) delete next[k]; else next[k] = v; }
  return next as A;
}

export const isMohsStageKey = (fieldId: string, k: string) => k.startsWith(`${fieldId}__`);

// ── Report text ─────────────────────────────────────────────────────────────

export interface MohsReportWords {
  stage: (n: number) => string;
  clear: string;
  residual: string;
  hour: (h: number) => string;
  peripheral: string;
  deep: string;
  block: (b: string) => string;
  perineural: string;
  blocksCut: (n: number) => string;
  time: (t: string) => string;
  /** Joins two pieces of one line. */
  join: (a: string, b: string) => string;
  /** Joins two sectors' descriptions. */
  list: (a: string, b: string) => string;
}

/** The stages as report text, a line per stage (in the report's words). */
export function mohsStagesDisplay(fieldId: string, answers: Answers, w: MohsReportWords): string {
  return readMohsStages(fieldId, answers).map(st => {
    const head = [w.stage(st.number), ...(st.time ? [w.time(st.time)] : []), ...(st.blocks !== undefined ? [w.blocksCut(st.blocks)] : [])].reduce(w.join);
    if (st.clear) return w.join(head, w.clear);
    const sectors = st.positive.map(p => [
      p.sectorId === 'deep' ? w.deep : w.join(w.hour(mohsSectorHour(p.sectorId)!), w.peripheral),
      ...(p.block ? [w.block(p.block)] : []), ...(p.histology ? [p.histology] : []), ...(p.perineural ? [w.perineural] : []),
    ].reduce(w.join)).reduce(w.list);
    return w.join(w.join(head, w.residual), sectors);
  }).join('\n');
}

// ── Voice (spec FR-05; Pete: all five languages) ───────────────────────────

export interface MohsVoiceCommand { stage: number; sector?: MohsSectorId; status: 'positive' | 'negative' | 'clear'; /** "… block B" */ block?: string }

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12,
  eins: 1, ein: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
  een: 1, één: 1, twee: 2, drie: 3, vijf: 5, zes: 6, zeven: 7, negen: 9, tien: 10, twaalf: 12,
};
/** Number words that are also articles ("une tumeur", "een tumor"): not counted as a second number. */
const ARTICLES = new Set(['un', 'une', 'een', 'ein']);

interface VoiceLexicon { stage: RegExp; positive: RegExp; negative: RegExp; clear: RegExp; hour: RegExp; deep: RegExp; block: RegExp }
const N = '(\\d{1,2}|[a-zäöüéë]+)';
const LEXICON: Record<string, VoiceLexicon> = {
  en: { stage: new RegExp(`\\bstage\\s+${N}`), positive: /\bpositive\b/, negative: /\bnegative\b/, clear: /\bclear\b/, hour: new RegExp(`\\b${N}\\s*o['’]?\\s*clock\\b|\\bat\\s+${N}\\b`), deep: /\bdeep\b/, block: /\bblock\s+([a-z])\b/ },
  fr: { stage: new RegExp(`(?:^|\\s)(?:stade|étape)\\s+${N}`), positive: /\bpositi(?:f|ve)\b/, negative: /\bnégati(?:f|ve)\b/, clear: /\b(?:sain|saine|libre|indemne)\b/, hour: new RegExp(`\\b${N}\\s*(?:heures?|h)\\b`), deep: /\bprofond(?:e|eur)?\b/, block: /\bbloc\s+([a-z])\b/ },
  de: { stage: new RegExp(`\\b(?:stufe|stadium|schritt)\\s+${N}`), positive: /\bpositiv\b/, negative: /\bnegativ\b/, clear: /\b(?:frei|tumorfrei)\b/, hour: new RegExp(`\\b${N}\\s*uhr\\b`), deep: /\b(?:tief|tiefe|tiefer)\b/, block: /\bblock\s+([a-z])\b/ },
  nl: { stage: new RegExp(`\\b(?:stadium|fase|stap)\\s+${N}`), positive: /\bpositief\b/, negative: /\bnegatief\b/, clear: /\b(?:vrij|tumorvrij|schoon)\b/, hour: new RegExp(`\\b${N}\\s*uur\\b`), deep: /\bdiep(?:e)?\b/, block: /\bblok\s+([a-z])\b/ },
  // Deep: 심부, or 기저 절제연 — never the 기저 of 기저세포암 (basal cell carcinoma).
  ko: { stage: /(\d{1,2})\s*단계|단계\s*(\d{1,2})/, positive: /양성/, negative: /음성/, clear: /(?:깨끗|종양\s*없음)/, hour: /(\d{1,2})\s*시/, deep: /심부|기저\s*절제연/, block: /(?:블록|블럭)\s*([a-z])\b/ },
};

/**
 * Batch 463b: words for 12 o'clock and Korean number words, rewritten as the
 * digits the lexicon reads. English noon / midday / midnight, French midi /
 * minuit, German Mittag / Mitternacht → 12 (on the margin clock midnight is 12
 * o'clock too; the deep margin is only ever its own word). Korean: native hours
 * (한 시 … 열두 시) and Sino-Korean hours and stages (십이시, 일단계) → digits.
 */
const KO_NATIVE_HOURS: [string, number][] = [['열\\s*두', 12], ['열\\s*한', 11], ['열', 10], ['아홉', 9], ['여덟', 8], ['일곱', 7], ['여섯', 6], ['다섯', 5], ['네', 4], ['세', 3], ['두', 2], ['한', 1]];
const KO_SINO: [string, number][] = [['십이', 12], ['십일', 11], ['십', 10], ['구', 9], ['팔', 8], ['칠', 7], ['육', 6], ['오', 5], ['사', 4], ['삼', 3], ['이', 2], ['일', 1]];
function normaliseSpoken(s: string, lang: string): string {
  if (lang === 'en') return s.replace(/\b(?:noon|midday|midnight)\b/g, "12 o'clock");
  if (lang === 'fr') return s.replace(/\b(?:midi|minuit)\b/g, '12 heures');
  if (lang === 'de') return s.replace(/\b(?:mittags?|mitternacht)\b/g, '12 uhr');
  if (lang === 'ko') {
    let out = s;
    // Native hours: "세 시", "열두시" (a space may sit between the number and 시).
    for (const [w, n] of KO_NATIVE_HOURS) out = out.replace(new RegExp(`(^|[^가-힣])${w}\\s*시`, 'g'), `$1${n}시`);
    // Sino-Korean hours and stages, only written together ("십이시", "일단계"): "이 단계" with a space is "this stage", not stage 2.
    for (const [w, n] of KO_SINO) out = out.replace(new RegExp(`(^|[^가-힣])${w}(시|단계)`, 'g'), `$1${n}$2`);
    return out;
  }
  return s;
}

const toNumber = (s: string | undefined) => (s === undefined ? NaN : /^\d+$/.test(s) ? Number(s) : NUMBER_WORDS[s] ?? NaN);
const firstGroup = (m: RegExpExecArray | RegExpMatchArray | null) => (m ? m.slice(1).find(g => g !== undefined) : undefined);
const global = (re: RegExp) => new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);

/**
 * "Stage 1, positive at 12 o'clock", "stage 2 deep negative", "stage 2 clear"
 * (and "stade 1 positif à 12 heures", "Stufe 1 positiv bei 12 Uhr",
 * "stadium 1 positief op 12 uur", "1단계 12시 양성"). Null when it isn't one,
 * or when it is ambiguous — two clock positions, a clock position and "deep",
 * or "negative" without a sector — so nothing is changed on a guess, and a
 * whole stage is cleared only by its clear word.
 */
export function parseMohsVoiceCommand(spoken: string, language: string): MohsVoiceCommand | null {
  const lang = LEXICON[language.slice(0, 2)] ? language.slice(0, 2) : 'en';
  const lex = LEXICON[lang];
  const s = normaliseSpoken(spoken.toLowerCase().replace(/[,.;:!?]/g, ' ').replace(/\s+/g, ' ').trim(), lang);
  const stageMatch = lex.stage.exec(s);
  const stage = toNumber(firstGroup(stageMatch));
  if (!stageMatch || !Number.isInteger(stage) || stage < 1 || stage > MOHS_MAX_STAGES) return null;
  const rest = s.replace(stageMatch[0], ' ');
  const positive = lex.positive.test(rest); const negative = lex.negative.test(rest);
  const deep = lex.deep.test(rest);
  const hourMatches = [...rest.matchAll(global(lex.hour))];
  // The same hour said twice ("12 o'clock noon") is one hour.
  const hours = [...new Set(hourMatches.map(m => toNumber(firstGroup(m))).filter(h => Number.isInteger(h)))];
  // Every other number spoken (a range "12 to 3", a list "1 and 2") makes it ambiguous.
  const otherNumbers = rest.replace(global(lex.hour), ' ').split(/\s+/).filter(w => /^\d+$/.test(w) || (NUMBER_WORDS[w] !== undefined && !ARTICLES.has(w)));
  if (hours.length > 1 || otherNumbers.length || (deep && hours.length)) return null;
  const hour = hours[0];
  const sector: MohsSectorId | undefined = deep ? 'deep' : hour !== undefined && hour >= 1 && hour <= 12 ? (`c${hour}` as MohsSectorId) : undefined;
  if (hour !== undefined && !sector) return null;
  const block = firstGroup(lex.block.exec(rest))?.toUpperCase();
  if (sector) return positive !== negative ? { stage, sector, status: positive ? 'positive' : 'negative', ...(positive && block ? { block } : {}) } : null;
  return lex.clear.test(rest) && !positive ? { stage, status: 'clear' } : null;
}

/** What a voice command does to these answers. */
export type MohsVoiceOutcome = 'applied' | 'noStage' | 'noChange';
export function mohsVoiceOutcome(fieldId: string, answers: Answers, cmd: MohsVoiceCommand, defaultHistology?: string): MohsVoiceOutcome {
  if (cmd.stage > mohsStageCount(fieldId, answers)) return 'noStage';
  return Object.keys(mohsVoicePatch(fieldId, answers, cmd, defaultHistology)).length ? 'applied' : 'noChange';
}

/** What a voice command changes (nothing when it doesn't apply to these answers). */
export function mohsVoicePatch(fieldId: string, answers: Answers, cmd: MohsVoiceCommand, defaultHistology?: string): AnswerPatch {
  if (cmd.stage > mohsStageCount(fieldId, answers)) return {};
  if (cmd.status === 'clear' || !cmd.sector) return clearMohsStage(fieldId, answers, cmd.stage);
  // "Stage 1, 12 o'clock positive, block B" on a sector already positive: assigns its block.
  if (cmd.status === 'positive' && cmd.block && positiveIds(fieldId, cmd.stage, answers).includes(cmd.sector)) {
    return text(answers[stageKey(fieldId, cmd.stage, cmd.sector, 'block')]).toUpperCase() === cmd.block ? {} : setMohsSectorDetail(fieldId, cmd.stage, cmd.sector, 'block', cmd.block);
  }
  return setMohsSector(fieldId, answers, cmd.stage, cmd.sector, cmd.status, defaultHistology, cmd.block);
}

/** The default histology for a newly positive sector: the answer to the
 *  question the Mohs field names (defaultHistologyFieldId), as its label. When
 *  that answer is "other" (it shows a free-text question, visibleWhen that
 *  answer), the free text instead, or no default when it is blank. */
export function mohsDefaultHistology(
  template: { sections: { fields: { id: string; type?: string; options?: { id: string; label: string }[]; visibleWhen?: { fieldId?: string; answerId?: string } | null }[] }[] } | null | undefined,
  field: { defaultHistologyFieldId?: string },
  answers: Answers,
): string | undefined {
  if (!template || !field.defaultHistologyFieldId) return undefined;
  const fields = template.sections.flatMap(s => s.fields);
  const source = fields.find(f => f.id === field.defaultHistologyFieldId);
  const raw = answers[field.defaultHistologyFieldId];
  // The first answer (a tumour type is one choice).
  const id = Array.isArray(raw) ? raw[0] : raw === undefined || raw === '' ? undefined : String(raw);
  if (!id) return undefined;
  const freeText = fields.find(f => f.visibleWhen?.fieldId === field.defaultHistologyFieldId && f.visibleWhen?.answerId === id && (f.type === 'text' || f.type === 'longtext'));
  if (freeText) return text(answers[freeText.id]) || undefined;
  const label = (source?.options?.find(o => o.id === id)?.label ?? id).trim();
  return label || undefined;
}

/** The report words from a translation function (organMap.mohs.report.*). */
export function mohsReportWords(t: (key: string, options?: Record<string, unknown>) => string): MohsReportWords {
  const R = 'organMap.mohs.report';
  return {
    stage: n => t(`${R}.stage`, { n }),
    clear: t(`${R}.clear`),
    residual: t(`${R}.residual`),
    hour: h => t('organMap.breast.hourName', { n: h }),
    peripheral: t(`${R}.peripheral`),
    deep: t(`${R}.deep`),
    block: b => t(`${R}.block`, { block: b }),
    perineural: t(`${R}.perineural`),
    blocksCut: n => t(`${R}.blocksCut`, { count: n }),
    time: time => t(`${R}.time`, { time }),
    join: (a, b) => t(`${R}.join`, { a, b }),
    list: (a, b) => t(`${R}.list`, { a, b }),
  };
}

/** Batch 463b: the template editor's check of a Mohs question's default-histology
 *  source: none chosen is allowed (no default); a chosen question must still exist
 *  and be a choice question. */
export function mohsHistologySourceProblem(
  template: { sections: { fields: { id: string; type?: string }[] }[] },
  field: { type?: string; defaultHistologyFieldId?: string },
): 'missing' | 'notChoice' | undefined {
  if (field.type !== 'spatialStageCanvas' || !field.defaultHistologyFieldId) return undefined;
  const source = template.sections.flatMap(s => s.fields).find(f => f.id === field.defaultHistologyFieldId);
  if (!source) return 'missing';
  return source.type === 'dropdown' || source.type === 'radio' || source.type === 'checkboxes' ? undefined : 'notChoice';
}

/** Every Mohs question in a template whose default-histology source is broken (blocks submitting it for review). */
export const mohsTemplateProblems = (template: { sections: { fields: { id: string; type?: string; defaultHistologyFieldId?: string }[] }[] }) =>
  template.sections.flatMap(s => s.fields).filter(f => mohsHistologySourceProblem(template, f) !== undefined).map(f => f.id);
