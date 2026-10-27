// src/services/consultAccess/consultIdentityMask.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (access-11): the decision about how much of the patient an outside
// consultant sees, kept pure so the browser mock and the API server apply the
// same rule (docs/architecture/CONSULT_ACCESS_API.md, CA-25).
//
// Minimise PHI by default. A consult link shows a MASKED identity: the first
// letter of each name with the rest replaced by asterisks ("J*** S****") and
// the date of birth as the year alone ("**-***-1980"). The consultant needs the
// specimens and slides to give an opinion, not who the patient is. The
// person issuing the link can opt in to the full name and date of birth, at
// issue time only (capability case:consult-link:reveal-identity), and the
// opt-in is audited.
//
// Batch 669: the date of birth is always written DD-MMM-YYYY (24-OCT-1980), see
// formatConsultDateOfBirth.
//
// The decision is made HERE, before the data reaches the page: the masked
// projection is built from the patient record and carries no part of the
// surname or the date beyond the year, so a masked page cannot leak them by
// any means (view source, a screen reader, the network tab). Hiding with CSS
// would not do that and is not used.
// ─────────────────────────────────────────────────────────────────────────────

/** The part of a patient record the projection reads. */
export interface ConsultPatientSource {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
}

/** What the consultant's page receives. `identity` says which projection it is. */
export type ConsultPatientView =
  | { identity: 'masked'; maskedName: string; birthYearMasked?: string }
  | { identity: 'full'; lastName: string; firstName: string; dateOfBirth?: string };

/** "John" → "J***". Each word of a name keeps its first letter; a hyphen or apostrophe inside a word is masked with the rest. */
export function maskNamePart(name: string | undefined): string {
  return (name ?? '').trim().split(/\s+/).filter(Boolean)
    .map(word => { const [first, ...rest] = Array.from(word); return first + '*'.repeat(rest.length); })
    .join(' ');
}

/** The year of a date of birth written year-first (1980-01-31) or year-last (31/01/1980), or null. */
export function birthYearOf(dateOfBirth: string | undefined): string | null {
  return /(?:^|\D)(\d{4})(?:\D|$)/.exec(dateOfBirth ?? '')?.[1] ?? null;
}

// The day and month masked, the year kept, in the same fixed style as the revealed date: **-***-1980.
export function maskDateOfBirth(dateOfBirth: string | undefined): string | undefined {
  const year = birthYearOf(dateOfBirth);
  return year ? `**-***-${year}` : undefined;
}

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * The date of birth in the FIXED form DD-MMM-YYYY with an English three-letter month in capitals
 * (24-OCT-1980), in every language and locale. This is the ONE deliberate exception to "format dates
 * with the user's locale" (CLAUDE.md): laboratory dates must not be ambiguous (03/04/1980 is March in
 * one country and April in another), and the consultant may be in any country.
 * Reads the calendar date as written (year-month-day, a time part ignored); it is not converted through
 * a time zone. A date that is not written year-first is shown as it was stored, never guessed.
 */
export function formatConsultDateOfBirth(dateOfBirth: string | undefined): string | undefined {
  if (!dateOfBirth) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(dateOfBirth.trim());
  const month = m ? MONTHS_EN[Number(m[2]) - 1] : undefined;
  return m && month ? `${m[3]}-${month}-${m[1]}` : dateOfBirth;
}

/**
 * The patient as the consultant may see them. Masked unless the link was issued
 * with the identity opt-in. The masked result is built from scratch: it never
 * holds the surname, the full first name or the full date.
 */
export function consultPatientView(patient: ConsultPatientSource | undefined, revealIdentity: boolean | undefined): ConsultPatientView {
  if (revealIdentity === true) {
    return {
      identity: 'full',
      lastName: patient?.lastName ?? '',
      firstName: patient?.firstName ?? '',
      ...(patient?.dateOfBirth ? { dateOfBirth: formatConsultDateOfBirth(patient.dateOfBirth) as string } : {}),
    };
  }
  const dob = maskDateOfBirth(patient?.dateOfBirth);
  return {
    identity: 'masked',
    maskedName: [maskNamePart(patient?.firstName), maskNamePart(patient?.lastName)].filter(Boolean).join(' '),
    ...(dob ? { birthYearMasked: dob } : {}),
  };
}
