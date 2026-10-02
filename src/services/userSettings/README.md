# services/userSettings

Settings that belong to a person rather than the browser they sign in on.

- `personalSettings.ts` (Batch 430): get, set and clear a setting for the signed-in person. On first read the old shared browser value carries over, so nobody loses what they had. Nobody signed in: the shared value, as before. Used for the voice accent, dictation's learned corrections and the personal AI provider override. Production: the person's settings on the API server (PS-345).
- Foot pedal bindings deliberately stay per workstation (`hooks/useFootPedal.ts`): the pedal is plugged into the machine.

## Batch 431: more per-person settings

- **Language** (`personalLanguage.ts`, new; applied by `hooks/usePersonalLanguage.ts` in AppShell). Signed in, the person's own language applies and a change is saved to them. The sign-in page uses the workstation's last language. The first time, the workstation's language carries over.
- **Worklist sort order** (`WorklistTable.tsx`, key `worklistSort`).
- **Billing Log saved searches** (`BillingLogsSection.tsx`, key `pathscribe:savedBillingLogQueries`).
Report screen layout stays with the workstation (Pete's decision; `utils/uiPreferences.ts`).

---
*Parent: [services/](../README.md).*
