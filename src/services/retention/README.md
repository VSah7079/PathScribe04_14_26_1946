# services/retention

Retention policy. `retentionPolicyService.ts`: how long AI suggestions, the audit log, case snapshots and report archives are kept. Saving needs `config:retention-policy:manage`. Nothing purges by it yet (server work, PS-345).

## Batch 430: personal settings per person; view-only fields

Correction to Batch 428: `storageGet` keeps keys under the mock prefix, so a policy saved before Batch 428 under the bare key wasn't being read. `loadRetentionPolicy` now falls back to it until the policy is saved again.

---
*Parent: [services/](../README.md).*
