// src/services/reportAppearance/convertToPoints.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: "Convert to points" for the lab's report styles (Configuration →
// System → Document Style) and for a template (Template Assembly). Both do the
// same thing (fontUnits.ts): every style saved in pixels keeps its number, now
// in points (at least 8), and is marked "pt". Nothing converts on its own: the
// screen first lists each size that changes (planPointsConversion) and the
// author confirms.
//
//   • The lab's styles are config:report-appearance:manage, checked here (audited
//     by the authorization service, like every Document Style change).
//   • A template is saved through the template service, as any edit to it is.
//   • Each conversion writes an Audit Log entry that names what was converted and
//     the sizes before and after. It carries no case, patient or free text.
// ─────────────────────────────────────────────────────────────────────────────

import type { LabelConfig } from '../../types/template';
import type { ReportTemplate } from '../../types/reportPart';
import type { IAuditService, NewAuditLog } from '../auditlog/IAuditService';
import {
  getOrgDocumentStyleDefault, getOrgHeaderStyleDefault, getOrgFooterStyleDefault,
  setOrgDocumentStyleDefault, setOrgHeaderStyleDefault, setOrgFooterStyleDefault,
} from '../../components/Config/System/documentStyleConfig';
import { permitConfigChange } from '../authorization/guardConfigWrites';
import {
  applyPointsConversion, conversionAuditSummary, planPointsConversion,
  type PointsConversionPlan, type StyleCategory,
} from './fontUnits';

export const REPORT_FONT_UNITS_CONVERTED = 'REPORT_FONT_UNITS_CONVERTED';

/** The audit entry for one conversion (pure). `subject` names what was converted. */
export function pointsConversionAuditEntry(subject: string, plan: PointsConversionPlan, actorName: string): NewAuditLog {
  return {
    type: 'user', event: REPORT_FONT_UNITS_CONVERTED,
    detail: `Report font sizes converted to points for ${subject}: ${conversionAuditSummary(plan)}.`,
    user: actorName, caseId: null, confidence: null,
  };
}

/** The lab's three styles as a convertible subject. */
export function readLabStyles(): { documentStyle: Record<StyleCategory, LabelConfig> } {
  return { documentStyle: { header: getOrgHeaderStyleDefault(), body: getOrgDocumentStyleDefault(), footer: getOrgFooterStyleDefault() } };
}

/** What converting the lab's styles would change (pure read). */
export function planLabPointsConversion(): PointsConversionPlan {
  return planPointsConversion(readLabStyles());
}

export type ConvertResult =
  | { ok: true; plan: PointsConversionPlan }
  | { ok: false; code: 'NOT_PERMITTED' | 'SAVE_FAILED'; error?: string };

export interface ConvertDeps {
  auditService: Pick<IAuditService, 'logEvent'>;
  actorName: string;
  /** The capability check (a fake in tests). */
  authorization?: { enforce: (capability: string) => Promise<{ allowed: boolean }> };
}

/** Converts the lab's header, body and footer styles. Refused without config:report-appearance:manage. */
export async function convertLabStylesToPoints(deps: ConvertDeps): Promise<ConvertResult> {
  const authorization = deps.authorization ?? (await import('../authorization/defaultAuthorizationService')).authorizationService;
  if (!(await permitConfigChange(authorization.enforce('config:report-appearance:manage'), 'config:report-appearance:manage'))) {
    return { ok: false, code: 'NOT_PERMITTED' };
  }
  const subject = readLabStyles();
  const plan = planPointsConversion(subject);
  const converted = applyPointsConversion(subject).documentStyle;
  if (converted.header) setOrgHeaderStyleDefault(converted.header);
  if (converted.body) setOrgDocumentStyleDefault(converted.body);
  if (converted.footer) setOrgFooterStyleDefault(converted.footer);
  await deps.auditService.logEvent(pointsConversionAuditEntry('the lab document styles', plan, deps.actorName))
    .catch(e => console.error('[convertLabStylesToPoints] Failed to write audit entry:', e));
  return { ok: true, plan };
}

/** What converting a template would change (pure). */
export function planTemplatePointsConversion(template: ReportTemplate): PointsConversionPlan {
  return planPointsConversion(template);
}

/** Converts one template and saves it through the template service. The saved template is returned. */
export async function convertTemplateToPoints(
  template: ReportTemplate,
  deps: ConvertDeps & { templateService: { save: (t: ReportTemplate) => Promise<{ ok: true; data: ReportTemplate } | { ok: false; error?: string }> } },
): Promise<ConvertResult & { template?: ReportTemplate }> {
  const plan = planPointsConversion(template);
  const converted = applyPointsConversion(template);
  const saved = await deps.templateService.save(converted);
  if (saved.ok === false) return { ok: false, code: 'SAVE_FAILED', error: saved.error };
  await deps.auditService.logEvent(pointsConversionAuditEntry(`template ${template.name?.trim() || 'Untitled'} (${template.id})`, plan, deps.actorName))
    .catch(e => console.error('[convertTemplateToPoints] Failed to write audit entry:', e));
  return { ok: true, plan, template: saved.data };
}
