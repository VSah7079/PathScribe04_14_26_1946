# Site agent: printers and file shares on the hospital network (PS-539 phase 2c)

**Decision D3** (Pete, Oct 13, 2026; `DEPLOYMENT_READINESS_REVIEW.md` §13): the on-site agent is phased.
- **Version 1:** report and label printers, and Windows file shares.
- **Version 2:** instruments and analyzers.
- BridgeLink runs on site only where a hospital requires it (D6, `INTERFACE_ENGINE_EDGE.md`).

**Pete's check before any site rollout:** local network print routing and file-share pickup through the agent, tested on a staging machine (§12, tests 1 and 2).

This contract covers the agent, one .NET Worker Service per site, and the API server it talks to. The India team builds both. It is the readiness review's §6.3 made specific.

**Source of truth for the wire contract:** `src/services/siteAgent/siteAgentContract.ts` (types, limits, the allow-list checks, the retry rule, status). Where they differ, the TypeScript file wins and this document is corrected.

**Not the workstation agent.** The workstation PathScribe Agent (`src/utils/labels/pathscribeAgent/`, `wss://127.0.0.1:9100-9102`) runs on a user's own computer, so a bench can print labels to the printer beside it. QZ Tray does the same job. Both stay, for printing from a particular workstation. The site agent prints and writes files for the server, when nobody is at a computer.

## 1. What exists today (checked Oct 13, 2026)

- **Report printing to a network printer (`DIRECT_NETWORK_PRINT`)** goes through Node transports in `src/services/printing/transport/`. They need Node's `net`, `http` and `Buffer`.
  - `sendRawPrintJob.ts`: Raw 9100.
  - `sendLprPrintJob.ts`: LPR.
  - `sendIppPrintJob.ts`: IPP over plain HTTP.
  - **Finding F3:** in the browser, the attempt threw "Buffer is not defined" before any transport ran.
    - **On release,** the job was left `QUEUED` with no retry scheduled.
    - **On a retry,** it failed with that message until its retries ran out.
    - Network report printing therefore worked nowhere.
  - **Fixed in Batch 546:** from a browser, the job now fails at once with "needs the site agent" (`NEEDS_SITE_AGENT`).
    - Retrying there can't help, so it goes straight to the exception queue, the fallback channels and the alert.
    - A transport that throws also fails the job, instead of leaving it queued (`attemptPrintDelivery.ts`, `transport/networkPrintRuntime.ts`, `deliveryRetries.ts`).
    - Printing itself needs this agent.
- **`PrintDestination`** (`src/types/printRouting/PrintDestination.ts`): protocol, IP address, port, queue name or resource path.
  - It **has no id**, so nothing can order jobs or report health per printer.
  - Routing rules, the facility default and Redirect all hold one (§3).
  - *Since Batch 553* it can instead name a site agent printer by site and id (§3); the address form remains for a server inside the hospital.
- **Paper source and duplex** reach only IPP. Raw 9100 and LPR drop them (`dispatchViaPrintProtocol.ts`).
- **Label printing:**
  - **Workstations** print through the workstation agent or QZ Tray (`dispatchZplLabel.ts`).
  - **Network label printers** (`direct_interface_engine` printer profiles) are tracked by `src/services/networkPrint/networkPrintJobs.ts`. The sender is a stub (`dispatchNetworkPrintJob.ts`).
  - Retry is manual only (Pete, Sep 26, 2026; `LIVE_UPDATES_SIGNALR.md` §10).
- **File drop:** the development server writes the PDF and a metadata JSON to a `directory` or SFTP target (`functions/report_delivery.py`, `FILE_DROP_TARGETS`).
  - Each file is written as `.part` and then renamed, never overwriting: a name clash adds `_2`, `_3`.
  - A Windows share works only when the delivering server is inside the hospital (`REPORT_DELIVERY_API.md`).
  - The file name is fixed (`deliveryPlan.ts`).
- **Picking files up from a share** doesn't exist in the code.
- **Finding F4:** the Content-Security-Policy had no entry for the workstation agent or QZ Tray, so the browser blocked both. *Fixed in Batch 546* (§10).
- **No device registration, pairing or heartbeat** exists in the code.

