// src/services/cases/caseWrite.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 458 (PS-71, Pete's optimistic-locking spec, Oct 4 2026): every case
// save carries the version it was built from, so a save made from an old
// copy never silently overwrites someone else's change.
//
//   updateCaseWithRetry  For saves the system makes (inbound interface
//                        messages, scans, sign-out side effects, batch and
//                        workspace actions). Reads the case, builds the
//                        change FROM THAT READ, saves with its version; on a
//                        conflict it reads again and rebuilds the change from
//                        the newer case (up to 3 tries). It never saves
//                        without a version. The change function must derive
//                        everything it writes from the case it is given:
//                        that is what makes the retry safe.
//
//   overwriteAfterConflict  The person's own "Overwrite" on the report
//                        page's Edit Conflict dialog. Needs
//                        case:edit-conflict:override (Pathologist, Admin
//                        and Lab Director: Pete, Oct 4). Re-reads the newest
//                        version and saves against it, so the overwrite is
//                        itself checked (a third save landing in between is
//                        caught), and audits what was overwritten.
//
// The guard caseWriteVersion.guard.test.ts fails on any case save without a
// version outside this file and the listed creation follow-ups.
// Server contract: docs/architecture/CASE_API.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { ConcurrencyConflictError } from './ConcurrencyConflictError';

export const CASE_WRITE_MAX_ATTEMPTS = 3;

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export interface CaseWriteDeps {
  getCase: (caseId: string) => Promise<Case | null | undefined>;
  updateCase: (caseId: string, updates: Partial<Case>, expectedVersion: number) => Promise<void>;
}

export type CaseWriteResult =
  | { ok: true; version: number; updates: Partial<Case>; attempts: number }
  | { ok: false; reason: 'notFound' | 'noChange' | 'conflict'; attempts: number };

export const caseVersionOf = (c: Pick<Case, 'version'> | null | undefined): number => (c?.version ?? 0);

/**
 * Read, build the change from what was read, save with that version; on a
 * conflict, read again and rebuild. `change` returns null when, given the
 * newest case, there is nothing to do (e.g. someone already did it).
 */
export async function updateCaseWithRetry(
  caseId: string,
  change: (current: Case) => Partial<Case> | null,
  deps: CaseWriteDeps,
  maxAttempts: number = CASE_WRITE_MAX_ATTEMPTS,
): Promise<CaseWriteResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const current = await deps.getCase(caseId);
    if (!current) return { ok: false, reason: 'notFound', attempts: attempt };
    const updates = change(current);
    if (!updates) return { ok: false, reason: 'noChange', attempts: attempt };
    const version = caseVersionOf(current);
    try {
      await deps.updateCase(caseId, updates, version);
      return { ok: true, version: version + 1, updates, attempts: attempt };
    } catch (e) {
      if (!(e instanceof ConcurrencyConflictError)) throw e;
      // Someone saved in between: go round again from their version.
    }
  }
  return { ok: false, reason: 'conflict', attempts: maxAttempts };
}

/**
 * The same, for callers that must not continue when the save didn't happen:
 * throws a ConcurrencyConflictError after the last try, so existing
 * conflict handling (and CaseRouter's conflict audit) applies.
 */
export async function updateCaseWithRetryOrThrow(
  caseId: string,
  change: (current: Case) => Partial<Case> | null,
  deps: CaseWriteDeps,
): Promise<CaseWriteResult> {
  const r = await updateCaseWithRetry(caseId, change, deps);
  if (r.ok === false && r.reason === 'conflict') {
    const latest = await deps.getCase(caseId);
    throw new ConcurrencyConflictError(caseId, -1, caseVersionOf(latest));
  }
  if (r.ok === false && r.reason === 'notFound') throw new Error(`Case ${caseId} not found`);
  return r;
}

// ── A screen's instant save (comments, flags, codes, specimen fields) ───────

export interface PendingChange { parts: Partial<Case>; base: Partial<Case> }

export type PageSaveOutcome =
  | { kind: 'saved'; version: number }
  /** The same field was changed both ways: nothing saved. The change is kept
   *  (`pending`) for the next draft save or "Save mine anyway". */
  | { kind: 'conflict'; actualVersion: number; pending: PendingChange }
  /** Someone else saved other fields: the person reviews before anything is saved. */
  | { kind: 'review'; review: MergeReview; pending: PendingChange }
  | { kind: 'notFound' };

