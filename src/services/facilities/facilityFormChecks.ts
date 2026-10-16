// src/services/facilities/facilityFormChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 528 (PS-359): what the Facility editor needs before it can save, from
// the organisation's Field Requirements (page `facility`). Moved here from
// FacilityEditorModal.tsx, where the check was hard-coded (name, assigning
// authority, email, and the interface fields once configured). Pure.
//
//   - Required fields with no value are missing.
//   - The assigning authority is always required and unique: inbound HL7
//     orders are matched to a facility by it (PS-73).
//   - An email address, when given, must contain "@", required or not.
//   - The interface engine endpoint and the LIS sending-facility id are
//     required only once that interface is set up on the facility.
//   - Batch 549: the letterhead logo, when given, must be an https:// link
//     (images are links only; services/links/externalLink.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { missingRequiredFields, type ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';
import type { FacilityInput, Facility } from './IFacilityService';
import { linkFieldProblem } from '../links/externalLink';

export type FacilityFormProblem = 'required' | 'assigningAuthorityCollision' | 'invalidEmail' | 'invalidLink';

export interface FacilityFormCheck {
  /** Field id (as in the Field Requirements catalog) → what is wrong with it. */
  problems: Partial<Record<string, FacilityFormProblem>>;
  /** The facility already using this assigning authority, when there is one. */
  collision?: Pick<Facility, 'name' | 'assigningAuthority'>;
  /** The required fields with no value, in catalog order. */
  missing: ResolvedFieldRequirement[];
}

type FacilityForm = Pick<FacilityInput, 'name' | 'assigningAuthority' | 'email' | 'phone' | 'fax' | 'address' | 'city' | 'state' | 'zip'
  | 'contactFamilyNames' | 'contactName' | 'isEnterprise' | 'interfaceEngineConnection' | 'lisRouting'> & { headerLogoUrl?: string };

/** Values for the check; an interface field that isn't set up counts as supplied. */
export function facilityFormValues(f: FacilityForm): Record<string, unknown> {
  const interfaceSetUp = !!(f.isEnterprise && f.interfaceEngineConnection);
  return {
    name: f.name, assigningAuthority: f.assigningAuthority, email: f.email, phone: f.phone, fax: f.fax,
    address: f.address, city: f.city, region: f.state, postalCode: f.zip,
    contactPerson: f.contactFamilyNames || f.contactName,
    interfaceEndpoint: interfaceSetUp ? f.interfaceEngineConnection?.endpoint : 'notSetUp',
    sendingFacilityId: f.lisRouting ? f.lisRouting.sendingFacilityId : 'notSetUp',
  };
}

export function checkFacilityForm(
  f: FacilityForm,
  requirements: readonly ResolvedFieldRequirement[],
  others: readonly Pick<Facility, 'id' | 'name' | 'assigningAuthority'>[],
  editingId?: string,
): FacilityFormCheck {
  const missing = missingRequiredFields(requirements, facilityFormValues(f));
  const problems: FacilityFormCheck['problems'] = {};
  for (const m of missing) problems[m.id] = 'required';
  let collision: FacilityFormCheck['collision'];
  const authority = f.assigningAuthority.trim().toLowerCase();
  if (authority) {
    const hit = others.find(o => o.id !== editingId && (o.assigningAuthority ?? '').trim().toLowerCase() === authority);
    if (hit) { problems.assigningAuthority = 'assigningAuthorityCollision'; collision = { name: hit.name, assigningAuthority: hit.assigningAuthority }; }
  }
  if (f.email.trim() && !f.email.includes('@')) problems.email = 'invalidEmail';
  if (linkFieldProblem(f.headerLogoUrl)) problems.headerLogoUrl = 'invalidLink';
  return { problems, collision, missing };
}
