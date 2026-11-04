// src/services/followUp/followUpSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454: the follow-up tracking settings, for the enterprise and as a
// per-facility override (Pete: "up to the Laboratory").
//   • warningDays: warn the lab this many days before the due date (0 = only
//     once it is overdue). Default 30.
//   • clinicianEmailEnabled: whether "Email ordering clinician" is offered at
//     all. Default off: a lab turns it on.
//   • emailSubject / emailBody: the lab's own wording for that email. Empty
//     means the built-in wording in the user's language. Only the
//     placeholders in FOLLOW_UP_EMAIL_PLACEHOLDERS are filled; there is
//     deliberately no patient name or diagnosis placeholder (the minimum
//     needed: the accession and a request for the follow-up).
// Changing them needs config:follow-up-tracking:manage.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { FOLLOW_UP_DEMO_FACILITY_OVERRIDES } from './followUpDemoSeed';

export interface FollowUpSettingsRule {
  warningDays: number;
  clinicianEmailEnabled: boolean;
  emailSubject: string;
  emailBody: string;
}

export const DEFAULT_FOLLOW_UP_SETTINGS: FollowUpSettingsRule = {
  warningDays: 30,
  clinicianEmailEnabled: false,
  emailSubject: '',
  emailBody: '',
};

export const MAX_FOLLOW_UP_WARNING_DAYS = 365;
export const MAX_FOLLOW_UP_EMAIL_SUBJECT = 200;
export const MAX_FOLLOW_UP_EMAIL_BODY = 4000;

/** The only placeholders an email template may use. */
export const FOLLOW_UP_EMAIL_PLACEHOLDERS = ['accession', 'windowStart', 'dueDate', 'clinicianName', 'labName', 'senderName'] as const;
export type FollowUpEmailPlaceholder = typeof FOLLOW_UP_EMAIL_PLACEHOLDERS[number];

export type FollowUpSettingsProblem = 'warningDaysInvalid' | 'subjectTooLong' | 'bodyTooLong' | 'unknownPlaceholder';

export interface FacilityFollowUpOverride {
  id: string;
  facilityId: string;
  overrides: Partial<FollowUpSettingsRule>;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveFollowUpSettings extends FollowUpSettingsRule {
  /** Where each value came from is not needed by callers; whether the
   *  facility overrides anything is (the settings screen shows it). */
  source: 'enterprise' | 'facility';
}

const PLACEHOLDER = /\{\{\s*([^{}\s]+)\s*\}\}/g;

/** The placeholders used in a template that aren't allowed. */
export function unknownFollowUpPlaceholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map(m => m[1]).filter(p => !(FOLLOW_UP_EMAIL_PLACEHOLDERS as readonly string[]).includes(p));
}

/** Every problem with (part of) a settings rule, in a fixed order. */
export function validateFollowUpSettings(rule: Partial<FollowUpSettingsRule>): FollowUpSettingsProblem[] {
  const problems: FollowUpSettingsProblem[] = [];
  if (rule.warningDays !== undefined && (!Number.isInteger(rule.warningDays) || rule.warningDays < 0 || rule.warningDays > MAX_FOLLOW_UP_WARNING_DAYS)) problems.push('warningDaysInvalid');
  if (rule.emailSubject !== undefined && rule.emailSubject.length > MAX_FOLLOW_UP_EMAIL_SUBJECT) problems.push('subjectTooLong');
  if (rule.emailBody !== undefined && rule.emailBody.length > MAX_FOLLOW_UP_EMAIL_BODY) problems.push('bodyTooLong');
  if (unknownFollowUpPlaceholders(`${rule.emailSubject ?? ''} ${rule.emailBody ?? ''}`).length) problems.push('unknownPlaceholder');
  return problems;
}

/** Enterprise settings with a facility's overrides on top. */
export function resolveEffectiveFollowUpSettings(
  enterprise: FollowUpSettingsRule | null | undefined,
  facilityOverride: Pick<FacilityFollowUpOverride, 'overrides'> | null | undefined,
): EffectiveFollowUpSettings {
  const base = { ...DEFAULT_FOLLOW_UP_SETTINGS, ...(enterprise ?? {}) };
  const own = facilityOverride?.overrides ?? {};
  const defined = Object.fromEntries(Object.entries(own).filter(([, v]) => v !== undefined)) as Partial<FollowUpSettingsRule>;
  return { ...base, ...defined, source: Object.keys(defined).length ? 'facility' : 'enterprise' };
}

export interface IFollowUpSettingsService {
  get(): Promise<ServiceResult<FollowUpSettingsRule>>;
  update(patch: Partial<FollowUpSettingsRule>): Promise<ServiceResult<FollowUpSettingsRule>>;
  reset(): Promise<ServiceResult<FollowUpSettingsRule>>;
}

export interface IFacilityFollowUpOverrideService {
  getAll(): Promise<ServiceResult<FacilityFollowUpOverride[]>>;
  getForFacility(facilityId: string): Promise<ServiceResult<FacilityFollowUpOverride | null>>;
  set(facilityId: string, overrides: Partial<FollowUpSettingsRule>): Promise<ServiceResult<FacilityFollowUpOverride>>;
  remove(facilityId: string): Promise<ServiceResult<void>>;
}

