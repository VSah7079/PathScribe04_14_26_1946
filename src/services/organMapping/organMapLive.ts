// src/services/organMapping/organMapLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: what the report page needs to draw a synoptic's map — the
// template, its binding and the facility's colours — and the wiring for the
// Configuration actions and the report figures. The decisions stay in the
// pure modules; this only fetches and passes in.
// ─────────────────────────────────────────────────────────────────────────────

import { derivedMarginAnswers } from './organMapDerivedAnswers';
import { getTemplateCached } from '../templates/templateService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { caseWriteDeps } from '../cases/caseWriteDeps';
import { resolveOrganMapBinding, type OrganMapBinding } from './organMapBindings';
import { browserOrganMapConfigStore, organMapSchemeFor, type OrganMapConfigDeps } from './organMapConfig';
import type { ResolvedOrganMapScheme } from './organMapScheme';
import type { OrganMapFigureDeps } from './organMapFigures';
import { resolveOrganMap } from './resolveProstateMap';
import { partGridRowsOf } from '../templates/partGrid';
import type { Case } from '@/types/case/Case';
import { isAutoReportMap } from './organMapTypes';
import { mohsBlockProblems } from '../templates/mohsStages';
import { invasiveMarginGaps, marginScopeOf } from './organMapDerived';
import type { OrganMapType } from './organMapTypes';
import { isVisible, type VisibilityCondition } from '../templates/fieldVisibility';

export interface OrganMapContext {
  template: { id: string; name?: string; sections: any[] } | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  binding: OrganMapBinding | null;
  scheme: ResolvedOrganMapScheme;
}

/** The map context for one synoptic (template) at one facility. */
export async function loadOrganMapContext(input: { templateId: string; facilityId?: string | null }): Promise<OrganMapContext> {
  const detail = await getTemplateCached(input.templateId).catch(() => null);
  const template = (detail?.template ?? null) as OrganMapContext['template'];
  let jurisdiction: string | null = null;
  if (input.facilityId) {
    const f = await mockFacilityService.getById(input.facilityId).catch(() => null);
    jurisdiction = f && f.ok ? ((f.data as { jurisdiction?: string }).jurisdiction ?? null) : null;
  }
  const store = browserOrganMapConfigStore;
  return {
    template,
    binding: resolveOrganMapBinding(template as never, store.getBindings()),
    scheme: organMapSchemeFor(store, { facilityId: input.facilityId ?? null, jurisdiction }),
  };
}

export function organMapConfigDeps(userName: string): OrganMapConfigDeps {
  return {
    enforce: (capability, context) => authorizationService.enforce(capability as never, (context ?? {}) as never),
    logAudit: entry => mockAuditService.logEvent(entry as never),
    userName,
    store: browserOrganMapConfigStore,
  };
}

export const organMapFigureDeps: OrganMapFigureDeps = {
  ...caseWriteDeps,
  enforce: (capability, context) => authorizationService.enforce(capability as never, context as never),
  logAudit: entry => mockAuditService.logEvent(entry as never),
  now: () => new Date(),
  newId: () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
};

/** Batch 461: the synoptics whose report map image no longer matches their
 *  answers (stale). Sign-out stops on these: the signed report must not carry
 *  a map that disagrees with the synoptic. */
export async function findStaleOrganMapFigures(caseData: Pick<Case, 'organMapFigures' | 'synopticReports' | 'specimens' | 'order'> | null | undefined): Promise<string[]> {
  const figures = caseData?.organMapFigures ?? [];
  const stale: string[] = [];
  for (const figure of figures) {
    if (isAutoReportMap(figure.mapType)) continue; // drawn at sign-out, never stale
    const instance = (caseData?.synopticReports ?? []).find(r => r.instanceId === figure.instanceId);
    if (!instance) continue;
    const context = await loadOrganMapContext({ templateId: instance.templateId, facilityId: caseData?.order?.facilityId ?? null });
    if (!context.binding) continue;
    const payload = resolveOrganMap({
      binding: context.binding, answers: (instance.answers ?? {}) as Record<string, string | string[]>, scheme: context.scheme.scheme, thresholds: context.scheme.thresholds,
      templateId: instance.templateId, instanceId: instance.instanceId, rows: partGridRowsOf(caseData?.specimens),
    });
    if (payload.fingerprint !== figure.fingerprint) stale.push(figure.instanceId);
  }
  return stale;
}

/** Batch 463: a facility's map colours (for the Mohs stage canvas in the synoptic). */
export async function loadOrganMapScheme(facilityId: string | null | undefined): Promise<ResolvedOrganMapScheme> {
  let jurisdiction: string | null = null;
  if (facilityId) {
    const f = await mockFacilityService.getById(facilityId).catch(() => null);
    jurisdiction = f && f.ok ? ((f.data as { jurisdiction?: string }).jurisdiction ?? null) : null;
  }
  return organMapSchemeFor(browserOrganMapConfigStore, { facilityId: facilityId ?? null, jurisdiction });
}

