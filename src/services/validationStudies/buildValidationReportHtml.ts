// src/services/validationStudies/buildValidationReportHtml.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 514 (PS-269, Pete, Oct 10, 2026): the printed AI validation report in
// the reader's language. It was built in ValidationStudiesSection.tsx in
// English with an en-GB date, on the reasoning that it was a compliance
// artifact like the audit log; Pete decided it follows the user's language.
//
// What stays as recorded: the study name, the ethics reference, the
// narrative section ids (data), and the brand names. The grade stored on the
// study (finalGrade, "PASS") is a code and is not changed here.
//
// Pure: the caller passes t(), the language, the app version and the time,
// so the report can be tested without a browser or a print window.
// ─────────────────────────────────────────────────────────────────────────────
import type { ValidationStudy } from './IValidationStudyService';
import type { NarrativeSignalStats } from '@/services/narrativeSignals/INarrativeSignalService';
import type { ValidationStudyGradeResult } from './computeValidationStudyGrade';
import { escapeHtml } from '@/services/security/sanitizeHtml';
import { formatDate, formatDateLong } from '@/utils/formatDate';
import { formatPercent } from '@/utils/formatPercent';

export type ReportTranslate = (key: string, options?: Record<string, unknown>) => string;

export interface ValidationReportInput {
  study: ValidationStudy;
  stats: NarrativeSignalStats;
  caseCount: number;
  grade: ValidationStudyGradeResult;
  avgEditRatio: number;
}

export interface ValidationReportContext {
  t: ReportTranslate;
  language: string;
  appVersion: string;
  /** ISO time the report is generated. */
  now: string;
}

const K = 'validationStudies.printReport';

export function buildValidationReportHtml(input: ValidationReportInput, ctx: ValidationReportContext): string {
  const { study, stats, caseCount, grade, avgEditRatio } = input;
  const { language, appVersion } = ctx;
  // Every translated piece is escaped: translations are text, not markup.
  const tx = (key: string, options?: Record<string, unknown>) => escapeHtml(ctx.t(`${K}.${key}`, options));
  const pct = (fraction: number) => escapeHtml(formatPercent(fraction * 100, language, 0));
  const generatedOn = formatDateLong(ctx.now, language);
  const period = tx('periodRange', {
    start: formatDate(study.startDate, language),
    end: study.endDate ? formatDate(study.endDate, language) : ctx.t(`${K}.ongoing`),
  });

  const rows = Object.entries(stats.bySection).map(([sectionId, sec]) => {
    const acceptance = sec.total ? sec.accepted / sec.total : 0;
    return `<tr>
      <td>${escapeHtml(sectionId.replace(/_/g, ' '))}</td>
      <td>${escapeHtml(sec.total)}</td>
      <td>${pct(acceptance)}</td>
      <td>${pct(sec.avgEditRatio)}</td>
    </tr>`;
  }).join('');

  const acceptanceClass = stats.acceptanceRate >= study.targetAcceptanceRate ? 'kpi-val kpi-val--good' : 'kpi-val kpi-val--bad';

  return `<!DOCTYPE html><html lang="${escapeHtml(language)}"><head><meta charset="UTF-8">
<title>${escapeHtml(ctx.t(`${K}.documentTitle`, { name: study.name }))}</title>
<style>
  body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1f2937; margin: 40px; }
  h1 { font-size: 20px; color: #0f172a; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #0891B2; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 24px 0 10px; }
  .subtitle { color: #6b7280; font-size: 11px; margin-bottom: 24px; }
  .rule { height: 2px; background: linear-gradient(90deg,#0891B2,rgba(8,145,178,0.1)); margin: 16px 0; }
  .kpi-row { display: flex; gap: 20px; margin: 12px 0; }
  .kpi { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
  .kpi-val { font-size: 22px; font-weight: 700; color: #0f172a; }
  .kpi-val--good { color: #10b981; }
  .kpi-val--bad { color: #ef4444; }
  .kpi-label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; color: #6b7280; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
  .grade { font-size: 16px; font-weight: 700; color: ${grade.color}; }
  .grade-description { margin-top: 6px; }
  .advisory { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; font-size: 11px; color: #1e40af; margin-top: 24px; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${tx('title')}</h1>
<div class="subtitle">${tx('generated', { date: generatedOn })}</div>
<div class="rule"></div>

<h2>${tx('sections.overview')}</h2>
<table><tr><td><strong>${tx('fields.studyName')}</strong></td><td>${escapeHtml(study.name)}</td></tr>
<tr><td><strong>${tx('fields.period')}</strong></td><td>${period}</td></tr>
<tr><td><strong>${tx('fields.validationMode')}</strong></td><td>${tx('validationModeValue')}</td></tr>
${study.committeeApproval?.irbReference ? `<tr><td><strong>${tx('fields.ethicsReference')}</strong></td><td>${escapeHtml(study.committeeApproval.irbReference)}</td></tr>` : ''}
<tr><td><strong>${tx('fields.version')}</strong></td><td>${tx('versionValue', { version: appVersion })}</td></tr></table>

<h2>${tx('sections.summary')}</h2>
<div class="grade">${tx(`grade.${grade.key}`)}</div>
<p class="grade-description">${tx(`gradeDescription.${grade.key}`)}</p>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val">${escapeHtml(caseCount)}</div><div class="kpi-label">${tx('kpi.cases')}</div></div>
  <div class="kpi"><div class="kpi-val">${escapeHtml(stats.totalSignals)}</div><div class="kpi-label">${tx('kpi.sectionsAnalysed')}</div></div>
  <div class="kpi"><div class="${acceptanceClass}">${pct(stats.acceptanceRate)}</div><div class="kpi-label">${tx('kpi.acceptanceRate')}</div></div>
  <div class="kpi"><div class="kpi-val">${pct(avgEditRatio)}</div><div class="kpi-label">${tx('kpi.meanEditRatio')}</div></div>
</div>

<h2>${tx('sections.bySection')}</h2>
<table><thead><tr><th>${tx('table.section')}</th><th>${tx('table.signals')}</th><th>${tx('table.acceptance')}</th><th>${tx('table.meanEditRatio')}</th></tr></thead>
<tbody>${rows}</tbody></table>

<h2>${tx('sections.governance')}</h2>
<p>${tx('governanceStatement')}</p>

<div class="advisory">🔒 ${tx('deidentification')}</div>

<div class="footer">${tx('footer', { version: appVersion, date: generatedOn })}</div>
</body></html>`;
}
