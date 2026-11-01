// src/services/reasons/benchReasons.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 736 (Pete, Oct 30, 2026): the bench's tap-to-pick reasons live in the Reason Dictionary, so each lab can
// reword, add, reorder and retire them (Configuration → System → Bench Reasons, config:bench-reasons:manage).
//   • Defaults ship in six languages: a default entry the lab has not reworded shows its translation
//     (`benchReasons.<code>`); once reworded, the lab's own words are shown as entered (data is not translated).
//   • The code is the entry's id, which never changes when the wording does, so reports count a reason the same
//     way before and after a lab rewords it. Every action saves the code beside the text, and the audit detail
//     carries both.
//   • A free-text note stays optional; with no reason picked, the note alone is the reason (no code).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReasonDictionaryCategory, ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';

export type BenchReasonCategory = Extract<ReasonDictionaryCategory,
  'BENCH_BLOCK_EXHAUSTED' | 'BENCH_ADDON_EXHAUSTED' | 'BENCH_BATCH_ABORT' | 'BENCH_BATCH_OVERRIDE' | 'BENCH_BATCH_COLD_CHAIN'>;

export const BENCH_REASON_CATEGORIES: readonly BenchReasonCategory[] = [
  'BENCH_BLOCK_EXHAUSTED', 'BENCH_ADDON_EXHAUSTED', 'BENCH_BATCH_ABORT', 'BENCH_BATCH_OVERRIDE', 'BENCH_BATCH_COLD_CHAIN',
];

export function isBenchReasonCategory(c: string): c is BenchReasonCategory {
  return (BENCH_REASON_CATEGORIES as readonly string[]).includes(c);
}

type Seed = [id: string, category: BenchReasonCategory, name: string, description: string];
const SEEDS: readonly Seed[] = [
  ['BE_NO_TISSUE', 'BENCH_BLOCK_EXHAUSTED', 'No tissue left in the block', 'The face has gone through the tissue.'],
  ['BE_FEW_SECTIONS', 'BENCH_BLOCK_EXHAUSTED', 'Only a few sections left', 'Some tissue remains, too little for every waiting slide.'],
  ['BE_INCOMPLETE_FACE', 'BENCH_BLOCK_EXHAUSTED', 'Cannot get a full face', 'Facing further would use up what is left.'],
  ['BE_BLOCK_DAMAGED', 'BENCH_BLOCK_EXHAUSTED', 'Block damaged', 'Cracked, chipped or poorly processed block.'],
  ['AE_PATHOLOGIST_REQUEST', 'BENCH_ADDON_EXHAUSTED', 'Requested by the pathologist', 'The pathologist asked for this answer.'],
  ['AE_LAST_MATERIAL', 'BENCH_ADDON_EXHAUSTED', 'Last material available', 'No other block or slide of the part can be used.'],
  ['AE_DIAGNOSIS_NEEDED', 'BENCH_ADDON_EXHAUSTED', 'Needed to complete the diagnosis', 'The result is needed before sign-out.'],
  ['BA_CREATED_IN_ERROR', 'BENCH_BATCH_ABORT', 'Created in error', 'The batch should not have been opened.'],
  ['BA_WRONG_CONTAINER', 'BENCH_BATCH_ABORT', 'Wrong container or rack', 'The items are in a different carrier.'],
  ['BA_EQUIPMENT_FAILURE', 'BENCH_BATCH_ABORT', 'Equipment failure', 'The instrument stopped or failed the run.'],
  ['BA_RUN_CANCELLED', 'BENCH_BATCH_ABORT', 'Run cancelled by the lab', 'The lab decided not to run this batch.'],
  ['BO_ACCOUNTED_ELSEWHERE', 'BENCH_BATCH_OVERRIDE', 'Items accounted for elsewhere', 'Missing items were found in another carrier or step.'],
  ['BO_SCANNED_BY_HAND', 'BENCH_BATCH_OVERRIDE', 'Checked by hand: barcode would not scan', 'The item is present; its barcode could not be read.'],
  ['BO_SUPERVISOR_APPROVED', 'BENCH_BATCH_OVERRIDE', 'Approved by the supervisor', 'A supervisor reviewed the discrepancy.'],
  ['BO_LABEL_DAMAGED', 'BENCH_BATCH_OVERRIDE', 'Label damaged, identity checked by eye', 'The label is unreadable; identity was confirmed another way.'],
  ['CC_BACK_IN_RANGE', 'BENCH_BATCH_COLD_CHAIN', 'Temperature back in range on arrival', 'The excursion was brief; the reading on arrival was in range.'],
  ['CC_LOGGER_FAULT', 'BENCH_BATCH_COLD_CHAIN', 'Packaging intact; logger fault', 'The packaging and coolant were intact; the logger misread.'],
  ['CC_COURIER_DELAY', 'BENCH_BATCH_COLD_CHAIN', 'Courier delay; contents checked', 'The delivery was late; the contents were checked.'],
];

