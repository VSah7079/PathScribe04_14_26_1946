// src/services/signoutGates/signOutReviewGates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649 (sign-out audit): the report-review checks run before a surgical
// case is signed, in one place for both entry points, so the two can't drift
// again. Before this, Assist Finalize (useSignOutWorkflow.handleRequestFinalize)
// ran the active case hold, microscopic documentation, critical findings,
// required fields and unverified-AI checks, and Orchestration Sign Out Case
// (handleSignOutConfirm) skipped all five.
//
// Order (the first that stops wins):
//   0. already pending release (recall window)
//   1. an active case hold
//   2. report map image out of date with the answers
//   3. a positive Mohs sector naming no block
//   4. map-derived margins disagreeing with the stored answer
//   5. count checks (block); a hand-entered total that differs from its grid (asks)
//   6. invasive carcinoma with margins not all reported (asks)
//   7. an answer differing from its molecular result (asks)
//   8. microscopic documentation, per specimen
//   9. a Critical or Malignant finding not yet acknowledged this session
//  10. required fields
//  11. a required, shown field still holding an unverified AI answer
//  12. an AI-drafted narrative section nobody has accepted or edited (Batch 680)
//
// The caller turns a stop into what the person sees (a toast, a modal, a jump
// to the field). Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CriticalFindingFlag } from '../clinical/detectCriticalFindings';
import type { SynopticCountBlock, SynopticTotalWarning, SynopticEntryChecks } from '../templates/synopticEntryChecks';
import type { InvasiveMarginGap } from '../organMapping/organMapLive';
import type { MolecularResultDifference } from '../molecularOrders/molecularSignOutCheck';
import { isVisible } from '../templates/fieldVisibility';
import { synopticFieldAnswered, synopticFieldMissing } from '../templates/partGrid';
import { evaluateMicroscopicFinalizeGate, type MicroscopicNarrativeStatus } from '@/utils/evaluateMicroscopicFinalizeGate';

/** A synoptic question that stops sign-out (same shape as RightSynopticPanel's MissingRequiredField). */
export interface SignOutFieldProblem { sectionId: string; sectionTitle: string; fieldId: string; fieldLabel: string; instanceId?: string }
export interface MicroscopicBlock { specimenId: string; specimenLabel: string; reasonKey: string }

export type SignOutGateStop =
  | { gate: 'pendingRelease' }
  | { gate: 'caseHold'; note: string }
  | { gate: 'staleOrganMap' }
  | { gate: 'mohsBlocks' }
  | { gate: 'derivedMargins' }
  | { gate: 'entryCount'; block: SynopticCountBlock }
  | { gate: 'warningDeclined' }
  | { gate: 'microscopic'; blocking: MicroscopicBlock[] }
  | { gate: 'criticalFindings'; findings: CriticalFindingFlag[] }
  | { gate: 'requiredFields'; missing: SignOutFieldProblem[] }
  | { gate: 'unverifiedAi'; fields: SignOutFieldProblem[] }
  | { gate: 'unacceptedAiNarrative'; sections: { id: string; label: string }[] };

export type SignOutGateOutcome = { ok: true } | { ok: false; stop: SignOutGateStop };

