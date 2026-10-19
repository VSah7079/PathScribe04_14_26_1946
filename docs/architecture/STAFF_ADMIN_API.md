# STAFF_ADMIN_API.md: audit, authorization, staff, roles, facilities and registry settings

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616 (PS-484). The calls the browser makes to the API server for audit, authorization, users, roles, facilities and the screening-registry settings. The browser side is `services/auditlog/httpAuditService.ts`, `authorization/httpAuthorizationService.ts`, `users/httpUserService.ts`, `roles/httpRoleService.ts`, `facilities/httpFacilityService.ts` and `facilities/httpRegistrySettingsService.ts`, built from the shared kit (`HTTP_SERVICES_PATTERN.md`). They are used when `config.json` has an API server address; the demo keeps the mock.

## 0. Rules for every call here

- **The caller is the bearer token.** The server never takes a user id, name, role or facility from the body to decide who is acting. The audit row's actor, time and session role are the server's.
- **The server decides permission** (`AUTHORIZATION_API.md`). A refusal is `403` and does no work. The browser maps it to `NOT_PERMITTED`; it never reads the server's message.
- **Fixed error codes only:** `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`.
- **Lists** reply `{ "items": [...] }`. **One record** replies the record. **Actions with nothing to return** reply `204`.
- **No patient data** in a body, a query or a log line. Audit `detail` is PHI-free (the existing service rule).

## 1. Audit (`IAuditService`)

| Method | Call | Permission | Notes |
|---|---|---|---|
| `getAuditLogs(filters)` | `GET /api/audit/logs?type&user&dateFrom&dateTo&search` | `screen:audit-log:open` | `type` and `user` of "all" are left out. |
| `logEvent(entry)` | `POST /api/auditlog/audit/log-event` | any signed-in user (own actions) | Body is the entry without `id` or `timestamp`. The server sets both and the actor. |
| `getErrorLogs(filters)` | `GET /api/audit/errors?severity&resolved&search` | `screen:audit-log:open` | |
| `logError(entry)` | `POST /api/auditlog/audit/log-error` | any signed-in user | |
| `resolveError(id)` | `POST /api/auditlog/audit/resolve-error` | `audit:error:resolve` | The server records who resolved it. |

The audit tables are append-only: there is no update or delete call, and the application's database login has no such permission. High-risk capability checks are audited by the server itself (§6), not by a `logEvent` call from the browser.

## 2. Staff (`IUserService`)

| Method | Call | Permission |
|---|---|---|
| `getAll()` | `GET /api/users/user/get-all` | any signed-in user (the directory the screens pick from) |
| `getById(id)` | `GET /api/users/user/get-by-id` | any signed-in user |
| `add(user)` | `POST /api/users/user/add` | `config:staff:edit`; roles, facilities or credentials in it also need `config:staff-access:assign` |
| `update(id, changes)` | `POST /api/users/user/update` | `config:staff:edit`; the access fields also need `config:staff-access:assign` |
| `deactivate(id)` | `POST /api/users/user/deactivate` | `config:staff:edit` |
| `reactivate(id)` | `POST /api/users/user/reactivate` | `config:staff:edit` |

The quick-sign PIN travels on a save only; the server stores a hash and never returns it. `externalIdentities` links are written by the sign-in flow, not by the edit screen.

## 3. Roles (`IRoleService`)

| Method | Call | Permission |
|---|---|---|
| `getAll()` | `GET /api/roles/role/get-all` | any signed-in user (the catalog the checks use) |
| `getById(id)` | `GET /api/roles/role/get-by-id` | any signed-in user |
| `add(role)` | `POST /api/roles/role/add` | `config:roles:manage` |
| `update(id, changes)` | `POST /api/roles/role/update` | `config:roles:manage` |
| `delete(id)` | `POST /api/roles/role/delete` | `config:roles:manage` |

