# services/siteAgent/

Batch 546 (PS-539 phase 2c, decision D3). `siteAgentContract.ts` is the contract between the PathScribe site agent and the API server. The agent is one .NET Worker Service per hospital site; version 1 covers report and label printers and Windows file shares. The contract is the source of truth for `docs/architecture/SITE_AGENT_API.md`.

It is pure:
- enrolment and certificate renewal;
- the local allow-list checks (`printerOutsideAllowList`, `shareWithinRoots`, `ipv4InCidr`);
- printers and shares, and the pickup rule and its key (`pickupIdempotencyKey`, `fileIsStable`);
- jobs, leases and expiry on the server's clock (`jobStartable`, `clockOffsetMs`);
- outcomes and error codes, including `IN_DOUBT`, and the retry rule (`agentFailureRetriable`: labels never by themselves);
- update manifests (`isNewerVersion`);
- the heartbeat and `agentStatus`.

Nothing in the app uses it yet: the agent and the API server implement it (phase 2e), and the screens come in 2d. `deploymentReadiness/phase2cContracts.guard.test.ts` keeps the document in step with it.

This is not the workstation agent (`src/utils/labels/pathscribeAgent/`), which runs on a user's computer for printing from that workstation.

## Batch 552 (PS-539 phase 2d: site agent screens)

Batch 552 (phase 2d) adds the administration side: Configuration → System → Site agents. It covers `SITE_AGENT_API.md` §11a. **A site is a performing-lab facility** (confirmed by Pete, Oct 13, 2026).

- **`siteAgentAdmin.ts`:** the wire types, plus pure rules:
  - **Status:** `siteAgentState` and `siteAgentCounts`. The server's own status is preferred; the browser's clock is used only as a fallback.
  - **Checks:**
    - `checkAgentPrinters`: a unique id; IPv4 or a host name, with no all-numeric or hex names; the port; a label printer is ZPL on Raw 9100.
    - `checkAgentShares`: a `\\server\share` path, not this machine, a device path or a drive's admin share; pickup patterns are file names only and never PDFs or images; the rejected folder's name.
    - `normaliseSiteAgentConfig`: values are trimmed before saving.
  - **Row helpers:** IPPS is the default, on port 631. A label printer is fixed to Raw 9100.
  - **Demo:** `newEnrollmentCode` makes the code in the demo only.
- **`siteAgentAdminService.ts`:** checks capabilities at the site, then calls the API or the demo.
  - `config:site-agents:enroll` covers the enrolment code and revoking.
  - `config:site-agent-config:manage` covers saving printers and shares.
  - Either capability lets you see the agents and the configuration.
  - The file also holds the HTTP client and the demo store.
- **`siteAgentAdminInstance.ts`:** `siteAgentAdminService` in `@/services`. In the demo, the configuration is kept under `site_agent_config`, which a demo reset clears.
- **Tests:** `siteAgentAdmin.test.ts`.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

Batch 553:
- **`reportPrinters(siteId, purpose)`:** the site's report printers for:
  - the routing rule window (`config:print-routing:manage`);
  - the facility default (`config:print-settings:manage`);
  - Redirect (`print:job:redirect`).

  Each is checked at the site. It calls `GET /api/sites/{id}/agent-printers`, which returns printers only, no shares.
- **Revoke:** takes a reason code (`REVOKE_REASON_CODES`), with a note only for "other". It is sent as `{ reasonCode, note? }`.
- **Update window:** `checkUpdateWindow` (both times or neither; it may cross midnight).
- **Pickup:** imports are `PICKUP_IMPORT_KINDS` (orders, results). `engineChannelSuggestions` lists the channels already used.

## Batch 562

- `siteAgentAdmin.ts`: `agentSiteIds` (the sites the Print Queue's agent line follows live).
