// src/services/smartCapture/smartCaptureServices.ts
// ─────────────────────────────────────────────────
// Batch 611 (queue entry #189): the Smart Capture services wired to the browser
// demo's pieces: browser-held storage, the audit log, the authorization service,
// the case router, the code-system policy, the financial-class builder and the
// interface dispatch (which answers from the simulated engine when none is set).
// With the API server, this file is replaced by HTTP calls; the screens and the
// rules above do not change.
// ─────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { auditService } from '../auditlog/auditServiceInstance';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { readSessionProfile } from '../auth/sessionProfile';
import { caseRouter } from '../cases/CaseRouter';
import { facilityService } from '../facilities/facilityServiceInstance';
import { resolveCasePerformingLab } from '../facilities/resolveCasePerformingLab';
import { codeSystemPolicyService } from '../coding/codeSystemPolicyServiceInstance';
import { roleOn } from '../coding/codeSystemPolicy';
import { isoDayOf } from '../coding/codePolicyEnforcement';
import { getCurrentJurisdiction } from '../retentionPolicy/RetentionPolicy';
import { buildFinancialClassPayload } from '../billing/buildFinancialClassPayload';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { isEngineSimulated } from '../mockInterfaceEngine/simulatedEngineReceiver';
import {
  createSmartCaptureService, createSmartCaptureSettingsService, type SmartCaptureDeps,
} from './smartCaptureService';

const actor = () => {
  const p = readSessionProfile();
  return { name: p?.name ?? 'unknown', role: p?.role as string | undefined };
};

const deps: SmartCaptureDeps = {
  load: storageGet,
  save: storageSet,
  audit: e => auditService.logEvent(e),
  enforce: (capability, context) => authorizationService.enforce(capability, context),
  actor,
  async facilityIdFor(caseId) {
    const c = await caseRouter.getCase(caseId).catch(() => undefined);
    const all = await facilityService.getAll();
    return resolveCasePerformingLab(c as { originHospitalId?: string } | undefined, all.ok ? all.data : [])?.id ?? null;
  },
  async specimensFor(caseId) {
    const c = await caseRouter.getCase(caseId).catch(() => undefined);
    return c?.specimens ?? null;
  },
  async cptActive() {
    const policy = await codeSystemPolicyService.policyFor(getCurrentJurisdiction());
    return roleOn(policy, 'CPT', isoDayOf(new Date())) !== 'off';
  },
  async financialClassFor(caseId) {
    const c = await caseRouter.getCase(caseId).catch(() => undefined);
    if (!c) return undefined;
    return buildFinancialClassPayload(c).catch(() => undefined);
  },
  async dispatch(id, payload) {
    const r = await dispatchInterfaceMessage(id, 'CHARGE_JSON', payload);
    return { ok: r.ok, error: r.error };
  },
  engineSimulated: isEngineSimulated,
  now: () => new Date().toISOString(),
};

export const mockSmartCaptureService = createSmartCaptureService(deps);

const settingsUnchecked = createSmartCaptureSettingsService(deps);

/** Every change to the settings needs config:smart-capture:manage (guardConfigWrites). */
export const mockSmartCaptureSettingsService = guardConfigWrites(settingsUnchecked, [
  ['config:smart-capture:manage', ['setPrototypeEnabled', 'setChecklistItem', 'setProductionActivated']],
]);
