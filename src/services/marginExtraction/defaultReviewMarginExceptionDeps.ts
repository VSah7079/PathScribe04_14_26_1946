// src/services/marginExtraction/defaultReviewMarginExceptionDeps.ts
// Batch 669: the real services behind reviewMarginException.ts (kept apart so the logic file stays testable without them).
import { auditService } from '../auditlog/auditServiceInstance';
import { caseService } from '../cases/caseServiceInstance';
import { marginExtractionService } from './marginExtractionServiceInstance';
import { runMarginRuleEvaluation } from '../tumorBoardRules/runMarginRuleEvaluation';
import { resolveFinalizeAuthorityContext } from '../auth/resolveFinalizeAuthorityContext';
import { getTemplate } from '../templates/templateService';
import type { ReviewMarginExceptionDeps } from './reviewMarginException';

/** The same inputs the sign-out run uses: the case's performing lab, and each template's flattened fields. */
export const defaultReviewMarginExceptionDeps: ReviewMarginExceptionDeps = {
  marginExtractionService,
  auditService,
  getCase: async caseId => (await caseService.getCase(caseId)) ?? null,
  runRules: async ({ caseData, ...rest }) => {
    const { performingLabFacilityId } = await resolveFinalizeAuthorityContext(caseData);
    return runMarginRuleEvaluation({
      ...rest, facilityId: performingLabFacilityId,
      getTemplateFields: async (templateId: string) => {
        const detail = await getTemplate(templateId);
        return (detail.template.sections ?? []).flatMap(s => (s.fields ?? []).map(f => ({ id: f.id, label: f.label, type: f.type })));
      },
    });
  },
};
