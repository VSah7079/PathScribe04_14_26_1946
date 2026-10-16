// src/services/grossing/recordMarginInkApplication.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 480 (Structured Inking, Module 1; PS-359 follow-up, Pete's own
// "Margin and Ink Application Data Model" requirement). Same orchestration
// shape as every other append-only clinical-log write site in this app
// (services/autopsy/recordAutopsyOrganTag.ts, recordAutopsyCustodyTransfer.ts):
// capability check, fetch, re-derive from the freshest copy via
// updateCaseWithRetry (version-safe, PS-71), real audit-log write.
//
// Real, deliberate scope per Pete's own acceptance criteria: calling this
// twice for the same marginId never overwrites the margin's own identity
// (name/orientation/laterality) or any prior ink application — it only ever
// appends a new MarginInkApplication. A margin is created, with its first
// ink application, the first time a given marginId is used.
//
// Deliberately NOT validated against a real ink-color palette this batch —
// that's the ink-color admin list, a later batch's own scope (see this
// folder's README). `colorCode`/`colorName` are stored as given.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { Margin, MarginInkApplication } from '@/types/case/Margin';

export interface RecordMarginInkApplicationInput {
  specimenId: string;
  /** Present when this grossing protocol inks per-cassette (margin lives on
   *  the block); omitted when it inks before blocking (margin lives on the
   *  specimen directly). See types/case/Margin.ts's own header. */
  blockId?: string;
  /** An existing margin's id — appends a new ink application to it,
   *  changing nothing else about it. Omit to create a new margin (its
   *  first ink application supplied in the same call). */
  marginId?: string;
  /** Required only when creating a new margin (marginId omitted). Ignored
   *  — never used to rename — when appending to an existing one. */
  marginName?: string;
  orientation?: string;
  laterality?: string;
  colorCode: string;
  colorName: string;
  /** Explicitly marks the margin examined (or not) as of this call.
   *  Omitted: leaves the margin's current status alone (a brand-new
   *  margin starts 'pending' regardless). */
  examined?: boolean;
}

export type RecordMarginInkApplicationReasonCode = 'notPermitted' | 'caseNotFound' | 'specimenNotFound' | 'blockNotFound' | 'marginNotFound' | 'conflict';

export interface RecordMarginInkApplicationResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordMarginInkApplicationReasonCode;
  notPermitted?: boolean;
  marginId?: string;
}

const findSpecimen = (c: Case, specimenId: string): Specimen | undefined => (c.specimens ?? []).find(s => s.id === specimenId);
const findBlock = (sp: Specimen, blockId: string): HistologyBlock | undefined => (sp.blocks ?? []).find(b => b.id === blockId);

function nextMarginId(caseId: string, existing: readonly Margin[] | undefined): string {
  return `margin-${caseId}-${(existing?.length ?? 0) + 1}-${Date.now().toString(36)}`;
}

export async function recordMarginInkApplication(
  caseId: string,
  input: RecordMarginInkApplicationInput,
  actingUserName: string,
): Promise<RecordMarginInkApplicationResult> {
  // Batch 480: its own capability — ordinary clinical grossing
  // documentation, not a legal/custody action, so standard risk, seeded to
  // the roles that gross (GROSSERS) — same posture as autopsy:organ-tag:record.
  const decision = await authorizationService.enforce('grossing:margin-ink:record', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Recording a margin ink application needs the grossing:margin-ink:record permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!findSpecimen(caseData, input.specimenId)) return { ok: false, error: 'Specimen not found.', reasonCode: 'specimenNotFound' };

  let reasonCode: RecordMarginInkApplicationReasonCode | undefined;
  let recordedMarginId: string | undefined;

  const write = await updateCaseWithRetry(caseId, current => {
    const sp = findSpecimen(current, input.specimenId);
    if (!sp) { reasonCode = 'specimenNotFound'; return null; }

    const target: HistologyBlock | Specimen | undefined = input.blockId ? findBlock(sp, input.blockId) : sp;
    if (!target) { reasonCode = 'blockNotFound'; return null; }

    const existingMargins = target.margins ?? [];
    const margin = input.marginId ? existingMargins.find(m => m.id === input.marginId) : undefined;
    if (input.marginId && !margin) { reasonCode = 'marginNotFound'; return null; }

    const application: MarginInkApplication = {
      id: `ink-${caseId}-${input.marginId ?? 'new'}-${existingMargins.length}-${Date.now().toString(36)}`,
      colorCode: input.colorCode,
      colorName: input.colorName,
      appliedAt: new Date().toISOString(),
      appliedByName: actingUserName,
    };

    let nextMargins: Margin[];
    if (margin) {
      recordedMarginId = margin.id;
      const updatedMargin: Margin = {
        ...margin,
        examinationStatus: input.examined === undefined ? margin.examinationStatus : (input.examined ? 'examined' : 'pending'),
        inkApplications: [...margin.inkApplications, application],
      };
      nextMargins = existingMargins.map(m => m.id === margin!.id ? updatedMargin : m);
    } else {
      const id = nextMarginId(caseId, existingMargins);
      recordedMarginId = id;
      const newMargin: Margin = {
        id,
        name: input.marginName ?? 'Margin',
        orientation: input.orientation,
        laterality: input.laterality,
        examinationStatus: input.examined ? 'examined' : 'pending',
        inkApplications: [application],
      };
      nextMargins = [...existingMargins, newMargin];
    }

    if (input.blockId) {
      return {
        specimens: (current.specimens ?? []).map(s => s.id !== input.specimenId ? s : {
          ...s,
          blocks: (s.blocks ?? []).map(b => b.id === input.blockId ? { ...b, margins: nextMargins } : b),
        }),
      };
    }
    return {
      specimens: (current.specimens ?? []).map(s => s.id !== input.specimenId ? s : { ...s, margins: nextMargins }),
    };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'MARGIN_INK_APPLICATION_RECORDED',
      detail: `Specimen ${input.specimenId}${input.blockId ? ` block ${input.blockId}` : ''}: ${input.colorName} applied to margin ${recordedMarginId}`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true, marginId: recordedMarginId };
  }
  if (reasonCode === 'blockNotFound') return { ok: false, error: 'Block not found.', reasonCode: 'blockNotFound' };
  if (reasonCode === 'marginNotFound') return { ok: false, error: 'Margin not found.', reasonCode: 'marginNotFound' };
  if (reasonCode === 'specimenNotFound') return { ok: false, error: 'Specimen not found.', reasonCode: 'specimenNotFound' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the ink application was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