const SETTINGS_KEY = 'followUpTrackingSettings';
const OVERRIDES_KEY = 'facilityFollowUpTrackingOverrides';
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const loadSettings = (): FollowUpSettingsRule => ({ ...DEFAULT_FOLLOW_UP_SETTINGS, ...storageGet<Partial<FollowUpSettingsRule>>(SETTINGS_KEY, {}) });
// Batch 455: the demo baseline turns the clinician email on for Metro General (c1).
const loadOverrides = () => storageGet<FacilityFollowUpOverride[]>(OVERRIDES_KEY, FOLLOW_UP_DEMO_FACILITY_OVERRIDES);

const settingsUnchecked: IFollowUpSettingsService = {
  async get() { return ok(loadSettings()); },
  async update(patch) {
    const next = { ...loadSettings(), ...patch };
    const problems = validateFollowUpSettings(next);
    if (problems.length) return err(problems[0]);
    storageSet(SETTINGS_KEY, next);
    return ok({ ...next });
  },
  async reset() {
    storageSet(SETTINGS_KEY, DEFAULT_FOLLOW_UP_SETTINGS);
    return ok({ ...DEFAULT_FOLLOW_UP_SETTINGS });
  },
};

const overridesUnchecked: IFacilityFollowUpOverrideService = {
  async getAll() { return ok(loadOverrides().map(o => ({ ...o, overrides: { ...o.overrides } }))); },
  async getForFacility(facilityId) {
    const found = loadOverrides().find(o => o.facilityId === facilityId);
    return ok(found ? { ...found, overrides: { ...found.overrides } } : null);
  },
  async set(facilityId, overrides) {
    if (!facilityId) return err('facilityRequired');
    const problems = validateFollowUpSettings(overrides);
    if (problems.length) return err(problems[0]);
    const records = loadOverrides();
    const now = new Date().toISOString();
    const existing = records.find(o => o.facilityId === facilityId);
    const record: FacilityFollowUpOverride = existing
      ? { ...existing, overrides: { ...overrides }, updatedAt: now }
      : { id: `fac-followup-${facilityId}`, facilityId, overrides: { ...overrides }, createdAt: now, updatedAt: now };
    storageSet(OVERRIDES_KEY, [...records.filter(o => o.facilityId !== facilityId), record]);
    return ok({ ...record, overrides: { ...record.overrides } });
  },
  async remove(facilityId) {
    storageSet(OVERRIDES_KEY, loadOverrides().filter(o => o.facilityId !== facilityId));
    return { ok: true, data: undefined };
  },
};

export const followUpSettingsService: IFollowUpSettingsService = guardConfigWrites(settingsUnchecked, [
  ['config:follow-up-tracking:manage', ['update', 'reset']],
]);
export const facilityFollowUpOverrideService: IFacilityFollowUpOverrideService = guardConfigWrites(overridesUnchecked, [
  ['config:follow-up-tracking:manage', ['set', 'remove']],
]);

/** The settings that apply to one facility. */
export async function getEffectiveFollowUpSettings(facilityId: string | undefined): Promise<EffectiveFollowUpSettings> {
  const enterprise = await followUpSettingsService.get();
  const override = facilityId ? await facilityFollowUpOverrideService.getForFacility(facilityId) : null;
  return resolveEffectiveFollowUpSettings(enterprise.ok ? enterprise.data : null, override && override.ok ? override.data : null);
}

/** Interpolation values that keep each placeholder as written, so the
 *  built-in wording can be shown (or filled later) with its {{placeholders}}. */
export const FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN: Record<FollowUpEmailPlaceholder, string> =
  Object.fromEntries(FOLLOW_UP_EMAIL_PLACEHOLDERS.map(p => [p, `{{${p}}}`])) as Record<FollowUpEmailPlaceholder, string>;

// ── The settings screen's drafts (Configuration → System → Follow-up tracking) ──

export interface FollowUpSettingsDraft {
  warningDays: string;
  clinicianEmailEnabled: boolean;
  emailSubject: string;
  emailBody: string;
}

export const followUpDraftOf = (rule: FollowUpSettingsRule): FollowUpSettingsDraft => ({
  warningDays: String(rule.warningDays),
  clinicianEmailEnabled: rule.clinicianEmailEnabled,
  emailSubject: rule.emailSubject,
  emailBody: rule.emailBody,
});

/** The rule a draft describes, or the problems that stop it being saved. */
export function followUpRuleFromDraft(draft: FollowUpSettingsDraft): { rule: FollowUpSettingsRule; problems: FollowUpSettingsProblem[] } {
  const days = draft.warningDays.trim();
  const rule: FollowUpSettingsRule = {
    warningDays: /^\d+$/.test(days) ? Number(days) : NaN,
    clinicianEmailEnabled: draft.clinicianEmailEnabled,
    emailSubject: draft.emailSubject.trim(),
    emailBody: draft.emailBody.trim(),
  };
  return { rule, problems: validateFollowUpSettings(rule) };
}

export function followUpDraftDirty(draft: FollowUpSettingsDraft, saved: FollowUpSettingsRule): boolean {
  const d = followUpDraftOf(saved);
  return draft.warningDays.trim() !== d.warningDays || draft.clinicianEmailEnabled !== d.clinicianEmailEnabled
    || draft.emailSubject.trim() !== d.emailSubject || draft.emailBody.trim() !== d.emailBody;
}
