// src/components/Config/System/cosdDestinationForm.ts
// Batch 620 (part C, PS-800): the UK cancer registry destination editor's draft and back. Pure, so it is tested without the screen.
import { DEFAULT_COSD_DESTINATION, type CosdDestinationInput, type CosdDestinationSettings } from '@/services/cosd/cosdDestination';

export interface DestinationDraft {
  facilityId: string | null;
  transport: CosdDestinationSettings['transport'];
  /** Typed as text so a half-typed number doesn't fight the box. */
  daysText: string;
  datesText: string;
}

export const parseList = (text: string): string[] => Array.from(new Set(text.split(/[\s,;]+/).filter(Boolean))).sort();

export function draftFromSettings(settings: CosdDestinationSettings | null, facilityId: string | null): DestinationDraft {
  const s = settings ?? DEFAULT_COSD_DESTINATION;
  return { facilityId, transport: s.transport, daysText: String(s.correctionWorkingDays), datesText: s.nonWorkingDates.join(', ') };
}

/** The draft as the service takes it. A days box that isn't a whole number becomes NaN, which the service refuses with a fixed code. */
export function toInput(d: DestinationDraft): CosdDestinationInput {
  const days = d.daysText.trim() === '' ? Number.NaN : Number(d.daysText);
  return { facilityId: d.facilityId, transport: d.transport, correctionWorkingDays: days, nonWorkingDates: parseList(d.datesText) };
}
