# components/ClientDictionary/

**Renamed this pass** (was `components/system/` — lowercase, a name that
collided with `components/Config/System/`, the much bigger admin folder,
differing only by capitalization). The old name told you nothing about
what was actually inside; this one does.

## Files

- **`ClientTable.tsx`** — Client Dictionary list, inline search + status
  filter.
- **`ClientEditorModal.tsx`** — Full client editor, 4 tabs (General/HL7/
  Reporting/TAT). Covered in detail during the Orchestrator Mode work
  earlier this session — see `Config/AI/README.md` and
  `services/clients/README.md` for the `internalAiOrchestratorEnabled`
  field added there.

  **Also added this session:** `idleTimeoutMinutesOverride` — the
  per-performing-lab override for the Inactivity Timeout feature
  (`PRIORITY_FIXES.md` #13), same tab and same inherit/override select
  pattern as `internalAiOrchestratorEnabled` right next to it. Resolved
  via `services/session/mockSessionTimeoutService.ts`, not this file
  directly — this is just the admin UI for setting the value. See
  `services/session/README.md` for the resolution logic.

Both files' self-documented path comments and relative imports updated
for the new location; sole consumer (`pages/system/ClientDictionaryPage.tsx`)
updated. `desktop.ini` (a Windows Explorer metadata file, not code) was
already deleted from the old location earlier this session.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
