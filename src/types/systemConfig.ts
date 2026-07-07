/**
 * src/types/systemConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure type definitions and default values for PathScribe system configuration.
 * No React, no side effects — safe to import anywhere.
 *
 * Single source of truth for:
 *   - The SystemConfig shape (what fields exist and their types)
 *   - DEFAULT_SYSTEM_CONFIG (safe baseline for first run / new fields)
 *
 * Runtime layer (loading, persisting, React context):
 *   → contexts/SystemConfigContext.tsx
 *
 * ─── Changelog ───────────────────────────────────────────────────────────────
 * v1  Initial — LIS integration flags, approved fonts
 * v2  Added jurisdiction, terminologyConfig
 * v3  Added voiceEnabled master switch
 * v4  Added GB_NIR, AU, NZ jurisdictions
 *     Added JurisdictionLocale, PatientIdStandard lookup tables
 *     Added IdentifierFormat / IdentifierFormats expansion (slide + barcode)
 *     Added IDENTIFIER_FORMAT_LIBRARY and helpers
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. JURISDICTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The institution's operating jurisdiction.
 * Determines SNOMED CT release, ICD-10 variant, locale, date/time format,
 * patient identifier standards, and license requirements.
 * Set once at deployment — never changed by end users.
 *
 * Licensing notes:
 *   US      — SNOMED CT US Edition (NLM) + ICD-10-CM. UMLS registration (free).
 *   CA      — SNOMED CT Canada Edition (Infoway) + ICD-10-CA (CIHI). Both free.
 *   GB_EW   — SNOMED CT UK Edition (NHS Digital/TRUD) + ICD-10 WHO. TRUD (free).
 *   GB_SCT  — SNOMED CT UK Edition + Scottish Extension (NHS Scotland/TRUD).
 *   GB_NIR  — SNOMED CT UK Edition (NHS Digital/TRUD) + ICD-10 WHO.
 *             H&C Number is the patient identifier (not NHS Number).
 *   IE      — SNOMED CT (SNOMED International Affiliate License, commercial fee)
 *             + ICD-10-AM (HSE Ireland/NCPOH). Affiliate License required before
 *             seeding production. Mock mode works without it during development.
 *   AU      — SNOMED CT Australian Edition (NCTS/AIHW) + ICD-10-AM (AIHW).
 *             NCTS registration (free). IHI is the patient identifier.
 *   NZ      — SNOMED CT New Zealand Edition (NCTS) + ICD-10-AM-NZ (MOH NZ).
 *             NHI is the patient identifier.
 */
export type Jurisdiction =
  | 'US'
  | 'CA'
  | 'GB_EW'
  | 'GB_SCT'
  | 'GB_NIR'
  | 'IE'
  | 'AU'
  | 'NZ';

/** Human-readable label for each jurisdiction. Used in the admin UI. */
export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  US:     'United States',
  CA:     'Canada',
  GB_EW:  'England & Wales (NHS)',
  GB_SCT: 'Scotland (NHS Scotland)',
  GB_NIR: 'Northern Ireland (HSC)',
  IE:     'Republic of Ireland (HSE)',
  AU:     'Australia',
  NZ:     'New Zealand',
};

/** ICD-10 variant for a given jurisdiction. */
export const icd10VariantForJurisdiction = (j: Jurisdiction): string => ({
  US:     'ICD-10-CM',
  CA:     'ICD-10-CA',
  GB_EW:  'ICD-10 (WHO)',
  GB_SCT: 'ICD-10 (WHO)',
  GB_NIR: 'ICD-10 (WHO)',
  IE:     'ICD-10-AM',
  AU:     'ICD-10-AM',
  NZ:     'ICD-10-AM-NZ',
}[j]);

/** SNOMED CT release name for a given jurisdiction. */
export const snomedReleaseForJurisdiction = (j: Jurisdiction): string => ({
  US:     'SNOMED CT US Edition (NLM)',
  CA:     'SNOMED CT Canada Edition (Infoway)',
  GB_EW:  'SNOMED CT UK Edition (NHS Digital)',
  GB_SCT: 'SNOMED CT UK Edition + Scottish Extension (NHS Scotland)',
  GB_NIR: 'SNOMED CT UK Edition (NHS Digital)',
  IE:     'SNOMED CT (SNOMED International Affiliate License)',
  AU:     'SNOMED CT Australian Edition (NCTS)',
  NZ:     'SNOMED CT New Zealand Edition (NCTS)',
}[j]);