/**
 * Batch 458 (PS-71; Pete: "We can't lose the user's changes" and "an option
 * to abort or accept"). A screen's instant save (a comment, a flag, a code, a
 * specimen field). Saved at once when nobody else saved since the screen's
 * version. Otherwise nothing is saved: if the other changes are elsewhere,
 * the person reviews them ('review'); if the same field was changed both
 * ways, the Edit Conflict dialog ('conflict'). Either way the change comes
 * back as `pending`, kept on the screen for the next save; never dropped.
 * `before` is the screen's case before this change.
 */
export async function savePageChange(
  input: { caseId: string; patch: Partial<Case>; before: Case | null; knownVersion: number; pending: PendingChange | null },
  deps: CaseWriteDeps,
): Promise<PageSaveOutcome> {
  const { caseId, patch, before } = input;
  const base = Object.fromEntries(Object.keys(patch).map(k => [k, before ? (before as any)[k] : undefined])) as Partial<Case>;
  const r = await saveDraftParts(caseId, patch, base, input.knownVersion, deps, { review: true, before });
  if (r.ok === false) {
    if (r.reason === 'notFound') return { kind: 'notFound' };
    const pending: PendingChange = { parts: { ...(input.pending?.parts ?? {}), ...patch }, base: { ...base, ...(input.pending?.base ?? {}) } };
    if (r.reason === 'review') return { kind: 'review', review: r.review, pending };
    // The first base recorded for a part wins: it's what the change was built on.
    return { kind: 'conflict', actualVersion: r.actualVersion, pending };
  }
  // With review on, a save that lands is never a merge (that stops for review).
  return { kind: 'saved', version: r.version };
}

// ── The person's overwrite ───────────────────────────────────────────────────

export interface OverwriteDeps extends CaseWriteDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  logAudit: (event: { type: 'user'; event: string; detail: string; user: string; caseId: string | null; confidence: null }) => unknown;
}

export type OverwriteResult =
  | { ok: true; version: number; overwroteVersion: number }
  | { ok: false; reason: 'notPermitted' | 'notFound' | 'conflict' };

/**
 * "Overwrite" after a conflict: saves this session's changes over the
 * newest version, permission-checked and audited. The fields overwritten
 * are named in the audit (their values are not: they may hold PHI).
 */
export async function overwriteAfterConflict(
  input: { caseId: string; caseLabel: string; updates: Partial<Case>; changedFields: string[]; actor: { id: string; name: string } },
  deps: OverwriteDeps,
): Promise<OverwriteResult> {
  const decision = await deps.enforce('case:edit-conflict:override', { caseId: input.caseId });
  if (!decision.allowed) {
    deps.logAudit({ type: 'user', event: 'Edit conflict overwrite refused', detail: `Overwrite refused: no case:edit-conflict:override.`, user: input.actor.name || input.actor.id, caseId: input.caseLabel, confidence: null });
    return { ok: false, reason: 'notPermitted' };
  }
  const latest = await deps.getCase(input.caseId);
  if (!latest) return { ok: false, reason: 'notFound' };
  const overwritten = caseVersionOf(latest);
  try {
    await deps.updateCase(input.caseId, input.updates, overwritten);
  } catch (e) {
    if (e instanceof ConcurrencyConflictError) return { ok: false, reason: 'conflict' };
    throw e;
  }
  const fields = input.changedFields.length ? input.changedFields.join(', ') : 'the draft';
  deps.logAudit({
    type: 'user', event: 'Concurrency conflict overridden',
    detail: `Edit Conflict → Overwrite: this session's changes saved over version ${overwritten} (fields: ${fields}).`,
    user: input.actor.name || input.actor.id, caseId: input.caseLabel, confidence: null,
  });
  return { ok: true, version: overwritten + 1, overwroteVersion: overwritten };
}

// ── View changes ─────────────────────────────────────────────────────────────

/** The parts of a case the Edit Conflict dialog compares, by locale key. */
export const CONFLICT_FIELDS = [
  'synopticReports', 'orchSections', 'grossingReports', 'diagnostic', 'specimens', 'participants', 'order',
  'coding', 'caseComments', 'caseFlags', 'caseHolds', 'status',
] as const;
export type ConflictField = typeof CONFLICT_FIELDS[number];

export interface ConflictRow {
  field: ConflictField;
  /** Overwrite replaces the saved version of this part with this session's. */
  overwritten: boolean;
}

