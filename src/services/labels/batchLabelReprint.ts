// src/services/labels/batchLabelReprint.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 518 (PS-123): reprinting labels for many cases at once (Batch
// Management → Label reprint). Before this, labels could be reprinted one
// case at a time from the case.
//
//   1. Find the cases: by accession date (accessionedAt, else the case's
//      creation) and/or an accession number range.
//   2. Choose the labels: requisition, specimen containers, cassettes.
//   3. Print them one at a time, with a pause between labels so a thermal
//      printer isn't flooded, reporting "X of Y" as it goes.
//   4. Failed labels can be retried; the rest are not printed again.
//
// Permission: label:batch:reprint (Pete, Oct 2: Histotechnologist and Admin),
// checked once per run and once per retry, here in the service.
//
// Every label printed is audited by the label printers themselves (PS-282,
// Batch 437: utils/labels/labelPrintAudit.ts). Each run is also kept
// (services/labels/mockLabelReprintRunService.ts): who, when, which labels,
// and each label's outcome.
//
// The lab's on-demand guardrail (Print settings → enforce on-demand) blocks
// printing every cassette of a case at once on the case page; it blocks
// cassettes here too. Requisition and container labels are not affected.
//
// Pure apart from the deps passed in.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';

export type ReprintLabelKind = 'requisition' | 'container' | 'cassette';
export const REPRINT_LABEL_KINDS: readonly ReprintLabelKind[] = ['requisition', 'container', 'cassette'];

export interface ReprintCaseFilter {
  /** 'YYYY-MM-DD', inclusive. */
  accessionedFrom?: string;
  accessionedTo?: string;
  /** Accession numbers, inclusive (compared as text, so use the same format). */
  accessionFrom?: string;
  accessionTo?: string;
}

export interface ReprintItem {
  /** Stable within a run: caseId + kind + target. */
  key: string;
  caseId: string;
  accession: string;
  kind: ReprintLabelKind;
  /** The specimen (container) or block (cassette) label, e.g. "A" or "A1". */
  target?: string;
}

export type ReprintItemStatus = 'pending' | 'printed' | 'failed' | 'blocked';

export interface ReprintItemResult extends ReprintItem {
  status: ReprintItemStatus;
  message?: string;
}

export interface LabelReprintRun {
  id: string;
  startedAt: string;
  startedBy: string;
  printerProfileId?: string;
  items: ReprintItemResult[];
  finishedAt?: string;
}

export type ReprintRefusal = 'notPermitted' | 'nothingToPrint' | 'noCassettePrinter';

const accessionOf = (c: Case) => c.accession?.fullAccession ?? c.accession?.accessionNumber ?? c.id;
const accessionedDay = (c: Case) => (c.accession?.accessionedAt ?? (c as { createdAt?: string }).createdAt ?? '').slice(0, 10);

/** The cases a filter matches, oldest accession first. An empty filter matches nothing (a guard against printing the whole lab). */
export function casesForReprint(cases: readonly Case[], f: ReprintCaseFilter): Case[] {
  if (!f.accessionedFrom && !f.accessionedTo && !f.accessionFrom?.trim() && !f.accessionTo?.trim()) return [];
  return cases
    .filter(c => {
      const day = accessionedDay(c);
      if (f.accessionedFrom && (!day || day < f.accessionedFrom)) return false;
      if (f.accessionedTo && (!day || day > f.accessionedTo)) return false;
      const acc = accessionOf(c);
      if (f.accessionFrom?.trim() && acc < f.accessionFrom.trim()) return false;
      if (f.accessionTo?.trim() && acc > f.accessionTo.trim()) return false;
      return true;
    })
    .sort((a, b) => accessionOf(a).localeCompare(accessionOf(b)));
}

