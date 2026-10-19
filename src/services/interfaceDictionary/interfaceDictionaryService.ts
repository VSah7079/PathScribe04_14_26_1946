// src/services/interfaceDictionary/interfaceDictionaryService.ts
// ─────────────────────────────────────────────────
// Batch 612: the Interface Dictionary service: vendor profiles with their
// draft / test / publish / rollback life, and the extension values they put on cases.
// Dependencies are passed in so it tests without the browser.
//
// Who may do what is decided by the wiring (interfaceDictionaryServices.ts), which
// wraps these methods in guardConfigWrites:
//   platform:interface-dictionary:manage    create, draft, save mappings, test
//   platform:interface-dictionary:publish   publish, roll back, retire
//   platform:interface-dictionary:simulate  apply a pasted message to a case
// All three are platform-only: ForMedrixAI staff through Superadmin. Reading the
// profiles and a case's vendor fields needs no capability beyond seeing the case.
//
// Simulated: in the demo nothing is received from a vendor. Staff paste a sample
// message to test a profile, and may apply it to a case to see the Vendor fields
// panel. Both are labelled Simulated and audited without any message content. With
// the API server, the interface engine applies the published profile to live
// messages (docs/architecture/INTERFACE_DICTIONARY_API.md).
// ─────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type {
  ExtensionStore, ExtensionValue, FieldMapping, InterfaceDictionaryRefusal, ProfileTestResult, VendorProfile,
} from './interfaceDictionaryTypes';
import { applyMappings, applyPassed, contentHash, type ApplyResult } from './mappingEngine';
import { parseVendorMessage } from './messagePath';
import {
  createProfile, publishedVersion, startDraft, withMappings, withPublished, withRetired, withRollback, withTestResult, workingVersion,
  rollbackTarget, messageTypeMatches,
} from './profileLifecycle';
import {
  draftStartedAudit, fieldsAppliedAudit, mappingsSavedAudit, profileCreatedAudit, publishedAudit, retiredAudit, rolledBackAudit,
  testedAudit,
} from './interfaceDictionaryAudit';

export const INTERFACE_DICTIONARY_PROFILES_KEY = 'interfaceDictionaryProfiles';
export const INTERFACE_DICTIONARY_VALUES_KEY = 'interfaceDictionaryFieldValues';