/**
 * The parts of the case where this session's copy (`mine`) differs from the
 * version now saved (`theirs`), and whether Overwrite would replace each
 * (it writes only `overwriteFields`; every other part stays as saved).
 */
export function caseConflictRows(mine: Partial<Case>, theirs: Partial<Case>, overwriteFields: readonly string[]): ConflictRow[] {
  return CONFLICT_FIELDS
    .filter(field => !same((mine as any)[field], (theirs as any)[field]))
    .map(field => ({ field, overwritten: overwriteFields.includes(field) }));
}

// ── Draft saves: merged section by section ──────────────────────────────────

/**
 * Batch 458 (Pete, Oct 4: lock "only the specific section ... being
 * modified", so a tech entering specimen data and a pathologist dictating
 * the microscopic don't block each other; and "We can't lose the user's
 * changes"). Lists of records are matched element by element by these keys:
 * a report section, a synoptic or grossing report, a specimen, a block, a
 * slide, a flag, a comment.
 */
export const DRAFT_LIST_KEYS: Readonly<Record<string, string>> = {
  orchSections: 'id', synopticReports: 'instanceId', grossingReports: 'instanceId',
};
const ELEMENT_KEYS = ['instanceId', 'id'] as const;

export type DraftMerge =
  | { ok: true; parts: Partial<Case> }
  | { ok: false; overlap: string[] };

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** The key a list's records are matched by: instanceId or id, when every record has one. */
function elementKey(...lists: unknown[][]): string | null {
  const all = lists.flat();
  if (!all.length || !all.every(isPlain)) return null;
  return ELEMENT_KEYS.find(k => all.every(e => (e as any)[k] !== undefined && (e as any)[k] !== null)) ?? null;
}

/**
 * Three-way merge of one value: `b` as this session started from it, `m`
 * this session's, `t` as now saved. Changed on one side only → that side.
 * Both changed differently → objects merge key by key, lists of records
 * record by record (matched by id); only the same field changed both ways
 * differently is an overlap (named by its path), and then the saved value
 * is kept there, nothing of this session's is applied over it.
 */
function merge3(b: unknown, m: unknown, t: unknown, path: string, overlap: string[]): unknown {
  if (same(m, t) || same(b, m)) return t;
  if (same(b, t)) return m;
  if (isPlain(m) && isPlain(t)) {
    const base = isPlain(b) ? b : {};
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(t), ...Object.keys(m)])) {
      const v = merge3(base[k], m[k], t[k], `${path}.${k}`, overlap);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  if (Array.isArray(m) && Array.isArray(t)) {
    const bl = Array.isArray(b) ? b : [];
    const key = elementKey(m, t, bl);
    if (key) {
      const idx = (list: unknown[]) => new Map(list.map(e => [(e as any)[key], e]));
      const bm = idx(bl); const mm = idx(m); const tm = idx(t);
      const order = [...t.map(e => (e as any)[key]), ...m.map(e => (e as any)[key]).filter(k => !tm.has(k))];
      const out: unknown[] = [];
      for (const k of new Set(order)) {
        const v = merge3(bm.get(k), mm.get(k), tm.get(k), `${path}:${String(k)}`, overlap);
        if (v !== undefined) out.push(v);
      }
      return out;
    }
  }
  overlap.push(path);
  return t;
}

/**
 * Merge this session's changed parts (`mine`) onto the saved case
 * (`theirs`), given those parts as this session last loaded or saved them
 * (`base`). Field by field and record by record; `overlap` names each field
 * both sides changed to different values, and then nothing is merged.
 */
export function mergeDraftParts(base: Partial<Case>, mine: Partial<Case>, theirs: Partial<Case>): DraftMerge {
  const parts: Record<string, unknown> = {};
  const overlap: string[] = [];
  for (const field of Object.keys(mine)) {
    parts[field] = merge3((base as any)[field], (mine as any)[field], (theirs as any)[field], field, overlap);
  }
  return overlap.length ? { ok: false, overlap } : { ok: true, parts: parts as Partial<Case> };
}

/**
 * Batch 458 (Pete: "the User gets alerted with a notification of the
 * changes, and then an option to abort or accept"). Someone else saved since
 * this screen loaded the case, in other fields than this save's: nothing is
 * saved yet. The person sees what they changed and chooses: save theirs and
 * mine together (commitMergeReview), or not yet (the screen takes up
 * `latest` with `parts` on top, unsaved).
 */
