// src/services/smartCapture/smartCaptureService.ts
// ─────────────────────────────────────────────────
// Batch 611 (queue entry #189): the Smart Capture review flow.
//
// PROTOTYPE, NOT COMPLIANCE-REVIEWED. Human-reviewed AI charge capture, as the
// development team decided (docs/product/SMART_CAPTURE.md):
//
//   suggest   makes the lines from the case (simulated rules, no patient data)
//   review    a person accepts or rejects each line      billing:smart-capture:review
//   approve   a pathologist confirms the accepted lines  billing:smart-capture:approve
//   export    hands the approved lines to the charge path billing:smart-capture:send
//
// Nothing is sent without the approval, and an export in the demo goes only to
// the simulated interface engine, labelled Simulated. An export to a real engine
// is refused until an administrator has closed the production checklist
// (Configuration → System → Smart Capture). Every step is audited, PHI-free, with
// the rule-set version. The deployment's API server holds this in production.
// Dependencies are passed in so the flow can be tested without the browser.
// ─────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { Specimen } from '@/types/case/Specimen';
import {
  SMART_CAPTURE_RULE_VERSION, smartCaptureSignature, suggestSmartCaptureLines, toSmartCaptureInput,
} from './smartCaptureRules';
import {
  approvalRefusal, exportRefusal, exportableLines, isStale, mergeDecisions, recordState,
  type SmartCaptureDecision, type SmartCaptureRecord, type SmartCaptureRecordState, type SmartCaptureRefusal,
} from './smartCaptureStates';
import {
  DEFAULT_SMART_CAPTURE_SETTINGS, activationRefusal, withTick,
  type SmartCaptureSettings, type SmartCaptureSettingsRefusal,
} from './smartCaptureSettings';
import {
  approvedAudit, buildSmartCapturePayload, exportedAudit, resetAudit, reviewedAudit, settingsAudit, suggestedAudit,
  type SmartCapturePayload,
} from './smartCapturePayload';

export const SMART_CAPTURE_REVIEW = 'billing:smart-capture:review';
export const SMART_CAPTURE_APPROVE = 'billing:smart-capture:approve';
export const SMART_CAPTURE_EXPORT = 'billing:smart-capture:send';
export const SMART_CAPTURE_MANAGE = 'config:smart-capture:manage';

export const SMART_CAPTURE_RECORDS_KEY = 'smartCaptureRecords';
export const SMART_CAPTURE_SETTINGS_KEY = 'smartCaptureSettings';

type Err = SmartCaptureRefusal | SmartCaptureSettingsRefusal | 'NOT_PERMITTED' | 'LAB_UNKNOWN' | 'CPT_OFF' | 'DISPATCH_FAILED';

export interface SmartCaptureView {
  record: SmartCaptureRecord | null;
  state: SmartCaptureRecordState;
  stale: boolean;
  /** CPT is switched off for the case's jurisdiction, so nothing is suggested. */
  cptOff: boolean;
}

