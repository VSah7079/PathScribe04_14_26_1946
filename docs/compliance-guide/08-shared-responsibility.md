# 8. Shared responsibility matrix

This table prevents the assumption that the software alone makes a laboratory compliant. **PathScribe** = the software and ForMedrixAI's service. **Customer** = laboratory and hospital. **IdP** = the identity provider. **Host** = the platform that runs the servers.

| Requirement | PathScribe | Customer | IdP | Host |
|---|---|---|---|---|
| Password policy, resets, lockout | Not applicable under SSO (none stored) | Choose the policy | Enforces it | |
| MFA enforcement | Checks the token claim; asks for a fresh sign-in at signature | Decide who needs MFA; set the policy in Session Security | Runs the second factor; must put `amr` / `acr` in the token | |
| User provisioning and leavers | Roles assigned in PathScribe; no SCIM yet (Planned) | Create, change and remove users and roles promptly | Holds the account; disabling it blocks sign-in | |
| Role and permission design | Capability catalogue, least-privilege defaults | Review roles against duties; grant sparingly | | |
| Audit log review | Writes the entries; Audit Log screen | Review on a schedule; act on findings | | |
| Audit tamper-evidence | **Planned** with the API server | Interim: export and retain per policy | | Write-once storage if used |
| Retention periods | Jurisdiction figures (some unverified); eligibility; holds | Confirm and adopt the schedule; place holds; dispose | | |
| Specimen handling and labelling | Scan, custody and disposal records | Procedures, training, physical storage | | |
| Report validity and clinical decisions | Checks and gates; unverified-AI block | The pathologist decides; sign-out is a professional act | | |
| Validation (IQ/OQ/PQ), change control | Evidence and checklist (checklist Planned) | Qualify the installation; accept updates | | Environment baselines |
| Backup and disaster recovery | Not in the browser app | Define RPO/RTO; test restores | | Implement and monitor |
| Encryption in transit and at rest | Uses HTTPS to the API; no clinical data in the browser | Require it in contracts | | TLS, disk and database encryption |
| Data residency | AI region policy; hosting options Planned | Choose location; sign data-processing terms | | Provides the region |
| AI vendor selection | Policy by jurisdiction and facility | Set the policy; vet vendors | | |
| Privacy rights and breach response | Not built | Own the process and the registers | | |
| Translations and clinical wording | Machine translated; native review pending | Review before clinical use | | |
| Accreditation evidence | Provides records and this guide | Prepare for the inspection; map to the standard | | |

Where a cell is blank the party has no part in that row.
