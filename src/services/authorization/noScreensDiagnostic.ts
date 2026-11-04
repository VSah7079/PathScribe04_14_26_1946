// src/services/authorization/noScreensDiagnostic.ts
// Oct 28, 2026 (Pete: "I logged in locally and still see no tiles"). When Home
// finds no screen for the signed-in person, this says why, for the browser
// console: who the session is, which roles the role list holds, which of them
// the staff record names, and how many capabilities they carry. It holds no
// patient data: ids, role names and counts only.
//
// Pure.

import type { AuthorizationSnapshot } from './authorizationService';
import { heldRoles } from './evaluateCapability';

export interface NoScreensDiagnostic {
  signedInAs: string | null;
  sessionRole: string | null;
  staffRoles: string[];
  roleListSize: number;
  roleListHasSuperadmin: boolean;
  heldRoles: Array<{ id: string; capabilities: number }>;
  verdict: string;
}

export function describeNoScreens(snap: AuthorizationSnapshot): NoScreensDiagnostic {
  const subject = snap.subject;
  const held = subject ? heldRoles(subject, snap.roles) : [];
  const roleListHasSuperadmin = snap.roles.some(r => r.id === 'superadmin' || r.name?.toLowerCase() === 'superadmin');
  let verdict: string;
  if (!subject) verdict = 'No signed-in user could be read, or the permissions could not be loaded.';
  else if (snap.roles.length === 0) verdict = 'The role list is empty or could not be read, so no role can grant a screen.';
  else if (subject.sessionRole === 'superadmin' && !roleListHasSuperadmin) verdict = 'The session is Superadmin but the role list has no Superadmin role.';
  else if (held.length === 0) verdict = 'None of the roles on the staff record matches a role in the role list.';
  else if (held.every(r => (r.capabilities ?? []).length === 0)) verdict = 'The matching roles carry no capabilities.';
  else verdict = 'The matching roles carry capabilities, but none opens a Home screen.';
  return {
    signedInAs: subject?.userId ?? null,
    sessionRole: subject?.sessionRole ?? null,
    staffRoles: [...(subject?.staffRoles ?? [])],
    roleListSize: snap.roles.length,
    roleListHasSuperadmin,
    heldRoles: held.map(r => ({ id: r.id, capabilities: (r.capabilities ?? []).length })),
    verdict,
  };
}
