// src/services/grossing/resolveInkingValidationSeverity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 480 (Structured Inking, Module 1; PS-359 follow-up, Pete's own
// "Proposed Severity Engine Rules for Sign-Out"). Pure resolution logic —
// mirrors services/autopsy/resolveAutopsyGrossExaminationGate.ts's own
// { allowed/blocked, reasons } shape (a real { issues, blocked } here,
// since more than one issue can genuinely coexist, unlike that gate's
// single-case checks).
//
// Pete's own severity table (system defaults should be "Warn & Advisory"
// for almost all rules; a hard block is reserved for a real, structural
// data-export problem):
//
//   Severity 1 (Advisory)             — never blocks. A grossing-time-only
//                                        inline indicator; genuinely not
//                                        representable without the
//                                        grossing-screen UI this batch
//                                        deliberately doesn't build
//                                        (Pete's own scoping choice) — no
//                                        rule emits a Severity 1 issue yet.
//   Severity 2 (Corrective Warning)   — blocks ONLY when the site's own
//                                        inking_validation_mode is
//                                        STRICT_ENFORCE (site-configurable;
//                                        WARN_ONLY is the default — see
//                                        services/siteSettings/). The two
//                                        real, concrete checks this batch
//                                        implements both land here: a
//                                        margin that's never been examined,
//                                        and a margin with no ink applied.
//                                        Neither one corrupts a diagnostic
//                                        artifact or an LIS export by
//                                        itself — the honest read of
//                                        Pete's own "only time a hard
//                                        block is clinically mandatory"
//                                        test.
//   Severity 3 (Compliance Critical)  — ALWAYS blocks, never site-
//                                        configurable (Pete: "Controlled
//                                        by regulatory/system schema").
//                                        Reserved for a structural
//                                        export failure — e.g. an ink
//                                        color code that doesn't map to
//                                        anything real, which is exactly
//                                        Pete's own given example
//                                        ("unmapped codes that cause LIS
//                                        drop-off"). Nothing in THIS batch
//                                        can trigger it yet, by design:
//                                        there's no real ink-color palette
//                                        to validate a colorCode against —
//                                        that's the admin-list batch,
//                                        still to come. The type and the
//                                        blocking logic are real and
//                                        tested now so wiring in that one
//                                        future check is additive, not a
//                                        second pass over this file.
// ─────────────────────────────────────────────────────────────────────────────

import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { Margin } from '@/types/case/Margin';

export type InkingValidationMode = 'WARN_ONLY' | 'STRICT_ENFORCE';

export type InkingValidationIssueCode =
  | 'margin_not_examined'
  | 'margin_no_ink_applied';

export type InkingValidationIssueSeverity = 1 | 2 | 3;

export interface InkingValidationIssue {
  severity: InkingValidationIssueSeverity;
  code: InkingValidationIssueCode;
  specimenId: string;
  /** Present when the margin lives on a block rather than the specimen
   *  directly — see types/case/Margin.ts's own header. */
  blockId?: string;
  marginId: string;
  marginName: string;
}

export interface InkingValidationResult {
  issues: InkingValidationIssue[];
  /** Whether sign-out should actually stop — the one thing a caller needs
   *  to act on without re-deriving severity/mode logic itself. */
  blocked: boolean;
}

/** The default severity for each check this batch implements. A later
 *  batch adding the real ink-color-palette check assigns IT severity 3
 *  directly (never through this table — that check is structural/
 *  compliance-critical by definition, not site-configurable). */
const DEFAULT_SEVERITY: Record<InkingValidationIssueCode, InkingValidationIssueSeverity> = {
  margin_not_examined: 2,
  margin_no_ink_applied: 2,
};

function issuesForMargin(specimenId: string, blockId: string | undefined, margin: Margin): InkingValidationIssue[] {
  const issues: InkingValidationIssue[] = [];
  if (margin.examinationStatus !== 'examined') {
    issues.push({ severity: DEFAULT_SEVERITY.margin_not_examined, code: 'margin_not_examined', specimenId, blockId, marginId: margin.id, marginName: margin.name });
  }
  if (margin.inkApplications.length === 0) {
    issues.push({ severity: DEFAULT_SEVERITY.margin_no_ink_applied, code: 'margin_no_ink_applied', specimenId, blockId, marginId: margin.id, marginName: margin.name });
  }
  return issues;
}

/**
 * Every margin, on every specimen and every one of its blocks, checked
 * against the two real rules this batch implements. `mode` is the site's
 * own `inking_validation_mode` (services/siteSettings/inkingSiteSettings.ts).
 */
export function resolveInkingValidationSeverity(
  specimens: readonly Pick<Specimen, 'id' | 'margins' | 'blocks'>[],
  mode: InkingValidationMode,
): InkingValidationResult {
  const issues: InkingValidationIssue[] = [];
  for (const sp of specimens) {
    for (const margin of sp.margins ?? []) {
      issues.push(...issuesForMargin(sp.id, undefined, margin));
    }
    for (const block of (sp.blocks ?? []) as readonly Pick<HistologyBlock, 'id' | 'margins'>[]) {
      for (const margin of block.margins ?? []) {
        issues.push(...issuesForMargin(sp.id, block.id, margin));
      }
    }
  }
  const hasSeverity3 = issues.some(i => i.severity === 3);
  const hasSiteConfigurableIssue = issues.some(i => i.severity === 2);
  const blocked = hasSeverity3 || (mode === 'STRICT_ENFORCE' && hasSiteConfigurableIssue);
  return { issues, blocked };
}
