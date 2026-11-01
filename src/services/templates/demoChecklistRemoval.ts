// src/services/templates/demoChecklistRemoval.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 754 (Pete, Oct 31, 2026): removes the 19 demonstration checklists (demoChecklists.ts) from a customer
// organisation's synoptic library on a deployment that carries them. ForMedrixAI support only
// (platform:demo-checklists:remove); each checklist is archived (retired from use: not offered for new reports, and a
// report already made with one still opens), with the usual per-template audit entry, plus one summary entry.
// A dry run reports what would happen and changes nothing. The library is the organisation's: on the API server each
// organisation has its own (POST /api/templates/remove-demo-checklists, scripts/remove-demo-checklists.mjs); in the
// demo build it is the browser's, so a removal there applies to every demo organisation until Full Reset.
// Dependencies are passed in, so this is testable without module mocks.
// ─────────────────────────────────────────────────────────────────────────────

import { demoChecklistRemovalAuditDetail, planDemoChecklistRemoval, type DemoChecklistRemovalPlan, type LibraryEntry } from './demoChecklists';

export const DEMO_CHECKLIST_REMOVAL_AUDIT_EVENT = 'DEMO_CHECKLISTS_REMOVED';

export interface DemoChecklistRemovalDeps {
  enforce: (capability: string) => Promise<{ allowed: boolean }>;
  /** The organisation's synoptic library as it is now. */
  library: () => readonly LibraryEntry[];
  /** Archives one checklist (templateService.archiveTemplate: its own capability check and audit entry). */
  archive: (id: string) => Promise<unknown>;
  audit: (detail: string) => Promise<void>;
}

export interface DemoChecklistRemovalFailure { entry: LibraryEntry; message: string }

export type DemoChecklistRemovalResult =
  | { ok: false; reason: 'notPermitted' }
  | { ok: true; dryRun: boolean; plan: DemoChecklistRemovalPlan; removed: LibraryEntry[]; failed: DemoChecklistRemovalFailure[] };

export async function removeDemoChecklists(deps: DemoChecklistRemovalDeps, options: { dryRun?: boolean } = {}): Promise<DemoChecklistRemovalResult> {
  if (!(await deps.enforce('platform:demo-checklists:remove')).allowed) return { ok: false, reason: 'notPermitted' };
  const plan = planDemoChecklistRemoval(deps.library());
  const dryRun = !!options.dryRun;
  if (dryRun || plan.toRemove.length === 0) return { ok: true, dryRun, plan, removed: [], failed: [] };
  const removed: LibraryEntry[] = [];
  const failed: DemoChecklistRemovalFailure[] = [];
  for (const entry of plan.toRemove) {
    try { await deps.archive(entry.id); removed.push(entry); }
    catch (e) { failed.push({ entry, message: (e as { message?: string })?.message ?? String(e) }); }
  }
  try { await deps.audit(demoChecklistRemovalAuditDetail(removed, plan.alreadyRemoved.length, failed.length)); } catch { /* best-effort, as the lifecycle entries */ }
  return { ok: true, dryRun, plan, removed, failed };
}
