// src/services/templates/demoChecklists.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 754 (Pete, Oct 31, 2026): the 19 generic synoptic checklists are demonstration content. They kept the
// question list of the older CAP- and RCPath-derived files (their wording was replaced; colon in Batch 738, the two
// prostate checklists in Batch 753), so no customer gets them:
//   • a customer build (`vite build --mode server`, npm run build:server) leaves them out entirely, and
//     scripts/check-production-bundle.mjs fails the build if any is in it;
//   • a customer organisation on a deployment that has them has them removed with platform:demo-checklists:remove
//     (demoChecklistRemoval.ts), or with scripts/remove-demo-checklists.mjs against the API server.
// PathScribe's own checklists (Mohs, oral cavity, neck dissection, the cytology, grossing and autopsy templates) stay.
// Batch 755a (Pete, Oct 31, 2026): they have plain names ("Colon resection") and show a "Demo wording" tag, and no copy
// (Duplicate, New Version, Build from an existing template) may start from one. One flag drives the tag, the copy
// refusal and the customer-build exclusion: a checklist leaves DEMO_CHECKLIST_IDS (and its file's "source" becomes
// "PathScribe") only after a pathologist has reviewed its wording; see docs/architecture/DEMO_CHECKLISTS.md.
// Pure, apart from reading the build mode.
// ─────────────────────────────────────────────────────────────────────────────

/** The demonstration checklists: data/templates/generic/<id>.json whose "source" is "Custom" (pinned by a test). */
export const DEMO_CHECKLIST_IDS = [
  'breast_invasive', 'breast_dcis_resection', 'breast_surgical_excision',
  'colon_resection', 'colorectal_resection_b', 'colorectal_local_excision', 'colorectal_further_investigations',
  'kidney_resection', 'kidney_biopsy', 'lung_adeno', 'lung_resection',
  'prostate_needle_biopsy', 'prostate_biopsy', 'prostate_resection', 'prostate_radical_prostatectomy', 'prostate_turp_enucleation',
  'skin_melanoma_bx', 'wilms_resection', 'wilms_biopsy',
] as const;

/** Other ids the same files are loaded under. */
export const DEMO_CHECKLIST_ALIASES: Readonly<Record<string, (typeof DEMO_CHECKLIST_IDS)[number]>> = {
  skin_invasive_melanoma_biopsy: 'skin_melanoma_bx',
};

const ALL = new Set<string>([...DEMO_CHECKLIST_IDS, ...Object.keys(DEMO_CHECKLIST_ALIASES)]);

/** Whether a template id is one of the demonstration checklists (or an alias of one). */
export function isDemoChecklist(id: string | null | undefined): boolean {
  return !!id && ALL.has(id);
}

/** Batch 755a: whether a checklist name shows the "Demo wording" tag. */
export function showsDemoWordingTag(templateId: string | null | undefined): boolean {
  return isDemoChecklist(templateId);
}

/** Batch 755b (Pete, Nov 1, 2026): demonstration checklists no demo case uses, whose wording is still placeholder text, so a
 *  pathologist is not offered them when adding a checklist to a case. They stay in the Synoptic Library. */
export const DEMO_CHECKLISTS_HIDDEN_FROM_CASE_PICKER: readonly string[] = [
  'breast_surgical_excision', 'kidney_biopsy', 'prostate_turp_enucleation', 'wilms_resection', 'wilms_biopsy',
];

/** Whether the "add a checklist to this specimen" list offers a library entry: not the non-clinical test forms (category
 *  TEST) and not the hidden demonstration checklists. */
export function offeredOnCasePicker(p: { id: string; category?: string }): boolean {
  return p.category !== 'TEST' && !DEMO_CHECKLISTS_HIDDEN_FROM_CASE_PICKER.includes(p.id);
}

/** Why a checklist can't be the source of a copy (Duplicate, New Version or Build from an existing template), or null
 *  when it can. Batch 755a: demonstration wording is never copied until a pathologist has reviewed it. */
export type ChecklistCopyRefusal = 'demoWording';
export function checklistCopyRefusal(sourceId: string | null | undefined): ChecklistCopyRefusal | null {
  return isDemoChecklist(sourceId) ? 'demoWording' : null;
}

/** Whether this build carries the demonstration checklists: every build except the customer build (mode "server").
 *  Vite writes the mode in at build time, so a customer build drops their files altogether. */
export const DEMO_CHECKLISTS_IN_BUILD: boolean = import.meta.env.MODE !== 'server';

export interface LibraryEntry { id: string; name: string; status: string }

export interface DemoChecklistRemovalPlan {
  /** In the library and not yet removed: these are archived. */
  toRemove: LibraryEntry[];
  /** Already archived (retired from use). */
  alreadyRemoved: LibraryEntry[];
  /** Not in this library at all (a customer build, or deleted). */
  notInLibrary: string[];
}

/** What removing the demonstration checklists from a library would do (pure). */
export function planDemoChecklistRemoval(library: readonly LibraryEntry[]): DemoChecklistRemovalPlan {
  const byId = new Map(library.map(e => [e.id, e]));
  const plan: DemoChecklistRemovalPlan = { toRemove: [], alreadyRemoved: [], notInLibrary: [] };
  for (const id of DEMO_CHECKLIST_IDS) {
    const entry = byId.get(id);
    if (!entry) plan.notInLibrary.push(id);
    else if (entry.status === 'archived') plan.alreadyRemoved.push(entry);
    else plan.toRemove.push(entry);
  }
  return plan;
}

/** The audit text for a removal (literal English: audit records are compliance artifacts). */
export function demoChecklistRemovalAuditDetail(removed: readonly LibraryEntry[], alreadyRemoved: number, failed: number): string {
  const names = removed.map(e => `${e.name} (${e.id})`).join('; ');
  return `Demonstration checklists removed from this organisation's synoptic library (archived, not offered for new reports): ${removed.length}${names ? ` — ${names}` : ''}. Already removed: ${alreadyRemoved}. Could not be removed: ${failed}.`;
}