A save refuses unknown keys and a capability whose requirements are not granted (`INVALID`), refuses a change that leaves no assignable role with `config:roles:manage`, refuses any change to the Superadmin role at a hospital, and writes the "Role capabilities changed" audit row naming who changed what.

## 4. Facilities (`IFacilityService`)

| Method | Call | Permission |
|---|---|---|
| `getAll()` / `getById(id)` | `GET /api/facilities/facility/get-all`, `GET /api/facilities/facility/get-by-id` | any signed-in user |
| `add(f)` | `POST /api/facilities/facility/add` | `config:facilities:manage` |
| `update(id, changes)` | `POST /api/facilities/facility/update` | `config:facilities:manage` (never changes the print settings) |
| `deactivate(id)` / `reactivate(id)` | `POST /api/facilities/facility/deactivate`, `.../reactivate` | `config:facilities:manage` |
| `verify(id)` | `POST /api/facilities/facility/verify` | `config:facilities:manage` (Unverified to Active) |
| `setPrintSettings(id, settings)` | `POST /api/facilities/facility/set-print-settings` | `config:print-settings:manage`; settings with a problem are `INVALID` |
| `findOrCreateByAssigningAuthority(authority, name, note?)` | `POST /api/facilities/facility/find-or-create-by-assigning-authority` with `{ assigningAuthority, name, note }` | order intake (service call); creates an Unverified, auto-created facility with no pediatric or turnaround configuration when there is no exact match |

## 5. Screening-registry settings

| Method | Call | Permission |
|---|---|---|
| `IRegistrySettingsService.get()` | `GET /api/facilities/registry-settings/get` | any signed-in user |
| `.update(patch)` | `PATCH /api/registry-settings` | `config:screening-registry:manage`, audited |
| `.reset()` | `POST /api/facilities/registry-settings/reset` | `config:screening-registry:manage`, audited |
| `IFacilityRegistryOverrideService.getForFacility(id)` | `GET /api/facilities/facility-registry-override/get-for-facility` | any signed-in user. `404` means no override; the browser treats that as a successful "none". |
| `.create(id, overrides)` | `POST /api/facilities/facility-registry-override/create` | `config:screening-registry:manage` |
| `.update(id, changes)` | `PATCH /api/facilities/{id}/registry-override` | `config:screening-registry:manage` |
| `.remove(id)` | `POST /api/facilities/facility-registry-override/remove` | `config:screening-registry:manage` |

## 6. Authorization (`IAuthorizationService`)

With a server, the browser does not evaluate access. It asks.

| Method | Call | Reply |
|---|---|---|
| `evaluate(capability, context)` | `POST /api/authorization/authorization/evaluate` with `{ capability, context }` | the `CapabilityDecision` (`allowed`, `reason`, `grantedBy`, `missingRequirements`, `outsideFacilities`, `context`). Nothing is audited. |
| `enforce(capability, context)` | `POST /api/authorization/authorization/enforce` with the same body | the same decision. A high-risk capability is audited by the server, allowed or refused, as `AUTHORIZATION_API.md` describes. |
| `grantedCapabilities()` | `GET /api/authorization/authorization/granted-capabilities` | `{ "capabilities": ["domain:object:verb", ...] }` for the caller |
| `snapshot()` | `GET /api/authorization/authorization/snapshot` | `{ subject, roles }` for the caller (the admin screens that show a role's reach) |

**Fails closed.** A `403`, a server error, a time-out, or a reply that is not a decision becomes a refusal (`allowed: false`, `reason: notGranted`); `grantedCapabilities()` becomes the empty set and `snapshot()` an empty snapshot. The browser never grants because it could not ask. Because the server's `403` body is not read, the specific refusal reason is only shown when the server answers `200` with a decision; the server should answer a *check* with `200` and `allowed: false`, and keep `403` for an *action* refused.

The same decision is what every action endpoint in `AUTHORIZATION_API.md` makes before doing its work. These two calls exist so the screens can show or hide a control with the server's answer, never instead of the server's check.