/** True if a manually obtained license is required before seeding production. */
export const requiresManualLicense = (j: Jurisdiction): boolean => j === 'IE';

// ── Locale & display format ───────────────────────────────────────────────────

export interface JurisdictionLocale {
  /** BCP-47 locale tag passed to Intl / toLocaleDateString */
  locale:     string;
  /** Display format string — for documentation / UI hint only */
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY';
  /** 12-hour or 24-hour clock */
  timeFormat: '12h' | '24h';
  /** Spell-check lang attribute for browser spell checking */
  spellLang:  string;
}

export const JURISDICTION_LOCALE: Record<Jurisdiction, JurisdictionLocale> = {
  US:     { locale: 'en-US', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', spellLang: 'en-US' },
  CA:     { locale: 'en-CA', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', spellLang: 'en-CA' },
  GB_EW:  { locale: 'en-GB', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', spellLang: 'en-GB' },
  GB_SCT: { locale: 'en-GB', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', spellLang: 'en-GB' },
  GB_NIR: { locale: 'en-GB', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', spellLang: 'en-GB' },
  IE:     { locale: 'en-IE', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', spellLang: 'en-IE' },
  AU:     { locale: 'en-AU', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', spellLang: 'en-AU' },
  NZ:     { locale: 'en-NZ', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', spellLang: 'en-NZ' },
};

// ── Patient identifier standards ──────────────────────────────────────────────

export interface PatientIdStandard {
  label:     string;
  pattern:   string;
  format:    string;
  example:   string;
  luhnCheck: boolean;
}

export const PATIENT_ID_BY_JURISDICTION: Record<Jurisdiction, PatientIdStandard> = {
  US:     { label: 'MRN',                pattern: '^\\d{5,10}$',                          format: '5–10 digits',                       example: '1234567',        luhnCheck: false },
  CA:     { label: 'Health Card Number', pattern: '^[0-9A-Z]{9,12}$',                     format: '9–12 alphanumeric (varies by province)', example: '1234567890',  luhnCheck: false },
  GB_EW:  { label: 'NHS Number',         pattern: '^\\d{3}[\\s-]?\\d{3}[\\s-]?\\d{4}$', format: '999 999 9999',                       example: '943 476 5919',   luhnCheck: true  },
  GB_SCT: { label: 'CHI Number',         pattern: '^\\d{10}$',                            format: 'DDMMYY9999 (10 digits)',             example: '1401740054',     luhnCheck: false },
  GB_NIR: { label: 'H&C Number',         pattern: '^[A-Z]{2}\\d{5,7}$',                  format: 'AA99999 – AA9999999',                example: 'AB123456',       luhnCheck: false },
  IE:     { label: 'PPS Number',         pattern: '^\\d{7}[A-Z]{1,2}$',                  format: '9999999A or 9999999AA',              example: '1234567T',       luhnCheck: false },
  AU:     { label: 'IHI Number',         pattern: '^800360\\d{10}$',                      format: '800360 + 10 digits (16 total)',      example: '8003601234567890',luhnCheck: true  },
  NZ:     { label: 'NHI Number',         pattern: '^[A-Z]{3}\\d{4}$|^[A-Z]{3}\\d{2}[A-Z]{2}$', format: 'AAA9999 or AAA99AA',         example: 'ZZZ0016',        luhnCheck: true  },
};


// ─────────────────────────────────────────────────────────────────────────────
// 2. TERMINOLOGY
// ─────────────────────────────────────────────────────────────────────────────

export type TerminologyMode = 'mock' | 'hosted' | 'live_api';

export interface TerminologySystemConfig {
  active:   boolean;
  mode:     TerminologyMode;
  version?: string;
}

export interface InstitutionTerminologyConfig {
  snomed: TerminologySystemConfig;
  icd10:  TerminologySystemConfig;
  icd11:  TerminologySystemConfig;
  icdo:   TerminologySystemConfig;
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. IDENTIFIER FORMATS
// ─────────────────────────────────────────────────────────────────────────────

export type IdentifierKind =
  | 'accession'
  | 'mrn'
  | 'slide'
  | 'requisition'
  | 'block'
  | 'external_ref';

export type BarcodeType =
  | '1d_code128'
  | '1d_code39'
  | '2d_datamatrix'
  | '2d_qr'
  | '2d_pdf417';

export type LisPreset =
  | 'generic'
  | 'copath'
  | 'epic_beaker'
  | 'sunquest'
  | 'cerner_pathnet'
  | 'meditech'
  | 'custom';

/** A single identifier format — system-defined, not editable by admins. */
export interface IdentifierFormat {
  id:                    string;
  kind:                  IdentifierKind;
  label:                 string;
  description:           string;
  pattern:               string;
  barcodeTypes:          BarcodeType[];
  payload2DSchema?:      string;
  /** 1 = smart identifier box + direct navigation. 2 = internal mapping only. */
  tier:                  1 | 2;
  /** When kind=slide and tier=1, navigate directly to synoptic on match. */
  navigateToCaseOnMatch: boolean;
  jurisdictions:         Jurisdiction[];
  lisPresets:            LisPreset[];
  enabled:               boolean;
  example:               string;
}

/**
 * Expanded identifier formats.
 * Legacy accessionPattern / mrnPattern fields are kept for backward compat
 * with SearchPage — derived automatically from the enabled formats list.
 */
export interface IdentifierFormats {
  formats:          IdentifierFormat[];
  accessionPattern: string;
  accessionExample: string;
  mrnPattern:       string;
  mrnExample:       string;
}

// ── Format library ────────────────────────────────────────────────────────────

export const IDENTIFIER_FORMAT_LIBRARY: IdentifierFormat[] = [

  // Accession numbers
  { id: 'accession_generic_us',     kind: 'accession',   label: 'Accession Number',                      description: 'US AP accession: uppercase letter + 2-digit year + hyphen + 4–6 digit sequence (e.g. S26-4200).',                                                          pattern: '^[A-Z]\\d{2}-\\d{4,6}$',                             barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['US'],                           lisPresets: ['generic','copath','sunquest'], enabled: true,  example: 'S26-4200'        },
  { id: 'accession_generic_uk',     kind: 'accession',   label: 'Accession Number',                      description: 'UK/IE AP accession: 1–2 uppercase letters + 2-digit year + hyphen + 4–6 digit sequence (e.g. SP26-4200).',                                               pattern: '^[A-Z]{1,2}\\d{2}-\\d{4,6}$',                        barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['GB_EW','GB_SCT','GB_NIR','IE'], lisPresets: ['generic'],                    enabled: true,  example: 'SP26-4200'       },
  { id: 'accession_generic_au_nz',  kind: 'accession',   label: 'Accession Number',                      description: 'AU/NZ AP accession: uppercase letters + year + hyphen + sequence.',                                                                                       pattern: '^[A-Z]{1,3}\\d{2}-\\d{4,6}$',                        barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['AU','NZ'],                      lisPresets: ['generic'],                    enabled: true,  example: 'PA26-4200'       },
  { id: 'accession_epic_beaker',    kind: 'accession',   label: 'Accession Number (Epic Beaker)',         description: 'Epic Beaker accession: 2–4 letter department code + 8–12 digit sequence.',                                                                                pattern: '^[A-Z]{2,4}\\d{8,12}$',                               barcodeTypes: ['1d_code128','2d_datamatrix'],     tier: 1, navigateToCaseOnMatch: false, jurisdictions: [],                               lisPresets: ['epic_beaker'],                enabled: false, example: 'SP202600004200'  },

  // Patient identifiers
  { id: 'mrn_us',                   kind: 'mrn',         label: 'MRN',                                   description: 'US Medical Record Number: 5–10 digits.',                                                                                                                  pattern: '^\\d{5,10}$',                                         barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['US','CA'],                      lisPresets: [],                             enabled: true,  example: '1234567'         },
  { id: 'mrn_nhs',                  kind: 'mrn',         label: 'NHS Number',                            description: 'England & Wales NHS Number: 10 digits with Luhn check digit. Format: 999 999 9999.',                                                                     pattern: '^\\d{3}[\\s-]?\\d{3}[\\s-]?\\d{4}$',                 barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['GB_EW'],                        lisPresets: [],                             enabled: false, example: '943 476 5919'    },
  { id: 'mrn_chi',                  kind: 'mrn',         label: 'CHI Number',                            description: 'Scotland CHI: 10 digits (DDMMYY + 4 digits).',                                                                                                          pattern: '^\\d{10}$',                                           barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['GB_SCT'],                       lisPresets: [],                             enabled: false, example: '1401740054'      },
  { id: 'mrn_hc',                   kind: 'mrn',         label: 'H&C Number',                            description: 'Northern Ireland H&C Number: 2 letters + 5–7 digits.',                                                                                                   pattern: '^[A-Z]{2}\\d{5,7}$',                                  barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['GB_NIR'],                       lisPresets: [],                             enabled: false, example: 'AB123456'        },
  { id: 'mrn_ihi',                  kind: 'mrn',         label: 'IHI Number',                            description: 'Australia IHI: 16 digits starting with 800360.',                                                                                                         pattern: '^800360\\d{10}$',                                      barcodeTypes: ['1d_code128','2d_datamatrix'],     tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['AU'],                           lisPresets: [],                             enabled: false, example: '8003601234567890' },
  { id: 'mrn_nhi',                  kind: 'mrn',         label: 'NHI Number',                            description: 'New Zealand NHI: 3 letters + 4 digits (legacy) or 3 letters + 2 digits + 2 letters (new format).',                                                      pattern: '^[A-Z]{3}\\d{4}$|^[A-Z]{3}\\d{2}[A-Z]{2}$',          barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: ['NZ'],                           lisPresets: [],                             enabled: false, example: 'ZZZ0016'         },

  // Slide barcodes — navigate directly to synoptic
  { id: 'slide_generic_1d',         kind: 'slide',       label: 'Slide Barcode',                         description: 'Generic slide: accession + specimen letter + block number + optional sequence (e.g. S26-4200-A1-1). Scanning opens the case directly at the specimen tab.', pattern: '^[A-Z]\\d{2}-\\d{4,6}-[A-Z]\\d+(-\\d+)?$',           barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: true,  jurisdictions: [],                               lisPresets: ['generic'],                    enabled: false, example: 'S26-4200-A1-1'   },
  { id: 'slide_copath_1d',          kind: 'slide',       label: 'Slide Barcode (CoPath)',                 description: 'CoPath slide: accession-block-stain code. Scanning opens the case directly.',                                                                             pattern: '^[A-Z]\\d{2}-\\d{4,6}-[A-Z]\\d+-[A-Z0-9]+$',         barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: true,  jurisdictions: [],                               lisPresets: ['copath'],                     enabled: false, example: 'S26-4200-A1-HE'  },
  { id: 'slide_epic_2d',            kind: 'slide',       label: 'Slide Barcode (Epic Beaker 2D)',         description: '2D DataMatrix from Epic Beaker. Pipe-delimited payload: ACC|SPEC|BLOCK|STAIN|LAB.',                                                                        pattern: '^ACC:[^|]+\\|SPEC:[^|]+\\|BLOCK:[^|]+\\|STAIN:[^|]+',  barcodeTypes: ['2d_datamatrix'],                 tier: 1, navigateToCaseOnMatch: true,  jurisdictions: [],                               lisPresets: ['epic_beaker'],                enabled: false, example: 'ACC:SP26-4200|SPEC:A|BLOCK:A1|STAIN:HE|LAB:MFT', payload2DSchema: 'pipe|ACC|SPEC|BLOCK|STAIN|LAB' },
  { id: 'slide_gs1_2d',             kind: 'slide',       label: 'Slide Barcode (GS1 DataMatrix)',         description: 'GS1 Application Identifier DataMatrix. Parsed using GS1 AI (01) for GTIN and (21) for serial.',                                                          pattern: '\\(01\\)\\d{14}\\(21\\)',                               barcodeTypes: ['2d_datamatrix'],                 tier: 1, navigateToCaseOnMatch: true,  jurisdictions: [],                               lisPresets: [],                             enabled: false, example: '(01)09501101530003(21)S26-4200-A1', payload2DSchema: 'gs1_ai' },

  // Requisition
  { id: 'requisition_generic',      kind: 'requisition', label: 'Requisition Number',                    description: 'Lab requisition: R or REQ prefix + 6–10 digits.',                                                                                                         pattern: '^R(?:EQ)?\\d{6,10}$',                                  barcodeTypes: ['1d_code128'],                    tier: 1, navigateToCaseOnMatch: false, jurisdictions: [],                               lisPresets: [],                             enabled: false, example: 'REQ1234567'       },

  // Block (Tier 2 — internal mapping only)
  { id: 'block_generic',            kind: 'block',       label: 'Block / Cassette ID',                   description: 'Specimen letter + block number (e.g. A1). Used for Computational Sidecar result mapping and HL7 OBR matching.',                                          pattern: '^[A-Z]\\d{1,2}[a-z]?$',                               barcodeTypes: ['1d_code128'],                    tier: 2, navigateToCaseOnMatch: false, jurisdictions: [],                               lisPresets: [],                             enabled: true,  example: 'A1'              },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the format library with correct enabled flags for a jurisdiction. */
export function defaultFormatsForJurisdiction(j: Jurisdiction): IdentifierFormat[] {
  const accessionMap: Record<Jurisdiction, string> = {
    US: 'accession_generic_us', CA: 'accession_generic_us',
    GB_EW: 'accession_generic_uk', GB_SCT: 'accession_generic_uk',
    GB_NIR: 'accession_generic_uk', IE: 'accession_generic_uk',
    AU: 'accession_generic_au_nz', NZ: 'accession_generic_au_nz',
  };
  const mrnMap: Record<Jurisdiction, string> = {
    US: 'mrn_us', CA: 'mrn_us',
    GB_EW: 'mrn_nhs', GB_SCT: 'mrn_chi',
    GB_NIR: 'mrn_hc', IE: 'mrn_us',
    AU: 'mrn_ihi', NZ: 'mrn_nhi',
  };
  const enabledIds = new Set([accessionMap[j], mrnMap[j], 'block_generic']);
  return IDENTIFIER_FORMAT_LIBRARY.map(f => ({ ...f, enabled: enabledIds.has(f.id) }));
}

/** Derives legacy accessionPattern / mrnPattern from the enabled formats list. */
export function deriveLegacyFormats(formats: IdentifierFormat[]): {
  accessionPattern: string; accessionExample: string;
  mrnPattern: string;       mrnExample: string;
} {
  const acc = formats.find(f => f.kind === 'accession' && f.enabled);
  const mrn = formats.find(f => f.kind === 'mrn'       && f.enabled);
  return {
    accessionPattern: acc?.pattern ?? '^[A-Z]\\d{2}-\\d{4,6}$',
    accessionExample: acc?.example ?? 'S26-4200',
    mrnPattern:       mrn?.pattern ?? '^\\d{5,10}$',
    mrnExample:       mrn?.example ?? '1234567',
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. SYSTEM CONFIG — main shape
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemConfig {
  lisIntegrationEnabled:           boolean;
  lisEndpoint:                     string;
  lisOwnsStatuses:                 boolean;
  allowPathScribePostFinalActions: boolean;
  approvedFonts:                   string[];
  jurisdiction:                    Jurisdiction;
  identifierFormats:               IdentifierFormats;
  terminologyConfig:               InstitutionTerminologyConfig;
  voiceEnabled:                    boolean;
}


// ─────────────────────────────────────────────────────────────────────────────
// 5. DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

// Defaults enable US formats (defaultFormatsForJurisdiction only ever
// returns one jurisdiction's set) plus UK accession + NHS Number on top —
// this trial serves both US and UK clients simultaneously (see
// Client.jurisdiction, added earlier for the same reason on the date-
// formatting side), so identifier detection shouldn't default to
// US-only and require an admin to remember to enable UK formats before
// a UK scan will work. Admins can still toggle any of these off (or add
// Scotland/NI/AU/NZ) via the Identifier Formats config screen — this
// just changes what ships enabled out of the box.
const _defaultFormats = defaultFormatsForJurisdiction('US').map(f =>
  (f.id === 'accession_generic_uk' || f.id === 'mrn_nhs') ? { ...f, enabled: true } : f
);
const _defaultLegacy  = deriveLegacyFormats(_defaultFormats);

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  lisIntegrationEnabled:           false,
  lisEndpoint:                     '',
  lisOwnsStatuses:                 true,
  allowPathScribePostFinalActions: true,
  approvedFonts: ['Arial', 'Times New Roman', 'Courier New'],
  jurisdiction: 'US',
  identifierFormats: {
    formats: _defaultFormats,
    ..._defaultLegacy,
  },
  terminologyConfig: {
    snomed: { active: true,  mode: 'mock' },
    icd10:  { active: true,  mode: 'mock' },
    icd11:  { active: false, mode: 'mock' },
    icdo:   { active: true,  mode: 'mock' },
  },
  voiceEnabled: true,
};