export interface SignOutReviewGateDeps {
  staleOrganMapFigures: (c: Case) => Promise<readonly unknown[]>;
  mohsBlockGaps: (c: Case) => Promise<readonly unknown[]>;
  derivedMarginConflicts: (c: Case) => Promise<readonly unknown[]>;
  synopticEntryChecks: (c: Case) => Promise<SynopticEntryChecks>;
  invasiveMarginGaps: (c: Case) => Promise<InvasiveMarginGap[]>;
  molecularDifferences: (c: Case) => Promise<MolecularResultDifference[]>;
  /** Asks the person to go past a warning (false = stop). Without it a warning doesn't stop. */
  confirm?: {
    entryTotals: (w: SynopticTotalWarning[]) => Promise<boolean>;
    invasiveMargins: (g: InvasiveMarginGap[]) => Promise<boolean>;
    molecular: (d: MolecularResultDifference[]) => Promise<boolean>;
  };
  microscopicBlocking: (c: Case) => Promise<MicroscopicBlock[]>;
  /** True once the person has recorded or acknowledged this session's findings. */
  criticalAcknowledged: boolean;
  detectFindings: () => Promise<CriticalFindingFlag[]>;
  /** Keeps the Critical/Malignant findings with the case (PS-323), also when there are none. */
  rememberCriticalFindings?: (findings: CriticalFindingFlag[]) => void;
  /** Required-field and unverified-AI problems on the report being signed. */
  synopticFieldProblems: () => Promise<{ missing: SignOutFieldProblem[]; unverifiedAi: SignOutFieldProblem[] }>;
  /** Batch 680: AI-drafted narrative sections not yet accepted or edited (AI output never bypasses review). */
  unacceptedNarrative?: () => { id: string; label: string }[];
}

const stop = (s: SignOutGateStop): SignOutGateOutcome => ({ ok: false, stop: s });

/** Runs the review checks in order; the first one that stops is returned. */
export async function runSignOutReviewGates(caseData: Case, deps: SignOutReviewGateDeps): Promise<SignOutGateOutcome> {
  if (caseData.status === 'pending-release') return stop({ gate: 'pendingRelease' });
  const hold = (caseData.caseHolds ?? []).find(h => h.active);
  if (hold) return stop({ gate: 'caseHold', note: hold.note ?? '' });

  if ((await deps.staleOrganMapFigures(caseData)).length > 0) return stop({ gate: 'staleOrganMap' });
  if ((await deps.mohsBlockGaps(caseData)).length > 0) return stop({ gate: 'mohsBlocks' });
  if ((await deps.derivedMarginConflicts(caseData)).length > 0) return stop({ gate: 'derivedMargins' });
  const checks = await deps.synopticEntryChecks(caseData);
  if (checks.blocking.length > 0) return stop({ gate: 'entryCount', block: checks.blocking[0] });
  if (checks.warnings.length > 0 && deps.confirm && !(await deps.confirm.entryTotals(checks.warnings))) return stop({ gate: 'warningDeclined' });
  const gaps = await deps.invasiveMarginGaps(caseData);
  if (gaps.length > 0 && deps.confirm && !(await deps.confirm.invasiveMargins(gaps))) return stop({ gate: 'warningDeclined' });
  const differences = await deps.molecularDifferences(caseData);
  if (differences.length > 0 && deps.confirm && !(await deps.confirm.molecular(differences))) return stop({ gate: 'warningDeclined' });

  const microscopic = await deps.microscopicBlocking(caseData);
  if (microscopic.length > 0) return stop({ gate: 'microscopic', blocking: microscopic });

  if (!deps.criticalAcknowledged) {
    const critical = (await deps.detectFindings()).filter(f => f.severity === 'Critical' || f.severity === 'Malignant');
    deps.rememberCriticalFindings?.(critical);
    if (critical.length > 0) return stop({ gate: 'criticalFindings', findings: critical });
  }

  const fields = await deps.synopticFieldProblems();
  if (fields.missing.length > 0) return stop({ gate: 'requiredFields', missing: fields.missing });
  if (fields.unverifiedAi.length > 0) return stop({ gate: 'unverifiedAi', fields: fields.unverifiedAi });
  const unaccepted = deps.unacceptedNarrative?.() ?? [];
  if (unaccepted.length > 0) return stop({ gate: 'unacceptedAiNarrative', sections: unaccepted });
  return { ok: true };
}

// ── Template-based checks ───────────────────────────────────────────────────

interface TemplateFieldLike { id: string; label?: string; required?: boolean; visibleWhen?: unknown; type?: string }
interface TemplateSectionLike { id?: string; title?: string; visibleWhen?: unknown; fields?: TemplateFieldLike[] }
export type SignOutTemplateLoader = (templateId: string) => Promise<{ template?: { sections?: TemplateSectionLike[] } | null } | null | undefined>;

