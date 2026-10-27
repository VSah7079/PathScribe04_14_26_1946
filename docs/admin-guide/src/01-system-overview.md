---
chapter: 1
id: ch1
title: System Overview and Architecture
---

# System Overview and Architecture {#ch1}

This chapter is for the administrator or engineer who is planning a PathScribe deployment. It says what the parts of PathScribe are, how data moves between them, what a site has to provide, and what the security controls are. It describes what the product does today. Anything that is not built is labelled **Planned** or **Not built**, and the chapter says where the nearest working feature is.

## How to use this guide {#ch1-how-to-use}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > How to use this guide

**Status:** Built (this guide and the in-app Help button).

**The chapters follow the setup order.** Chapter 2 covers Tier 1, Chapter 3 covers Tier 2, and so on to Chapter 8, which covers Tier 7. Chapter N documents Tier N-1. If you set a site up from the first chapter to the last, each screen you reach has the screens it depends on already configured. Chapter 9 holds the appendices (audit log reference and glossary).

**Every screen has a Setup sequence box.** Each maintenance screen in this guide carries three lines:

- **Setup step:** the screen's place in the order, for example "Tier 2, step 6". A screen that is a log, a queue or a dashboard used day to day says "Reference, not part of setup".
- **Requires:** the screens that must be configured first. Each one is a link. The guide also says what happens if you skip it (an empty drop-down list, or a save that is refused).
- **Unlocks:** what the screen makes possible once it is configured.

**The master Setup order page.** [Setup order](setup-sequence.html) (`setup-sequence.html`) lists every screen in the order you should configure it, built from those three lines. Use it as a checklist for a new site.