export interface MergeReview {
  caseId: string;
  /** The saved case now, and its version. */
  latest: Case;
  version: number;
  /** This save's parts, merged onto `latest`: what Save would write. */
  parts: Partial<Case>;
  /** Parts of the case the other person (or a system process) changed. */
  theirsChanged: string[];
  /** Parts this save changes. */
  mineChanged: string[];
}

export type DraftSaveResult =
  | { ok: true; version: number; merged: false }
  | { ok: true; version: number; merged: true; saved: Case }
  | { ok: false; reason: 'review'; review: MergeReview }
  | { ok: false; reason: 'overlap'; actualVersion: number; overlap: string[] }
  | { ok: false; reason: 'notFound' };

/**
 * A person's draft save. First against the version the page knows; if
 * someone else saved since, the draft is merged section by section onto the
 * newest case and saved against it, with no dialog, unless both changed the
 * same section (then 'overlap', and the page opens the Edit Conflict
 * dialog). `saved` is the case as now stored, for the page to take up.
 */
export async function saveDraftParts(
  caseId: string, mine: Partial<Case>, base: Partial<Case>, knownVersion: number, deps: CaseWriteDeps,
  /** review: stop for the person's decision instead of saving a merge (`before` = the screen's case, to name what changed). */
  opts: { review?: boolean; before?: Partial<Case> | null } = {},
): Promise<DraftSaveResult> {
  try {
    await deps.updateCase(caseId, mine, knownVersion);
    return { ok: true, version: knownVersion + 1, merged: false };
  } catch (e) {
    if (!(e instanceof ConcurrencyConflictError)) throw e;
  }
  let lastVersion = knownVersion;
  for (let attempt = 1; attempt <= CASE_WRITE_MAX_ATTEMPTS; attempt++) {
    const latest = await deps.getCase(caseId);
    if (!latest) return { ok: false, reason: 'notFound' };
    lastVersion = caseVersionOf(latest);
    const merge = mergeDraftParts(base, mine, latest);
    if (merge.ok === false) return { ok: false, reason: 'overlap', actualVersion: lastVersion, overlap: merge.overlap };
    if (opts.review) {
      const before = { ...(opts.before ?? {}), ...base };
      return {
        ok: false, reason: 'review',
        review: {
          caseId, latest, version: lastVersion, parts: merge.parts,
          theirsChanged: caseConflictRows(before, latest, []).map(r => r.field),
          mineChanged: Object.keys(mine).filter(k => !same((mine as any)[k], (base as any)[k])),
        },
      };
    }
    try {
      await deps.updateCase(caseId, merge.parts, lastVersion);
      return { ok: true, version: lastVersion + 1, merged: true, saved: { ...latest, ...merge.parts, version: lastVersion + 1 } as Case };
    } catch (e) {
      if (!(e instanceof ConcurrencyConflictError)) throw e;
    }
  }
  return { ok: false, reason: 'overlap', actualVersion: lastVersion, overlap: [] };
}

/** "Save mine with theirs": saves the reviewed merge against the version reviewed. */
export async function commitMergeReview(review: MergeReview, deps: CaseWriteDeps): Promise<{ ok: true; version: number; saved: Case } | { ok: false; reason: 'changedAgain' }> {
  try {
    await deps.updateCase(review.caseId, review.parts, review.version);
  } catch (e) {
    if (e instanceof ConcurrencyConflictError) return { ok: false, reason: 'changedAgain' };
    throw e;
  }
  return { ok: true, version: review.version + 1, saved: { ...review.latest, ...review.parts, version: review.version + 1 } as Case };
}

/**
 * What a screen holds after taking up a newer saved case (after a reviewed
 * save, or "Not yet, show me their changes"), without losing what the person
 * has typed and not saved. Their unsaved draft parts are merged onto the
 * saved case the same field-by-field way. If that merges cleanly, the screen
 * shows the result on the saved version (its next save is checked against
 * that). If not, the draft is kept exactly as typed and the screen keeps its
 * old version and base, so the next draft save opens the Edit Conflict
 * dialog: nothing is laid over the other person's work, nothing of theirs is
 * lost.
 */
