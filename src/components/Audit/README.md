# components/Audit/

## Files

- **`useAuditLog.ts`** (463 lines) — Centralized audit logging hook,
  used across many folders (confirmed consumer in `ValidationStudies/`,
  `Search/`, and others this session). Auto-stamps user email, UUID,
  timestamp. **FIXED this pass:** the file's top comment was literally
  duplicated twice in a row (a leftover from a past "drop this file in"
  patch instruction that was never cleaned up after being applied).
  Consolidated into one clean header. No other issues.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
