# services/staff/

Rules about staff members' jurisdiction-scoped credentials. Pure functions, each with tests.

## Files

- **`resolveNormalizedCredentialCapabilities.ts`** — the one place a raw, jurisdiction-specific credential is normalized into a PathScribe capability key, and only while it is active (right jurisdiction, inside its effective and expiry dates).
  - `CYTO_ADVANCED_SPECIALIST`: the UK Advanced Specialist cytology sign-out, plus the NL and DE equivalents.
  - `FORENSIC_AUTOPSY_SIGNOUT` (Batch 331, PS-327): may sign a forensic autopsy in that jurisdiction. It comes from `MEDICOLEGAL_APPOINTMENT` (any jurisdiction's medical examiner / forensic pathologist / coroner's pathologist appointment) or `UK_HO_REGISTERED_FORENSIC_PATHOLOGIST`.
  - `KNOWN_CREDENTIAL_TYPES` lists the raw types the Staff editor offers.
- **`resolveHasAdvancedSignOutCertification.ts`** — the cytology advanced sign-out check built on the above.
- **`providerCredentialRules.ts`** (Batch 331) — the Staff editor's rules:
  - validation, per row: type, issuing body, jurisdiction, effective date, and expiry not before effective;
  - normalization;
  - `providerCredentialChangeDetail`, the literal-English audit detail written when an administrator adds or removes a credential.

## staffAdministration.ts (Batch 370, PS-356)

`saveStaffMember` is the only way screens change staff records. It needs two capabilities:
- `config:staff:edit` for any save;
- `config:staff-access:assign` as well when the save changes roles, facilities, pediatric, orchestration or cross-tenant QA access, or jurisdictional credentials (`staffAccessChanges`). Adding someone always counts, because a new record needs a role.

Audit entries:
- **"Staff access changed"** (`staffAccessChangeDetail`) records roles, facilities and flags, before → after. It is new.
- **"Staff credentials changed"** is the credentials entry. It moved here from `StaffTab.tsx`.


## Batch 536 (PS-554)

`staffAdministration.saveStaffMember` refuses a role change whose roles together carry both duties of a separation-of-duty pair (`separationOfDuties`), when given `roleService` (the Staff screen passes it).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 528: Staff editor requirements (PS-359)

`staffFormChecks.ts` decides what the Staff editor needs before it saves, from the organisation's Field Requirements (page `staff`). Before, `StaffTab.tsx` hard-coded first name, last name and a role. Those three stay locked; an organisation can also require any of the other fields. An email, when given, must look like one. See `services/fieldRequirements/README.md`.

## Batch 544: the signature is a link

Pete, Oct 13, 2026: PathScribe stores links to images, never the images. `staffFormChecks.ts` adds:
- `isHttpsLink`: https only, a named host, no user name or password.
- The `invalidLink` problem for a signature that isn't such a link.
- `signaturePreviewUrl`.
- `signatureLinkOnOpen`: a signature saved earlier as an image opens empty, with a note, so the record can still be saved.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `staffFormChecks.ts`: `isHttpsLink` moved to `services/links/externalLink.ts`, shared with the logo and imaging address checks; re-exported here, so callers don't change.

## Batch 658 — `roleDisplayName.ts`: a stored role name tidied for display (My Contribution subtitle), with a test.
