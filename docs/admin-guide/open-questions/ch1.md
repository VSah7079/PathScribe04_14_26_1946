# Chapter 1 open questions (System Overview and Architecture)

Each item needs Pete's decision or a ForMedrixAI answer. The chapter says "Not yet specified" where noted.

- **Sizing figures (Not yet specified in the repo):** API server, hub, interface engine and renderer CPU and memory; SQL Server storage, memory and IOPS per case volume; bandwidth per workstation; minimum workstation processor, memory and monitor size. Only the renderer's pool (2 to 4 Chromium browsers) and a 2-vCore database starting point (a recommendation, untested) exist.
- **Backup, recovery and retention of backups:** schedule, recovery time objective and recovery point objective are not written anywhere.
- **Encryption at rest for SQL Server (TDE or provider-managed):** only blob containers are specified as encrypted at rest. State a requirement for the database.
- **SAML 2.0:** Not built. The only plan is the shared-SaaS identity broker (Entra External ID). Confirm whether a direct SAML option is wanted for private-cloud customers.
- **Capability count:** `AUTHORIZATION_API.md` and `capabilitySeeds`/README say 244 to 319 in different places; the catalog files hold 322 entries (318 in `capabilityCatalog.ts` plus 4 in `lockboxCapabilities.ts`). The chapter says "about 320". The docs lag the code.
- **Platform-only capabilities:** six exist (`platform:cross-tenant-cases:view`, `governing-bodies:manage`, `signing-rules:manage`, and three `interface-dictionary` ones). `ACCESS_CONTROL_PLAN.md` says the Terminology screen's platform settings show only to a Superadmin session, not through a capability. Confirm which screens the other chapters should mark `[FORMEDRIXAI INTERNAL ONLY]`.
- **Retention is not enforced:** no purge job reads the Retention screen's periods (PS-345). The chapter says so. Confirm the wording is acceptable for customer-edition readers.
- **Hosting-region display:** `/api/config` `hosting` is built in the browser, but the endpoint is not. Chapter 5 should say the same when it documents the AI Behavior tab.
- **Help button:** described as Planned in the same release. If it does not ship in the same batch, change the "How to use this guide" part.
- **Support-screenshot redaction:** the screenshot feature name is "Enhancement Request" in the docs. Confirm the on-screen name for Chapter 9.
- **Source-file disagreement:** `SYSTEM_ARCHITECTURE.md` still describes Firestore migration status in places that predate the SQL Server decision. The chapter follows CLAUDE.md and the readiness review, not that section.
- **Firefox and screen readers:** both listed as open checks (PS-718, PS-687). Update the workstation part when they are run.
- **Pete's decisions still open per the readiness review:** native-speaker review of fr, de, nl, ko and es translations before clinical use.
