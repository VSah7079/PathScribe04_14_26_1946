# smartCapture

Batch 611, queue entry #189. **Prototype, not compliance-reviewed. Simulated in the demo.** Suggested charge lines for a person to review. Full description and acceptance criteria: `docs/product/SMART_CAPTURE.md`.

| File | What it holds |
|---|---|
| `smartCaptureRules.ts` | The fixed, versioned rule set (`sim-rules-1.0`), the specimen reader and the case signature. Pure, deterministic, reads no patient identifier |
| `smartCaptureStates.ts` | suggested, reviewed, approved, exported; the approval and export refusals; stale detection; merging earlier decisions. Pure |
| `smartCaptureSettings.ts` | The prototype switch and the six-item production checklist. Pure |
| `smartCapturePayload.ts` | The structured payload and the audit entries (counts, CPT codes, rule ids and version only) |
| `smartCaptureService.ts` | The review service and the settings service, built from dependencies so they test without mocks |
| `smartCaptureServices.ts` | Wiring to browser storage, the audit log, authorization, the case router, the code-system policy and the interface dispatch |

Capabilities: `billing:smart-capture:review`, `billing:smart-capture:approve`, `billing:smart-capture:send` (Pathologist), `config:smart-capture:manage` (Admin, Lab Director). With the API server, `smartCaptureServices.ts` is replaced by HTTP calls; the rules and screens do not change.

## Batch 617 (part C): server versions (PS-514)

The smart capture and smart capture settings services here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/SIGNATURES_SMART_CAPTURE_API.md`. The mocks are unchanged.
