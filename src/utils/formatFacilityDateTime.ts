// src/utils/formatFacilityDateTime.ts
// Batch 669 (access-12): a date and time shown in the FACILITY's time zone (SystemConfig.facilityTimezone, an IANA name), with the
// zone's short name beside it, so a link that "expires at 5:00 PM" means the same moment to every reader wherever the device is.
// The reader's language still sets the wording and the 12/24-hour style. An unknown zone name falls back to the device's own zone.
export function formatFacilityDateTime(iso: string | undefined, locale: string | undefined, timeZone: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
  try {
    return new Intl.DateTimeFormat(locale, { ...options, ...(timeZone ? { timeZone } : {}) })
      .format(date) + ' ' + zoneName(date, locale, timeZone);
  } catch {
    return date.toLocaleString(locale);
  }
}

function zoneName(date: Date, locale: string | undefined, timeZone: string | undefined): string {
  const parts = new Intl.DateTimeFormat(locale, { ...(timeZone ? { timeZone } : {}), timeZoneName: 'short' }).formatToParts(date);
  return parts.find(p => p.type === 'timeZoneName')?.value ?? '';
}