export interface SmartCaptureDeps {
  load<T>(key: string, fallback: T): T;
  save<T>(key: string, value: T): void;
  audit(entry: NewAuditLog): Promise<unknown>;
  enforce(capability: string, context: { caseId?: string; facilityId?: string }): Promise<{ allowed: boolean }>;
  actor(): { name: string; role: string | undefined };
  facilityIdFor(caseId: string): Promise<string | null>;
  specimensFor(caseId: string): Promise<readonly Specimen[] | null>;
  /** The code-system policy in force for the case; CPT 'off' means no suggestions. */
  cptActive(caseId: string): Promise<boolean>;
  financialClassFor(caseId: string): Promise<object | undefined>;
  dispatch(id: string, payload: SmartCapturePayload): Promise<{ ok: boolean; error?: string }>;
  engineSimulated(): boolean;
  now(): string;
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = (error: Err): ServiceResult<never> => ({ ok: false, error });

export function createSmartCaptureService(d: SmartCaptureDeps) {
  const records = (): Record<string, SmartCaptureRecord> => d.load<Record<string, SmartCaptureRecord>>(SMART_CAPTURE_RECORDS_KEY, {});
  const putRecord = (r: SmartCaptureRecord) => d.save(SMART_CAPTURE_RECORDS_KEY, { ...records(), [r.caseId]: r });
  const settings = (): SmartCaptureSettings => ({ ...DEFAULT_SMART_CAPTURE_SETTINGS, ...d.load<Partial<SmartCaptureSettings>>(SMART_CAPTURE_SETTINGS_KEY, {}) });
  const log = (e: NewAuditLog) => { void d.audit(e).catch(() => undefined); };

  /** The caller must hold the capability for the case's performing lab. */
  async function permit(check: (context: { caseId: string; facilityId: string }) => Promise<{ allowed: boolean }>, caseId: string): Promise<Err | null> {
    const facilityId = await d.facilityIdFor(caseId);
    if (!facilityId) return 'LAB_UNKNOWN';
    const decision = await check({ caseId, facilityId });
    return decision.allowed ? null : 'NOT_PERMITTED';
  }

  async function view(caseId: string): Promise<SmartCaptureView> {
    const specimens = await d.specimensFor(caseId);
    const cptOff = !(await d.cptActive(caseId));
    const sig = smartCaptureSignature(toSmartCaptureInput(specimens ?? []));
    const record = records()[caseId] ?? null;
    return { record, state: recordState(record), stale: isStale(record, sig, SMART_CAPTURE_RULE_VERSION), cptOff };
  }

  /** Makes the suggestions (or keeps the ones made). Starts again when the case or the rule set changed and nothing is approved yet. */
  async function suggest(caseId: string): Promise<ServiceResult<SmartCaptureView>> {
    const denied = await permit(c => d.enforce('billing:smart-capture:review', c), caseId);
    if (denied) return fail(denied);
    const v = await view(caseId);
    if (v.cptOff) return fail('CPT_OFF');
    if (v.record && !v.stale) return ok(v);
    if (v.record && (v.state === 'approved' || v.state === 'exported')) return ok(v); // locked: the reviewer restarts on purpose
    const input = toSmartCaptureInput(await d.specimensFor(caseId) ?? []);
    const lines = mergeDecisions(suggestSmartCaptureLines(input), v.record?.lines);
    const record: SmartCaptureRecord = { caseId, ruleVersion: SMART_CAPTURE_RULE_VERSION, signature: smartCaptureSignature(input), generatedAt: d.now(), lines };
    putRecord(record);
    const who = d.actor().name;
    log(v.record ? resetAudit(caseId, who, 'stale') : suggestedAudit(record, who));
    return ok(await view(caseId));
  }

  return {
    /** The current record for a case, and whether it is stale or CPT is off. A read; shown to anyone who can see the billing review. */
    async get(caseId: string): Promise<ServiceResult<SmartCaptureView>> { return ok(await view(caseId)); },

    suggest,

    /** Throws away an approved or exported record and suggests again. The earlier steps stay in the audit trail. */
    async restart(caseId: string): Promise<ServiceResult<SmartCaptureView>> {
      const denied = await permit(c => d.enforce('billing:smart-capture:review', c), caseId);
      if (denied) return fail(denied);
      const { [caseId]: _gone, ...rest } = records();
      d.save(SMART_CAPTURE_RECORDS_KEY, rest);
      log(resetAudit(caseId, d.actor().name, 'restart'));
      return suggest(caseId);
    },

    /** A person accepts or rejects one suggested line. */
    async review(caseId: string, lineKey: string, decision: SmartCaptureDecision): Promise<ServiceResult<SmartCaptureView>> {
      const denied = await permit(c => d.enforce('billing:smart-capture:review', c), caseId);
      if (denied) return fail(denied);
      const v = await view(caseId);
      if (!v.record) return fail('NOT_FOUND');
      if (v.stale) return fail('STALE');
      if (v.state === 'approved' || v.state === 'exported') return fail('LOCKED');
      const line = v.record.lines.find(l => l.key === lineKey);
      if (!line) return fail('NOT_FOUND');
      const who = d.actor().name;
      const next: SmartCaptureRecord = {
        ...v.record,
        lines: v.record.lines.map(l => l.key === lineKey ? { ...l, state: 'reviewed', decision, reviewedBy: who, reviewedAt: d.now() } : l),
      };
      putRecord(next);
      log(reviewedAudit(next, line, decision, who));
      return ok(await view(caseId));
    },

    /** The pathologist's confirmation: every line decided, at least one accepted, the box ticked. */
    async approve(caseId: string, input: { confirmed: boolean }): Promise<ServiceResult<SmartCaptureView>> {
      const denied = await permit(c => d.enforce('billing:smart-capture:approve', c), caseId);
      if (denied) return fail(denied);
      const v = await view(caseId);
      const who = d.actor();
      const refusal = approvalRefusal(v.record, { role: who.role, confirmed: input.confirmed, stale: v.stale });
      if (refusal) return fail(refusal);
      const record = v.record!;
      const next: SmartCaptureRecord = {
        ...record, approvedBy: who.name, approvedAt: d.now(),
        lines: record.lines.map(l => l.decision === 'accepted' ? { ...l, state: 'approved' } : l),
      };
      putRecord(next);
      log(approvedAudit(next, who.name));
      return ok(await view(caseId));
    },

    /** The payload that would leave, for the preview. Built from the approved lines, or the accepted ones before approval. */
    async preview(caseId: string): Promise<ServiceResult<SmartCapturePayload>> {
      const v = await view(caseId);
      if (!v.record) return fail('NOT_FOUND');
      const shown: SmartCaptureRecord = v.record.approvedAt
        ? v.record
        : { ...v.record, lines: v.record.lines.map(l => l.decision === 'accepted' ? { ...l, state: 'approved' as const } : l) };
      return ok(buildSmartCapturePayload(shown, { simulated: d.engineSimulated(), financialClass: await d.financialClassFor(caseId) }));
    },

    /** Hands the approved lines to the charge path. Simulated in the demo; refused to a real engine until the gate is open. */
    async exportLines(caseId: string): Promise<ServiceResult<SmartCaptureView>> {
      const denied = await permit(c => d.enforce('billing:smart-capture:send', c), caseId);
      if (denied) return fail(denied);
      const v = await view(caseId);
      const who = d.actor();
      if (!mayExportRole(who.role)) return fail('NOT_A_PATHOLOGIST');
      const refusal = exportRefusal(v.record, { stale: v.stale, engineSimulated: d.engineSimulated(), productionActivated: settings().productionActivated });
      if (refusal) return fail(refusal);
      const record = v.record!;
      const simulated = d.engineSimulated();
      const payload = buildSmartCapturePayload(record, { simulated, financialClass: await d.financialClassFor(caseId) });
      const sent = await d.dispatch(`SC-${caseId}-${Date.parse(d.now()).toString(36)}`, payload);
      log(exportedAudit(record, who.name, { simulated, ok: sent.ok }));
      if (!sent.ok) {
        putRecord({ ...record, lastExportError: sent.error ?? 'The message was not delivered.' });
        return fail('DISPATCH_FAILED');
      }
      const lines = record.lines.map(l => exportableLines(record).some(x => x.key === l.key) ? { ...l, state: 'exported' as const } : l);
      putRecord({ ...record, lines, exportedAt: d.now(), exportSimulated: simulated, lastExportError: undefined });
      return ok(await view(caseId));
    },
  };
}

/** Exporting is also the pathologist's: it carries the approval's weight (pure). */
function mayExportRole(role: string | undefined): boolean { return role === 'pathologist' || role === 'pathologist-admin'; }

/**
 * The settings the administrator changes. Unchecked here; the exported
 * smartCaptureSettingsService wraps it with config:smart-capture:manage.
 */
export function createSmartCaptureSettingsService(d: Pick<SmartCaptureDeps, 'load' | 'save' | 'audit' | 'actor' | 'now'>) {
  const read = (): SmartCaptureSettings => ({ ...DEFAULT_SMART_CAPTURE_SETTINGS, ...d.load<Partial<SmartCaptureSettings>>(SMART_CAPTURE_SETTINGS_KEY, {}) });
  const write = (s: SmartCaptureSettings) => d.save(SMART_CAPTURE_SETTINGS_KEY, s);
  const log = (e: NewAuditLog) => { void d.audit(e).catch(() => undefined); };
  return {
    async getSettings(): Promise<ServiceResult<SmartCaptureSettings>> { return ok(read()); },
    async setPrototypeEnabled(enabled: boolean): Promise<ServiceResult<SmartCaptureSettings>> {
      const next = { ...read(), prototypeEnabled: enabled };
      write(next);
      log(settingsAudit('prototype', d.actor().name, enabled ? 'on' : 'off'));
      return ok(next);
    },
    async setChecklistItem(id: string, ticked: boolean): Promise<ServiceResult<SmartCaptureSettings>> {
      const next = withTick(read(), id, ticked, d.actor().name, d.now());
      if (typeof next === 'string') return fail(next);
      write(next);
      log(settingsAudit(ticked ? 'tick' : 'untick', d.actor().name, id));
      return ok(next);
    },
    async setProductionActivated(on: boolean): Promise<ServiceResult<SmartCaptureSettings>> {
      const current = read();
      if (on) {
        const refusal = activationRefusal(current);
        if (refusal) return fail(refusal);
      }
      const next = { ...current, productionActivated: on };
      write(next);
      log(settingsAudit('activation', d.actor().name, on ? 'on' : 'off'));
      return ok(next);
    },
  };
}

export type SmartCaptureService = ReturnType<typeof createSmartCaptureService>;
export type SmartCaptureSettingsService = ReturnType<typeof createSmartCaptureSettingsService>;