export function takeUpSavedCase(input: {
  saved: Case; savedVersion: number; applied: Partial<Case>;
  pageDraft: Partial<Case>; draftBase: Partial<Case>;
}): { show: Case; adoptVersion: number | null; draftBase: Partial<Case> | null; draftParts: Partial<Case> } {
  const draft = Object.fromEntries(Object.entries(input.pageDraft).filter(([k]) => !(k in input.applied))) as Partial<Case>;
  const keys = Object.keys(draft);
  const pick = (c: Partial<Case>) => Object.fromEntries(keys.map(k => [k, (c as any)[k]])) as Partial<Case>;
  const m = mergeDraftParts(pick(input.draftBase), draft, input.saved);
  if (m.ok === false) {
    return { show: { ...input.saved, ...input.applied, ...draft } as Case, adoptVersion: null, draftBase: null, draftParts: draft };
  }
  return { show: { ...input.saved, ...input.applied, ...m.parts } as Case, adoptVersion: input.savedVersion, draftBase: pick(input.saved), draftParts: m.parts };
}

/** Batch 575: the Orchestration report's text fields the page fills from its sections (useOrchestratorDraft). */
export const SECTION_BACKED_DIAGNOSTIC_FIELDS = ['grossDescription', 'microscopicDescription', 'ancillaryStudies', 'reportNarrative'] as const;

/**
 * Batch 575 (review): the diagnostic to show after taking up a newer case in Orchestration mode: the saved one
 * (so someone else's sign-out or recut fields are shown, and not written back over later), with only the
 * fields the page fills from its own sections kept from the page.
 */
export function orchestrationDiagnosticAfterTakeUp(saved: Record<string, unknown> | undefined, page: Record<string, unknown> | undefined): Record<string, unknown> {
  const kept = Object.fromEntries(SECTION_BACKED_DIAGNOSTIC_FIELDS.filter(k => page && k in page).map(k => [k, page![k]]));
  return { ...(saved ?? {}), ...kept };
}

export type TakeUpNewerCaseResult =
  | { kind: 'stale' }
  | { kind: 'shown'; show: Case; adoptVersion: number; draftBase: Partial<Case>; pending: { parts: Partial<Case>; base: Partial<Case> } | null }
  | { kind: 'overlap'; show: Case };

/**
 * Batch 575 ("Show their changes" on the "someone else saved this case" notice): take up the newer saved case
 * in place, without a reload, keeping everything this page holds and hasn't saved: its draft parts AND the
 * changes held back by an earlier conflict (`pending`, e.g. a flag edit kept with "decide later"), merged field
 * by field like any save.
 *   - stale: the case read is not newer than the page (its own save landed meanwhile): nothing to do.
 *   - shown: merged cleanly; the page moves to the saved version, its unsaved parts laid over theirs, the held
 *     changes rebased on the saved case (so the next save checks them against what is now shown).
 *   - overlap: their changes touch what this page hasn't saved: theirs are shown everywhere else, this page's
 *     unsaved parts stay exactly as typed, and the page keeps its old version, so the next save opens the Edit
 *     Conflict dialog to choose.
 */
export function takeUpNewerCase(input: {
  saved: Case; savedVersion: number; knownVersion: number;
  pageDraft: Partial<Case>; draftBase: Partial<Case>;
  pending: { parts: Partial<Case>; base: Partial<Case> } | null;
}): TakeUpNewerCaseResult {
  if (!(input.savedVersion > input.knownVersion)) return { kind: 'stale' };
  const pendingParts = input.pending?.parts ?? {};
  const pageDraft = { ...pendingParts, ...input.pageDraft } as Partial<Case>;
  const draftBase = { ...(input.pending?.base ?? {}), ...input.draftBase } as Partial<Case>;
  const take = takeUpSavedCase({ saved: input.saved, savedVersion: input.savedVersion, applied: {}, pageDraft, draftBase });
  if (take.adoptVersion === null) return { kind: 'overlap', show: take.show };
  const pendingKeys = Object.keys(pendingParts);
  const merged = take.draftParts as Record<string, unknown>;
  const savedFields = input.saved as unknown as Record<string, unknown>;
  const pending = pendingKeys.length
    ? {
      parts: Object.fromEntries(pendingKeys.map(k => [k, merged[k]])) as Partial<Case>,
      base: Object.fromEntries(pendingKeys.map(k => [k, savedFields[k]])) as Partial<Case>,
    }
    : null;
  const draftKeys = Object.keys(input.pageDraft);
  return {
    kind: 'shown', show: take.show, adoptVersion: take.adoptVersion, pending,
    draftBase: Object.fromEntries(draftKeys.map(k => [k, savedFields[k]])) as Partial<Case>,
  };
}

