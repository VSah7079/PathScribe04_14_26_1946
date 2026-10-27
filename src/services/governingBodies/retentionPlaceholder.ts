// src/services/governingBodies/retentionPlaceholder.ts
// Batch 652: a retention version whose source note says a figure is an UNVERIFIED placeholder
// (the seeded CAP and CAP-ACP wet-tissue figures, the RCPA figures, the Korean MSA figure) is
// flagged on the Governing Bodies retention window, so nobody reads a placeholder as a published
// requirement. The flag follows the note: when a lead publishes a new version with a cited
// source, the note no longer says "unverified" and the badge goes with it.
import type { RetentionPolicyVersion } from './IGoverningBodyService';

export function isUnverifiedRetentionPlaceholder(version: Pick<RetentionPolicyVersion, 'sourceNote'>): boolean {
  return /\bunverified\b/i.test(version.sourceNote ?? '');
}
