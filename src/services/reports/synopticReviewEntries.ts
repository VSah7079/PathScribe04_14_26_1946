// src/services/reports/synopticReviewEntries.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 738 (Demo Seed Data S1, rule 4: no raw ids on screen): what the "Review before finalising" window shows for
// each synoptic report. Moved out of useSignOutWorkflow.buildSynopticsForReview (no behaviour change except):
//   • each question is named as the template names it (the generic label list is the fallback), and
//   • each chosen option is shown by its label, not its stored id (the window showed "procedure_opt_5").
// The stored answers are not changed: only what the window displays.
// ─────────────────────────────────────────────────────────────────────────────

import { getFieldLabel, type ReportingStandard } from '@/utils/synopticFieldLabels';

type Answer = string | string[];

export interface ReviewTemplateField { id: string; label?: string; options?: { id: string; label?: string }[] }
export interface ReviewTemplate { sections?: { title?: string; fields?: ReviewTemplateField[] }[] }

export interface ReviewReportInput {
  instanceId: string; templateId: string; templateName?: string; specimenId: string; status?: string;
  answers?: Record<string, unknown>;
}

export interface SynopticReviewEntry {
  instanceId: string; templateName: string; specimenId: string; specimenLabel: string; specimenDesc: string;
  answers: Record<string, Answer>; fieldLabels: Record<string, string>; fieldOrder: string[];
  sections?: { title: string; fieldKeys: string[] }[];
  answeredCount: number; totalCount: number; requiredFields?: string[]; status: string;
}

function standardOf(templateName: string | undefined): ReportingStandard {
  return templateName?.includes('RCPath') ? 'RCPath'
    : templateName?.includes('RCPA') ? 'RCPA'
    : templateName?.includes('WHO') ? 'WHO'
    : templateName?.includes('CAP') ? 'CAP' : 'generic';
}

const answered = (v: unknown) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);

/** An answer as shown: each option id replaced by its label (free text and unknown ids stay as they are). Pure. */
export function displayAnswer(value: unknown, field: ReviewTemplateField | undefined): Answer {
  const labelOf = (v: unknown) => {
    const s = String(v);
    return field?.options?.find(o => o.id === s)?.label || s;
  };
  return Array.isArray(value) ? value.map(labelOf) : labelOf(value);
}

/** One review entry per synoptic report. `loadTemplate` returns null when a template can't be loaded. */
export async function buildSynopticReviewEntries(
  reports: readonly ReviewReportInput[],
  specimens: readonly { id: string; label?: string; description?: string }[],
  loadTemplate: (templateId: string) => Promise<ReviewTemplate | null>,
): Promise<SynopticReviewEntry[]> {
  const templates = await Promise.all(reports.map(r => loadTemplate(r.templateId).catch(() => null)));
  return reports.map((report, i) => {
    const template = templates[i];
    const fields = new Map((template?.sections ?? []).flatMap(s => s.fields ?? []).map(f => [f.id, f] as const));
    const specimen = specimens.find(s => s.id === report.specimenId);
    const raw = report.answers ?? {};
    const fieldKeys = Object.keys(raw);
    const std = standardOf(report.templateName);
    const answers: Record<string, Answer> = {};
    const fieldLabels: Record<string, string> = {};
    for (const k of fieldKeys) {
      const f = fields.get(k);
      answers[k] = displayAnswer(raw[k], f);
      fieldLabels[k] = f?.label || getFieldLabel(k, std);
    }
    return {
      instanceId: report.instanceId,
      templateName: report.templateName ?? '',
      specimenId: report.specimenId,
      specimenLabel: specimen?.label ?? '?',
      specimenDesc: specimen?.description ?? 'Specimen',
      answers, fieldLabels, fieldOrder: fieldKeys,
      sections: (template?.sections ?? []).map(s => ({ title: s.title ?? '', fieldKeys: (s.fields ?? []).map(f => f.id) })),
      answeredCount: fieldKeys.filter(k => answered(raw[k])).length,
      totalCount: fieldKeys.length,
      // Unchanged: SynopticReportInstance has no required-field list (see the note this replaced); [] as before.
      requiredFields: [],
      status: report.status ?? '',
    };
  });
}