/** Batch 463b: the synoptics with a Mohs stage question whose positive sectors
 *  lack a block, or name one the stage didn't cut. Sign-out stops on these
 *  (Pete: block traceability), whatever the question's required flag. A
 *  question hidden by its (or its section's) visibility condition doesn't
 *  count, as in the panel. A template that can't be loaded counts as a gap
 *  when its answers hold Mohs stages (it can't be shown complete), and is
 *  ignored otherwise. */
export async function findMohsBlockGaps(caseData: Pick<Case, 'synopticReports'> | null | undefined): Promise<string[]> {
  type Field = { id: string; type: string; visibleWhen?: VisibilityCondition };
  type Section = { visibleWhen?: VisibilityCondition; fields?: Field[] };
  const gaps: string[] = [];
  for (const instance of caseData?.synopticReports ?? []) {
    const answers = (instance.answers ?? {}) as Record<string, string | string[]>;
    // No Mohs stages recorded, nothing to check (and no template to load).
    if (!Object.keys(answers).some(k => /__stages$/.test(k))) continue;
    const detail = await getTemplateCached(instance.templateId).catch(() => null);
    const sections = (detail?.template as { sections?: Section[] } | undefined)?.sections;
    if (!sections) { gaps.push(instance.instanceId); continue; }
    const mohsFields = sections.filter(sec => isVisible(sec.visibleWhen, answers))
      .flatMap(sec => sec.fields ?? []).filter(f => f.type === 'spatialStageCanvas' && isVisible(f.visibleWhen, answers));
    if (mohsFields.some(f => mohsBlockProblems(f.id, answers).length > 0)) gaps.push(instance.instanceId);
  }
  return gaps;
}

/** Batch 466b (Pete: map and form can't disagree): the synoptics whose generic margin questions, as stored, differ
 *  from what their map calculates (e.g. answered while no binding existed, or not opened since). Sign-out stops on
 *  these; opening the synoptic recalculates them. */
export async function findDerivedMarginConflicts(caseData: Pick<Case, 'synopticReports' | 'specimens' | 'order'> | null | undefined): Promise<string[]> {
  const out: string[] = [];
  for (const instance of caseData?.synopticReports ?? []) {
    const answers = (instance.answers ?? {}) as Record<string, string | string[]>;
    if (!Object.keys(answers).length) continue;
    let ctx: OrganMapContext;
    try { ctx = await loadOrganMapContext({ templateId: instance.templateId, facilityId: caseData?.order?.facilityId ?? null }); } catch { continue; }
    if (!ctx.binding?.derived || !ctx.template) continue;
    type Section = { visibleWhen?: VisibilityCondition; fields?: { id: string; type: string; visibleWhen?: VisibilityCondition }[] };
    const shown = (ctx.template.sections as Section[]).filter(sec => isVisible(sec.visibleWhen, answers))
      .flatMap(sec => sec.fields ?? []).filter(f => isVisible(f.visibleWhen, answers));
    const patch = derivedMarginAnswers({ binding: ctx.binding, answers, fields: shown, scheme: ctx.scheme.scheme, thresholds: ctx.scheme.thresholds, rows: partGridRowsOf(caseData?.specimens) });
    if (Object.keys(patch).length) out.push(instance.instanceId);
  }
  return out;
}

export interface InvasiveMarginGap { instanceId: string; templateName: string; mapType: OrganMapType; margins: string[] }

/** Batch 466d (Pete): the synoptics whose map records invasive carcinoma while its margins aren't all reported (none
 *  involved, and a margin still blank). Sign-out asks before going on — a warning the pathologist can pass, not a
 *  block (Pete's choice). The precursor's margins are not part of it. */
export async function findInvasiveMarginGaps(caseData: Pick<Case, 'synopticReports' | 'specimens' | 'order'> | null | undefined): Promise<InvasiveMarginGap[]> {
  const out: InvasiveMarginGap[] = [];
  for (const instance of caseData?.synopticReports ?? []) {
    const answers = (instance.answers ?? {}) as Record<string, string | string[]>;
    if (!Object.keys(answers).length) continue;
    let ctx: OrganMapContext;
    try { ctx = await loadOrganMapContext({ templateId: instance.templateId, facilityId: caseData?.order?.facilityId ?? null }); } catch { continue; }
    if (!ctx.binding || !ctx.template) continue;
    let payload;
    try {
      payload = resolveOrganMap({ binding: ctx.binding, answers, scheme: ctx.scheme.scheme, thresholds: ctx.scheme.thresholds, rows: partGridRowsOf(caseData?.specimens), templateId: instance.templateId, instanceId: instance.instanceId });
    } catch { continue; }
    if (!payload.hasData) continue;
    const margins = invasiveMarginGaps(payload, marginScopeOf(ctx.binding));
    if (margins.length) out.push({ instanceId: instance.instanceId, templateName: ctx.template.name ?? instance.templateId, mapType: payload.mapType, margins });
  }
  return out;
}
