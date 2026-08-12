# src/audit/

One file (plus its test): `auditLogger.ts` — a thin `logEvent()`
wrapper used by `hooks/useSynopticAudit.ts`,
`components/Audit/useAuditLog.ts`, and `InlineCommentThread.tsx` (via
`TemplateRenderer.tsx`).

## Already fixed in a past session — verified, not just read

The file's own header documents a real bug found and fixed before this
review: it used to be a completely separate, parallel audit system —
its own `localStorage` key, never read by `AuditLogPage.tsx` (the real
System Audit page, which reads exclusively from
`services/auditlog/mockAuditService`). Every synoptic-editor action and
inline comment routed through this file was silently invisible to any
real audit review. Fixed by making `logEvent()` forward to the real,
shared `mockAuditService` instead of maintaining its own disconnected
store.

Didn't just take the header comment's word for it — ran the test suite
directly (`auditLogger.test.ts`) to confirm the fix still holds
end-to-end. Both tests pass, confirming a logged event genuinely shows
up via the real `mockAuditService`.

## Also fixed this review

Two unnecessary `any` casts removed from the test file
(`mockAuditService.getAuditLogs({ search: ... } as any)` — `search` is
a genuinely declared field on `AuditFilterParams`, no cast needed).
