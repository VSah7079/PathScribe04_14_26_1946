**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

## Batch 601

`actionSeeds.ts` also offers the 89 open/filter/move commands (and QA Reviewer is now seeded).

## Batch 600

`actionSeeds.ts` offers each built-in role the commands added to the roles list, once (`Role.seededActions`); applied when roles load in `mockRoleService.ts`. A removal sticks; custom roles and copies are untouched.

# services/roles/

Staff role dictionary: capabilities (enforced, `services/authorization/`), voice/keyboard commands, case/config access. (The role-level pediatric and orchestration switches were removed in Batch 370; those are staff-record flags.)

**Pattern:** Standard interface/mock/firestore pattern.

**Real addition, per direct design brief on the RFP-APLIS-2026-GLOBAL Intraoperative/Frozen Section Dashboard:** `'or-staff'` role added, same real "directory only — no app access" posture as the existing `'physician'` role (`caseAccess: false, configAccess: false`, an empty `DEFAULT_ROLE_PERMISSIONS` entry in `constants/systemActions.ts`). OR staff (RN, circulator, surgeon) never log into the main app — they exist in this directory only to be resolved by `quickAuthPin` and attributed on the Intraoperative Dashboard's own audit log.

## Built-in template roles, fixed ids (Batch 329, PS-63)

Per Pete, the template roles are system roles every site has out of the box.

- **`systemRoles.ts`** (+ `.test.ts`, new, pure):
  - **`SYSTEM_ROLE_IDS`** holds the ids the rules depend on: `admin`, `template-author`, `template-approver`, `lab-director`. The ids never change. An administrator may rename a role's display name in Staff → Roles, and the rules still find it by id.
  - **`mergeBuiltInRoles`** adds any built-in seed role missing from a stored catalog and keeps stored roles, including admin edits, as they are.
  - **`roleIdsForNames`** maps a staff record's role names to ids, ignoring case and surrounding spaces.
  - **`renameRoleInList`** is used when a role is renamed.
- **`mockRoleService.ts`:**
  - **New seed roles:** Template Author, Template Approver and Lab Director (built-in, Configuration access). Their permission sets are in `constants/systemActions.ts`.
  - **Migration:** `load()` runs `mergeBuiltInRoles`, so an existing site's stored catalog gains the new roles on next load. Checked in the browser against an old two-role catalog with a renamed Admin: the three roles were added and the rename was kept.
  - **Renames reach staff:** `update()` carries a role rename over to every staff record holding the old name. Staff records store role names, so before this, renaming a role silently removed it from everyone who had it.
- **Not done:**
  - **Firestore:** `firestoreRoleService.ts` is still a stub. Its seed or migration should call `mergeBuiltInRoles` with the same seeds when it is built.
  - **Identity-provider mapping:** SSO sign-in exists since Batch 343, but it takes roles from the staff record (`services/auth/sessionRole.ts`). Mapping identity-provider group claims to these role ids is not built, and is after the first release (Pete, Oct 15, 2026): user accounts sync from the directory first (SCIM, phase 2e); when mapping comes, a group may grant bench roles only, a second admin approves each mapping, and each role shows whether it came from the directory or was added by hand (`docs/architecture/AUTHENTICATION_OIDC.md`). (Corrected in Batch 369: this line used to say PathScribe had no single sign-on.)

## Capabilities on roles (Batch 369, PS-355)

- **`IRoleService.Role`** has three new optional fields:
  - `capabilities`: the enforced grants, from `services/authorization/capabilityCatalog.ts`;
  - `seededCapabilities`: the built-in seeds already offered;
  - `assignable`: `false` means the role can't be given to staff.
- **Two new built-in roles:**
  - **QA Reviewer** (`qa-reviewer`) exports QA reports and report change history. It has no case or configuration access of its own, so it is given alongside someone's main role.
  - **Superadmin** (`superadmin`) is PathScribe platform support. It is held only through a support sign-in and is not assignable.
- **`load()`** runs `applyCapabilitySeeds` after `mergeBuiltInRoles`, so a stored catalog gains the day-one grants once. After that, an administrator's removals stick.
- **`add()` / `update()`** refuse a capability list with an unknown key or an unmet requirement (`roleCapabilityProblem`).
- **`systemRoles.ts`**: `SYSTEM_ROLE_IDS.QA_REVIEWER` and `.SUPERADMIN` are added.

## Batch 370 (PS-356)

- **`roleAdministration.ts`** (new): `saveRole` is the only way screens change roles.
  - It checks `config:roles:manage` and validates the capability list.
  - It refuses a save that would leave no assignable role able to manage roles (`keepsARoleManager`; Superadmin doesn't count, since a hospital can't give it to anyone).
  - It writes "Role capabilities changed".
- **Retired role fields:** `Role.canViewPediatric`, `canViewOrchestration` and `facilityIds` are removed. None was ever read outside the Role Dictionary. `withoutRetiredRoleFields` (in `systemRoles.ts`) strips them from a stored catalog on load. Pediatric and orchestration access remain on the staff record, and facility scope is now `StaffUser.facilityIds`.

## Batch 371: Superadmin is ForMedrixAI's

- **Locked.** `mockRoleService.load()` runs `lockPlatformRoles`, so Superadmin always holds the whole catalog except `config:ai-prompt:approve` (separation of duties, Batch 536). `update()` refuses any change to a role staff can't be given.
- **`saveRole`** refuses edits to Superadmin (`platformRole`) and refuses platform-only capabilities on a hospital role.

## Batch 374: bench roles

Four new built-in roles, so each bench screen has a role to hold it by default: **Accessioner**, **Histotechnologist**, **Cytotechnologist** and **Molecular Technologist** (`SYSTEM_ROLE_IDS`). They have case access and no configuration access; which screens they open is in `authorization/capabilitySeeds.ts`. Existing role catalogues gain them on load (`mergeBuiltInRoles`).

`caseAccess` and `configAccess` stay as they were: they decide whether an SSO sign-in gets the app at all (`auth/sessionRole.ts`), and now also which screens a hospital's own role is first offered.

## Batch 441

- The built-in Cytotechnologist role now lists the `cytotechnologist` participation type. A stored copy with an empty list (the seed before this batch) is filled on load (`systemRoles.withCytotechParticipationType`); a list an administrator set is kept.
- `roleAdministration.saveRole` refuses the Cytotechnologist role listing a pathologist type (`cytotechPathologistType`). The Role Dictionary shows those types locked for that role.


## Batch 536 (PS-554)

`roleAdministration.saveRole` refuses a role that would hold both duties of a separation-of-duty pair (`separationOfDuties`), and, given `userService`, a change that would give someone holding the role and another one both (`separationOfDutiesStaff`).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 513 (PS-269)

`builtInRoleText.ts`: the built-in roles' seeded descriptions and their locale keys. `builtInRoleDescriptionKey()` gives a key only while a role still carries the exact seeded text, so a lab's own edit is never replaced by a translation. Test: `builtInRoleText.test.ts`. `mockRoleService` seeds from the same text.


Batch 616: server version in `httpRoleService.ts` (used when the deployment has an API server address; the demo keeps the mock). Chosen in `roleServiceInstance.ts`. Contract: `docs/architecture/STAFF_ADMIN_API.md`.
