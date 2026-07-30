// src/services/caseRegistry/mockCaseRegistryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Active implementation of ICaseRegistryService — same relationship to
// caseRegistryService.ts (Firestore) as mockCaseService.ts has to
// FirestoreCaseService.ts: this is what the running app actually uses
// today; the Firestore version is the pending-cutover target.
//
// Seeded with a CaseMaskConfig for every real organisation in
// organisationService.ts, using each org's real shortName as {PREFIX} and
// real site shortNames (MRI, WYT, NMGH for MFT) in sitePrefixMap — not
// placeholder data. Mask pattern mirrors today's O26-NNNN shape exactly
// (2-digit year, 4-digit sequence) so switching this on doesn't change
// what numbers currently-active organisations see, just where the prefix
// comes from.
//
// Category-driven series (added alongside SpecimenCategory wiring):
// an organisation's base CaseMaskConfig still owns the mask PATTERN
// (year format, sequence digit width, annual reset behavior) — those
// structural properties don't vary by case type. What varies per
// category is the PREFIX and the SEQUENCE COUNTER itself: Surgical (S),
// Non-GYN Cytology (NG), and Consultation (CS) cases at one organisation
// each draw from their own independent, non-colliding series rather than
// all incrementing one shared org-level counter. See
// CaseNumberCategoryOverride in ICaseRegistryService.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { ICaseRegistryService, CaseNumberCategoryOverride } from './ICaseRegistryService';
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import {
  CaseMaskConfig, DEFAULT_FALLBACK_MASK, DEFAULT_FALLBACK_PREFIX, DEFAULT_FALLBACK_SEQUENCE_DIGITS,
} from '@/types/config/CaseMaskConfig';

const STORAGE_KEY = 'ps_case_registries_v1';
const SERIES_STORAGE_KEY = 'ps_case_number_series_v1';

const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

const nowIso = () => new Date().toISOString();

// ─── Seed data — real organisations, real site shortNames ─────────────────
const SEED: Record<string, CaseMaskConfig> = {
  'ORG-DVMC': {
    organisationId: 'ORG-DVMC', prefix: 'DVMC',
    maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
    currentSequence: 0, resetSequenceAnnually: true, lastResetYear: 2026,
    updatedBy: 'system', updatedAt: nowIso(),
  },
  'ORG-MFT': {
    organisationId: 'ORG-MFT', prefix: 'MFT',
    // No sitePrefixMap — MFT runs a unified Trust-wide sequence across
    // all three sites (MRI/WYT/NMGH) rather than fragmenting into
    // per-site prefixes/counters. originSiteId is still captured at
    // accessioning and still drives Mode A hardware routing and
    // cassette/slide label sub-headers — it just doesn't fork the
    // master accession sequence itself. sitePrefixMap remains a real,
    // supported feature for any organisation that DOES want per-site
    // prefixes (see the test suite) — this is a config choice specific
    // to MFT, not a capability that was removed.
    maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
    currentSequence: 0, resetSequenceAnnually: true, lastResetYear: 2026,
    updatedBy: 'system', updatedAt: nowIso(),
  },
  'ORG-MPA': {
    organisationId: 'ORG-MPA', prefix: 'MPA',
    maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
    currentSequence: 0, resetSequenceAnnually: true, lastResetYear: 2026,
    updatedBy: 'system', updatedAt: nowIso(),
  },
  'ORG-HFHS': {
    organisationId: 'ORG-HFHS', prefix: 'HFHS',
    maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
    currentSequence: 0, resetSequenceAnnually: true, lastResetYear: 2026,
    updatedBy: 'system', updatedAt: nowIso(),
  },
};

function load(): Record<string, CaseMaskConfig> {
  return storageGet<Record<string, CaseMaskConfig>>(STORAGE_KEY, SEED);
}
function persist(registries: Record<string, CaseMaskConfig>): void {
  storageSet(STORAGE_KEY, registries);
}

// ─── Per-series sequence counters ──────────────────────────────────────────
// Separate from the org-level CaseMaskConfig on purpose: a category's
// numberSeries counter needs its own currentSequence/lastResetYear
// tracking independent of the org's own default counter, but shouldn't
// duplicate the org's maskPattern/sequenceDigits/resetSequenceAnnually —
// those are read from the org's (or fallback's) config and just applied
// to whichever counter is actually being incremented.
interface SeriesCounter { currentSequence: number; lastResetYear?: number }

function loadSeriesCounters(): Record<string, SeriesCounter> {
  return storageGet<Record<string, SeriesCounter>>(SERIES_STORAGE_KEY, {});
}
function persistSeriesCounters(counters: Record<string, SeriesCounter>): void {
  storageSet(SERIES_STORAGE_KEY, counters);
}

/** Renders a mask pattern given a resolved prefix and sequence number.
 *  No {SPECIMEN_TYPE} token — deliberately dropped per the case-vs-
 *  specimen-level numbering decision (see CaseMaskConfig.ts's header
 *  comment). {SEQ:N} is the only parameterized token; N is read from
 *  sequenceDigits rather than re-parsed out of the pattern string itself. */
function renderMask(pattern: string, prefix: string, seq: number, sequenceDigits: number): string {
  const now = new Date();
  const year4 = String(now.getFullYear());
  const year2 = year4.slice(-2);

  return pattern
    .split('{PREFIX}').join(prefix)
    .split('{SITE}').join(prefix) // if {SITE} is used without a resolved site prefix, falls back to {PREFIX}'s value rather than leaving a literal token in the output
    .split('{YEAR:4}').join(year4)
    .split('{YEAR:2}').join(year2)
    .replace(/\{SEQ:(\d+)\}/, (_m, digits) => String(seq).padStart(Number(digits) || sequenceDigits, '0'));
}

