// src/services/interfaceDictionary/interfaceDictionaryTypes.ts
// ─────────────────────────────────────────────────
// Batch 612: the Interface Dictionary / Message Mapper. Types shared by the pure
// rules, the service and the screens.
//
// What it is: a vendor's own fields (an HL7 v2 Z-segment, a JSON or FHIR element)
// are described once, by ForMedrixAI staff, as a vendor profile. Each mapping says
// "this path in the vendor's message becomes this extension field on the case".
// A profile goes draft → tested → published, and a bad publish is rolled back to
// the version before. Extension fields are shown read-only in a "Vendor fields"
// panel on the case. Core structure (patient, order, specimen, diagnosis, report)
// is never reached by a mapping: that needs a code release (scopeGuard.ts).
// ─────────────────────────────────────────────────

/** The wire format a vendor profile reads. FHIR is JSON whose paths start at a resource type. */
export type VendorMessageFormat = 'hl7v2' | 'json' | 'fhir';
export const VENDOR_MESSAGE_FORMATS: readonly VendorMessageFormat[] = ['hl7v2', 'json', 'fhir'];

/** How a mapped value is shown and checked. */
export type MappingDataType = 'text' | 'number' | 'date' | 'dateTime' | 'code' | 'boolean';
export const MAPPING_DATA_TYPES: readonly MappingDataType[] = ['text', 'number', 'date', 'dateTime', 'code', 'boolean'];

/** What is done to the raw value before it is stored. */
export type MappingTransform = 'none' | 'trim' | 'upper' | 'lower' | 'hl7Date' | 'hl7DateTime';
export const MAPPING_TRANSFORMS: readonly MappingTransform[] = ['none', 'trim', 'upper', 'lower', 'hl7Date', 'hl7DateTime'];

/** One vendor element becoming one extension field. */
export interface FieldMapping {
  id: string;
  /** Where the value is in the vendor's message (see messagePath.ts for the syntax). */
  sourcePath: string;
  /** The extension field it becomes: `ext.<name>`. Anything else is refused by the scope guard. */
  target: string;
  /** What the Vendor fields panel calls it. Entered by staff and shown as written: not translated. */
  label: string;
  dataType: MappingDataType;
  transform: MappingTransform;
  /** Code translations applied after the transform (vendor value → shown value). */
  valueMap?: Record<string, string>;
  /** A message without this value fails the test. */
  required?: boolean;
  /** Used when the vendor's message has no value. */
  defaultValue?: string;
}

/** profile lifecycle. `superseded`: a newer version was published. `retired`: switched off by staff. */
export type ProfileStatus = 'draft' | 'tested' | 'published' | 'superseded' | 'retired';

/** The result of one test run. Holds counts only: a sample message may carry patient data, so it is never kept. */
export interface ProfileTestResult {
  at: string;
  by: string;
  passed: boolean;
  mapped: number;
  missingRequired: number;
  problems: number;
  /** Fingerprint of the mappings that were tested: any later edit makes the test stale. */
  contentHash: string;
}

export interface ProfileVersion {
  version: number;
  status: ProfileStatus;
  mappings: FieldMapping[];
  createdAt: string;
  createdBy: string;
  test?: ProfileTestResult;
  publishedAt?: string;
  publishedBy?: string;
  supersededAt?: string;
  retiredAt?: string;
  retiredBy?: string;
  /** Set on a version created by a rollback: the version whose mappings it copies. */
  rolledBackFrom?: number;
  /** Set on a version that a rollback replaced: it is never offered as a rollback target. */
  rolledBackAt?: string;
}

export interface VendorProfile {
  id: string;
  /** The vendor or device, as staff name it. Shown as written. */
  name: string;
  format: VendorMessageFormat;
  /** HL7: the message type it applies to (for example ORU^R01). FHIR: the resource type. JSON: free text. */
  messageType: string;
  createdAt: string;
  createdBy: string;
  versions: ProfileVersion[];
}

/** One extension value on a case. */
export interface ExtensionValue {
  vendorId: string;
  vendorName: string;
  profileVersion: number;
  target: string;
  label: string;
  dataType: MappingDataType;
  value: string;
  receivedAt: string;
  /** True in the demo: the message was pasted in by staff, not received from the vendor. */
  simulated: boolean;
}

export type ExtensionStore = Record<string, ExtensionValue[]>;

export type InterfaceDictionaryRefusal =
  | 'NOT_FOUND'
  | 'NAME_REQUIRED'
  | 'DUPLICATE_NAME'
  | 'BAD_MESSAGE_TYPE'
  | 'DRAFT_EXISTS'
  | 'NOT_A_DRAFT'
  | 'NO_MAPPINGS'
  | 'MAPPING_PROBLEM'
  | 'NOT_TESTED'
  | 'TEST_STALE'
  | 'NOTHING_TO_ROLL_BACK_TO'
  | 'NOT_PUBLISHED'
  | 'EMPTY_MESSAGE'
  | 'BAD_MESSAGE'
  | 'WRONG_MESSAGE_TYPE'
  | 'CASE_REQUIRED'
  | 'NO_PUBLISHED_VERSION';
