// src/services/participationTypes/saveCountryProfiles.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-341 (Batch 335): saving one country's signing rules from System →
// Country Signing Rules. Same order as saveParticipationType.ts: plan
// (permission, reason, last-country check) → persist each changed type →
// only then write one audit entry per changed type → clear the shared
// participation-type cache so the next sign-out check sees the new rules.
// ─────────────────────────────────────────────────────────────────────────────

import type { IAuditService } from '../auditlog/IAuditService';
import type { IParticipationTypeService, ParticipationTypeRecord } from './IParticipationTypeService';
import type { Jurisdiction } from '../../types/systemConfig';
import { buildCountryProfileAuditEntry, planCountryProfileSave, type CountryProfileChange, type CountryProfileRefusal, type CountryProfileRow } from './countryProfileEditor';
import { invalidateParticipationTypeLookup } from '../../utils/participationTypeLookup';
import { permitConfigChange } from '../authorization/guardConfigWrites';
import { usesApiServer } from '../apiServer/serviceSelection';
import { participationTypeService } from './participationTypeServiceInstance';
import { participationTypeServiceUnchecked } from './mockParticipationTypeService';

export type SaveCountryProfilesResult =
  | { ok: true; savedTypeIds: string[] }
  | { ok: false; code: CountryProfileRefusal | 'SAVE_FAILED'; typeIds?: string[]; error?: string };

export async function saveCountryProfilesWithAudit(
  input: {
    types: readonly ParticipationTypeRecord[];
    jurisdiction: Jurisdiction;
    original: readonly CountryProfileRow[];
    edited: readonly CountryProfileRow[];
    actor: { userId: string; userName: string; role?: string };
    reason: string;
    now?: () => string;
  },
  deps: {
    typeService?: Pick<IParticipationTypeService, 'update'>;
    auditService: Pick<IAuditService, 'logEvent'>;
    /** Batch 428: the capability check (a fake in tests). */
    authorization?: { enforce: (capability: string) => Promise<{ allowed: boolean }> };
  },
): Promise<SaveCountryProfilesResult> {
  // Batch 428: national signing rules are ForMedrixAI support's (platform:signing-rules:manage, audited).
  const authorization = deps.authorization ?? (await import('../authorization/defaultAuthorizationService')).authorizationService;
  if (!(await permitConfigChange(authorization.enforce('platform:signing-rules:manage'), 'platform:signing-rules:manage'))) {
    return { ok: false, code: 'NOT_PERMITTED' };
  }
  // The country profile lives on the participation type record; this change is
  // checked above, so the record is written without the participation-types check.
  const typeService = deps.typeService ?? (usesApiServer() ? participationTypeService : participationTypeServiceUnchecked); // the demo's unguarded store: this save checked the permission itself (permitConfigChange); with an API server the server decides
  const plan = planCountryProfileSave({ ...input, nowIso: (input.now ?? (() => new Date().toISOString()))() });
  if (plan.ok === false) return { ok: false, code: plan.code, ...(plan.typeIds ? { typeIds: plan.typeIds } : {}) };

  const saved: string[] = [];
  for (const u of plan.updates) {
    const res = await typeService.update(u.typeId, u.changes);
    if (res.ok === false) {
      // Types saved before the failure are audited; nothing is claimed for the rest.
      await audit(plan.changes.filter(c => saved.includes(c.typeId)));
      invalidateParticipationTypeLookup();
      return { ok: false, code: 'SAVE_FAILED', typeIds: [u.typeId], error: res.error };
    }
    saved.push(u.typeId);
  }
  await audit(plan.changes);
  invalidateParticipationTypeLookup();
  return { ok: true, savedTypeIds: saved };

  async function audit(changes: CountryProfileChange[]) {
    for (const c of changes) {
      await deps.auditService
        .logEvent(buildCountryProfileAuditEntry(c, input.jurisdiction, input.actor.userName, input.reason))
        .catch(e => console.error('[saveCountryProfilesWithAudit] Failed to write country-profile audit entry:', e));
    }
  }
}