/** Resolves which prefix string actually feeds {SITE}/{PREFIX} in the
 *  mask, in precedence order: an explicit categoryOverride.prefix wins
 *  first (case-type is the more fundamental clinical distinction), then
 *  the org's sitePrefixMap if a siteId was given and is present in it,
 *  otherwise the org's base prefix. An unmapped site never hard-fails —
 *  it just behaves like {SITE} wasn't used. */
function resolvePrefix(config: Pick<CaseMaskConfig, 'prefix' | 'sitePrefixMap'>, siteId: string | undefined, categoryOverride: CaseNumberCategoryOverride | undefined): string {
  if (categoryOverride?.prefix) return categoryOverride.prefix;
  if (siteId && config.sitePrefixMap?.[siteId]) return config.sitePrefixMap[siteId];
  return config.prefix;
}

function needsAnnualReset(counter: { resetSequenceAnnually: boolean; lastResetYear?: number }): boolean {
  const currentYear = new Date().getFullYear();
  return counter.resetSequenceAnnually && (!counter.lastResetYear || counter.lastResetYear < currentYear);
}

/** The actual counter key a given allocation draws from — organisationId
 *  alone for the org's default series, or a composite key when a
 *  category has its own numberSeries. Two different organisations' same-
 *  named series (unlikely, but possible with future custom series names)
 *  still can't collide, since organisationId is always part of the key. */
function seriesKeyFor(organisationId: string, categoryOverride: CaseNumberCategoryOverride | undefined): string {
  return categoryOverride?.numberSeries ? `${organisationId}::${categoryOverride.numberSeries}` : organisationId;
}

export const mockCaseRegistryService: ICaseRegistryService = {
  async getConfig(organisationId) {
    const registries = load();
    return ok(registries[organisationId] ?? null);
  },

  async saveConfig(config) {
    const registries = load();
    registries[config.organisationId] = { ...config, updatedAt: nowIso() };
    persist(registries);
    return ok(registries[config.organisationId]);
  },

  async allocateNextCaseNumber(organisationId, siteId, categoryOverride) {
    const registries = load();
    const config = registries[organisationId];

    // Structural mask properties (pattern, digit width, reset behavior)
    // come from the org's base config when one exists, otherwise the
    // default fallback scheme — a category override never invents its
    // own pattern, only its own prefix/series.
    const maskPattern     = config?.maskPattern     ?? DEFAULT_FALLBACK_MASK;
    const sequenceDigits  = config?.sequenceDigits  ?? DEFAULT_FALLBACK_SEQUENCE_DIGITS;
    const resetAnnually   = config?.resetSequenceAnnually ?? true;

    if (!config) {
      console.info(
        `[caseRegistry] No CaseMaskConfig for organisation "${organisationId}" — using default fallback scheme (${DEFAULT_FALLBACK_MASK}).`
      );
    }

    const seriesKey = seriesKeyFor(organisationId, categoryOverride);
    const counters = loadSeriesCounters();
    const existing = counters[seriesKey] ?? { currentSequence: config?.currentSequence ?? 0, lastResetYear: config?.lastResetYear };
    const nextSeq = needsAnnualReset({ resetSequenceAnnually: resetAnnually, lastResetYear: existing.lastResetYear })
      ? 1 : existing.currentSequence + 1;

    counters[seriesKey] = { currentSequence: nextSeq, lastResetYear: new Date().getFullYear() };
    persistSeriesCounters(counters);

    // Keep the org's own default config's counter in sync too, ONLY when
    // this allocation was actually drawing from that same default series
    // (no categoryOverride, or a categoryOverride with no distinct
    // numberSeries) — a category with its own series must never also
    // advance the org's shared counter, or the two would drift into
    // reporting inconsistent "next number" previews against each other.
    if (config && !categoryOverride?.numberSeries) {
      registries[organisationId] = { ...config, currentSequence: nextSeq, lastResetYear: new Date().getFullYear(), updatedAt: nowIso() };
      persist(registries);
    }

    const prefix = resolvePrefix(
      { prefix: config?.prefix ?? DEFAULT_FALLBACK_PREFIX, sitePrefixMap: config?.sitePrefixMap },
      siteId, categoryOverride,
    );
    return ok(renderMask(maskPattern, prefix, nextSeq, sequenceDigits));
  },

  async previewNextCaseNumber(organisationId, siteId, categoryOverride) {
    const registries = load();
    const config = registries[organisationId];

    const maskPattern    = config?.maskPattern    ?? DEFAULT_FALLBACK_MASK;
    const sequenceDigits = config?.sequenceDigits ?? DEFAULT_FALLBACK_SEQUENCE_DIGITS;
    const resetAnnually  = config?.resetSequenceAnnually ?? true;

    const seriesKey = seriesKeyFor(organisationId, categoryOverride);
    const counters = loadSeriesCounters();
    const existing = counters[seriesKey] ?? { currentSequence: config?.currentSequence ?? 0, lastResetYear: config?.lastResetYear };
    const nextSeq = needsAnnualReset({ resetSequenceAnnually: resetAnnually, lastResetYear: existing.lastResetYear })
      ? 1 : existing.currentSequence + 1;

    const prefix = resolvePrefix(
      { prefix: config?.prefix ?? DEFAULT_FALLBACK_PREFIX, sitePrefixMap: config?.sitePrefixMap },
      siteId, categoryOverride,
    );
    return ok(renderMask(maskPattern, prefix, nextSeq, sequenceDigits));
  },
};
