// src/services/interfaceDictionary/profileLifecycle.ts
// ─────────────────────────────────────────────────
// Batch 612: the life of a vendor profile. Pure; the service keeps the profiles.
//
//   draft ──test passes──▶ tested ──publish──▶ published ──newer publish──▶ superseded
//     ▲                       │                    │
//     └── any edit to the ────┘                    ├── rollback: the latest earlier version is copied as a NEW
//         mappings (the test                       │   published version (history only grows; nothing is edited)
//         no longer matches)                       └── retire: the profile stops applying
//
// One working copy (draft or tested) per vendor at a time. A publish needs a
// passing test of exactly these mappings, no definition problems, and no target
// outside the extension namespace (mappingEngine.ts, scopeGuard.ts).
// ─────────────────────────────────────────────────
import type {
  FieldMapping, InterfaceDictionaryRefusal, ProfileTestResult, ProfileVersion, VendorMessageFormat, VendorProfile,
} from './interfaceDictionaryTypes';
import { VENDOR_MESSAGE_FORMATS } from './interfaceDictionaryTypes';
import { contentHash, validateMappings } from './mappingEngine';
import type { VendorMessage } from './messagePath';

const HL7_MESSAGE_TYPE = /^[A-Z]{3}(\^[A-Z0-9]{3})?$/;
const FHIR_RESOURCE_TYPE = /^[A-Z][A-Za-z]+$/;

/** Whether a message type suits the format (pure). JSON takes any text. */
export function messageTypeValid(format: VendorMessageFormat, messageType: string): boolean {
  const t = messageType.trim();
  if (format === 'hl7v2') return HL7_MESSAGE_TYPE.test(t);
  if (format === 'fhir') return FHIR_RESOURCE_TYPE.test(t);
  return true;
}

/** Whether a received message is of the type the profile is for (pure). HL7: MSH-9; FHIR: resourceType; JSON: any. */
export function messageTypeMatches(p: Pick<VendorProfile, 'format' | 'messageType'>, message: VendorMessage): boolean {
  if (message.format === 'hl7v2') {
    const msh9 = (message.hl7.getSegment('MSH')?.fields[9] ?? '').trim();
    const want = p.messageType.trim();
    return want.includes('^') ? msh9.split('^').slice(0, 2).join('^') === want : msh9.split('^')[0] === want;
  }
  if (message.format === 'fhir') return message.root.resourceType === p.messageType.trim();
  return true;
}

export function workingVersion(p: VendorProfile): ProfileVersion | undefined {
  return p.versions.find(v => v.status === 'draft' || v.status === 'tested');
}
export function publishedVersion(p: VendorProfile): ProfileVersion | undefined {
  return p.versions.find(v => v.status === 'published');
}
const nextNumber = (p: VendorProfile) => p.versions.reduce((n, v) => Math.max(n, v.version), 0) + 1;

function replaceVersion(p: VendorProfile, version: number, change: (v: ProfileVersion) => ProfileVersion): VendorProfile {
  return { ...p, versions: p.versions.map(v => (v.version === version ? change(v) : v)) };
}

export interface NewProfileInput { id: string; name: string; format: string; messageType: string; by: string; at: string }

/** A new vendor profile with an empty first draft, or why not (pure). */
export function createProfile(input: NewProfileInput, existing: readonly VendorProfile[]): VendorProfile | InterfaceDictionaryRefusal {
  const name = input.name.trim();
  if (!name) return 'NAME_REQUIRED';
  if (existing.some(p => p.name.trim().toLowerCase() === name.toLowerCase())) return 'DUPLICATE_NAME';
  if (!(VENDOR_MESSAGE_FORMATS as readonly string[]).includes(input.format)) return 'BAD_MESSAGE_TYPE';
  const format = input.format as VendorMessageFormat;
  if (!messageTypeValid(format, input.messageType) || (format !== 'json' && !input.messageType.trim())) return 'BAD_MESSAGE_TYPE';
  return {
    id: input.id, name, format, messageType: input.messageType.trim(), createdAt: input.at, createdBy: input.by,
    versions: [{ version: 1, status: 'draft', mappings: [], createdAt: input.at, createdBy: input.by }],
  };
}

/** Opens a new working copy from the live version (or the latest one) (pure). */
export function startDraft(p: VendorProfile, by: string, at: string): VendorProfile | InterfaceDictionaryRefusal {
  if (workingVersion(p)) return 'DRAFT_EXISTS';
  const source = publishedVersion(p) ?? [...p.versions].sort((a, b) => b.version - a.version)[0];
  const draft: ProfileVersion = {
    version: nextNumber(p), status: 'draft', mappings: (source?.mappings ?? []).map(m => ({ ...m, valueMap: m.valueMap ? { ...m.valueMap } : undefined })),
    createdAt: at, createdBy: by,
  };
  return { ...p, versions: [...p.versions, draft] };
}

