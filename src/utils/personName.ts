// src/utils/personName.ts
// ─────────────────────────────────────────────────────────────
// Medical-grade name field model — Prefix / Given Name(s) / Family
// Name(s) / Preferred Name / Suffix — replacing rigid First/Middle/Last
// boxes that break for Spanish double surnames, Hungarian name order,
// patients with no middle name, Mc/Mac variants, etc.
//
// Used by Patient, Physician, and Facility contact name fields. Each of
// those types keeps `firstName`/`lastName` (or `contactName`) as
// backward-compatible derived fields — always mirroring givenNames/
// familyNames — so the ~15 existing consumers across Worklist, report
// rendering, letterheads etc. that haven't migrated yet keep working
// unchanged. New code should read/write givenNames/familyNames directly.
// ─────────────────────────────────────────────────────────────

import type { Patient } from '@/types/case/Patient';

export interface PersonNameValue {
  namePrefix?: string;
  givenNames: string;
  familyNames: string;
  preferredName?: string;
  nameSuffix?: string;
}

/** Common US/UK/EU generational suffixes for the dropdown. "Other…" in
 *  the UI reveals free text for anything not on this list (professional
 *  credentials, less common generational markers, etc.) — never a
 *  restriction, just a shortcut for the common case. */
export const SUFFIX_PRESETS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

/** True if a suffix value is empty or one of the preset options — i.e.
 *  the dropdown (not the free-text fallback) should be shown for it. */
export function isPresetSuffix(value?: string): boolean {
  return !value || SUFFIX_PRESETS.includes(value);
}

/**
 * Builds the display string used on wristbands/labels/report headers per
 * the medical-grade formatting rules: family name in caps, leads;
 * prefix/suffix dropped entirely (not clinically useful at the point of
 * identification, and wristbands have no room for them).
 */
export function formatIdentificationName(name: PersonNameValue): string {
  const family = name.familyNames.trim().toUpperCase();
  const given = name.givenNames.trim();
  return family && given ? `${family}, ${given}` : (family || given);
}

/** Ordinary display string — "Dr. Juan Carlos García López Jr." — for
 *  anywhere prefix/suffix should actually show (chart headers, staff
 *  directories), as opposed to the identification-only format above. */
export function formatFullDisplayName(name: PersonNameValue): string {
  return [name.namePrefix, name.givenNames, name.familyNames, name.nameSuffix]
    .map(p => p?.trim())
    .filter(Boolean)
    .join(' ');
}

/** Titles a Korean screen shows as 선생님 rather than 님 (stored values, any case, with or without the dot). */
const KOREAN_PROFESSIONAL_TITLES = new Set(['dr', 'prof']);
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;

/**
 * Batch 514 (Pete, Oct 10, 2026): the display name in the screen's language.
 *
 * Korean follows South Korean medical charting convention instead of a
 * Western title: the full name followed by 님 (김민준 님), or 선생님 for a
 * doctor or professor (김민준 선생님). Western titles (Mr., Mrs., Ms.) have no
 * natural Korean equivalent, and -씨 can sound hierarchical. A Korean name
 * (in Hangul) is written family name first with no space; any other name keeps
 * given-then-family order. The stored prefix is unchanged: it's data, and
 * English documents still print it.
 *
 * Every other language uses formatFullDisplayName ("Dr. Juan García López").
 */
export function formatDisplayNameForLanguage(name: PersonNameValue, language: string): string {
  if (!language.toLowerCase().startsWith('ko')) return formatFullDisplayName(name);
  const given = name.givenNames.trim();
  const family = name.familyNames.trim();
  const core = HANGUL.test(given + family)
    ? `${family}${given}`
    : [given, family].filter(Boolean).join(' ');
  const full = [core, name.nameSuffix?.trim()].filter(Boolean).join(' ');
  if (!full) return '';
  const prefix = (name.namePrefix ?? '').trim().replace(/\.$/, '').toLowerCase();
  return `${full} ${KOREAN_PROFESSIONAL_TITLES.has(prefix) ? '선생님' : '님'}`;
}

/**
 * Backward-compat bridge: given only legacy firstName/lastName (e.g. an
 * existing record created before this model existed), produces a
 * PersonNameValue with givenNames/familyNames populated from them. Used
 * when a form opens in "edit" mode against an old record — never loses
 * data, just maps it into the richer shape so the form has something to
 * show.
 */
export function fromLegacyName(firstName: string, lastName: string, opts?: { middleName?: string }): PersonNameValue {
  const given = opts?.middleName ? `${firstName} ${opts.middleName}`.trim() : firstName;
  return { givenNames: given, familyNames: lastName };
}

/**
 * Shared "which name fields does this patient actually have" resolver —
 * prefers the real givenNames/familyNames fields, falls back to the legacy
 * firstName/lastName bridge above, using the ordinary (not identification)
 * display format. File-by-file cleanup sweep: consolidates a duplicated
 * inline implementation that had been copy-pasted into both
 * CytologyQcQueuePage.tsx and SurgicalQaWorklistPage.tsx. Returns null for
 * a missing patient — never a fabricated placeholder; callers decide their
 * own fallback (e.g. the case id).
 */
export function resolvePatientFullDisplayName(patient: Patient | undefined | null, language?: string): string | null {
  const name = resolvePatientNameValue(patient);
  if (!name) return null;
  return language ? formatDisplayNameForLanguage(name, language) : formatFullDisplayName(name);
}

/** The patient's name fields (real givenNames/familyNames, else the legacy
 *  firstName/lastName bridge), for a screen to format in its own language.
 *  Null for a missing patient. (Batch 514) */
export function resolvePatientNameValue(patient: Patient | undefined | null): PersonNameValue | null {
  if (!patient) return null;
  if (patient.givenNames && patient.familyNames) {
    return { ...patient, givenNames: patient.givenNames, familyNames: patient.familyNames };
  }
  return fromLegacyName(patient.firstName, patient.lastName);
}