**The Help button.** **Built.** A **Help** button sits at the top right of every Configuration screen and opens this guide at that screen's own section in a separate window that remembers its place (a new tab if the browser refuses a window), so unsaved edits are not lost. It follows the open tab and sidebar section: on the Staff tab's Role Dictionary it opens the [Role Dictionary](#screen-staff-roles) section, and on **System > Departments** it opens [Departments](#screen-departments). The Migration Jobs screen has one under its title. The button opens `go.html#<screen id>`, where `<screen id>` is the screen's id in this guide (for example `screen-departments`); `go.html` is produced by the guide's build and finds the right chapter page. Screens outside Configuration that have a section here (the Audit Log, Batch Management, Lockbox Drop-Off and others) are opened by an open-book button in the top bar, beside the microphone. A test fails if a Configuration tab or section has no section in this guide, so a new screen cannot ship undocumented.

**Status words.** Every screen and every part of this chapter uses one of five fixed words:

| Status | Meaning |
|---|---|
| **Built** | Works on the demonstration data and has a written service contract (`docs/architecture/*_API.md`) for the production server. |
| **Demonstration** | Works on the demonstration data in the browser only. The production server side is not connected yet. |
| **Partial** | Part of what the heading says is built. The section lists exactly which part. |
| **Planned** | Not built. A short paragraph says what is intended and what is known about timing. |
| **Not built** | Asked for, but no screen or contract exists. The section says so in one sentence and names the nearest thing that does exist. |

Read "Built" with care. It means the browser side works and the contract for the server is written. It does not mean the production server exists. The next part of this chapter says what the production server's state is today.

**FORMEDRIXAI INTERNAL ONLY.** Some settings may be changed only by ForMedrixAI deployment or service engineers. They are the capabilities in the `platform:` domain, or any capability marked `platformOnly`, and screens shown only to such staff. In this guide their heading starts with `[FORMEDRIXAI INTERNAL ONLY]` and the section opens with a boxed notice that says who may change the setting and why it is restricted. The customer edition of the guide leaves those sections out. The internal edition keeps them. If you are a customer administrator and cannot see a setting that a ForMedrixAI engineer mentions, it is probably one of these.

## Executive summary {#ch1-executive-summary}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Executive summary

**Status:** Partial. The browser application is built. The production API server, database schema and always-on services are specified in written contracts and are not built yet (see [The state of the product today](#ch1-current-state)).

PathScribe is an AI-assisted clinical pathology reporting and laboratory information system (LIS) from ForMedrixAI LLC. It is built for the US, the UK, the EU and other markets, and the screens are translated into six languages (English, French, German, Dutch, Korean and Spanish; the translations other than English still need review by native speakers before clinical use).

A case runs in one of two modes, decided per case:

- **CoPilot.** PathScribe is a synoptic data-capture layer on top of a host LIS. The host LIS owns the case and the final report, and PathScribe feeds structured synoptic data back to it.
- **Orchestration.** PathScribe owns the case from end to end as a lightweight LIS, including AI-assisted narrative. It is used for outreach cases that have no host LIS.

What an administrator controls is the configuration: staff and roles, the dictionaries and lookups, the workflow rules, AI behaviour, report templates, interfaces and billing rules. The chapters that follow document those screens in the order a site is set up.

Three facts matter for planning:

1. **The production database is Microsoft SQL Server**, reached through a PathScribe API server built on ASP.NET Core, with live updates over SignalR. PathScribe does not use Firebase as its production database. Some Firebase files remain in the repository from earlier work and are to be replaced.
2. **Hosting is the customer's or ForMedrixAI's choice.** The design uses standard parts (containers, SQL Server, TLS certificates) and does not depend on one cloud provider. A site can use a public cloud, a private or sovereign cloud, or its own data centre.
3. **PathScribe cannot yet be deployed to production.** The browser application is complete enough to demonstrate and to test against contracts. The server that would hold real patient data is not built. Plan a first deployment as a joint project with ForMedrixAI, not as an installation.

## Architecture blueprint {#ch1-architecture}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Architecture blueprint

**Status:** Partial. Each part below carries its own status.

### The parts {#ch1-parts}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Architecture blueprint > The parts

| Part | What it is | Status |
|---|---|---|
| **Browser application** | A React and TypeScript single-page application, served as static files. It holds no keys and, when an API server is configured, writes no patient data to browser storage. One build serves every site: each site's settings come from a `config.json` file beside `index.html`. | Built |
| **PathScribe API server** | ASP.NET Core. It enforces permissions, holds the sign-in session, runs the database transactions and scheduled jobs, and calls the AI vendors, the report renderer and the interface engine. | Planned. Contracts are written in `docs/architecture/*_API.md`. There is no server code in the repository. |
| **Live updates hub** | A SignalR hub on the API server at `/hubs/live`. It tells open screens that something changed, using identifiers only and never patient text. | Planned. The browser side is built and tested against a test hub. |
| **Database** | Microsoft SQL Server. | Planned. No schema or scripts are in the repository. |
| **Interface engine** | BridgeLink, an open-source fork of Mirth Connect (a Java server). PathScribe hands it a JSON message; the engine builds and sends the HL7 and receives replies. | Partial. The message contract is written. The engine is not yet deployed or connected, and the demonstration build uses a mock engine. |
| **AI proxy and AI vendors** | The API server forwards AI requests to the configured vendor and adds the vendor key, which the browser never holds. | Partial. The browser side and the per-jurisdiction vendor check are built. The server routes are Planned. |
| **Report renderer** | A service that turns a released report into a PDF, using headless Chromium driven by Playwright. | Planned. Only a development stand-in exists. |
| **Site agent** | A Windows service installed at each site. It connects outward over HTTPS and prints reports and labels to network printers and writes files to Windows shares. | Partial. The administration screens and the contract are built. The agent itself is Planned. |
| **Workstation print bridges** | QZ Tray or the PathScribe workstation agent, running on a bench computer to print labels to the printer beside it. | QZ Tray: Built (labels print through it). Workstation agent: Built (browser side). |
| **Whole Slide Imaging (WSI) viewers** | The vendor's own viewer application (for example Leica, Roche or Hamamatsu). PathScribe tracks scan batches and opens the vendor's viewer in a new browser tab for the right slide. It never draws slide images. | Built (launch link). Scan-batch status updates need the hub. |

### How data flows {#ch1-data-flow}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Architecture blueprint > How data flows

```
 Hospital or lab network                         PathScribe hosting (cloud or on-premises)
 -----------------------                         ----------------------------------------
 Bench workstation                               Static web host (browser app, config.json)
   Browser app  --- https ---------------------> PathScribe API server (ASP.NET Core)
     |   ^                                         |        |         |          |
     |   +---- wss /hubs/live (SignalR) <----------+        |         |          |
     |                                                      |         |          |
     +-- QZ Tray / workstation agent (localhost)            v         v          v
         labels to the printer beside it                SQL Server   AI proxy   Report renderer
                                                         (database)    |        (Chromium PDF)
 Site agent (Windows service) --- https, outward ------>     |         v
   report and label printers, Windows shares                 |    AI vendors (per jurisdiction policy)
                                                             |
 Interface engine (BridgeLink) <---- JSON ---- API server ---+
   HL7 to and from the host LIS, EMR, instruments
   (hosted by ForMedrixAI, or installed at the hospital)
```

How to read it:

1. **Browser to API server.** Every action goes through the API server with the signed-in user's identity. The browser's own permission checks only hide buttons; the server decides. The server returns fixed error codes (`NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`) and never sends back text that could name a patient. Patient names and identifiers travel in a request body, never in a web address.
2. **API server to hub to browsers.** After a database change commits, the server writes an event to an outbox table in the same transaction. A dispatcher then publishes it through the hub. The event carries identifiers only. A screen that receives it re-reads the data through the normal, permission-checked call. The first screens to use it are the operating-room Live Board and the Intraoperative Queue; the design target is under 500 milliseconds from commit to the second board. Without a hub, the same screens poll (every 15 seconds on the intraoperative screens).
3. **API server to AI.** The browser calls `/api/ai/...` on its own origin. The server adds the vendor key, checks the jurisdiction's vendor and region policy, forwards the request and writes an audit record that holds no prompt text.
4. **API server to interface engine.** The API server sends a JSON envelope with a transaction type (15 outbound types are listed in `INTERFACE_TRANSACTIONS.md`). The engine maps it to HL7 and sends it. PathScribe never builds HL7 for the wire itself. HL7 traffic stays in the engine's own message store, not on the PathScribe message bus.
5. **API server to site agent.** The site agent is the only way a cloud-hosted server reaches a printer or share inside the hospital. It connects out to the server over HTTPS with a client certificate, so no inbound firewall opening is needed.
6. **Reports.** The server renders every PDF that leaves PathScribe, stores one immutable, hashed document per release, and sends that same document by every channel. The browser shows a preview that is built to match what is sent.

### Hosting and scale {#ch1-hosting}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Architecture blueprint > Hosting and scale

**Status:** Planned. This is the design in `DEPLOYMENT_READINESS_REVIEW.md`; none of it has been deployed.

- **Two supported ways to host.** A public cloud, using the provider's managed database and container hosting where it fits. Or a portable package: the same containers on Kubernetes or Docker in a private cloud, a sovereign cloud or the hospital's own data centre. The package is validated once, and each hosting location then gets an installation qualification checklist.
- **Always-on parts.** The API (at least one warm instance), the database (never auto-paused in production), the live-updates hub, the report renderer, and the interface engine that holds HL7 connections. Scaling to zero is not compatible with a one-second screen refresh or with STAT cases at night. Recurring jobs (retries, release timers, expiry checks) can run as short scheduled tasks.
- **Scaling the hub.** Shared SaaS uses Azure SignalR Service. Private cloud and on-premises use a Redis backplane, or a single instance. Without Azure SignalR Service the load balancer needs sticky sessions and WebSockets enabled with an idle timeout above 15 seconds. The development team is still to confirm this matrix.
- **The interface engine runs either way** (decided Oct 13, 2026): hosted by ForMedrixAI in the tenant's region, or installed at the hospital, from the same container image.
- **One build, many sites.** `npm run build:server` makes the build for production. It contains no demonstration accounts or demonstration tools. Each site's addresses and sign-in settings go in its `config.json` (37 settings, listed in `RUNTIME_SETTINGS`), served with `Cache-Control: no-store`. PathScribe refuses to start, and names the wrong settings, if the file breaks a rule (for example an address that is not `https://`).
- **Browser security headers.** The Content-Security-Policy, HSTS and the other headers are generated for nginx, IIS and Azure App Service, Azure Static Web Apps, Azure Front Door, or a plain list, from one definition in `deploy/security-headers/`. After you change an address in `config.json`, run the generator again so the new address is allowed.
- **Schema changes** are versioned SQL scripts applied by the release pipeline, never at application start-up, and each change leaves the database usable by the previous version.

## The state of the product today {#ch1-current-state}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > The state of the product today

**Status:** Demonstration for almost every data screen; see the table below for exceptions.

Read this part before you promise a customer a go-live date. It was checked against the repository on Oct 21, 2026.

**What runs today.** The browser application runs on **browser-held demonstration services**. About 170 service folders in `src/services/` follow one pattern: an interface, a demonstration version that keeps its data in the browser, and (for nearly all of them) a server version that calls the API. The application picks the server version when `VITE_API_BASE_URL` is set in `config.json`, and the demonstration version otherwise. When an API server is configured, demonstration data is kept in memory and not written to browser storage.

**What is connected to a production API.** None. The server versions exist in the browser code and have fake-server tests that check every route, but the API server that would answer them is not in the repository and has not been built (the work is assigned to the India team, from the contracts). Nothing has been tried against a real server. Server-side versions in the browser code are written for all but three services:

| Service with no server version yet | Why |
|---|---|
| Action registry (voice and hotkey matching) | Synchronous and in memory. Only its saved settings would go to the server, through the configuration service. |
| AI instruction service | Its rules run in the browser over injected storage; storage goes through the configuration and audit services. |
| Interface dictionary service | Same: rules run in the browser. Storage goes through the configuration and audit services. |

Live updates already use SignalR in the browser (`signalRLiveUpdateService.ts`), but the hub is not built.

**What blocks a production deployment** (from the readiness review, status at Batch 641):

| Blocker | State |
|---|---|
| API server and SQL Server schema | Open. Not started. |
| Blob storage for report PDFs, exports and held releases | Contract written. Storage and endpoints open. |
| Server-side scheduled jobs (about ten timers) | Open. Until each job moves, the browser runs it while someone is signed in. `VITE_SERVER_JOBS` hands a job to the server by name. |
| Report renderer service | Cytology template done. The hosted service is open. |
| Sign-in through the server (backend-for-frontend), runtime identity-provider configuration | Runtime configuration done. The server part is open. |
| Interface engine, always-on, with the edge rules | Contract written. Hosting and endpoints open. |
| Site agent | Contract and screens done. The agent is open. |
| Hub and push updates | Browser side done. The hub is open. |
| Retire the earlier Vercel `api/` functions, Firebase services and `functions/` | Open. Three screens (Engraver Monitor, QA deficiency list, material tracking history) still read Firebase-backed services. |

Other open items an administrator should know about:

- **The browser enforces permissions today, and the server enforcement is not built.** The capability checks run in the browser's services. A server must repeat every check before real patient data is held. See [Security model](#ch1-security).
- **Screen-reader testing by a person has not been done.** Automated accessibility checks (WCAG 2.1 A and AA rules, in Chromium) pass, but a person has not yet tested with NVDA or VoiceOver (PS-687).
- **Firefox has not been run through the automated suite** in the build workspace. A hand check in Chrome, Edge and Firefox is open (PS-718).
- **Translations** in French, German, Dutch, Korean and Spanish need native-speaker review before clinical use.
- **The continuous-integration pipeline** is written but runs only once the repository is on GitHub (planned for the end of October 2026).

## System prerequisites {#ch1-prerequisites}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > System prerequisites

**Status:** Partial. The repository holds the software, network and browser requirements. It holds **no sizing figures** for servers, database storage, bandwidth, backup or recovery. Where this part says "Not yet specified", no figure exists in the repository and none is invented here; the open items are in the chapter's open-questions file for ForMedrixAI to decide before a customer plans capacity.

### Server hardware and hosting {#ch1-prereq-hardware}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > System prerequisites > Server hardware and hosting

| Item | What the repository says |
|---|---|
| API server size (CPU, memory, instance count) | Not yet specified. The design asks for at least one warm instance, with business logic in class libraries and a container image. |
| Hub (SignalR) size and connection count | Not yet specified. The acceptance test uses at least 50 connected boards. |
| Report renderer | A warm pool of 2 to 4 Chromium browser processes (start with 2), a 5-second timeout per report, a browser recycled after 500 renders, no network egress, a larger `/dev/shm`, and about 100 MB of fonts (including CJK). CPU and memory per instance: Not yet specified. |
| Interface engine | BridgeLink, a long-running Java server, as a container. Size: Not yet specified. |
| Container platform | Kubernetes or Docker for the portable package; the provider's container hosting for a public cloud. Versions: Not yet specified. |
| Message broker | None. The message bus is tables in the SQL Server database, behind an interface (`IMessageBus`). RabbitMQ or a cloud queue would be added only if load testing shows the tables are a bottleneck. |
| Build tooling (for engineers who build the front end) | Node.js 24.x (`engines` in `package.json`). Not needed on a production server, which serves static files. |

### Database {#ch1-prereq-database}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > System prerequisites > Database

**Status:** Planned. No schema, scripts or database code are in the repository.

- **Engine.** Microsoft SQL Server. The same engine runs as Azure SQL Database (serverless or provisioned), SQL Server on a virtual machine, SQL Server in Linux containers (official Microsoft images for 2017 to 2025; x86-64 Linux hosts only; a licence is required), or AWS RDS for SQL Server.
- **Never auto-pause a production database.** A paused database turns the first screen of the morning, or a STAT case at night, into a failed request. Auto-pause is acceptable for test and training tenants only. On Azure SQL serverless it is turned off with `-1`.
- **Starting point for size.** The readiness review recommends a minimum of 2 virtual cores for a production tenant "until load testing says otherwise". It is a recommendation, not a tested requirement. Storage, memory, IOPS and growth per case: Not yet specified.
- **Schema changes.** Versioned scripts applied by the release pipeline before the API container starts, never at application start-up.
- **Backups.** Point-in-time restore is the design for the audit tables. Backup schedule, retention, recovery time objective and recovery point objective: Not yet specified.
- **AWS note.** AWS has no serverless SQL Server, and a changed instance class means downtime (shortened by Multi-AZ). Licence cost applies.
- **Blob storage** for report PDFs, exports and held releases: Azure Blob or an S3-compatible store, per tenant, private, encrypted at rest and in the tenant's hosting region (contract: `BLOB_STORAGE_API.md`). PathScribe stores no images or attachments, only links to the lab's imaging system.

### Network {#ch1-prereq-network}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > System prerequisites > Network

| Need | Detail |
|---|---|
| TLS everywhere | Every server address in `config.json` must be `https://`. Plain `http://` is allowed only to the same computer in a development build, or for an internal deployment that sets `"https": false` in its security-headers origins file (which then drops HSTS). |
| Browser to API and hub | HTTPS to the API server. WebSockets (`wss://`) to `/hubs/live`. Leave Server-Sent Events and long polling enabled as fallbacks, because some hospital proxies block WebSockets. Load balancers need WebSockets enabled and an idle timeout above 15 seconds. |
| Allowed addresses | `config.json` addresses (API, identity providers, hub, renderer, interface receiver, AI and terminology endpoints, error monitoring) become the browser's Content-Security-Policy. Re-run the headers generator after any change. |
| Identity provider | Reachable from the browser (and from the server, once the server holds the sign-in). Redirect addresses for Microsoft Entra ID: `https://<pathscribe host>/auth/callback/microsoft` and `https://<pathscribe host>/auth/signing/microsoft`. |
| Site agent | Outbound HTTPS (port 443) only, on its own host name (for example `agent.<tenant domain>`) that demands a client certificate. No inbound firewall opening. A TLS-inspecting proxy must pass that host through untouched, because inspection breaks the client certificate. |
| Site agent reach (set locally by hospital IT) | The printer subnets, the printer ports (default 9100, 515, 631 and 443), the UNC roots for shares, and the hosts documents may be downloaded from. PathScribe cannot change this list. |
| HL7 link | Orders in and results out use the interface engine. The link is secured with a site-to-site VPN or MLLP over TLS. A message is acknowledged only once it is stored durably. |
| Fixed outbound address | SFTP file drops need a fixed outbound IP address for the hospital's allow-list (a NAT gateway or firewall egress), and a pinned host key. |
| E-fax and email | An SMTP gateway on port 587 with authentication. |
| Bandwidth and latency | Not yet specified. The design target for a general screen refresh is 800 ms at the 95th percentile from commit to render; for the operating-room boards, under 500 ms. The first page load is 0.70 MB compressed (target 1 MB). |
| Hosting region | One region is chosen per deployment. The API server's `/api/config` can report the database and blob regions, which the AI Behavior tab shows (see [AI Behavior](#screen-tab-ai)). That endpoint is Planned. |

### Client workstation {#ch1-prereq-workstation}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > System prerequisites > Client workstation

**Status:** Built, with open checks noted.

- **Supported browsers** (decided Oct 15, 2026): current Chrome, Microsoft Edge and Firefox. **Safari is not supported.** The automated tests run in Chromium (the engine of Chrome and Edge). Firefox is run only on request, has not yet been run in the build workspace, and a hand check in all three is open (PS-718). In Chrome and Edge drop-down lists are drawn as styled panels; Firefox shows its own list. Behaviour is the same.
- **Browser features used.** WebAssembly (the spell checker), Web Workers, and (when the person grants them) camera, microphone and screen capture, for grossing photographs, dictation and enhancement-request screenshots. The Permissions-Policy header allows these for PathScribe only.
- **Label printing from a bench computer.** QZ Tray (Built) or the PathScribe workstation agent (Built, browser side) must run on the computer. They listen only on the computer itself: the workstation agent on `wss://127.0.0.1` ports 9100 to 9102, and QZ Tray on `localhost` ports 8181, 8282, 8383 and 8484. If the page cannot reach QZ Tray, the label opens in the browser's print window and a message says the label printer is not connected.
- **Allow local-network access.** Chrome and Edge ask the person's permission for local addresses. Hospital IT can pre-approve PathScribe with the `LocalNetworkAccessAllowedForUrls` policy.
- **QZ Tray prompts.** QZ Tray asks "Allow this website to use your printers?" until print requests are signed with the customer's certificate. Signing is **Planned** (it needs the API server). Until then the person may be asked once per workstation. The decision (Oct 16, 2026) is one self-signed certificate per customer, which has an expiry date that IT must renew and redeploy; see `docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md`. The steps for each device-management tool are marked "Test first" because they have not been run on a pilot machine.
- **Label printers.** Thermal printers that take ZPL. Report printers on the network are reached through the site agent. Network report printing does not work from the browser today.
- **Screen readers.** Automated accessibility checks pass; testing by a person with NVDA or VoiceOver is open (PS-687).
- **Languages.** English, French, German, Dutch, Korean and Spanish, plus Belgian Dutch and Belgian French wording.
- **Monitor size, minimum processor and memory:** Not yet specified.
- **Whole Slide Imaging viewers.** The vendor's viewer must be installed or reachable from the workstation as that vendor requires. PathScribe only opens the viewer in a new tab, using a launch address template you enter once for each viewer, with the slide's barcode filled in. It is configured in [Vendor Integrations](#screen-vendor_integrations). PathScribe ships no viewer address.

## Security model {#ch1-security}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model

**Status:** Partial. Nearly every control below is built in the browser and has a written server contract. The server that must repeat each check is not built (see [The state of the product today](#ch1-current-state)). A browser check is a courtesy; the server's check is the control. Do not describe any control here as protecting real patient data until the server side exists.

This part says what each control does. It does not say that using it makes a laboratory compliant with any law or standard. The laboratory's own policies, contracts and quality system decide that.

### Single sign-on {#ch1-sso}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Single sign-on

**Status:** Partial. OpenID Connect (OIDC): browser side Built. Server side Planned.

- **Protocol.** OpenID Connect, authorization code flow with PKCE, with the app registered as a public single-page-application client (no client secret). It is generic, so it works with Microsoft Entra ID, Okta, Ping and Keycloak. Microsoft Entra ID is the first target. The Entra authority must name a tenant: `/common`, `/organizations` and `/consumers` are refused because they would let any Microsoft account in.
- **Google** sign-in is not offered, because Google's token endpoint demands a client secret. A hospital on Google Workspace can federate Google through Entra ID or Okta.
- **Nobody is created by signing in.** Only staff who are already provisioned and active can sign in. The identity is matched to a staff record by the provider's permanent subject (Entra's `oid`, otherwise `sub`), never by email alone. The first sign-in may link by email if the email is trusted (verified, or a tenant-specific Entra authority); a setting can turn that off so an administrator links each account. Refusals (not provisioned, inactive, ambiguous, already linked, no application access) are shown with a plain message and audited. See [Members](#screen-staff-members).
- **Demonstration builds** also offer password sign-in. A production build (`VITE_AUTH_MODE` set to `sso`) has no demonstration accounts in it.
- **Tokens.** Today the browser holds the tokens in `sessionStorage` (this tab only, gone when the tab closes). **Planned for production** (decided Oct 3 and Oct 15, 2026): the API server holds the tokens and the browser gets only an `HttpOnly`, `Secure`, `SameSite` session cookie with an anti-forgery header. The browser never carries a JWT, and the hub uses the same cookie. This needs shared session storage (SQL Server or Redis) on the server.
- **Registering the app in Entra ID** (steps for hospital IT, from `AUTHENTICATION_OIDC.md`): a single-tenant registration with platform Single-page application and the two redirect addresses listed under [Network](#ch1-prereq-network), no client secret, the optional `email` claim in the ID token, and an exposed API scope granted to the application.
- **Accounts and roles from the directory.** Automatic account sync (SCIM: joiners, changes and leavers) is **Planned** for the server phase. Mapping directory groups to PathScribe roles is **Planned** for after the first release. When it comes, a group may grant only bench roles, never Admin, Lab Director, Template Approver or anything with signing authority, and each mapping needs a second administrator's approval. Today roles are assigned by hand in [Members](#screen-staff-members) and [Roles](#screen-staff-roles).

#### SAML 2.0 {#ch1-saml}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Single sign-on > SAML 2.0

**Status:** Not built.

PathScribe has no SAML 2.0 sign-in, no SAML library and no SAML screen. A search of the whole repository finds the word only in two design documents. The nearest thing that works is OIDC, above. The documented direction for shared SaaS hosting is that hospitals sign in through a PathScribe identity broker (Microsoft Entra ID External ID), which speaks SAML or OIDC to the hospital's directory and plain OIDC to PathScribe, so "PathScribe never handles SAML". That broker is **Planned** and not built. A private-cloud or dedicated deployment connects straight to the hospital's own Entra ID by OIDC. A hospital that can only offer SAML today should say so to ForMedrixAI during planning, or federate SAML into Entra ID or Okta, which then speak OIDC to PathScribe.

### Role-based access control {#ch1-rbac}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Role-based access control

**Status:** Demonstration. The checks run in the browser's services. The server-side enforcement (`AUTHORIZATION_API.md`, phase 4) is **Planned**.

- **Capabilities.** Everything PathScribe enforces is a named capability in the form `domain:object:verb`, for example `config:retention-policy:manage`. The catalog (`capabilityCatalog.ts`) is the only list and holds about 320 capabilities (322 at the time of writing; the number grows with releases). A capability is added only together with its check, and a test fails the build if a capability has no check. Each capability has a risk level. For a **high-risk** capability, every check at an action is written to the audit log, allowed or refused, and every export is high risk.
- **Roles.** A role is a set of capabilities. A staff member holds one or more roles and a facility assignment (an empty assignment means all facilities). Scope belongs to the assignment, not the role. A check passes only when a held role grants the capability, every capability it requires is also granted, and the action is within the person's facilities. A refusal gives a reason (not granted, requirement not granted, out of scope, facility unknown).
- **Built-in roles.** Sixteen: Pathologist, Resident, Fellow, Pathologist's Assistant, Admin, Physician, OR Staff, Template Author, Template Approver, Lab Director, QA Reviewer, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist and Superadmin. Physician and OR Staff are directory entries with no application access. Seeds follow least privilege: a Pathologist holds no configuration capabilities by default. An administrator can change roles and add roles in [Roles](#screen-staff-roles), except Superadmin.
- **No bypass for any role.** Superadmin is a role granted capabilities like any other, and the check has no shortcut for it. Admin does not imply anything either. Superadmin holds every capability except `config:ai-prompt:approve` (approving the AI instructions): that is withheld for separation of duties, so only the laboratory (the Lab Director) approves what its own AI is told, and ForMedrixAI support never does.
- **Superadmin is reserved for ForMedrixAI support.** It is held only through a support sign-in. A hospital cannot assign it, edit it or see it in the staff role picker, and a staff record that names it gets nothing from it. The server-side source of that identity (ForMedrixAI's own identity tenant) is **Planned**.
- **Platform-only capabilities.** Six capabilities in the `platform:` domain count only from Superadmin (cross-tenant case viewing, governing bodies, signing rules, and the interface dictionary's manage, publish and simulate). A hospital role cannot hold them. Their screens are marked `[FORMEDRIXAI INTERNAL ONLY]` in this guide.
- **Tenant boundary.** Every user and case carries an `organisationId`. Cross-tenant reach is limited to support access (below). Enforcement today is in the browser; a server-side query layer that enforces it is Planned.
- **Case privacy.** A person who cannot open a case gets the same neutral message as for a case that does not exist. A typed or pasted accession number proves nothing, and a message turns a number into a link only if the reader can open that case. The server must give the same answer (for example `404`) for "no such case" and "you may not see it", with no difference in body, headers or timing.
- **Screens.** Each screen has its own `screen:<name>:open` capability. Home and the hubs show only the tiles the person may open, and the route checks again.
- **Voice and keyboard commands** are not access control and are never used to grant access.
- **Where to administer it.** [Roles](#screen-staff-roles), [Members](#screen-staff-members) and the [Staff tab](#screen-tab-staff). Role and capability changes are audited.

### Multi-factor authentication and sign-out re-authentication {#ch1-mfa}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Multi-factor authentication and sign-out re-authentication

**Status:** Partial. Browser side Built. The authenticator for demonstration accounts is **Simulated**. Server side Planned.

- **Single sign-on users.** The identity provider asks for the second factor. PathScribe reads the ID token and accepts MFA when `amr` contains `mfa`, or names methods from two different families (knowledge, possession, inherence), or `acr` names a multi-factor class. A password alone is not MFA. If the organisation requires MFA and the token does not say so, the sign-in is refused with a plain message. The provider must be set to send these claims (Entra: a Conditional Access policy that requires MFA; Okta: an authentication policy with a possession factor; Keycloak: map the authentication level to `acr` and add an `amr` mapper).
- **Policy per organisation.** In [Session Security](#screen-session_security): who is asked (no one, the roles that sign reports, or everyone; default no one), how many minutes before a signature needs a fresh code (1 to 720, default 30), and how many hours before the second factor expires and the session ends (1 to 72, default 12). Saved with `config:session-security:manage` and audited.
- **Step up at a signature.** When the last second factor is older than the step-up time, signing asks again: a fresh code for password sessions, or a fresh sign-in at the provider (`prompt=login`) whose token must again assert MFA.
- **Demonstration accounts.** A **Simulated** time-based authenticator (RFC 6238) with recovery codes shown once. It is in the demonstration build only. A server build has no simulated factor, so a person who is not using single sign-on and is asked for MFA is told it is unavailable and cannot sign in. Reset of an enrolment needs `auth:mfa-enrolment:reset`.
- **Lockout.** Five failed codes lock the check for 15 minutes. Five failed password sign-ins lock an email for 15 minutes. These counts are kept in the browser today; the server must keep them. With single sign-on the provider applies its own lockout.
- **Sign-out authentication policy** (Built, Demonstration). Per performing facility: a password at every sign-out (the default, `strict`) or once per session (`session`, with a length of 15, 30, 60 or 240 minutes), with an optional second factor. A session ends on timeout, sign-out or a change of role. The screen warns that the once-per-session mode departs from what 21 CFR Part 11 (11.200(a)(1)) expects for later signings, so the customer's quality system decides.
- **Biometric signing** (WebAuthn, Touch ID or Windows Hello) is an optional confirmation. Each person enrols their own device and the password always works as well. The server version of the biometric calls is written but the screens do not yet use it.
- **Not built:** remote sign-out restriction by network, workstation-lock expiry of a sign-out session, SMS and hardware-key second factors, a server-side policy store.
- **Where to administer it.** [Session Security](#screen-session_security).

### Session security {#ch1-session}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Session security

**Status:** Partial. Idle time-out Built (browser). Server-held session Planned.

- **Idle time-out.** An organisation-wide default in [Session Security](#screen-session_security), chosen from 5, 10, 15, 20, 30 or 60 minutes. The default is 15. A performing laboratory can set its own value in the [Facility Dictionary](#screen-facility-dictionary). When a case is open the laboratory's value applies; elsewhere (Home, Worklist) the organisation value applies. On time-out the person is signed out, and unsaved drafts are kept, not discarded.
- **Same account, second tab.** Signing in again as the same user in another tab supersedes the earlier session in the same browser, with a prompt.
- **Server rule.** The server also ends a session whose token has expired, so a closed or frozen browser cannot keep one open.
- **Browser storage.** With an API server configured, no patient data is written to browser storage. Only display preferences, workstation settings (scan station, display profile, window positions) and the sign-in session touch it.
- **Transport and page protection.** The generated headers set a strict Content-Security-Policy (no inline script, no `eval`, no framing), HSTS on https deployments, `nosniff`, a `no-referrer` policy (addresses can carry case ids) and a restricted Permissions-Policy. Report HTML is sanitised before it is shown. The browser holds no AI, terminology or vendor key, and a test fails the build if one appears in the front end.
- **Error reports.** Crash reports can go to Sentry or a hospital's own collector, **off by default**. A report holds only an error name, a scrubbed message (no quoted text, email addresses or runs of three or more digits), at most ten stack frames, the route with numeric segments replaced, and a reference. It needs two settings in `config.json` and, for a US customer, a signed Business Associate Agreement with the provider, or for the EU and UK a data-processing agreement and EU data residency. Self-hosting avoids both.
- **Where to administer it.** [Session Security](#screen-session_security) and [Facility Dictionary](#screen-facility-dictionary).

### Support access {#ch1-support}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Support access

**Status:** Partial. Browser side Built. Server side Planned.

The hospital, as data controller, decides whether ForMedrixAI support may reach its data. "Support access" means a Superadmin session reaching an organisation the person is not a staff member of.

- **Policy per organisation.** Disabled (support gets nothing, including Superadmin), **Approval required** (the default), or Always allowed. Under Approval required, support asks per ticket with a reason of at least 10 characters. An approver in the hospital (not the requester) approves or rejects. An approval lasts the organisation's access window (30 minutes, 1, 2, 4 or 8 hours; the default is 2) or less if support ends it or the hospital revokes it.
- **The hospital's own audit stream.** Separate from the main audit log: requests, decisions, expiries, refused opens, case opens and edits, every list or search that disclosed cases (case ids; search criteria names, never values), policy changes and exports. Each entry is hash-chained to the one before it, so a changed or removed entry breaks the chain, and the screen shows the tamper check. Export is CSV or JSON.
- **Capabilities.** `config:support-access:policy`, `config:support-access:approve` and `config:support-audit:view`, seeded to Admin. Opening another organisation's case also needs `platform:cross-tenant-cases:view`, which only Superadmin can hold, and is audited.
- **Not built (server work):** the originating IP address and country (the browser records them empty), email and webhook notification to approvers (today an in-app message), ending access when the ticket closes, PDF export of the stream (CSV and JSON exist; a PDF function is written in the browser), the stream in its own append-only per-tenant table, and support session tokens bound to the ticket and expiry.
- **Where to administer it.** [Support Access](#screen-support_access).

### Audit logging {#ch1-audit}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Audit logging

**Status:** Partial. Browser side Built. Server storage Planned.

- **What is recorded.** User actions, sign-outs, amendments, voice events, system events and AI calls. Every high-risk capability check is recorded whether allowed or refused. Configuration changes by an authorised person are audited. Some record the old and new values (for example the AI vendor policy and signing-authority overrides); for many settings the log holds only the entry that the capability check was allowed, not the new value. See [System Logs](#screen-audit-log) for what each entry holds.
- **No patient data in the detail.** Audit `detail` text is literal English and is built to hold no patient names, dates of birth, MRNs or clinical values. It uses identifiers and configuration names. Passwords, codes and secrets are never recorded.
- **Server design.** Append-only tables (insert and select permissions only), each audit row written in the same transaction as the change it records, a hash-chained stream for support access, and point-in-time backups. Exported audit archives on immutable storage are a per-hospital option. **Planned:** none of it exists until the server is built. The browser version keeps the log in demonstration storage.
- **Retention.** See [Data retention](#ch1-retention).
- **Where to read it.** [System Logs](#screen-audit-log), with the interface and financial views [System Logs: interfaces](#screen-audit-interfaces) and [System Logs: financial](#screen-audit-financial).

### Redaction of patient data in support screenshots {#ch1-phi}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Redaction of patient data in support screenshots

**Status:** Built.

When a user sends an Enhancement Request, the app takes a screenshot and covers every element tagged as patient data before the image leaves the browser. Anything that shows a patient name, date of birth, MRN or national identifier, accession or case number, or patient contact or insurance detail is tagged `data-phi` with its kind. Toasts that name a case are wrapped so they are covered too. Staff names are not treated as patient data. A test reads every source file and fails the build on an untagged place, with no exception list. Limits to plan around: free text that happens to contain an identifier (audit detail, interface exception reasons) cannot be recognised by any code check, so those cells are covered as a whole; and the check reads names, not types, so a value passed through a generic list can be missed (one such case was found and fixed in Batch 368, and twenty screens were then checked in a browser).

### AI vendor policy and hosting regions {#ch1-ai-policy}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > AI vendor policy and hosting regions

**Status:** Partial. Browser check Built. Server proxy check Planned.

- **Why.** Some jurisdictions name which AI vendors are allowed or forbidden. PathScribe is vendor-neutral and checks every AI call before sending it.
- **The rule.** For each jurisdiction, and optionally each facility: the AI services allowed, and the hosting regions allowed for each service. No rule means every service is allowed. A facility rule narrows its jurisdiction's rule, and the call must pass both. Where a rule limits regions, a call whose region is not recorded is refused. The services are named by request shape: structured messages (Anthropic), chat completions (OpenAI), chat completions managed (Azure OpenAI), model gateway (AWS Bedrock), structured content (Google Gemini) and custom (a self-hosted model). The configured hosting region is saved with the AI provider setting.
- **When refused.** The feature carries on without AI and says "AI is not available for this jurisdiction" where it can. The call is never sent to a different vendor instead.
- **The server must repeat the check.** A browser check can be bypassed, so the server's AI proxy must make the same check on every route and is the one that counts. It must choose the service and region from the saved setting, never from the request body, answer `403` with code `AI_VENDOR_NOT_ALLOWED`, and audit the refusal. **Planned.**
- **Keys.** The browser never holds an AI vendor key. In production the keys live in the server's secret store (for example Azure Key Vault). The saved setting holds the provider, model, endpoint and deployment name, never a key.
- **What the server should also do (Planned):** audit each AI call (who, case, facility and jurisdiction checked, service, model, hosting region, feature, tokens, outcome; never the prompt, which can hold patient data), rate-limit per user and organisation, and check that a Business Associate Agreement or data-processing agreement is in place for the chosen provider.
- **Disclosed gap.** In the browser, a provider setting of `mock` sends AI requests to the Anthropic route through the proxy, so a demonstration site set to `mock` still calls the proxy. A jurisdiction that does not allow Anthropic refuses it.
- **Human review.** AI output is a suggestion. The screens that use it show it for the clinician to accept or reject; see the AI chapter (Chapter 5).
- **Where to administer it.** The AI vendor policy card and the hosting-regions card on the [AI Behavior](#screen-tab-ai) tab. Changing a rule needs `config:ai-vendor-policy:manage` (Admin and Lab Director by default), and each change is audited as `AI_VENDOR_POLICY_CHANGED`.

### Data retention {#ch1-retention}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > Data retention

**Status:** Partial. The settings are Built. **Nothing purges data by them yet**; the purge job is server work.

[Data Retention](#screen-retention) holds four periods: AI suggestions (default 90 days), audit logs (default 365 days), case snapshots (default 7 years) and the report archive (default 10 years). The screen warns that the minimum audit-log retention is 90 days and that reductions below regulatory minimums need sign-off from the institution's compliance officer. Saving needs `config:retention-policy:manage`. Retention of physical specimens and blocks is handled by the disposal queue and case-level Retention Holds, which follow the jurisdiction (RCPath for the UK, CAP and CLIA for the US). Immutable report documents in blob storage are their own protection against deletion. Retention periods for backups: Not yet specified.

### HIPAA and CLIA: the controls the product has {#ch1-regulatory}
Breadcrumb: Home > Administrator Guide > System Overview and Architecture > Security model > HIPAA and CLIA: the controls the product has

**Status:** Partial. The table lists controls that exist in the browser build. No control protects real patient data until the server side exists, and **using these controls does not make a laboratory compliant** with HIPAA, CLIA or any other law. Compliance depends on the laboratory's policies, contracts, hosting and quality system.

| Area | What PathScribe has | Status | Where |
|---|---|---|---|
| Unique user identity | Staff records, with single sign-on matched by the provider's permanent subject | Partial | [Members](#screen-staff-members) |
| Access control (least privilege) | Capabilities and roles, facility scope, no bypass for any role, case privacy | Demonstration | [Roles](#screen-staff-roles) |
| Automatic logoff | Idle time-out (organisation default, per-laboratory override); drafts are kept | Built (browser) | [Session Security](#screen-session_security) |
| Person authentication | Single sign-on, provider MFA checked from the token, step-up at a signature, optional device check | Partial | [Session Security](#screen-session_security) |
| Audit controls | Audit log of actions, high-risk checks, configuration changes; hash-chained support stream | Partial | [System Logs](#screen-audit-log) |
| Transmission security | https required for every server address, HSTS, strict content policy; mutual TLS for the site agent | Built (browser and headers). Server Planned | [Network](#ch1-prereq-network) |
| Vendor access | Hospital-controlled, ticket-linked, time-limited support access with its own audit | Partial | [Support Access](#screen-support_access) |
| Minimum necessary in tools | Patient data redacted from support screenshots; no patient text in web addresses, errors or hub messages; crash reports scrubbed | Built | [Redaction](#ch1-phi) |
| Third parties handling patient data | AI vendor policy per jurisdiction, region limits, keys held by the server; Business Associate Agreement or data-processing agreement needed for each provider | Partial | [AI Behavior](#screen-tab-ai) |
| Report integrity | One immutable, hashed (SHA-256) report document per release, sent unchanged by every channel; versioned case saves with conflict detection | Built (contract); server Planned | Chapter 6 |
| Data retention | Configurable periods; disposal queue and Retention Holds for specimens | Partial | [Data Retention](#screen-retention) |
| CLIA: signing authority | Participation types and per-country signing rules decide who may sign, with audited local overrides | Built | [Participation Types](#screen-participation_types), [Country Signing Rules](#screen-country_signing_rules) |
| CLIA: cytology workload and competency | A daily workload limit for GYN cytology screening, with staff and facility overrides, and routing of a new cytotechnologist's sign-outs to a supervisor for countersign until competency assessments are documented | Built (browser). The server records screening time with its own clock; Planned | [Daily Workload Cap](#screen-cytology_workload_cap), [Country and laboratory rules](#screen-cytology_compliance_features) |
| Facility identity on reports | A facility record holds its CLIA or ISO 15189 number, shown in report headers | Built | [Facility Dictionary](#screen-facility-dictionary) |

**Not built or not specified:** encryption at rest for the SQL Server database (no setting or requirement is written in the repository; the blob containers are specified as encrypted at rest); a backup and disaster-recovery specification; a server-side tamper-evident audit store; independent penetration test or security certification (none is recorded in the repository); and any statement of compliance.