export interface InterfaceDictionaryDeps {
  load<T>(key: string, fallback: T): T;
  save<T>(key: string, value: T): void;
  audit(entry: NewAuditLog): Promise<unknown>;
  actor(): { name: string };
  now(): string;
  newId(): string;
  caseExists(caseId: string): Promise<boolean>;
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = (error: InterfaceDictionaryRefusal): ServiceResult<never> => ({ ok: false, error });
const messageRefusal = (r: 'EMPTY' | 'BAD_MESSAGE'): InterfaceDictionaryRefusal => (r === 'EMPTY' ? 'EMPTY_MESSAGE' : 'BAD_MESSAGE');
const isRefusal = <T extends object>(v: T | InterfaceDictionaryRefusal): v is InterfaceDictionaryRefusal => typeof v === 'string';

/** A test run's detail for the screen. Holds values from the pasted sample: shown once, never stored. */
export interface ProfileTestReport { result: ProfileTestResult; apply: ApplyResult }

export function createInterfaceDictionaryService(d: InterfaceDictionaryDeps) {
  const profiles = (): VendorProfile[] => d.load<VendorProfile[]>(INTERFACE_DICTIONARY_PROFILES_KEY, []);
  const putProfile = (p: VendorProfile) => {
    const all = profiles();
    d.save(INTERFACE_DICTIONARY_PROFILES_KEY, all.some(x => x.id === p.id) ? all.map(x => (x.id === p.id ? p : x)) : [...all, p]);
  };
  const values = (): ExtensionStore => d.load<ExtensionStore>(INTERFACE_DICTIONARY_VALUES_KEY, {});
  const log = (e: NewAuditLog) => { void d.audit(e).catch(() => undefined); };
  const find = (id: string) => profiles().find(p => p.id === id);

  return {
    async list(): Promise<ServiceResult<VendorProfile[]>> { return ok(profiles()); },

    async get(id: string): Promise<ServiceResult<VendorProfile>> {
      const p = find(id);
      return p ? ok(p) : fail('NOT_FOUND');
    },

    async createProfile(input: { name: string; format: string; messageType: string }): Promise<ServiceResult<VendorProfile>> {
      const by = d.actor().name;
      const made = createProfile({ ...input, id: d.newId(), by, at: d.now() }, profiles());
      if (isRefusal(made)) return fail(made);
      putProfile(made);
      log(profileCreatedAudit(made.name, made.format, made.messageType, by));
      return ok(made);
    },

    async startDraft(id: string): Promise<ServiceResult<VendorProfile>> {
      const p = find(id); if (!p) return fail('NOT_FOUND');
      const by = d.actor().name;
      const next = startDraft(p, by, d.now());
      if (isRefusal(next)) return fail(next);
      putProfile(next);
      log(draftStartedAudit(p.name, (workingVersion(next))?.version ?? 0, by));
      return ok(next);
    },

    async saveMappings(id: string, mappings: FieldMapping[]): Promise<ServiceResult<VendorProfile>> {
      const p = find(id); if (!p) return fail('NOT_FOUND');
      const next = withMappings(p, mappings);
      if (isRefusal(next)) return fail(next);
      putProfile(next);
      log(mappingsSavedAudit(p.name, workingVersion(next)?.version ?? 0, mappings.length, d.actor().name));
      return ok(next);
    },

    /** Runs the working copy against a pasted sample and records the counts. The sample is not kept. */
    async testProfile(id: string, sample: string): Promise<ServiceResult<ProfileTestReport & { profile: VendorProfile }>> {
      const p = find(id); if (!p) return fail('NOT_FOUND');
      const w = workingVersion(p); if (!w) return fail('NOT_A_DRAFT');
      const parsed = parseVendorMessage(p.format, sample);
      if (!parsed.ok) return fail(messageRefusal(parsed.reason));
      if (!messageTypeMatches(p, parsed.message)) return fail('WRONG_MESSAGE_TYPE');
      const apply = applyMappings(p.format, w.mappings, parsed.message);
      const by = d.actor().name;
      const result: ProfileTestResult = {
        at: d.now(), by, passed: applyPassed(apply), mapped: apply.mapped, missingRequired: apply.missingRequired,
        problems: apply.problems, contentHash: contentHash(w.mappings),
      };
      const next = withTestResult(p, result);
      if (isRefusal(next)) return fail(next);
      putProfile(next);
      log(testedAudit(p.name, w.version, result, by));
      return ok({ result, apply, profile: next });
    },

    async publish(id: string): Promise<ServiceResult<VendorProfile>> {
      const p = find(id); if (!p) return fail('NOT_FOUND');
      const by = d.actor().name;
      const live = publishedVersion(p)?.version ?? null;
      const w = workingVersion(p);
      const next = withPublished(p, by, d.now());
      if (isRefusal(next)) return fail(next);
      putProfile(next);
      log(publishedAudit(p.name, w?.version ?? 0, live, by));
      return ok(next);
    },

    async rollback(id: string): Promise<ServiceResult<VendorProfile>> {
      const p = find(id); if (!p) return fail('NOT_FOUND');
      const by = d.actor().name;
      const from = publishedVersion(p)?.version ?? 0;
      const target = rollbackTarget(p)?.version ?? 0;
      const next = withRollback(p, by, d.now());
      if (isRefusal(next)) return fail(next);
      putProfile(next);
      log(rolledBackAudit(p.name, from, target, publishedVersion(next)?.version ?? 0, by));
      return ok(next);
    },

    async retire(id: string): Promise<ServiceResult<VendorProfile>> {
      const p = find(id); if (!p) return fail('NOT_FOUND');
      const by = d.actor().name;
      const live = publishedVersion(p)?.version ?? 0;
      const next = withRetired(p, by, d.now());
      if (isRefusal(next)) return fail(next);
      putProfile(next);
      log(retiredAudit(p.name, live, by));
      return ok(next);
    },

    /** Simulated receive: applies the live version to a pasted message and keeps the result against the case. */
    async simulateReceive(vendorId: string, caseId: string, message: string): Promise<ServiceResult<{ applied: number; problems: number }>> {
      if (!caseId.trim()) return fail('CASE_REQUIRED');
      const p = find(vendorId); if (!p) return fail('NOT_FOUND');
      const live = publishedVersion(p); if (!live) return fail('NO_PUBLISHED_VERSION');
      if (!(await d.caseExists(caseId))) return fail('NOT_FOUND');
      const parsed = parseVendorMessage(p.format, message);
      if (!parsed.ok) return fail(messageRefusal(parsed.reason));
      if (!messageTypeMatches(p, parsed.message)) return fail('WRONG_MESSAGE_TYPE');
      const apply = applyMappings(p.format, live.mappings, parsed.message);
      const at = d.now();
      const fresh: ExtensionValue[] = apply.values.map(v => ({
        vendorId: p.id, vendorName: p.name, profileVersion: live.version, target: v.target, label: v.label,
        dataType: v.dataType, value: v.value, receivedAt: at, simulated: true,
      }));
      const store = values();
      const kept = (store[caseId] ?? []).filter(e => !(e.vendorId === p.id && fresh.some(f => f.target === e.target)));
      d.save(INTERFACE_DICTIONARY_VALUES_KEY, { ...store, [caseId]: [...kept, ...fresh] });
      log(fieldsAppliedAudit(p.name, live.version, fresh.length, caseId, d.actor().name));
      return ok({ applied: fresh.length, problems: apply.problems + apply.missingRequired });
    },

    /** The vendor fields on a case, newest first. Read-only; shown with the case. */
    async getCaseFields(caseId: string): Promise<ServiceResult<ExtensionValue[]>> {
      return ok([...(values()[caseId] ?? [])].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || a.label.localeCompare(b.label)));
    },
  };
}

export type InterfaceDictionaryService = ReturnType<typeof createInterfaceDictionaryService>;
