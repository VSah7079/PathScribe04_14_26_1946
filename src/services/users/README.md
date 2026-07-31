# services/users/

Staff user directory — the full user profile (name, roles, NPI, license, department, voice profile) underlying login/staff assignment.

**Pattern:** Standard interface/mock/firestore pattern.

**Real addition (this session):** `StaffUser.canAccessCrossTenantQa?: boolean` — a granular permission distinct from `role: 'superadmin'`, grants cross-tenant visibility specifically for QA/compliance reporting views without granting the broader platform-admin case-access bypass superadmin implies. Same pattern as the existing `canViewPediatric`/`canViewOrchestration` flags — defaults to false/undefined, must be explicitly granted. See `services/auth/README.md` for the real enforcement (`canViewCrossTenantQaData()`) and why this was added.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*