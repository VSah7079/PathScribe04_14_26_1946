// src/services/grossing/reportGrossComplete.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 398 (PS-359, Pete: "Please fix the grossing issue"). The case report
// page's Gross Complete / Update Gross (orchestration cases) used to check only
// that every specimen had some grossing entered. It ignored the organisation's
// Grossing field requirements and the case:grossing:complete permission that
// Complete grossing on the Grossing screen applies. Now both pages apply the
// same rules (services/grossing/grossingCompletion.ts), with one difference
// Pete chose: on the report page, a specimen with a Grossing template report
// meets the "Grossing protocol attached" rule, because that page records
// grossing on Grossing templates rather than protocols.
//
//   specimensWithoutGrossEntry   no answers and no dictated gross text (the
//                                page's existing rule, moved out of the hook)
//   checkReportGrossComplete     the field requirements, the protocol
//                                confirmation (rule switched off) and the permission
//
// An update (Update Gross, after a correction) is checked against the same
// field requirements, but never asks the protocol question again: the
// secondary review was raised at first completion.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';
import {
  missingGrossingItems, specimensForSecondaryReview,
  type MissingGrossingItem, type ProtocolSatisfied,
} from './grossingCompletion';

/** Report page: an attached protocol, or a Grossing template report for the specimen. */
export function reportPageProtocolSatisfied(c: Pick<Case, 'grossingReports'>): ProtocolSatisfied {
  const withTemplate = new Set((c.grossingReports ?? []).map(g => g.specimenId));
  return sp => !!sp.protocolSnapshot || withTemplate.has(sp.id);
}

export interface GrossSection { sourcePartId?: string; specimenId?: string; text?: string }

/**
 * The specimens with no grossing entered: no answered Grossing template field
 * and no dictated Gross Description text of their own. Dictated text in a
 * case-wide section (no specimen) covers every specimen. Pure.
 */
export function specimensWithoutGrossEntry(c: Pick<Case, 'specimens' | 'grossingReports'>, sections: readonly GrossSection[]): string[] {
  const gross = sections.filter(s => s.sourcePartId === 'std_body_gross');
  if (gross.some(s => !s.specimenId && s.text?.trim())) return [];
  return (c.specimens ?? []).filter(sp => {
    if (gross.some(s => s.specimenId === sp.id && s.text?.trim())) return false;
    const reports = (c.grossingReports ?? []).filter(g => g.specimenId === sp.id);
    return !reports.some(g => Object.values(g.answers ?? {}).some(v => v !== '' && !(Array.isArray(v) && !v.length)));
  }).map(sp => sp.label);
}

export type ReportGrossRefusal = 'missing' | 'needsConfirmation' | 'notPermitted';

export interface ReportGrossCheck {
  ok: boolean;
  reason?: ReportGrossRefusal;
  missing?: MissingGrossingItem[];
  /** needsConfirmation: specimens with neither a protocol nor a Grossing template. */
  withoutProtocol?: string[];
  /** ok: specimens to route for secondary review once the save succeeds. */
  forReview: string[];
}

export async function checkReportGrossComplete(
  c: Case,
  requirements: readonly ResolvedFieldRequirement[],
  options: { isUpdate: boolean; confirmedWithoutProtocol?: boolean },
  deps: { authorization: Pick<IAuthorizationService, 'enforce'> },
): Promise<ReportGrossCheck> {
  const satisfied = reportPageProtocolSatisfied(c);
  const missing = missingGrossingItems(c, requirements, satisfied);
  if (missing.length) return { ok: false, reason: 'missing', missing, forReview: [] };
  const forReview = options.isUpdate ? [] : specimensForSecondaryReview(c, requirements, satisfied);
  if (forReview.length && !options.confirmedWithoutProtocol) {
    return { ok: false, reason: 'needsConfirmation', withoutProtocol: forReview, forReview: [] };
  }
  const decision = await deps.authorization.enforce('case:grossing:complete', { caseId: c.id, facilityId: c.order?.facilityId ?? null });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted', forReview: [] };
  return { ok: true, forReview };
}
