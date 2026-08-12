// src/utils/staffSubspecialties.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, per direct confirmation: replaces the old free-text
// StaffUser.department field — genuinely redundant with the real
// Subspecialty dictionary (services/subspecialties/), which already
// existed but had no way to assign it from the Staff editor until now
// (see components/Config/Staff/StaffTab.tsx).
//
// department had been quietly doing double duty as an informal
// "subspecialty" stand-in throughout the app — DelegateModal.tsx even
// named its own field `subspecialty` while reading it from
// `u.department`. Every one of those real consumers is fixed here to
// use this shared helper against the real Subspecialty.userIds
// relationship, rather than reintroducing a second, disconnected
// concept of "what specialty is this person in."
// ─────────────────────────────────────────────────────────────────────────────
import type { Subspecialty } from '../services/subspecialties/ISubspecialtyService';

/**
 * Real subspecialty names this user is assigned to, comma-joined for
 * display — the direct, real replacement for `StaffUser.department`
 * everywhere it was being read as an informal specialty/subtitle.
 * Empty string (never fabricated) when the user has no real
 * subspecialty assignment yet — same honest-absence posture as
 * everywhere else in this app.
 */
export function getStaffSubspecialtyDisplay(userId: string, allSubspecialties: Subspecialty[]): string {
  return allSubspecialties
    .filter(s => s.userIds.includes(userId))
    .map(s => s.name)
    .join(', ');
}