/** Replaces the working copy's mappings; a changed set no longer matches its test (pure). */
export function withMappings(p: VendorProfile, mappings: readonly FieldMapping[]): VendorProfile | InterfaceDictionaryRefusal {
  const w = workingVersion(p);
  if (!w) return 'NOT_A_DRAFT';
  const next = [...mappings];
  const stillTested = w.test?.passed && w.test.contentHash === contentHash(next);
  return replaceVersion(p, w.version, v => ({ ...v, mappings: next, status: stillTested ? 'tested' : 'draft' }));
}

/** Records a test run on the working copy; a pass of exactly these mappings makes it tested (pure). */
export function withTestResult(p: VendorProfile, result: ProfileTestResult): VendorProfile | InterfaceDictionaryRefusal {
  const w = workingVersion(p);
  if (!w) return 'NOT_A_DRAFT';
  const matches = result.contentHash === contentHash(w.mappings);
  return replaceVersion(p, w.version, v => ({ ...v, test: result, status: result.passed && matches ? 'tested' : 'draft' }));
}

/** Why the working copy cannot be published yet, or null (pure). */
export function publishRefusal(p: VendorProfile): InterfaceDictionaryRefusal | null {
  const w = workingVersion(p);
  if (!w) return 'NOT_A_DRAFT';
  if (w.mappings.length === 0) return 'NO_MAPPINGS';
  if (validateMappings(p.format, w.mappings).length) return 'MAPPING_PROBLEM';
  if (!w.test || !w.test.passed) return 'NOT_TESTED';
  if (w.test.contentHash !== contentHash(w.mappings)) return 'TEST_STALE';
  return null;
}

/** Publishes the working copy; the live version becomes superseded (pure). */
export function withPublished(p: VendorProfile, by: string, at: string): VendorProfile | InterfaceDictionaryRefusal {
  const refusal = publishRefusal(p);
  if (refusal) return refusal;
  const w = workingVersion(p) as ProfileVersion;
  const live = publishedVersion(p);
  return {
    ...p,
    versions: p.versions.map(v => {
      if (live && v.version === live.version) return { ...v, status: 'superseded' as const, supersededAt: at };
      if (v.version === w.version) return { ...v, status: 'published' as const, publishedAt: at, publishedBy: by };
      return v;
    }),
  };
}

/** The version a rollback would restore: the latest earlier version that was live and not itself rolled away from (pure). */
export function rollbackTarget(p: VendorProfile): ProfileVersion | undefined {
  const live = publishedVersion(p);
  if (!live) return undefined;
  return [...p.versions].filter(v => v.status === 'superseded' && !v.rolledBackAt && v.version < live.version && !!v.publishedAt)
    .sort((a, b) => b.version - a.version)[0];
}

/** Restores the previous version as a new published version; the faulty one is kept for the record (pure). */
export function withRollback(p: VendorProfile, by: string, at: string): VendorProfile | InterfaceDictionaryRefusal {
  const live = publishedVersion(p);
  if (!live) return 'NOT_PUBLISHED';
  const target = rollbackTarget(p);
  if (!target) return 'NOTHING_TO_ROLL_BACK_TO';
  const restored: ProfileVersion = {
    version: nextNumber(p), status: 'published', mappings: target.mappings.map(m => ({ ...m, valueMap: m.valueMap ? { ...m.valueMap } : undefined })),
    createdAt: at, createdBy: by, test: target.test, publishedAt: at, publishedBy: by, rolledBackFrom: target.version,
  };
  return {
    ...p,
    versions: [...p.versions.map(v => (v.version === live.version ? { ...v, status: 'superseded' as const, supersededAt: at, rolledBackAt: at } : v)), restored],
  };
}

/** Switches the live version off (pure). */
export function withRetired(p: VendorProfile, by: string, at: string): VendorProfile | InterfaceDictionaryRefusal {
  const live = publishedVersion(p);
  if (!live) return 'NOT_PUBLISHED';
  return replaceVersion(p, live.version, v => ({ ...v, status: 'retired', retiredAt: at, retiredBy: by }));
}

/** A new empty mapping row with the next free id (pure). */
export function blankMapping(existing: readonly FieldMapping[]): FieldMapping {
  const used = existing.map(m => Number(/^m(\d+)$/.exec(m.id)?.[1] ?? 0));
  return { id: `m${Math.max(0, ...used) + 1}`, sourcePath: '', target: 'ext.', label: '', dataType: 'text', transform: 'none' };
}