**Corrections made in Batch 546:**
- `INTERFACE_TRANSACTIONS.md` said `PRINT_JOB` is "a label for a network printer" confirmed by `PrintJobStatus`. It is a report PDF handed to the interface engine, and any 2xx marks it printed.
- `REPORT_DELIVERY_API.md` §3.2.3 said print confirmation is the network print result. Report print jobs are marked printed as soon as the send succeeds; `PrintJobStatus` is used only by the label tracker.
- `MESSAGE_BUS_API.md`'s `print.dispatch` row had three errors:
  - it keyed jobs by a `destinationId` that didn't exist;
  - it gave 4 attempts, where print retries follow the lab's delivery delays;
  - it folded the label tracker's 120 s "no answer" timer into report print jobs.
- The review's F3 said only the retry sweep reached the Node transports. The first attempt at release failed too, on `Buffer`, and left the job stuck in the queue.
- `src/utils/labels/printCassetteSlideLabel.ts` said the workstation agent was refused there. It has gone through `dispatchZplLabel.ts` since that file gained it.

## 2. Enrolment and identity

1. **The code:** an administrator makes an enrolment code for one site, in a phase 2d screen.
   - It has at least 128 random bits, and is used once.
   - It expires after 24 hours.
   - It is checked in constant time, with attempts rate-limited.
2. **The request:** at installation the agent creates its key pair.
   - The key is P-256 or RSA 3072 or stronger, in the TPM where the machine has one, otherwise in the Windows certificate store, and not exportable.
   - The agent sends `POST /api/agent/enroll` (`AgentEnrollmentRequest`) with the code and a certificate signing request.
3. **The certificate:** the API issues a client certificate from PathScribe's agent CA, valid for 90 days (`AgentEnrollmentResponse`).
   - It sets the subject itself (agent and site) and ignores what the request asked for.
   - The tenant and site always come from the certificate, never from a message.
   - The CA's key is held in a hardware security module or the cloud's key vault.
4. **Every later call** uses mutual TLS with that certificate.
   - **Renewal:** 30 days before expiry, the agent sends a new signing request over its current certificate (`certificateNeedsRenewal`). A revoked or expired certificate can't renew. An agent offline past its expiry is enrolled again with a new code.
   - **Revocation:** an administrator can revoke an agent. Every request and every hub connection is checked against the agent's record, so revocation takes effect at once (no certificate revocation list).
5. **No inbound port.** The agent only connects out, over HTTPS (443). Nothing on the hospital's firewall is opened inbound.
6. **Its own host name.** The agent's endpoints use their own host name (for example `agent.<tenant domain>`), which requires a client certificate. Browsers never use it.
   - The hospital's TLS-inspecting proxy, if any, must let that host through untouched, because inspection breaks mutual TLS.
   - The ingress must pass the client certificate to the API.

## 3. What the agent may reach, and its configuration

**The local allow-list comes first.** At installation the hospital's IT sets, on the machine (`AgentLocalAllowList`):
- the printer subnets, for example `10.20.30.0/24`;
- the printer ports (by default 9100, 515, 631 and 443);
- the UNC roots shares must sit under;
- the hosts documents may be downloaded from.

It is never changed from PathScribe.
- The agent refuses any printer, share or download outside it (`printerOutsideAllowList`, `shareWithinRoots`).
- Host names are resolved first and the address checked.
- Downloads are https only, with no redirects followed.

A mistaken or compromised configuration therefore can't point the agent at other hosts on the hospital network.

**The configuration:** `GET /api/agent/config` returns, for the agent's site:
- its printers (`AgentPrinter`): an id, report or label, protocol, host, port, LPR queue or IPP path, and label language (ZPL);
- its shares (`AgentShare`): an id, the UNC path, write or pickup, and the pickup rule;
- its update window.

It is sent again whenever an administrator changes it.
- Changing an agent's printers and shares is a protected action. Its capability is added with the 2d screen, checked in the service, and audited (CLAUDE.md rule 7).

