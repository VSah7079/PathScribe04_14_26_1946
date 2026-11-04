// src/services/locations/formatLocationDisplay.ts
// Batch 397: how a location (room) is shown in a picker or a summary:
// point of care / room / bed, skipping the parts it doesn't have. These are
// the hospital's own names (data), so they aren't translated. Pure.
import type { Location } from './ILocationService';

export function formatLocationDisplay(l: Pick<Location, 'pointOfCare' | 'room' | 'bed'> | null | undefined): string {
  return l ? [l.pointOfCare, l.room, l.bed].filter(Boolean).join(' / ') : '';
}