type Answers = Record<string, string | string[]>;
const visible = (cond: unknown, answers: Answers) => isVisible(cond as Parameters<typeof isVisible>[0], answers);
const missingField = (f: TemplateFieldLike, answers: Answers) => synopticFieldMissing(f as Parameters<typeof synopticFieldMissing>[0], answers);

/** One instance's required-field and unverified-AI problems, as RightSynopticPanel reports them for the open report. */
export function synopticFieldProblemsFor(
  instance: { instanceId: string; answers?: Answers; aiSuggestions?: Record<string, { verification?: string }> },
  sections: readonly TemplateSectionLike[],
): { missing: SignOutFieldProblem[]; unverifiedAi: SignOutFieldProblem[] } {
  const answers = instance.answers ?? {};
  const out = { missing: [] as SignOutFieldProblem[], unverifiedAi: [] as SignOutFieldProblem[] };
  for (const sec of sections) {
    if (!visible(sec.visibleWhen, answers)) continue;
    for (const f of sec.fields ?? []) {
      if (!visible(f.visibleWhen, answers)) continue;
      const ref = { sectionId: sec.id ?? '', sectionTitle: sec.title ?? '', fieldId: f.id, fieldLabel: f.label ?? f.id, instanceId: instance.instanceId };
      if (missingField(f, answers)) out.missing.push(ref);
      if (f.required && instance.aiSuggestions?.[f.id]?.verification === 'unverified') out.unverifiedAi.push(ref);
    }
  }
  return out;
}

/**
 * Required-field and unverified-AI problems across the reports being signed.
 * `scope: 'case'` (Orchestration Sign Out Case signs the whole case) checks every
 * report not already finalized; `'active'` (Assist Finalize, where reports can be
 * left out at review) checks the open one. `live` is the open report's state from
 * its panel, which wins over the stored copy. A template that can't be loaded
 * can't be shown complete, so it stops sign-out (same as the microscopic check).
 */
export async function findSynopticSignOutFieldProblems(
  caseData: Pick<Case, 'synopticReports'>,
  opts: {
    scope: 'case' | 'active';
    activeInstanceId?: string;
    live?: { instanceId: string; missing: SignOutFieldProblem[]; unverifiedAi: SignOutFieldProblem[] };
    /** Stored AI suggestions (the panel saves verification straight to the store), by instance. */
    storedSuggestions?: Record<string, Record<string, { verification?: string }> | undefined>;
    loadTemplate: SignOutTemplateLoader;
  },
): Promise<{ missing: SignOutFieldProblem[]; unverifiedAi: SignOutFieldProblem[] }> {
  // The open report's panel is the whole answer for 'active' (as Assist Finalize always worked).
  if (opts.scope === 'active' && opts.live) return { missing: [...opts.live.missing], unverifiedAi: [...opts.live.unverifiedAi] };
  const out = { missing: [] as SignOutFieldProblem[], unverifiedAi: [] as SignOutFieldProblem[] };
  const reports = (caseData.synopticReports ?? []).filter(r => (opts.scope === 'case'
    ? r.status !== 'finalized'
    : r.instanceId === opts.activeInstanceId));
  for (const r of reports) {
    if (opts.live && opts.live.instanceId === r.instanceId) {
      out.missing.push(...opts.live.missing.map(m => ({ ...m, instanceId: r.instanceId })));
      out.unverifiedAi.push(...opts.live.unverifiedAi.map(m => ({ ...m, instanceId: r.instanceId })));
      continue;
    }
    let sections: readonly TemplateSectionLike[] | null = null;
    try { sections = (await opts.loadTemplate(r.templateId))?.template?.sections ?? null; } catch { sections = null; }
    if (!sections) {
      out.missing.push({ sectionId: '', sectionTitle: r.templateName ?? '', fieldId: '', fieldLabel: r.templateName ?? r.templateId, instanceId: r.instanceId });
      continue;
    }
    const found = synopticFieldProblemsFor({ ...r, aiSuggestions: opts.storedSuggestions?.[r.instanceId] ?? r.aiSuggestions }, sections);
    out.missing.push(...found.missing);
    out.unverifiedAi.push(...found.unverifiedAi);
  }
  return out;
}