**Routing to agent printers** (*done in Batch 553*, browser side). Routing rules, the facility default and Redirect name an agent printer as `{ agentPrinter: { siteId, destinationId }, displayName? }`, not an IP address (`PrintDestination` is now that or a printer address; `src/types/printRouting/PrintDestination.ts`, rules in `src/services/printRouting/printDestinationRules.ts`). It is what Pete's routing check exercises (§12, test 1).
- **Which printers:** report printers on the site's list (`GET /api/sites/{siteId}/agent-printers`, §11a); label printers are never offered for reports.
- **Which site:** a facility-tier rule and the facility default use the facility itself (the service refuses another site's printer). Other tiers (workstation, location, client) choose the site, from the performing labs; naming a site's printer needs `config:print-routing:manage` at that site. **A report prints only at the lab that performed it:** at release, a rule naming another lab's agent printer is skipped for that lab's reports, so the next matching tier, or the facility's default, applies (`dispatchPrintJob.ts`). The server applies the same rule. Redirect uses the jobs' own performing lab (`PrintJob.performingFacilityId`, set at release since Batch 553): a report never prints at another lab, and the queue service refuses it. Jobs from more than one lab, or queued before Batch 553, can be redirected only to a printer address.
- **New destinations default to an agent printer**, the way that works from the cloud. A printer address stays possible, for a PathScribe server inside the hospital's network.
- **Sending:** the API server hands an agent-printer job to the site's agent (§4). From the browser, or any process here, such a job fails at once with "needs the site agent", not retried, and goes to the exception queue and its fallback, as a direct network print from the browser does (`attemptPrintDelivery.ts`).
- **A printer removed from the site's list** after being chosen is still shown on the rule, with a warning to choose another.
- **Server checks (phase 2e):** when it records a rule, a default or a Redirect, and again when it hands a job to the agent, the server checks that the printer is on that site's list and is a report printer. The browser checks the shape and the site only. A printer that has gone fails the job to the exception queue and its fallback.
- **Audit:** a Redirect is logged with the printer's name, id and site (`printDestinationAuditText`), since the name can change.
- **One printer:** when the site has exactly one report printer, the rule window and Redirect pick it (rule 8).

**Protocols:**
- **Raw 9100 and LPR:** as today's transports.
- **IPP:** plain HTTP, only where the printer offers nothing else.
- **IPPS (IPP over TLS):** preferred where the printer supports it.

Each printer is checked at setup to accept PDF directly. Raw and LPR send the PDF as is.

**Share credentials stay on site.** Either the agent's service account has access to the share, or a credential is entered by the hospital's IT at installation and kept in Windows Credential Manager. A share entry names it only by `credentialRef`. PathScribe never receives or stores it.

**Least privilege:** the agent runs as a group managed service account (gMSA) with only printer and share access, and no interactive sign-in.

## 4. Getting work, at most once

- **The connection:**
  - The agent holds an outbound WebSocket to `/hubs/agent` on its own host (§2), and jobs are pushed to it. It is a separate hub from the browsers' `/hubs/live` (`LIVE_UPDATES_SIGNALR.md`).
  - If WebSockets are blocked by the hospital's proxy, it long-polls `GET /api/agent/jobs?wait=30`.
- **Claim and lease:**
  - The agent claims a job (`POST /api/agent/jobs/{jobId}/claim`) when it is about to work on it. The claim gives it a 120 s lease, which it renews every 40 s while it works (`POST .../renew`).
  - It holds at most 20 claimed jobs.
  - Each claim mints the job's download links, valid for 15 minutes.
- **At most once:**
  - Just before it sends anything to a printer or share, the agent writes "started" for the job's `idempotencyKey` to its local store and flushes it. It then tells the API (`POST .../started`).
  - **A job reported started is never sent again by itself.** If the agent stops (a crash, a restart) before it knows the result, it reports **`IN_DOUBT`** on restart. The job goes to the exception queue for a person to check the printer and reprint if needed.
  - The API applies the same rule. A lease that lapses on a job **not** reported started is offered again, with the same `jobId`; this doesn't count as a failed attempt. A lapsed lease on a job reported started is `IN_DOUBT`.
  - While a connected agent holds a job's lease, the API neither offers it again nor sends its fallback.
  - A result that arrives after the job was dead-lettered and its fallback sent is recorded, and flagged in the exception queue as a possible duplicate.
- **Order:** jobs for one printer are given out in order (`printer:{destinationId}` on the bus, `MESSAGE_BUS_API.md`).
- **Expiry:** a job not started by its `expiresAt` is returned `EXPIRED`, not done late.
  - Report prints expire 4 hours after creation; label prints after 10 minutes, because a label printed late risks going on the wrong cassette or slide.
  - Expiry is judged on the server's clock: each job carries `serverTime`, and the agent corrects its own clock's offset (`clockOffsetMs`, `jobStartable`).
  - An expired job goes to the exception queue, with the fallback channels for a report, and an alert.
- **Where documents come from:** document links point at the API or its document store, which must be in the site's allowed download hosts and the hospital's outbound allow-list. Where the hospital won't allow the storage host, the API streams the file through its own host instead.

## 5. The jobs (version 1)

| Kind | What the agent does | Outcome |
|---|---|---|
| `print.report` | Downloads the PDF (`document`) and checks its SHA-256 (`DOCUMENT_INTEGRITY` if it doesn't match: never printed). Sends it `copies` times. Paper source and duplex go as IPP's `media-source` and `sides`; on Raw or LPR, as a PJL header where the printer takes one, otherwise not at all (recorded at setup). | `printed` when the printer confirms it (IPP or IPPS job state "completed"); `sent` when it took the data but can't confirm (Raw 9100, LPR) |
| `print.label` | Removes printer-configuration commands (`^NS`, `~WC`, `^JU`) from the ZPL, then sends it to the label printer on Raw 9100. The label's own `^PQ` sets the count. | `sent`, or a printer state or refusal (`PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `MALFORMED_ZPL`, `INVALID_GS1`) where the printer reports one |
| `share.write` | Checks its local done-log first: a key already written is reported again, not written twice. Downloads each file and checks its hash. Writes it as `.part`, then renames it, never overwriting (`_2`, `_3` on a clash, as file drop does today). The metadata JSON carries the `idempotencyKey`, so a receiver can de-duplicate too. | `written`, with the names actually written |

- **"Sent" is not "printed."** The Print Queue shows a Raw 9100 or LPR job as "Sent to printer", and an IPP job the printer completed as "Printed". This matters for clinical reports, so where a site can, its report printers use IPPS.
- **Results:** `POST /api/agent/jobs/{jobId}/result` (`AgentJobResult`), idempotent on the job and attempt.
- Nothing is left on the agent's disk after a job, apart from what store and forward needs (§7).

**Where results show** (the API maps them; phase 2d adds the fields and statuses marked *new*):

| Agent result | `PrintJob` (report) | `PrintJobStatus` (labels, `LIVE_UPDATES_SIGNALR.md` §10) | File drop |
|---|---|---|---|
| `printed` | `PRINTED`, confirmation `printed` *(new field)* | `PRINT_SUCCESS` | — |
| `sent` | `PRINTED`, confirmation `sent` *(new)*: "Sent to printer" | `PRINT_SUCCESS`, with "sent, not confirmed" *(new)* | — |
| `written` | — | — | delivered; `ReportDeliveryStatus` gains `WRITTEN` *(new)* for Audit Log users (`LIVE_UPDATES_SIGNALR.md` §12) |
| `failed` | `FAILED` with the code | the printer state, where it has one | failed with the code |

## 6. Failures

| Error | Retried? | Why |
|---|---|---|
| `PRINTER_UNREACHABLE`, `PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `DOCUMENT_UNAVAILABLE`, `SHARE_UNREACHABLE`, `SHARE_FULL`, `AGENT_ERROR` | yes | Usually temporary |
| `PRINTER_REJECTED`, `DOCUMENT_INTEGRITY`, `SHARE_ACCESS_DENIED`, `UNKNOWN_DESTINATION`, `EXPIRED`, `MALFORMED_ZPL`, `INVALID_GS1` | no | Retrying can't help: straight to the exception queue and the fallback channels |
| `IN_DOUBT` | no | It may have printed: a person checks the printer, and reprints if needed |

- `agentFailureRetriable` decides which errors are retried.
- **Labels are never retried by themselves**, whatever the error, so a label can't print twice (Pete, Sep 26). A failed label waits for a person's Retry.
- **Reports and file drops** are retried on the lab's delivery schedule: 1, 5 and 15 minutes by default, up to 10 retries, set in Delivery Rules → Retries (`deliveryRetryPolicy.ts`). After the last retry, the job is dead-lettered: its fallback channels are sent, and Admin and Lab Director are alerted, as report delivery already does (`REPORT_DELIVERY_API.md` §3.2).

## 7. When the API can't be reached

- **Claimed jobs carry on.** The agent keeps working on what it has claimed: a printer on the hospital network doesn't need the cloud.
- **Store and forward:** jobs, "started" marks, the share done-log and results are kept on the agent's disk until they are reported.
  - They are encrypted with Windows DPAPI at machine scope, so a service-account password reset can't lose them.
  - Results are sent in order when the connection is back, and the API takes each once (by job and attempt).
- **New work waits.** The agent never invents work. Anything not yet claimed waits in the API, and a job that expires meanwhile is handled as in §4.
- **Visible on site:**
  - The heartbeat reports how many results are waiting to be sent.
  - When the agent has been unable to reach the API for 15 minutes, it also writes to the Windows Event Log, for the hospital's monitoring.

## 8. File-share pickup

A share with `direction: 'pickup'` is watched for files matching its rule (`SharePickupRule`):
- **Wait until it's finished.**
  - A file is taken only once its size and modified time haven't changed for 30 s (`fileIsStable`), and the agent can open it exclusively. A file its writer still holds open is left for the next scan.
  - A file larger than its limit (50 MB by default) is left in place, with one alert per file.
- **Hand over data, not a stored file.** The content goes to the site's interface engine channel, or to the API's import for a kind of **data** file, such as orders or results (`handTo`).
  - PDFs and images aren't picked up: they stay links (`BLOB_STORAGE_API.md`).
  - PathScribe doesn't keep the file as an attachment.
- **Once only.**
  - The handover carries a key made of the share, the name, size, SHA-256 and modified time (`pickupIdempotencyKey`).
  - The receiver keeps keys for 7 days and takes each once. This duty applies to the engine channel and the API import alike (`INTERFACE_ENGINE_EDGE.md` §4.3).
  - A fixed-name daily file with a new modified time is still taken.
  - A crash between handing over and moving the file can't take it twice.
- **Then move it.**
  - After the receiver confirms, the file is moved to a `processed` sub-folder (the default).
  - Deleting is possible but not recommended for clinical files.
  - A refused file goes to the rule's `rejected` folder, with an alert.
  - Neither sub-folder is scanned.

## 9. Updates, health and audit

- **Updates:**
  - **Checking:** the agent checks `GET /api/agent/update` daily (`AgentUpdateManifest`).
  - **Verifying:** it installs a newer version (`isNewerVersion`; anything but a plain dotted version, such as `1.3.0-rc`, is never newer) only if all three checks pass:
    - the installer is Authenticode-signed with ForMedrixAI's publisher certificate (pinned by thumbprint);
    - it matches the manifest's SHA-256;
    - the manifest's Ed25519 signature verifies. The signature covers the whole manifest as canonical JSON and is made by a release key named by `keyId`. The agent carries the current and next public keys, so keys can be rotated.
  - **Timing:** each site installs only within its update window. Pilot sites get a release first, then everyone.
  - **Rollback:** the previous version is kept. The agent rolls back if the new one fails to start, or to reach the API, within 10 minutes.
  - **Too old:** an agent older than the API's lowest contract version is told to update.
- **Heartbeat:** every 60 s, `POST /api/agent/heartbeat` (`AgentHeartbeat`) reports:
  - its version;
  - queued jobs, and the age of the oldest;
  - results waiting to be sent;
  - for each printer and share, whether it is reachable and how many jobs wait for it;
  - certificate expiry and free disk.

  The agent and site come from its certificate, and the heartbeat carries no patient data.
- **Status** (`agentStatus`):
  - **offline:** no heartbeat received for 180 s, by the server's clock;
  - **degraded:** a printer or share with jobs waiting is unreachable, a job has waited more than 10 minutes, disk is below 15%, or the certificate expires within 14 days. A printer switched off overnight with nothing waiting isn't a fault;
  - **online:** otherwise.

  Status shows in the Print Queue, the delivery exceptions and the system health page (phase 2d). A change to offline or degraded alerts Admin and Lab Director once.
- **Audit:** enrolment, renewal, revocation, configuration changes, each job's result (by id, with no patient data in `detail`), every update installed or rolled back, and each file picked up.
- **Logs:** the agent's local logs carry job ids, never document content or patient names.

## 10. The browser's workstation bridges (F4)

- **The bridges:**
  - **Workstation agent:** `wss://127.0.0.1:9100-9102`, and `https://` on the same ports for the scale.
  - **QZ Tray:** `wss://localhost` and `wss://localhost.qz.io`, on ports 8181, 8282, 8383 and 8484.
- **What the policy allows (since Batch 546):**
  - Every deployment's Content-Security-Policy allows these loopback origins (`WORKSTATION_BRIDGE_ORIGINS`, `deploy/security-headers/securityHeaders.mjs`).
  - A deployment on plain http also gets QZ Tray's `ws://` ports.
  - A deployment with neither bridge sets `"workstationBridges": false` in its origins file.
  - The scale's address (`agentBaseUrl`) must use `127.0.0.1`, as the agent does, not `localhost`.
  - A workstation agent moved to another port (a printer profile's `agentPort`) needs that origin added under `connect`.
- **Browser permission:** recent Chrome and Edge versions ask the user's permission before a page reaches a local address (Local Network Access). Hospital IT can pre-approve PathScribe with the `LocalNetworkAccessAllowedForUrls` policy.

## 11a. Managing agents from the browser (Batch 552, PS-539 phase 2d)

Source of truth for the wire types: `src/services/siteAgent/siteAgentAdmin.ts`. A **site** is a performing-lab facility; `siteId` is its facility id.

| Call | Capability (at the site) | What it does |
|---|---|---|
| `GET /api/sites/{siteId}/agents` | `config:site-agents:enroll` or `config:site-agent-config:manage` | The site's agents (`SiteAgentSummary`): machine, version, enrolled, certificate expiry, revoked, the last heartbeat and when it was received, and `status` worked out by the server's clock (§9; the browser uses its own clock only if `status` is missing). |
| `GET /api/agents` | either, per agent's site | Every agent the user may see (the Print Queue's status line); the server filters by the user's facilities, and the browser filters again. |
| `POST /api/sites/{siteId}/agent-enrollment-codes` | `config:site-agents:enroll` | A one-time code (§2), shown once; the server keeps only its hash. Audited. |
| `POST /api/agents/{agentId}/revoke` `{ reasonCode, note? }` | `config:site-agents:enroll` at the **agent's own site, which the server takes from its record**, never from the request | Cuts the agent off at once (§2). Audited with the reason. *Batch 553:* `reasonCode` is one of `replaced`, `retired`, `compromised`, `movedSite`, `enrolledByMistake`, `other` (`REVOKE_REASON_CODES`); `note` (up to 500 characters) is required for `other` only. |
| `GET` / `PUT /api/sites/{siteId}/agent-config` | read: either; write: `config:site-agent-config:manage` | The printers and shares the agent fetches (§3). Values are trimmed before saving; ids are unique; a label printer is ZPL on Raw 9100; IPv4 or host names only (an all-numeric or hex name such as `10.1.1` or `0x7f.0.0.1` is refused); share paths `\\server\share\…` with no `.`/`..`/blank segments, not this machine, a device path or a drive's admin share; pickup patterns are file names only and never PDFs or images. Audited. The local allow-list (§3) still decides on the machine. |
| `GET /api/sites/{siteId}/agent-printers` *(Batch 553)* | `config:print-routing:manage` (routing rules), `config:print-settings:manage` (the facility default) or `print:job:redirect` (Redirect), at the site | The site's printers only (`AgentPrinter[]`, no shares), for choosing where a report prints. The browser offers report printers only. Not audited (a read). |

**Also in the configuration** (*Batch 553*):
- `updateWindow` `{ start, end }`: `HH:mm` in the site's local time; both or neither; not equal; it may cross midnight. The agent installs a new version only inside it.
- A pickup share's `handTo` `{ kind: 'apiImport', importKind }` takes `orders` or `results` (`PICKUP_IMPORT_KINDS`); anything else is refused. Engine channels are free text; the screen offers the channels already used on the site.

Errors: 400/422 invalid, 401 session ended, 403 not permitted, 404 not found.

**The screen** (Configuration → System → **Site agents**, Workstation & Hardware): the site is the facility chosen in the group's picker; with "All facilities" it asks for one. Status refreshes every minute. The enrolment code is shown once, with Copy (and a note if the browser refuses to copy). Revoke asks for a reason inline, because it can't be undone: one of six quick picks, with a note needed only for "Other" (Batch 553). Printers, shares and the update window (Batch 553) are edited as a draft and saved together; leaving or changing facility with unsaved edits asks first. A pickup share hands over to an import picked from a list, or an engine channel (the channels already used are offered; Batch 553). Credentials are never entered: a share names its Windows Credential Manager entry (`credentialRef`) only. **Planned:** instruments (version 2).

## 11. Contract tests

The API's contract tests run every rule above against a test agent:
- enrolment and revocation;
- claim, lease, renew, `started` and `IN_DOUBT`;
- expiry by server time;
- the retry rule, with labels manual only;
- the allow-list refusals;
- pickup de-duplication;
- results after a dead letter;
- heartbeat status.

## 12. Acceptance tests (Pete's D3 check first)

**The staging machine:**
- domain-joined Windows Server, with the agent as its gMSA;
- behind a proxy, with no inbound ports;
- at least one physical report printer and one label printer of a model the first sites use (IPPS or LPD simulators may be added, but can't prove "Printed");
- a Windows file server with a write share and a pickup share.

**Evidence:** for each test, the job records, the audit entries and a photo or scan of the output, signed off by the person who ran it. Kept with the release.

1. **Network print routing (Pete's check):**
   - **Routing:** a released report follows its routing rule at each tier (workstation, location, client, facility) to the right agent printer. Redirect sends it to another printer on the site's list.
   - **Confirmation:** Raw and LPR show "Sent to printer"; IPPS shows "Printed".
   - **Labels:** a label prints on the label printer, once.
   - **Bad file:** a PDF whose hash doesn't match is refused and never printed.
   - **Expired link:** a job whose download link has expired fetches a new one through its claim and prints.
   - **Crash:** stopping the agent just after "started" gives `IN_DOUBT`, with no second print. A lease lapse before "started" is printed once.
   - **Agent down:** a report goes to its fallback channels once it expires.
2. **File-share pickup and write (Pete's check):**
   - **Slow copy:** a file copied slowly into the pickup share, or held open by its writer, is taken only once complete, handed over once, and moved to `processed`.
   - **Repeats:** the same file dropped again with the same modified time isn't taken again. A new day's file with the same name is taken.
   - **Oversized and refused files:** an oversized file stays, with one alert. A refused file goes to `rejected`.
   - **Crash during pickup:** a crash between handover and move doesn't hand the file over twice.
   - **Access:** shares work both through the gMSA's own access and through a Credential Manager entry.
   - **File drop:** a file drop writes the PDF and its JSON without overwriting. A crash after the rename doesn't leave a `_2` copy.
3. **Enrolment:** a used or expired code is refused, and repeated wrong codes are rate-limited. A revoked agent is cut off at once. The certificate renews 30 days before expiry with no gap.
4. **No inbound port:** with every inbound port closed, the agent receives jobs over its outbound connection, and over the long poll when WebSockets are blocked.
5. **Allow-list:** a configured printer outside the allowed subnets or ports, a share outside the allowed roots, or a download from another host is refused, and alerted.
6. **Store and forward:** cut the internet link while a job prints. The result is reported once the link is back, and taken once. A job that expires while the agent is cut off goes to the fallback channels.
7. **Failures:**
   - An unplugged report printer is retried on the lab's schedule, then dead-lettered with an alert and the fallback sent.
   - A failed label waits for a manual Retry.
   - A denied share goes straight to the exception queue.
8. **Updates:** a tampered installer, a wrong signature or a manifest signed with an unknown key is refused. A version that fails to start is rolled back.
9. **Heartbeat:** a printer with jobs waiting that is switched off shows degraded within a minute. Stopping the agent shows offline after 180 s.
10. **Browser (F4):** under the shipped policy, the workstation agent and QZ Tray connect in Chrome and Edge, and print a label.

## 13. Status

| Part | Status |
|---|---|
| This contract and `siteAgentContract.ts` | **Written, Batch 546** |
| F3: network report printing from the browser fails cleanly and goes straight to the fallback | **Fixed, Batch 546** (printing itself needs the agent) |
| F4: the CSP allows the workstation agent and QZ Tray | **Fixed, Batch 546** (test 10 still to run in a browser) |
| The agent (.NET Worker Service), its installer and the agent CA | **Planned** (India team, phase 2e) |
| The Site agents screen: agents and status, enrolment code, revoke, printers and shares (§11a); "Sent to printer" and agent status in the Print Queue | **Done, Batch 552** (browser side; the API's endpoints are phase 2e) |
| Agent printers in routing rules, the facility default and Redirect (`{siteId, destinationId}`, §3); the update window, quick-pick revoke reasons and the hand-over picklist (§11a) | **Done, Batch 553** (browser side; `/agent-printers` and sending to the agent are phase 2e) |
| Version 2: instruments and analyzers (ASTM, HL7 over serial or TCP) | **Planned** (after version 1, D3) |
