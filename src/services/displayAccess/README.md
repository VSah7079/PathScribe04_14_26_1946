# displayAccess

Device binding for the two wall displays (Batch 603).

| File | What it is |
|---|---|
| `displayToken.ts` | Pure: generate a `psd_` token, SHA-256 hash it, decide valid / unbound / invalid / expired / revoked. |
| `IDisplayAccessService.ts` | Issue, revoke, verify, summaries. |
| `mockDisplayAccessService.ts` | Demo registry (`displayDeviceBindings` in browser storage). Issue and revoke are guarded by the display's own Configuration capability. Deliberately not cleared by a Full Reset. |
| `*.test.ts` | Token helpers and service rules. |

Used by `hooks/useDisplayBinding.ts`, `components/Common/DisplayTokenPrompt.tsx`, both display pages, and `components/Config/System/DisplayTokenModal.tsx`.

The API server's 401 check is **Planned**: `docs/architecture/DISPLAY_ACCESS_API.md`.

## Batch 617 (part B): server version (PS-514)

The display access (token) service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/DELEGATIONS_NOTES_API.md`.