/** Batch 577: what the page shows after "Use their version" in the Edit Conflict dialog. */
export interface TheirVersion {
  /** The saved case, exactly as saved: nothing of this page's is laid over it. */
  show: Case;
  /** The Orchestration report's sections as saved (none saved: none, as when the case is opened). */
  orchSections: unknown[];
  /** The version the page now holds. */
  adoptVersion: number;
}

/**
 * Batch 577 (carried from 575): the Edit Conflict dialog's "Use their version" replaces "Reload their
 * version". The person has chosen to discard what this page holds and hasn't saved (its draft parts and any
 * change held back by an earlier conflict), so the page takes the saved case up in place, exactly as opening
 * it would show it, without a reload: no wait, the tab and scroll position kept, and no draft copy offered
 * back afterwards. The caller also discards its draft copy, clears its unsaved marks and held changes, and
 * reads its lists again.
 */
export function takeTheirVersion(saved: Case, savedVersion: number): TheirVersion {
  const orch = (saved as unknown as { orchSections?: unknown }).orchSections;
  return { show: saved, orchSections: Array.isArray(orch) ? orch : [], adoptVersion: savedVersion };
}

/** Batch 577: where the report page is in the case (which specimen, report and section are open). */
export interface CasePageSelection {
  specimenId: string;
  reportType: 'grossing' | 'microscopic' | 'synoptic' | 'billing';
  reportInstanceId: string;
  /** The Orchestration section open in the editor (null: the first, as when the case opens). */
  sectionId: string | null;
}

/**
 * Batch 577 (review): after the page takes up someone else's saved version (Show their changes, Use their
 * version), whatever is open stays open if it still exists. Something their save removed is replaced as
 * opening the case would choose: the first specimen; an unfinished grossing report, else the first synoptic
 * report, else the first grossing report; the first section.
 */
export function selectionAfterTakeUp(show: Case, sections: readonly { id: string }[], current: CasePageSelection): CasePageSelection {
  const specimens = (show.specimens ?? []) as { id: string }[];
  const specimenId = current.specimenId && !specimens.some(s => s.id === current.specimenId) ? (specimens[0]?.id ?? '') : current.specimenId;
  const synoptic = (show.synopticReports ?? []) as { instanceId: string }[];
  const grossing = ((show as unknown as { grossingReports?: { instanceId: string; status?: string }[] }).grossingReports ?? []);
  const list = current.reportType === 'grossing' ? grossing : synoptic;
  let reportType = current.reportType;
  let reportInstanceId = current.reportInstanceId;
  if (reportInstanceId && !list.some(r => r.instanceId === reportInstanceId)) {
    const unfinished = grossing.find(g => g.status === 'draft');
    if (unfinished) { reportType = 'grossing'; reportInstanceId = unfinished.instanceId; }
    else if (synoptic.length) { reportType = 'synoptic'; reportInstanceId = synoptic[0].instanceId; }
    else if (grossing.length) { reportType = 'grossing'; reportInstanceId = grossing[0].instanceId; }
    else reportInstanceId = '';
  }
  const sectionId = current.sectionId && !sections.some(s => s.id === current.sectionId) ? null : current.sectionId;
  return { specimenId, reportType, reportInstanceId, sectionId };
}

/**
 * The version a screen should remember after a save that may have been
 * merged with someone else's. Only a save made straight on top of the
 * screen's own version (saved = known + 1) means the screen's copy is the
 * saved case; otherwise the screen keeps its old version, so its next save
 * of anything else is checked (and opens the Edit Conflict dialog).
 */
export const adoptSavedVersion = (known: number, saved: number | undefined): number =>
  (saved !== undefined && saved === known + 1 ? saved : known);

/**
 * A screen's save stopped for the person's review (MergeReview). Extends the
 * conflict error so every existing caller stops as it does for a conflict;
 * the screen shows the review instead of the Edit Conflict dialog.
 */
export class MergeReviewPendingError extends ConcurrencyConflictError {
  readonly review: MergeReview;
  constructor(review: MergeReview, knownVersion: number) {
    super(review.caseId, knownVersion, review.version);
    this.name = 'MergeReviewPendingError';
    this.review = review;
  }
}
