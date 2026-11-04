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
//                                        drop-off"). Wired additively
//                                        below (margin_ink_color_unmapped,
//                                        Structured Inking Module 3,
//                                        PS-359 follow-up) once the real
//                                        ink-color admin palette existed
//                                        (services/inkColors/) — exactly
//                                        the additive, non-second-pass
//                                        extension this comment promised
//                                        when it was written.
// ─────────────────────────────────────────────────────────────────────────────

import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { Margin } from '@/types/case/Margin';

export type InkingValidationMode = 'WARN_ONLY' | 'STRICT_ENFORCE';

export type InkingValidationIssueCode =
  | 'margin_not_examined'
  | 'margin_no_ink_applied'
  | 'margin_ink_color_unmapped';

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
  /** Present only for margin_ink_color_unmapped — which real ink
   *  application raised it, and the colorCode it recorded that the
   *  current active ink-colour dictionary no longer (or never did)
   *  recognize. */
  inkApplicationId?: string;
  colorCode?: string;
}

export interface ResolveInkingValidationSeverityOptions {
  /** The active ink-colour dictionary's own codes (services/inkColors/),
   *  normalized by the caller to a consistent case. When omitted, the
   *  margin_ink_color_unmapped check is skipped entirely — same honest
   *  "can't check what we don't have" posture as every other optional
   *  cross-reference in this app. Compared case-insensitively. */
  activeInkColorCodes?: ReadonlySet<string>;
}

export interface InkingValidationResult {
  issues: InkingValidationIssue[];
  /** Whether sign-out should actually stop — the one thing a caller needs
   *  to act on without re-deriving severity/mode logic itself. */
  blocked: boolean;
}

/** The default severity for each site-configurable check. margin_ink_color_unmapped
 *  is deliberately excluded — it's assigned severity 3 directly, inline, never
 *  through this table (see this file's own header: structural/compliance-critical
 *  by definition, not site-configurable). */
const DEFAULT_SEVERITY: Record<Exclude<InkingValidationIssueCode, 'margin_ink_color_unmapped'>, InkingValidationIssueSeverity> = {
  margin_not_examined: 2,
  margin_no_ink_applied: 2,
};

function issuesForMargin(specimenId: string, blockId: string | undefined, margin: Margin, activeInkColorCodes: ReadonlySet<string> | undefined): InkingValidationIssue[] {
  const issues: InkingValidationIssue[] = [];
  if (margin.examinationStatus !== 'examined') {
    issues.push({ severity: DEFAULT_SEVERITY.margin_not_examined, code: 'margin_not_examined', specimenId, blockId, marginId: margin.id, marginName: margin.name });
  }
  if (margin.inkApplications.length === 0) {
    issues.push({ severity: DEFAULT_SEVERITY.margin_no_ink_applied, code: 'margin_no_ink_applied', specimenId, blockId, marginId: margin.id, marginName: margin.name });
  }
  // Severity 3, assigned directly (never through DEFAULT_SEVERITY — see
  // this file's own header): a real structural export failure, not
  // site-configurable. Only ever checked when the caller supplies the
  // active ink-colour dictionary; an application whose colorCode matches
  // nothing in it (case-insensitively) is exactly Pete's own given
  // example of an "unmapped code that causes LIS drop-off."
  if (activeInkColorCodes) {
    for (const app of margin.inkApplications) {
      if (!activeInkColorCodes.has(app.colorCode.trim().toUpperCase())) {
        issues.push({
          severity: 3, code: 'margin_ink_color_unmapped', specimenId, blockId,
          marginId: margin.id, marginName: margin.name, inkApplicationId: app.id, colorCode: app.colorCode,
        });
      }
    }
  }
  return issues;
}

/**
 * Every margin, on every specimen and every one of its blocks, checked
 * against the real rules this file implements. `mode` is the site's own
 * `inking_validation_mode` (services/grossing/inkingSiteSettings.ts).
 * `options.activeInkColorCodes` additively enables the Severity 3
 * margin_ink_color_unmapped check (Structured Inking Module 3, PS-359
 * follow-up) — omit it and this behaves exactly as Batch 480 shipped it.
 */
export function resolveInkingValidationSeverity(
  specimens: readonly Pick<Specimen, 'id' | 'margins' | 'blocks'>[],
  mode: InkingValidationMode,
  options?: ResolveInkingValidationSeverityOptions,
): InkingValidationResult {
  const activeInkColorCodes = options?.activeInkColorCodes;
  const issues: InkingValidationIssue[] = [];
  for (const sp of specimens) {
    for (const margin of sp.margins ?? []) {
      issues.push(...issuesForMargin(sp.id, undefined, margin, activeInkColorCodes));
    }
    for (const block of (sp.blocks ?? []) as readonly Pick<HistologyBlock, 'id' | 'margins'>[]) {
      for (const margin of block.margins ?? []) {
        issues.push(...issuesForMargin(sp.id, block.id, margin, activeInkColorCodes));
      }
    }
  }
  const hasSeverity3 = issues.some(i => i.severity === 3);
  const hasSiteConfigurableIssue = issues.some(i => i.severity === 2);
  const blocked = hasSeverity3 || (mode === 'STRICT_ENFORCE' && hasSiteConfigurableIssue);
  return { issues, blocked };
}
