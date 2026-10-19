// src/services/labels/batchLabelReprintDeps.ts
// Batch 518 (PS-123): the app's real dependencies for batchLabelReprint.ts —
// the label printers (each audits its own print, PS-282), the print settings
// (on-demand guardrail, GS1 GTIN, cassette layout), the printer profiles, the
// run log and the authorization service. The screen passes these; tests pass
// fakes.
import type { ReprintDeps, ReprintItem } from './batchLabelReprint';
import { labelReprintRunService } from './labelReprintRunServiceInstance';
import { printSettingsService } from '../printSettings/printSettingsServiceInstance';
import { DEFAULT_CASSETTE_LABEL_LAYOUT } from '../printSettings/IPrintSettingsService';
import { printerProfileService } from '../printerProfiles/printerProfileServiceInstance';

async function printItem(item: ReprintItem, printerProfileId: string | undefined): Promise<{ ok: boolean; message?: string }> {
  const { mockCaseService } = await import('../cases/mockCaseService');
  const caseData = await mockCaseService.getCase(item.caseId);
  if (!caseData) return { ok: false, message: 'The case could not be loaded.' };
  if (item.kind === 'requisition') {
    const { printRequisitionLabel } = await import('@/utils/labels/printRequisitionAndContainerLabels');
    return { ok: await printRequisitionLabel(caseData) };
  }
  if (item.kind === 'container') {
    const specimen = (caseData.specimens ?? []).find(s => s.label === item.target);
    if (!specimen) return { ok: false, message: `Specimen ${item.target} is no longer on the case.` };
    const { printContainerLabel } = await import('@/utils/labels/printRequisitionAndContainerLabels');
    return { ok: await printContainerLabel(caseData, specimen) };
  }
  // Cassette: the chosen printer, with the lab's GS1 GTIN and cassette layout.
  const printer = printerProfileId ? await printerProfileService.getById(printerProfileId) : null;
  if (!printer?.ok || !printer.data) return { ok: false, message: 'The cassette printer was not found.' };
  const settings = await printSettingsService.get();
  const gtin = settings.ok ? settings.data.gs1Gtin : '';
  const layout = settings.ok ? settings.data.cassetteLabelLayout : DEFAULT_CASSETTE_LABEL_LAYOUT;
  const { getAllCassetteLabelRequests } = await import('@/utils/labels/getAllCassetteLabelRequests');
  const { printCassetteLabel } = await import('@/utils/labels/printCassetteSlideLabel');
  const { ordinary, matrix } = getAllCassetteLabelRequests(caseData);
  const patientName = `${caseData.patient?.givenNames ?? ''} ${caseData.patient?.familyNames ?? ''}`.trim();
  const block = ordinary.find(r => `${r.specimenLabel}${r.blockLabel}` === item.target);
  const mx = block ? undefined : matrix.find(r => r.matrixBlockLabel === item.target);
  if (!block && !mx) return { ok: false, message: `Cassette ${item.target} is no longer on the case.` };
  const input = block
    ? { ...block, patientName }
    : { fullAccession: mx!.fullAccession, specimenLabel: mx!.specimenLabels.join(','), blockLabel: mx!.matrixBlockLabel, cassetteId: mx!.cassetteId, patientName };
  const result = await printCassetteLabel(input, printer.data, gtin, layout);
  return result.ok ? { ok: true } : { ok: false, message: (result as { message?: string }).message };
}

export const batchLabelReprintDeps: ReprintDeps = {
  enforce: async capability => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability as never, {});
  },
  printItem,
  cassettesBlocked: async () => {
    const s = await printSettingsService.get();
    return s.ok && s.data.defaultPrintBehavior === 'on_demand' && s.data.enforceOnDemandGuardrails === true;
  },
  saveRun: run => labelReprintRunService.save(run),
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  now: () => new Date().toISOString(),
  newId: () => `reprint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
};