/**
 * Microscopic documentation per specimen (evaluateMicroscopicFinalizeGate).
 * Moved from useSignOutWorkflow.getMicroscopicBlockingSpecimens unchanged:
 * case-wide, the procedure-level requirement still off (no setting yet), and an
 * unloadable template counted as incomplete.
 */
export async function findMicroscopicBlockingSpecimens(caseData: Case, loadTemplate: SignOutTemplateLoader): Promise<MicroscopicBlock[]> {
  const blocking: MicroscopicBlock[] = [];
  const templateCache = new Map<string, readonly TemplateSectionLike[]>();
  for (const specimen of caseData.specimens ?? []) {
    const micro = (caseData.microscopicReports ?? []).find(m => m.specimenId === specimen.id);
    const microscopicStatus: MicroscopicNarrativeStatus = micro?.status ?? 'not-started';
    const microscopicText = micro?.text ?? '';
    // Rules 1/2 need no synoptic data (a draft blocks; saved text passes).
    if (microscopicStatus === 'draft' || (microscopicStatus === 'saved' && microscopicText.trim().length > 0)) {
      const result = evaluateMicroscopicFinalizeGate({ microscopicStatus, microscopicText, hasSynopticTemplate: false, allRequiredSynopticFieldsComplete: false, requiresMicroscopicNarrative: false });
      if (result.blocked) blocking.push({ specimenId: specimen.id, specimenLabel: specimen.label, reasonKey: result.reasonKey! });
      continue;
    }
    const instances = (caseData.synopticReports ?? []).filter(r => r.specimenId === specimen.id);
    let allComplete = true;
    for (const inst of instances) {
      let sections = templateCache.get(inst.templateId);
      if (!sections) {
        try {
          sections = (await loadTemplate(inst.templateId))?.template?.sections ?? [];
          templateCache.set(inst.templateId, sections);
        } catch (e) {
          console.error(`[Finalize] Could not load template ${inst.templateId} for microscopic gate check:`, e);
          allComplete = false;
          continue;
        }
      }
      const answers = inst.answers ?? {};
      const incomplete = sections.some(sec => visible(sec.visibleWhen, answers)
        && (sec.fields ?? []).some(f => !!f.required && visible(f.visibleWhen, answers)
          && !synopticFieldAnswered(f as Parameters<typeof synopticFieldAnswered>[0], answers)));
      if (incomplete) allComplete = false;
    }
    const result = evaluateMicroscopicFinalizeGate({
      microscopicStatus, microscopicText, hasSynopticTemplate: instances.length > 0,
      allRequiredSynopticFieldsComplete: allComplete, requiresMicroscopicNarrative: false,
    });
    if (result.blocked) blocking.push({ specimenId: specimen.id, specimenLabel: specimen.label, reasonKey: result.reasonKey! });
  }
  return blocking;
}

/** Sections holding an AI draft nobody has accepted or edited (pure). Sign-out waits for these (Batch 680). */
export function unacceptedAiNarrativeSections<S extends { id: string; label: string; text: string; aiGenerated: string; userEdited: boolean; committed?: boolean }>(sections: readonly S[]): { id: string; label: string }[] {
  return sections.filter(s => !!s.aiGenerated && s.text.trim() !== '' && !s.userEdited && !s.committed).map(s => ({ id: s.id, label: s.label }));
}
export { recordAiOmittedAtSignOut } from '../aiGovernance/omitUnverifiedAi'; // Batch 691
