// src/services/relatedCases/loadAmendedRelatedCases.ts
// Batch 613: which related cases sent with a signed report have been amended since sign-out.
// Only the flag is raised; the section attached to the signed report is never changed.
import { getRelatedCaseAttachment } from './relatedCaseAttachments';
import { amendedRelatedCases } from './relatedCaseRules';
import type { AmendedRelatedCase } from './relatedCaseTypes';

export interface AmendedDeps {
  /** Current record versions of the cases the viewer may see, by case id. */
  getVersions: () => Promise<Map<string, number>>;
}

export async function loadAmendedRelatedCases(caseId: string, deps: AmendedDeps): Promise<AmendedRelatedCase[]> {
  const attachment = getRelatedCaseAttachment(caseId);
  if (!attachment?.frozenAt || attachment.cases.length === 0) return [];
  const versions = await deps.getVersions();
  return amendedRelatedCases(attachment, id => versions.get(id));
}
