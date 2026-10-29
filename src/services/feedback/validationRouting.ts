// src/services/feedback/validationRouting.ts
// ─────────────────────────────────────────────────────────────────────────────
// The 'AI / Template validation' category of QA / testing feedback. Feedback in that category can
// name the validation study and the template it is about, and goes to the validation recipients
// (Configuration → System → Feedback). With none set it goes to the QA recipients and the sender
// is told so. Pure helpers, plus the one loader that lists what the pickers offer. The audit
// event is FEEDBACK_ROUTED_TO_VALIDATION (literal English, ids and the title only).
// ─────────────────────────────────────────────────────────────────────────────
import type { IValidationStudyService } from '../validationStudies/IValidationStudyService';
import type { IReportTemplateService } from '../reportTemplates/IReportTemplateService';
import { validationStudyService } from '../validationStudies/validationStudyServiceInstance';
import { reportTemplateService } from '../reportTemplates/reportTemplateServiceInstance';

export const VALIDATION_CATEGORY = 'AI / Template validation' as const;
export const FEEDBACK_ROUTED_TO_VALIDATION = 'FEEDBACK_ROUTED_TO_VALIDATION';

/** What a piece of validation feedback is about. Every part is optional. */
export interface ValidationLinks {
  studyId?: string;
  studyName?: string;
  templateId?: string;
  templateName?: string;
  templateVersion?: string;
}

export const hasValidationLinks = (l: ValidationLinks | undefined): l is ValidationLinks => !!(l && (l.studyId || l.templateId));

/** Who validation feedback goes to: the validation recipients, else the QA recipients (said so), else nobody. */
export function validationRecipientsFor(config: { validationRecipients?: readonly string[]; qaEmailRecipients: readonly string[] }): { to: string[]; usedFallback: boolean } {
  const own = [...(config.validationRecipients ?? [])];
  if (own.length > 0) return { to: own, usedFallback: false };
  return { to: [...config.qaEmailRecipients], usedFallback: true };
}

/** The audit detail: literal English, the title and ids only, never the feedback text or an address. */
export function validationAuditDetail(input: { title: string; links?: ValidationLinks; usedFallback: boolean; recipientCount: number }): string {
  const l = input.links ?? {};
  const parts = [
    `title "${input.title}"`,
    `study ${l.studyId ?? '(none)'}`,
    `template ${l.templateId ? `${l.templateId}${l.templateVersion ? ` v${l.templateVersion}` : ''}` : '(none)'}`,
    `${input.recipientCount} recipient${input.recipientCount === 1 ? '' : 's'}${input.usedFallback ? ' (QA recipients: no validation recipients are set)' : ''}`,
  ];
  return `QA feedback routed to validation: ${parts.join('; ')}.`;
}

// ─── What the pickers offer ──────────────────────────────────────────────────

export interface ValidationLinkOptions {
  studies: { id: string; name: string; templateIds: string[] }[];
  templates: { id: string; name: string; version: string }[];
}

/** Active validation studies and published templates, for the two optional pickers. A failed read gives an empty list. */
export async function loadValidationLinkOptions(
  deps: { studyService: Pick<IValidationStudyService, 'getActive'>; templateService: Pick<IReportTemplateService, 'getAll'> } = { studyService: validationStudyService, templateService: reportTemplateService },
): Promise<ValidationLinkOptions> {
  const [studies, templates] = await Promise.all([
    deps.studyService.getActive().catch(() => null),
    deps.templateService.getAll().catch(() => null),
  ]);
  return {
    studies: studies && studies.ok ? studies.data.map(s => ({ id: s.id, name: s.name, templateIds: s.templateIds ?? [] })) : [],
    templates: templates && templates.ok ? templates.data.filter(t => t.status === 'published').map(t => ({ id: t.id, name: t.name, version: t.version })) : [],
  };
}

/** The templates to offer once a study is chosen: that study's own templates when it names any, else all. */
export function templatesForStudy(options: ValidationLinkOptions, studyId: string): ValidationLinkOptions['templates'] {
  const study = options.studies.find(s => s.id === studyId);
  if (!study || study.templateIds.length === 0) return options.templates;
  return options.templates.filter(t => study.templateIds.includes(t.id));
}

/** The links to save with the feedback, from the two picked ids ('' = none). Unknown ids are dropped. */
export function buildValidationLinks(options: ValidationLinkOptions, studyId: string, templateId: string): ValidationLinks | undefined {
  const study = options.studies.find(s => s.id === studyId);
  const template = options.templates.find(t => t.id === templateId);
  const links: ValidationLinks = {
    ...(study ? { studyId: study.id, studyName: study.name } : {}),
    ...(template ? { templateId: template.id, templateName: template.name, templateVersion: template.version } : {}),
  };
  return hasValidationLinks(links) ? links : undefined;
}
