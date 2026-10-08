// src/services/aiIntegration/aiReportTools.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-274 / PS-275 (Batch 451): which AI report tools the report page's right
// panel offers, and the case content their enablement is judged on. Moved out
// of SynopticReportPage.tsx so the rule can be tested.
//
//   Suggest Synoptic from Narrative (PS-274): in orchestrator AND assist (LIS)
//     mode — reading a narrative and suggesting synoptic answers works
//     whoever owns the report.
//   Generate Narrative from Synoptic (PS-275): orchestrator mode only — in
//     assist mode the external LIS owns the narrative, so PathScribe writing
//     narrative text back doesn't apply.
//
// Whether each is enabled (there is narrative text / there are synoptic
// answers) is resolveBuildReportAvailability in
// pages/SynopticReportPage/hooks/resolveBuildReportDirection.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface AiReportToolsVisibility {
  /** Suggest Synoptic from Narrative is offered. */
  suggestSynoptic: boolean;
  /** Generate Narrative from Synoptic is offered. */
  generateNarrative: boolean;
}

export function aiReportToolsVisibility(reportingMode: string | undefined): AiReportToolsVisibility {
  const orchestrator = reportingMode === 'orchestrator';
  return {
    suggestSynoptic: orchestrator || reportingMode === 'assist',
    generateNarrative: orchestrator,
  };
}

interface CaseForAiTools {
  diagnostic?: { grossDescription?: string; microscopicDescription?: string; ancillaryStudies?: string };
  synopticReports?: { instanceId: string; answers?: Record<string, unknown> }[];
  synopticAnswers?: Record<string, unknown>;
}

/**
 * The narrative text and synoptic answers the two tools are judged on: the
 * case's gross/microscopic/ancillary text, and the answers of the synoptic
 * report being viewed (the first report when none is chosen), falling back
 * to the case's older single-report answers.
 */
export function aiReportToolsInputs(caseData: CaseForAiTools | null | undefined, activeReportInstanceId: string | null | undefined): {
  caseText: { gross: string; microscopic: string; ancillary: string };
  synopticAnswers: Record<string, unknown>;
} {
  const report = activeReportInstanceId
    ? caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId)
    : caseData?.synopticReports?.[0];
  return {
    caseText: {
      gross: caseData?.diagnostic?.grossDescription ?? '',
      microscopic: caseData?.diagnostic?.microscopicDescription ?? '',
      ancillary: caseData?.diagnostic?.ancillaryStudies ?? '',
    },
    synopticAnswers: report?.answers ?? caseData?.synopticAnswers ?? {},
  };
}
