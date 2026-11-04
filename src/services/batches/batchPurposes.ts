// src/services/batches/batchPurposes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 728 (Lab Workflow & Batch spec, Decision 4a): what a carrier is for.
// A configurable list (Configuration → System → Research cases & batch
// purposes): six built-in purposes (Routine, Research, Teaching, Clinical
// Trial, Biobank, QA / Validation) that can be switched off but not removed,
// and any the lab adds. A new carrier takes Routine unless another is chosen;
// a Display Profile can show only carriers of chosen purposes.
//
// Built-in names are shown in the reader's language (batchPurposes.builtIn.*);
// a lab's own purposes are data and shown as entered. A lab-wide setting in the
// lab settings store; saving needs config:batch-purposes:manage (checked here).
// ─────────────────────────────────────────────────────────────────────────────
import { readLabSetting, saveLabSetting } from '../labSettings/labSettingsStore';

export const BUILT_IN_BATCH_PURPOSE_IDS = ['routine', 'research', 'teaching', 'clinical-trial', 'biobank', 'qa-validation'] as const;
export type BuiltInBatchPurposeId = typeof BUILT_IN_BATCH_PURPOSE_IDS[number];
export const DEFAULT_BATCH_PURPOSE_ID: BuiltInBatchPurposeId = 'routine';

export interface BatchPurpose {
  id: string;
  /** A lab-defined purpose's name, as entered. Empty for a built-in one (its name comes from the locale). */
  name: string;
  builtIn: boolean;
  active: boolean;
}

export const BATCH_PURPOSES_KEY = 'pathscribe_batch_purposes';
const NAME_MAX = 40;

const builtIns = (): BatchPurpose[] => BUILT_IN_BATCH_PURPOSE_IDS.map(id => ({ id, name: '', builtIn: true, active: true }));

const isBuiltInId = (id: string): id is BuiltInBatchPurposeId => (BUILT_IN_BATCH_PURPOSE_IDS as readonly string[]).includes(id);

/** The full list from whatever was saved: every built-in present (in its order), then the lab's own. */
export function normaliseBatchPurposes(saved: readonly Partial<BatchPurpose>[] | null | undefined): BatchPurpose[] {
  const list = Array.isArray(saved) ? saved : [];
  const out = builtIns().map(b => {
    const s = list.find(x => x?.id === b.id);
    return { ...b, active: b.id === DEFAULT_BATCH_PURPOSE_ID ? true : (typeof s?.active === 'boolean' ? s.active : true) };
  });
  const seen = new Set<string>(out.map(p => p.id));
  for (const s of list) {
    const id = typeof s?.id === 'string' ? s.id.trim() : '';
    const name = typeof s?.name === 'string' ? s.name.trim() : '';
    if (!id || seen.has(id) || isBuiltInId(id) || !name) continue;
    seen.add(id);
    out.push({ id, name: name.slice(0, NAME_MAX), builtIn: false, active: s.active !== false });
  }
  return out;
}

export type BatchPurposeProblem = 'nameRequired' | 'nameTooLong' | 'duplicateName' | 'routineRequired';

/** What stops a list from being saved. Names are compared without regard to case or surrounding spaces. */
export function batchPurposeProblems(list: readonly BatchPurpose[]): BatchPurposeProblem[] {
  const out = new Set<BatchPurposeProblem>();
  const names = new Set<string>();
  for (const p of list) {
    if (p.builtIn) continue;
    const n = p.name.trim();
    if (!n) out.add('nameRequired');
    if (n.length > NAME_MAX) out.add('nameTooLong');
    if (n && names.has(n.toUpperCase())) out.add('duplicateName');
    names.add(n.toUpperCase());
  }
  if (!list.some(p => p.id === DEFAULT_BATCH_PURPOSE_ID && p.active)) out.add('routineRequired');
  return [...out];
}

/** An id for a new lab-defined purpose that no other purpose has. */
export function newBatchPurposeId(name: string, existing: readonly BatchPurpose[]): string {
  const base = `lab-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'purpose'}`;
  const ids = new Set(existing.map(p => p.id));
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** The locale key of a built-in purpose's name, or undefined for a lab's own (shown as entered). */
export const batchPurposeLabelKey = (id: string | undefined): string | undefined =>
  id && isBuiltInId(id) ? `batchPurposes.builtIn.${id}` : undefined;

/** The purpose a carrier counts as: its own, or Routine when it has none (carriers made before Batch 728). */
export const effectiveBatchPurposeId = (b: { purposeId?: string }): string => b.purposeId || DEFAULT_BATCH_PURPOSE_ID;

/** Whether a carrier is shown under a Display Profile's purpose filter (none chosen = all). */
export function batchMatchesPurposeFilter(b: { purposeId?: string }, purposeIds: readonly string[] | undefined): boolean {
  return !purposeIds || purposeIds.length === 0 || purposeIds.includes(effectiveBatchPurposeId(b));
}

export function getBatchPurposes(): BatchPurpose[] {
  return normaliseBatchPurposes(readLabSetting<Partial<BatchPurpose>[] | null>(BATCH_PURPOSES_KEY, null));
}

export type SaveBatchPurposesResult =
  | { ok: true; purposes: BatchPurpose[] }
  | { ok: false; error: 'NOT_PERMITTED' }
  | { ok: false; error: 'INVALID'; problems: BatchPurposeProblem[] };

/** Saves the list after the capability check and validation. Nothing is saved on a refusal. */
export async function saveBatchPurposes(list: readonly BatchPurpose[]): Promise<SaveBatchPurposesResult> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  const { permitConfigChange } = await import('../authorization/guardConfigWrites');
  if (!(await permitConfigChange(authorizationService.enforce('config:batch-purposes:manage'), 'config:batch-purposes:manage'))) return { ok: false, error: 'NOT_PERMITTED' };
  const problems = batchPurposeProblems(list);
  if (problems.length > 0) return { ok: false, error: 'INVALID', problems };
  const purposes = normaliseBatchPurposes(list);
  saveLabSetting(BATCH_PURPOSES_KEY, purposes);
  return { ok: true, purposes };
}

/** What to show for a carrier's purpose on Batch Detail: nothing for Routine, else the locale key or the lab's own name. */
export function batchPurposeBadge(b: { purposeId?: string }, purposes: readonly BatchPurpose[] = getBatchPurposes()): { labelKey?: string; name?: string } | undefined {
  const id = effectiveBatchPurposeId(b);
  if (id === DEFAULT_BATCH_PURPOSE_ID) return undefined;
  const key = batchPurposeLabelKey(id);
  return key ? { labelKey: key } : { name: purposes.find(p => p.id === id)?.name ?? id };
}
