// src/services/patients/patientSexAtBirth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 662 (UK target). Sex at birth, shown in words instead of a bare letter,
// and mapped to the NHS Data Dictionary "person phenotypic sex" codes. The
// stored field stays Patient.sex ('M' | 'F' | 'U', plus 'I' for indeterminate),
// so templates written as `patient.sex == 'M'` keep working.
//   M → 1 Male, F → 2 Female, I → 9 Indeterminate, U → X Not known.
// Pure: no React, no storage.
// ─────────────────────────────────────────────────────────────────────────────

export type SexAtBirth = 'M' | 'F' | 'U' | 'I';

const LABEL_KEYS: Readonly<Record<SexAtBirth, string>> = {
  M: 'patientSex.male',
  F: 'patientSex.female',
  I: 'patientSex.indeterminate',
  U: 'patientSex.notKnown',
};

const NHS_CODES: Readonly<Record<SexAtBirth, string>> = { M: '1', F: '2', I: '9', U: 'X' };

/** Locale key for the full word, or null when no sex has been recorded (the screen shows a dash). */
export function sexAtBirthLabelKey(sex: string | undefined | null): string | null {
  return sex && sex in LABEL_KEYS ? LABEL_KEYS[sex as SexAtBirth] : null;
}

/** NHS phenotypic sex code, or null when none is recorded. */
export function nhsSexCode(sex: string | undefined | null): string | null {
  return sex && sex in NHS_CODES ? NHS_CODES[sex as SexAtBirth] : null;
}

const ENGLISH: Readonly<Record<SexAtBirth, string>> = { M: 'Male', F: 'Female', I: 'Indeterminate', U: 'Not known' };

/** The word printed on a report (reports are issued in English), or undefined when none is recorded. */
export function sexAtBirthEnglish(sex: string | undefined | null): string | undefined {
  return sex && sex in ENGLISH ? ENGLISH[sex as SexAtBirth] : undefined;
}

/** The word for a screen, or a dash when none is recorded. `t` is the caller's translate function. */
export function sexAtBirthText(sex: string | undefined | null, t: (key: string) => string): string {
  const key = sexAtBirthLabelKey(sex);
  return key ? t(key) : '—';
}