/** The labels to print for the chosen cases and kinds, in print order (case by case). */
export function reprintItems(cases: readonly Case[], kinds: readonly ReprintLabelKind[]): ReprintItem[] {
  const out: ReprintItem[] = [];
  for (const c of cases) {
    const accession = accessionOf(c);
    if (kinds.includes('requisition')) out.push({ key: `${c.id}|requisition`, caseId: c.id, accession, kind: 'requisition' });
    if (kinds.includes('container')) {
      for (const s of c.specimens ?? []) out.push({ key: `${c.id}|container|${s.label}`, caseId: c.id, accession, kind: 'container', target: s.label });
    }
    if (kinds.includes('cassette')) {
      for (const s of c.specimens ?? []) for (const b of s.blocks ?? []) {
        out.push({ key: `${c.id}|cassette|${s.label}${b.label}`, caseId: c.id, accession, kind: 'cassette', target: `${s.label}${b.label}` });
      }
      for (const m of c.matrixBlocks ?? []) out.push({ key: `${c.id}|cassette|${m.label}`, caseId: c.id, accession, kind: 'cassette', target: m.label });
    }
  }
  return out;
}

export interface ReprintDeps {
  enforce: (capability: string) => Promise<{ allowed: boolean }>;
  /** Prints one label; resolves with the outcome (the printers audit it). */
  printItem: (item: ReprintItem, printerProfileId: string | undefined) => Promise<{ ok: boolean; message?: string }>;
  /** Whether the lab's on-demand guardrail blocks batch cassette printing. */
  cassettesBlocked: () => Promise<boolean>;
  saveRun: (run: LabelReprintRun) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  now: () => string;
  newId: () => string;
}

/** Pause between labels, so a thermal printer's buffer isn't flooded. */
export const REPRINT_THROTTLE_MS = 250;

async function printAll(run: LabelReprintRun, which: (r: ReprintItemResult) => boolean, deps: ReprintDeps, onProgress?: (done: number, total: number) => void): Promise<LabelReprintRun> {
  const blocked = await deps.cassettesBlocked();
  const todo = run.items.filter(which);
  let done = 0;
  for (const item of todo) {
    if (done > 0) await deps.sleep(REPRINT_THROTTLE_MS);
    if (item.kind === 'cassette' && blocked) {
      item.status = 'blocked';
      item.message = 'On-demand guardrail: batch cassette printing is turned off in Print settings.';
    } else {
      try {
        const res = await deps.printItem(item, run.printerProfileId);
        item.status = res.ok ? 'printed' : 'failed';
        item.message = res.ok ? undefined : res.message;
      } catch (e) {
        item.status = 'failed';
        item.message = e instanceof Error ? e.message : String(e);
      }
    }
    done++;
    onProgress?.(done, todo.length);
  }
  run.finishedAt = deps.now();
  await deps.saveRun(run);
  return run;
}

/** Prints a run. Needs label:batch:reprint. */
export async function reprintLabels(
  input: { items: readonly ReprintItem[]; printerProfileId?: string; startedBy: string },
  deps: ReprintDeps,
  onProgress?: (done: number, total: number) => void,
): Promise<LabelReprintRun | ReprintRefusal> {
  if (!(await deps.enforce('label:batch:reprint')).allowed) return 'notPermitted';
  if (input.items.length === 0) return 'nothingToPrint';
  if (input.items.some(i => i.kind === 'cassette') && !input.printerProfileId) return 'noCassettePrinter';
  const run: LabelReprintRun = {
    id: deps.newId(), startedAt: deps.now(), startedBy: input.startedBy, printerProfileId: input.printerProfileId,
    items: input.items.map(i => ({ ...i, status: 'pending' as const })),
  };
  return printAll(run, () => true, deps, onProgress);
}

/** Prints a run's failed labels again (not the printed or guardrail-blocked ones). Needs label:batch:reprint. */
export async function retryFailedLabels(
  run: LabelReprintRun,
  deps: ReprintDeps,
  onProgress?: (done: number, total: number) => void,
): Promise<LabelReprintRun | ReprintRefusal> {
  if (!(await deps.enforce('label:batch:reprint')).allowed) return 'notPermitted';
  const copy: LabelReprintRun = { ...run, items: run.items.map(i => ({ ...i })) };
  if (!copy.items.some(i => i.status === 'failed')) return 'nothingToPrint';
  return printAll(copy, i => i.status === 'failed', deps, onProgress);
}

/** Counts for the summary line. */
export function reprintSummary(run: LabelReprintRun): Record<ReprintItemStatus, number> {
  const counts: Record<ReprintItemStatus, number> = { pending: 0, printed: 0, failed: 0, blocked: 0 };
  for (const i of run.items) counts[i.status]++;
  return counts;
}