/** The default bench reasons, in English as data (their translations are `benchReasons.<id>`). */
export const BENCH_REASON_SEEDS: readonly ReasonDictionaryEntry[] = SEEDS.map(([id, category, name, description]) => ({
  id, category, name, description, status: 'Active',
  sortOrder: SEEDS.filter(s => s[1] === category).findIndex(s => s[0] === id) + 1,
}));

const SEED_NAME = new Map(SEEDS.map(([id, , name]) => [id, name]));

/** The locale key of a default reason's wording. */
export const benchReasonKey = (id: string): string => `benchReasons.${id}`;

/** Whether an entry still has its default wording (so its translation is shown). */
export function hasDefaultWording(entry: Pick<ReasonDictionaryEntry, 'id' | 'name'>): boolean {
  return SEED_NAME.get(entry.id) === entry.name;
}

/** The text to show for an entry: its translation while it keeps the default wording, else the lab's own words. */
export function benchReasonLabel(entry: Pick<ReasonDictionaryEntry, 'id' | 'name'>, translate: (key: string) => string): string {
  return hasDefaultWording(entry) ? translate(benchReasonKey(entry.id)) : entry.name;
}

/** The active reasons of a category, in the lab's order. */
export function activeBenchReasons(entries: readonly ReasonDictionaryEntry[]): ReasonDictionaryEntry[] {
  return entries.filter(e => e.status === 'Active')
    .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
}

/** What the person chose: a reason (its code and the words shown) and an optional note. */
export interface BenchReasonChoice {
  code?: string;
  label?: string;
  note: string;
}

export const EMPTY_BENCH_REASON: BenchReasonChoice = { note: '' };

/**
 * The reason text saved with the record: the picked reason, the note, or both joined by `join` (a locale template,
 * so word order and punctuation follow the language). Empty when neither was given.
 */
export function benchReasonText(choice: BenchReasonChoice, join: (reason: string, note: string) => string): string {
  const label = choice.label?.trim() ?? '';
  const note = choice.note.trim();
  if (label && note) return join(label, note);
  return label || note;
}

/** The code saved beside the text (only when a reason was picked). */
export const benchReasonCode = (choice: BenchReasonChoice): string | undefined => (choice.label?.trim() ? choice.code : undefined);

/** An audit detail with its reason code, in the literal English audit records use. */
export function withReasonCode(detail: string, code: string | undefined): string {
  return code ? `${detail} [reason code ${code}]` : detail;
}

/** Which bench reasons each Batch Detail window offers (BatchReasonModal's fieldId). */
export const BATCH_REASON_CATEGORY: Readonly<Record<'abortReason' | 'overrideReason' | 'coldChainNote', BenchReasonCategory>> = {
  abortReason: 'BENCH_BATCH_ABORT',
  overrideReason: 'BENCH_BATCH_OVERRIDE',
  coldChainNote: 'BENCH_BATCH_COLD_CHAIN',
};
