// src/services/reportTemplates/finalDiagnosisPublishCheck.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#38): the Declared Final Diagnosis rule where templates are saved
// and published. A Final template may have at most one field marked as the
// Final Diagnosis (validateFinalDiagnosisDesignation.ts has the rule and its
// reasons; Preliminary templates, whose id starts 'tmpl-prelim-', are exempt).
// Until now nothing called that check, so a design with two such fields could
// be published and the previously-reported-as text would pick the wrong one.
//
//   • publishing a template runs the check and is refused when it fails
//     (mockReportTemplateService.publish; error code FINAL_DIAGNOSIS_DESIGNATION);
//   • saving a template or a part is allowed (a draft can be mid-edit), and the
//     builder pages show the problem straight away from these functions, so
//     the designer sees it before they try to publish;
//   • changing a part checks every Final template that uses it, so a second
//     marked field added to a shared part is caught too.
//
// This file reads parts only; it does not import the template service (that
// service calls it), so there is no import cycle.
// ─────────────────────────────────────────────────────────────────────────────

import { reportPartService as mockReportPartService } from '../reportParts/reportPartServiceInstance';
import type { AssemblySlot, ReportTemplate } from '@/types/reportPart';
import type { TemplateNode } from '@/types/template';

export const FINAL_DIAGNOSIS_DESIGNATION_ERROR = 'FINAL_DIAGNOSIS_DESIGNATION';

/** A Preliminary template (the app's own id convention); the rule does not apply to it. */
export const isPreliminaryTemplateId = (templateId: string) => templateId.startsWith('tmpl-prelim-');

/** How many fields in these nodes (and their children) are marked as the Final Diagnosis (pure). */
export function countFinalDiagnosisFields(nodes: readonly TemplateNode[] | undefined): number {
  let count = 0;
  for (const node of nodes ?? []) {
    if (node.isFinalDiagnosisField) count++;
    const children = (node as { children?: readonly TemplateNode[] }).children;
    if (Array.isArray(children)) count += countFinalDiagnosisFields(children);
  }
  return count;
}

export interface FinalDiagnosisCheck {
  ok: boolean;
  /** Fields marked as the Final Diagnosis across the template's enabled parts. */
  count: number;
  /** Not applicable: a Preliminary template. */
  exempt?: boolean;
}

/** The rule (pure): a Final template passes with at most one marked field. */
export function finalDiagnosisCheck(templateId: string, partNodes: readonly (readonly TemplateNode[] | undefined)[]): FinalDiagnosisCheck {
  if (isPreliminaryTemplateId(templateId)) return { ok: true, count: 0, exempt: true };
  const count = partNodes.reduce((sum, nodes) => sum + countFinalDiagnosisFields(nodes), 0);
  return { ok: count <= 1, count };
}

/**
 * Checks a template as designed now (its assembly as given, not as last
 * saved), so the builder can warn before anything is stored. A part that
 * can't be read is not counted: the check never blocks on a lookup failure.
 */
export async function checkTemplateFinalDiagnosis(template: Pick<ReportTemplate, 'id' | 'assembly'>): Promise<FinalDiagnosisCheck> {
  if (isPreliminaryTemplateId(template.id)) return { ok: true, count: 0, exempt: true };
  const slots: readonly AssemblySlot[] = (template.assembly ?? []).filter(s => s.enabled !== false);
  if (slots.length === 0) return { ok: true, count: 0 };
  const parts = await mockReportPartService.getByIds(slots.map(s => s.partId)).catch(() => null);
  if (!parts || !parts.ok) return { ok: true, count: 0 };
  return finalDiagnosisCheck(template.id, parts.data.map(p => p.nodes));
}

/**
 * Every Final template that uses this part and would have more than one
 * marked field, with the count. `templates` is passed in (the caller lists
 * them), so this stays free of the template service.
 */
export async function finalTemplatesBrokenByPart(
  partId: string,
  templates: readonly Pick<ReportTemplate, 'id' | 'name' | 'assembly'>[],
): Promise<{ id: string; name: string; count: number }[]> {
  const using = templates.filter(t => !isPreliminaryTemplateId(t.id) && (t.assembly ?? []).some(s => s.partId === partId && s.enabled !== false));
  const broken: { id: string; name: string; count: number }[] = [];
  for (const t of using) {
    const check = await checkTemplateFinalDiagnosis(t);
    if (!check.ok) broken.push({ id: t.id, name: t.name, count: check.count });
  }
  return broken;
}
