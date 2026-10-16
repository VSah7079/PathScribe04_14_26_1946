# PathScribe — Feature Overview

**Last verified:** August 2026, against the real, current codebase (not
inherited from any earlier doc). Sections marked "(Sep 2026)" were added or
updated in Batch 406 (Sep 30, 2026), checked against the routes in `App.tsx`. Written to be a source for generating
Jira epics/features from — each section below is a real, distinct
capability area, not a code-organization artifact.

## How to read this

Each feature area below names the real routes/pages it lives at and
the real folder to go to for implementation detail (every folder has
its own `README.md` — this document is the rollup, not a replacement).
Status is marked honestly: **Live** (built, working, in real use in
the demo), **Partial** (some real, working pieces; a real, named gap
remains), or **Planned** (deliberately scoped, not yet built).

---

## Core clinical workflow

### Synoptic Reporting (`/case/:caseId/synoptic`) — Live
The central page: a pathologist builds and signs out a report. Two
distinct operating modes:
- **CoPilot** — PathScribe as a passive synoptic data-capture layer
  feeding a host LIS.
- **Orchestration** — PathScribe owns the full report lifecycle as a
  lightweight LIS for outreach cases, including AI-assisted narrative
  generation (the Orchestrator engine).

See `src/pages/SynopticReportPage/hooks/README.md` for the full
architecture (14 `use*` hooks covering LIS integration, specimen/block
management, report generation, amendment workflow, grossing
completion, sign-out/finalize, and more).
*Corrected in the Batch 496 README audit (Oct 9, 2026): hook count 10 → 14 (`src/pages/SynopticReportPage/hooks/`).*

**Someone else saved this case (Batch 572) — Live in the demo (another tab); through the server, Partial (the hub's `caseReport` topic, phase 2e).** When another user saves a case you have open, the report says so at once, above the tabs ("Someone else saved this case", with Show their changes and Later) instead of your next save being refused. Your own saves show nothing. *Batch 575:* Show their changes takes the newer case up in place, without a reload: anything you typed and haven't saved stays on top; if it overlaps their changes, nothing is replaced and your next save asks which to keep. *Batch 577:* the Edit Conflict box's Use their version shows their save in place too, discarding your unsaved work; afterwards the whole page (the synoptic form, lists, preview) matches their save. **Who else has the case open (Batch 573) — Live in the demo (other windows of the same browser); through the server, Partial (the hub's presence methods, phase 2e).** In the tab bar (Batch 577; it no longer moves the page): each other person with the case open, whether they are editing (have unsaved changes) or viewing, and their work email and phone when the lab has them; the same person in another window shows as "You, in another window". Screen readers hear one short message when someone opens, starts editing or closes the case.

### Case Accessioning (`/accession`) — Live
Case creation, order import, patient/encounter resolution, specimen
entry.

### Grossing — Live
Scan-driven grossing workflow: default block/decant generation at
accession, grossing-scan hydration, cassette color routing
(`services/cassetteRouting/`), matrix/shared-block support.

### Amendment, Correction & Addendum — Live
Real two-stage pipeline (transmission-before-release ordering), LIS
Amendment Notice handling, hybrid classification (pure addendum / pure
amendment / corrected-with-addition), `ReportVersionRecord` PDF
snapshots at every sign-out.

### Cytology case report: one report per accession — Live (Batch 532)
Each cytology specimen is screened, reviewed and signed on its own, but the
clinician receives one report for the accession: nothing is published until
the case closes (the last specimen signed, or the case finalized early), then
one consolidated PDF (a first page listing every specimen and its status,
then each specimen's signed report) and one HL7 result message. Registry
submissions go per sample, together, at closure. An early close lists unsigned
specimens as "not reported" with the reason; a correction or addendum
reissues the whole case report. An urgent finding on one specimen can go
out first as a clearly marked preliminary report (Batch 533); who may send
one and whether it needs the electronic signature are set by each
laboratory. Every one of these follows the laboratory's release delay
(Batch 534).

### Release delay and recall — Live (all outputs from Batch 534)
Every report output waits out the laboratory's release delay before it
reaches the clinician, EMR, print, fax or a registry: surgical, autopsy and
cytology sign-outs, preliminaries, corrections and addenda. The delay is set
for the enterprise and per performing lab; STAT cases can skip it. Until it
ends, the person who released the report can recall it, which reopens it
for correction and sends nothing. A resend after a failed delivery is never
delayed. Released on time from any open screen. Recall reopens surgical
corrections and addenda and autopsy PAD/FAD too (Batch 535). A
server-side scheduler comes with the API server (PS-539). While a report
is in its delay, a correction or addendum can't be started: it is changed
by recall (Batch 540), and a released PDF never carries the "pending
release" watermark. See [REPORT_RELEASE_DELAY.md](REPORT_RELEASE_DELAY.md).

### Site agents — Partial (browser side built, Batches 552–553; agent and server planned, phase 2e)
**What it is:** the site agent is a small PathScribe program installed on a performing lab's own network. It sends reports and labels to the lab's printers, and writes and picks up files on its shares. It needs no inbound firewall port.

**Configuration → System → Site agents** lets administrators:
- see each agent's status (online, needs attention, offline), version, last check-in and certificate expiry;
- make a one-time enrolment code to install a new agent;
- revoke an agent, which cuts it off at once (with a reason picked from a short list);
- set up the lab's agent printers (IPPS preferred) and file shares. Passwords are never entered in PathScribe;
- set the agent's update window, so it updates outside working hours.

**Choosing an agent printer** (Batch 553): print routing rules, a facility's default printer and the Print Queue's Redirect pick one of the lab's agent printers by name, instead of typing an IP address. A report always prints at the lab that performed it.

**Print Queue:**
- It shows "Sent to printer" for printers that can't confirm printing (Raw 9100, LPR), and "Printed" when the printer confirmed it (IPPS).
- It also shows the agents' status.

**Planned:**
- Instruments (agent version 2).

Contract: `docs/architecture/SITE_AGENT_API.md`.

### Hosting regions shown to administrators — Partial (Batch 557; the server's /api/config planned, phase 2e)
"Where PathScribe keeps data", in the AI provider settings, shows the database and file storage regions reported by the PathScribe server, beside the AI service's region (Batch 536). A server can also give a few AI and voice settings when the app starts. Sign-in and other security settings always stay in the site's own config.json.

### Released report documents — Live in the demo; through the server, Partial (Batch 556)
Every released report is stored once, with its SHA-256 fingerprint, and every channel (result message, print, fax, file drop) sends those bytes. "View as sent" in Version History opens them (Batch 538).

With the PathScribe server (Batch 556), they are fetched from the server and checked again. The screen says when the server can't be reached or the list may be incomplete. Planned: the server's document endpoints (phase 2e).

### Signed report versions — Live in the demo; through the server, Partial (Batch 558)
Version History lists each signed version of a report, with who signed it, the patient and encounter as they were, and its PDF. Every version's PDF is checked against its SHA-256 fingerprint before it is opened, sent as a result message or used when a held report is released (Batch 558); one that fails is refused. With the PathScribe server, the server's versions are listed too and their PDFs fetched from it. Planned: the server's version endpoints (phase 2e).

### Server jobs — Partial (browser side built, Batch 551; server planned, phase 2e)
**What it shows:** with the PathScribe server, deliveries, prints, interface messages, held releases, charges and exports run as background jobs. System Logs → **Server jobs** shows administrators:
- what is waiting, running or overdue, by kind;
- whether each recurring job (delivery retries, held releases, link expiry and others) is running on time;
- the jobs that failed for good, each with its error. One click requeues it, and the requeue is audited. Interface and print jobs are resent from their own screens.

**Permissions:** two permissions (see and requeue), given to Admin by default. Someone assigned to some facilities sees only theirs.

**In the demo:** the browser does this work itself.

**Moving the work to the server** (Batch 555): until the server runs a recurring job, the browser keeps doing it while someone is signed in. A deployment setting (`VITE_SERVER_JOBS`) names the jobs the server runs, and the browser stops exactly those, so nothing is done twice or left undone. Planned: the jobs themselves (phase 2e).

Contract: `docs/architecture/MESSAGE_BUS_API.md` §4a.

### Large exports in the background — Partial (browser side built, Batch 550; server planned, phase 2e)
**What it does:** QA, audit, billing, disposal, contribution, change history and case search exports run on the server as background jobs.
- A quick export still downloads at once, with no extra click.
- A longer one shows a small "Preparing…" notice, and the user carries on working.
- When it's ready, the notice offers **Download**.
- **My exports** (top bar) lists the user's exports from the last 7 days, with Download, or Cancel while one is being prepared.

**Permissions:** each export keeps its own permission, checked when it is requested and again at download. Only the person who asked can download it, and their notices are cleared when they sign out.

**Status:**
- **Built (Batch 550):** every export button goes through the one export service, which uses the PathScribe server when one is configured.
- **Planned:** the server's export endpoints and jobs (phase 2e).
- **In the demo:** exports are built in the browser, as before.

Contract: `docs/architecture/ASYNC_EXPORT_API.md`.

### What was sent is what you see — Live in the browser (Batch 538; server storage Planned)
Each released report is stored once as a document, with its SHA-256 fingerprint. Every channel sends exactly that file:
- the result message to the EMR;
- print;
- e-fax;
- file drop;
- fallback channels;
- every retry.

Each delivery records the fingerprint. **View as sent** (Version History) opens the stored file itself, so what a pathologist or auditor sees is byte-for-byte what went out. A stored file that no longer matches its fingerprint is refused. The print preview is drawn from the same content as the released report: before signing it differs only in the PRELIMINARY watermark and the signature line.

Planned:
- the API server holds the documents in tamper-proof storage;

Not covered yet: deliveries queued before Batch 538, per-specimen cytology messages, and releases whose PDF could not be made carry no stored document, so their retries use the saved PDF as before. Browser storage holds the documents in the demo, within its size limit.

**Cytology (Batch 539, Live once the report renderer is redeployed):** cytology reports, previews included, are made by the same server renderer as surgical reports. A preview before sign-out carries PRELIMINARY — SUBJECT TO CHANGE and otherwise matches what is released; a released case's "Print case report" opens the report exactly as sent.

See `docs/architecture/REPORT_DOCUMENT_STORE_API.md`.

### Countersign & FPPE — Live
Resident-drafts/attending-countersigns workflow, and Focused
Professional Practice Evaluation (new-hire credentialing) tracking.

---

## Batch Management & Chain of Custody

### Batch Management (`/batch-management`) — Live
Cassette/slide chain-of-custody tracking through processing nodes
(Decal/Special Processing, Processing, Embedding, Microtomy/
Sectioning, Staining, Checkout) via container barcode scanning.
(Sep 2026, Batches 404–408) The New Container form follows the
organisation's Field Requirements and fits on screen in two columns.
Aborting, overriding a reconciliation, acknowledging a cold-chain
excursion, disposing of retained material and exporting the disposal
report each need their own permission. Every refusal is shown in the
user's language.

### Bench workstations (`/workstations/embedding`, `/workstations/microtomy`, `/workstations/slide-distribution`) — Live (Sep 2026)
Scan-driven stations for embedding (piece-count check, cassette reprint),
microtomy and slide distribution (checkout, scanner loading, exceptions,
label reprint). What each needs before it acts comes from the organisation's
Field Requirements. See `src/pages/` for each workstation.

### Add-On Orders (`/add-on-orders`) — Live (Sep 2026)
Recuts, special stains, IHC and molecular/send-out orders on existing
blocks, with block-exception handling (a tech flags insufficient tissue;
the pathologist cancels, modifies, or approves destructive cutting). A
send-out line always names its reference lab, defaulted from the labs
approved for that test in the Stain Dictionary. Placing orders and approving
destructive cutting are separate permissions.

### Molecular (`/molecular`, `/molecular-rack`, `/molecular-control-rules`, `/molecular-order-queue`) — Live (Sep 2026)
The molecular workcenter: extraction racks, the plate builder (control rules,
reagent-lot gating, scan-to-well), worklist dispatch to the instrument,
inbound results, and Clone & Supersede (its own permission). Batch 406 added
deck placement: each analyser has a deck layout (Configuration → Equipment),
an assay's control rule can name the slots its sample rack may use, and Rack
Loading requires the rack's barcode, every tube's sample ID, and the
instrument and slot (slot only on multi-slot instruments), with a warning when
a scanned deck position is wrong. Managing control rules is an Admin
permission by default. See `src/services/molecular/README.md`.
*Corrected in the Batch 496 README audit (Oct 9, 2026): the deck layout lives at Configuration → System → Workstation & Hardware → Equipment.*

### Retention Hold & Disposal (`/batch-management/disposal`, `/batch-management/disposal-report`) — Live
Jurisdiction-aware retention policy (RCPath/UK, CAP/CLIA/US), computed
disposal-eligibility queue with direct scan-to-dispose, and a
case-level Retention Hold (placed and released from the case sidebar)
that blocks disposal until explicitly released. There is no separate
retention-holds queue screen.
*Corrected in the Batch 496 README audit (Oct 9, 2026): `/batch-management/retention-holds` is not a route in `App.tsx` and `RetentionHoldsQueuePage.tsx` does not exist; the disposal report route was missing.*

### Case Hold (in-case sidebar) — Live
A second, deliberately separate hold concept from Retention Hold —
gates **finalize** on an active case for a real, named reason (quality
issue, awaiting outside materials, clinical discrepancy, pending
consultation), surfaced via its own "Cases on Hold" Worklist tile.

### Pending Batch Load (`/batch-management/pending-load`) — Live
Computed queue of printed/engraved cassettes and slides not yet
scanned into any active batch.

### Cassette Color Routing & Printing — Live
Admin-manageable color dictionary and routing rules
(`services/cassetteColors/`, `services/cassetteRouting/`), full label-
printing architecture (`utils/labels/` — 29 modules covering barcode
rendering, GS1/ZPL encoding, and dispatch).
*Corrected in the Batch 496 README audit (Oct 9, 2026): module count 17 → 29.*

### Label Printing — Partial
The QZ Tray bridge is wired: cassette, slide, requisition, container,
decant and molecular labels print through it. Network print via the
Interface Engine and the Local Bridge Agent path record the job but
wait on the API server to send it (`POST /api/print/jobs`). Tracked in
Jira as PS-51 through PS-55.
*Corrected in the Batch 496 README audit (Oct 9, 2026): QZ Tray is no longer scaffolding (`utils/labels/README.md`, `qzTrayBridge.ts` callers).*

---

## Quality Assurance & Compliance

### Quality Assurance (`/quality-assurance`) — Live
Organised into seven pillars: Operations, Financials, CAPA Engine,
Cytology QA, Enterprise Rollup, QA Dashboard and Inspection Mode.
Operations has Deficiencies, Follow-up not received, Frozen Linkage,
Discordance, Countersign Turnaround, Credentialing Review (FPPE),
Post-Final Drift, Patient Match Review, Patient Management and Access
Requests. CAPA Engine has Recommended, Discordance Patterns, Escalated
to CAPA, Closed and Management Reviews. Financials has Billing
Deficiencies, Resolved, Code Review Pool and Charges awaiting approval.
*Corrected in the Batch 496 README audit (Oct 9, 2026): this listed eight report groups; the page now has pillars and more tiles (`src/pages/QualityAssurancePage.tsx`).*

**One facility or all (Batch 544, Pete, Oct 13, 2026):** every QA report whose items belong to a facility has a Scope picker: enterprise-wide, one organisation, or one facility (FPPE: facilities only). The list, its counts and its export follow the scope, and the export is checked for that one facility, so staff assigned to some facilities can export their own. Someone assigned to one facility opens on it. The enterprise rollup, management reviews and patient match review stay lab-wide.

**Cytology screening hours (Batch 572; readiness review F7, option C) — Partial: browser side built; the server's own screening events are phase 2e.** Each cytotechnologist or pathologist confirms their own screening hours at the end of the day on the Cytology worklist (one click), or corrects them with a quick-pick reason (screened at the microscope; a slide left open; other, with a note). A correction more than 0.5 h from the recorded figure, or one that turns an exceeded day into one within the limit, is flagged on the supervisor's workload report (CYT-QA-05), which shows recorded and signed-off hours side by side. A sign-off made before more screening was recorded stops counting until the person confirms again. The workload limit (assigned cap × hours ÷ 8) never rises above the cap. Capability `cytology:screening-hours:sign-off` (Pathologist, Fellow, Resident, Cytotechnologist). The server will record screening time with its own clock; the browser's timer is never trusted. *Batch 574:* yesterday can be signed off too while it still needs it (night shifts), and the lab sets when its screening day starts (applies from the change on). A **workload counter** on the worklist and screening page shows slides counted of the cap over the last 24 hours, reviews, and what is left now and in a full day, never more than the save-time check allows. The report shows each correction's reason. Editing a saved review no longer counts its slide again.

### Clinical-pathologic mismatch check — Live (PS-554 redesign Live, including governed AI instructions, Batch 536)
PathScribe compares what the ordering clinician expected (the indication, the history, and for an autopsy the clinical cause of death) with what the pathologist found. It runs for surgical, cytology (pathologist track) and autopsy (FAD) reports.

The AI suggests and the pathologist decides. Only clinical text goes to the AI, never patient identifiers. An unresolved mismatch recommends a CAPA (PS-145; Batches 439 and 523).

**Live (Batch 529, PS-554):** configurable risk rules in Configuration → System → Clinical Mismatch Rules: a display threshold and an action threshold per kind of mismatch, for all specimen types or one, and an action (Block, Warn or Log). Changing them needs a permission no built-in role has; Pathologist, QA Reviewer and Lab Director can read them. Every change is audited.

**Live (Batch 530, PS-554):**
- the check runs in the background while the pathologist reviews a surgical or autopsy report, with an inline "AI suggests possible mismatch" alert (no window);
- only a high-risk mismatch (a Block rule) holds sign-out, until the pathologist records Resolved or Unresolved; a low-risk one is logged to the QA dashboard, or deferred to secondary review;
- one-click decisions with quick reasons; the note is optional;
- QA oversight: the Clinical-Pathologic Correlation board under Quality Assurance → Activities, and the secondary review queue on the Surgical QA worklist.
- Cytology: the same inline alert in the Cytology Workspace, per specimen (Batch 531).
- The check runs again when the diagnosis or clinical text changes, and asks again only if the result is worse (Batch 531).
- No clinical information on the requisition (any specialty): intake is never blocked; the check is deferred with a notice on the report, Cytology Workspace and grossing screens and an audit entry; the coded clinical history can be added later, until sign-out.

**Live (Batch 536, PS-554):** governed AI instructions (Configuration → System → AI Instructions). The instructions the AI gets for each discipline are versioned configuration: an edit waits for approval and is never used before it; the editor can't approve it; approving starts with the Lab Director (never ForMedrixAI's Superadmin); a Test panel runs a draft on a sample case before approval; every version, approval and rejection is kept and audited, and each AI suggestion records the version it used. Changing the mismatch rules and approving the instructions are separate duties: no role, and no person through several roles, can hold both. *(Earlier text here scheduled this for Batch 531; it shipped in Batch 536.)*

Full explanation: [`CLINICAL_MISMATCH_CHECK.md`](CLINICAL_MISMATCH_CHECK.md).

### System Audit / Quality Control record (`/audit`) — Live
The permanent, complete compliance record — every event regardless of
status, distinct from the working queue above.

### Frozen-to-Permanent Reconciliation — Live
Real audit trail proving the full reviewed population (not just
mismatches), matching ISO 15189/CAP audit-trail expectations.

---

## Patient Identity & Interoperability

### Master Patient Index (MPI) — Live
Deterministic patient matching, a real review queue for ambiguous
matches, Break-Glass rebind workflow for downtime-placeholder
identities.

### HL7 Processing — Partial
Standard core (ORM/ORU builders, segment builders) is real and
tested. Vendor-specific adapters: `identityAdapter` (pass-through) is
live; `cerebroAdapter` and `vantageAdapter` are deliberately
unimplemented stubs, with real, documented directional context, waiting
on a genuine vendor integration guide.

### Interface Exception & Case-Binding — Live
Handles cases created under a temporary/downtime identity, later
rebound to the confirmed patient via a real reason-code taxonomy.

### Interface monitoring — Partial (browser side built, Batch 554; engines' heartbeat and server planned, phase 2e)
**Audit Log → Interfaces → Engines** shows each hospital's interface engine, hosted or on site. For each engine it shows:
- whether it is online, needs attention, degraded or offline;
- when it last checked in;
- whether it reaches PathScribe (if not, it stores messages to forward);
- free disk and certificate expiry;
- each listener and channel, with what is waiting, how long the oldest has waited, and the messages that failed for good. Problems are listed first.

A line above the Interfaces sub-tabs gives the same at a glance, for example "1 offline, 1 listener down and 2 online". One click opens Engines. The view is read only: channels are started on the engine, and failed messages are resent from Outbound. Permission: "View interface engines" (Admin by default). Contract: `docs/architecture/INTERFACE_ENGINE_EDGE.md` §9a.

---

## Administration & Configuration

### Images and attachments: links only — Live (Batch 544)
PathScribe keeps links to images and attachments in the hospital's own systems and stores no copies: gross photos (in the imaging system), referral PDFs, letterhead logos and, since Batch 544, staff signatures (Configuration → Staff takes an https link). It stores only the files it makes itself: report documents, report versions and exports. Labs without an imaging system link to wherever they keep photos. Contract: `docs/architecture/BLOB_STORAGE_API.md`. Since Batch 549 the letterhead logo (facility and department) and the gross imaging vendor's address must be https links too. Planned: audited opening of links with the API server.

### Capabilities, roles and Field Requirements — Live (Sep 2026)
Access control is a catalog of capabilities (244 as of Batch 496; 67 at Batch 409), each
checked in the service that does the work, granted through roles in the Role
Dictionary and scoped by the staff member's facilities. The full list, with
default roles and where each is checked, is in
`docs/architecture/AUTHORIZATION_API.md` ("Capability catalog"). Field
Requirements (Configuration) let an organisation choose which fields each
page requires; locked fields can't be switched off.
*Corrected in the Batch 496 README audit (Oct 9, 2026): current capability count 244 (`capabilityCatalog.ts`).*

**Field Requirements cover 16 pages (Batch 528, PS-359):** Accession, Grossing, Case report,
Messaging, Cytology screening, Microtomy, Intraoperative consultation, Embedding,
Slide distribution, Add-on orders, Batch management, Molecular plate builder,
Molecular rack loading, and now **Staff**, the **Facility editor** and **Clinical
history (cytology)**. Settings are per organisation (the performing-lab tenant);
nothing is fixed by jurisdiction. Each screen marks required fields with a star and
lists anything missing ("Still required: …") instead of failing on save. Locked
fields show why they can't be switched off (for example, a facility's assigning
authority, because inbound HL7 orders are matched by it). Every change is audited.

### TAT (Turnaround Time) Configuration — Live
Most-specific-wins resolution for each TAT type across six dimensions:
ordering facility (client), performing lab, specimen, subspecialty,
urgency (routine/STAT) and role.
*Corrected in the Batch 496 README audit (Oct 9, 2026): performing lab and role are dimensions too, and matching is weighted rather than a fixed seven levels (`services/tatConfig/tatTargetResolution.ts`).*

### Delegation, Pools & Case Team — Live
Case delegation, subspecialty pool claiming with real membership
enforcement, ad-hoc case team assignment.

### Template Builder & Protocol Dictionary — Live
Report templates assembled from reusable Parts, a synoptic protocol
dictionary (31 seeded templates: 22 surgical, 1 autopsy, 5 cytology,
3 grossing), full review/approval workflow for template changes (a reviewer's guide and dark, labelled question comments from Batch 579). The
seeded templates carry generic placeholder wording, not CAP or RCPath
content, until a content licence is in place.
*Corrected in the Batch 496 README audit (Oct 9, 2026): 27 → 31 seeded templates, and they are generic, not CAP/RCPath text (`services/templates/templateService.ts`, `src/data/templates/`).*

### Governing Bodies, Specimen Dictionary, Client/Facility Dictionary — Live
Admin-managed reference dictionaries underlying the rest of the app.

---

## AI & Computational Features

### Orchestrator (AI narrative generation) — Live
Streaming AI-generated report narrative for Orchestration mode, with
real field-level provenance (confidence + source-text quote per
suggestion).

### Computational Sidecar — Live
Live LIS results integration (IHC, molecular, FISH) with a real
dual-tag flag model and full WCAG remediation.

### ForMedrixAI Store — Partial
Customer-facing model browse/download workflow is built. Tenant
scoping is done (global catalog plus per-organisation adoption, Batch
320, PS-58). Subscription authorization is still open (PS-59).
*Corrected in the Batch 496 README audit (Oct 9, 2026): PS-58 is done (`services/models/`, `components/Config/Models/`).*

---

## Security, Accessibility & Platform (Oct 2026)

### Accessibility to WCAG 2.1 AA — Live (Batch 524, PS-491)
- Automated axe-core checks run on every main screen and every Configuration section, with no serious or critical violations (`npm run test:a11y`).
- Clickable elements work from the keyboard, focus is always visible, switches announce their state, and every field has a name a screen reader reads.
- An app-wide guard stops regressions.
- Since Batches 563–566: every top-level screen and its selected states are also checked in the browser; faint text across the app meets AA contrast; selected tiles are announced; worklist rows that hold buttons open from a real button.
- Manual keyboard and screen-reader QA is open (PS-548).

### No patient data on the workstation — Live for server installations (Batch 525, PS-485)
- With the API server configured, clinical data is never written to the browser's storage, and old copies are removed at start-up.
- Only display preferences, workstation settings, the language and a minimal sign-in record stay.

### Supported browsers — Live (Pete, Oct 15, 2026)
- Chrome, Microsoft Edge and Firefox, current versions (Pete: "the big 3"). Safari isn't on the list.
- The automated accessibility checks run in Chromium, the engine of Chrome and Edge. Firefox runs and the screen-reader checks (NVDA, VoiceOver) are in the manual test plan (PS-687), not yet run.
- In Chrome and Edge, dropdown lists are drawn as styled panels (Batch 580); Firefox shows the browser's own dark list until it supports the styled one. Behaviour is the same in all three.

### Fast first load — Live (Batch 527, PS-486)
- 0.68 MB compressed to the sign-in screen. The rest loads after sign-in, and PDF and barcode tools load only when used.
- The build fails over 1 MB.
- Server installations leave out the demo and developer screens.

### Outside consult links — Live (Batch 522, PS-290)
- Scoped, expiring, revocable links let an outside consultant view one case (or selected slides) and sign an opinion.
- The token is kept out of server logs.
- Oversight is in Audit Log → Consult links.

### AI vendor choice — Live; per-jurisdiction vendor rules Partial (PS-558, Batch 536)
- One provider layer covers Anthropic Claude, OpenAI, Azure OpenAI, AWS Bedrock, Google Gemini and self-hosted OpenAI-compatible models. All calls go through the server's AI proxy, with no vendor key in the browser.
- **Live in the browser (Batch 536):** the AI vendor policy (Configuration → AI Behavior → AI vendor policy): the allowed AI services and hosting regions per jurisdiction, optionally narrowed per facility; everything allowed by default. Every AI call (the mismatch check, critical findings, suggestions, coding, voice and dictation, narrative generation) is checked against the jurisdiction of its case or facility before anything is sent; a refused call goes nowhere, never to another vendor. The service's hosting region is recorded, and every call is logged with service, model, region and jurisdiction. Choosing a service a served jurisdiction doesn't allow shows an inline warning before saving. The mismatch check says "AI is not available for this jurisdiction" when it falls back to its rule-based check.
- **Partial:** the same check in the server's AI proxy (the one that counts in production) is specified for the API server (`docs/architecture/AI_PROXY.md`, with PS-539). Features other than the mismatch check carry on without AI when refused, but don't yet say why on screen.

*What changed batch by batch, for the guides, training and marketing: [`GUIDE_UPDATES.md`](GUIDE_UPDATES.md).*

### Hosting: public cloud, private or sovereign cloud, or on premises — Planned (PS-539; review done, Batch 537)
- One cloud-agnostic package (containers, SQL Server, self-hosted live updates, jobs and events in SQL Server tables (decision D1)), validated once. Each hosting location gets an installation qualification checklist.
- **Connection banner and waiting states (Live, Batch 548):** a notice below the top bar when the connection to the server drops, and "Connection restored" when it's back. Screens show a placeholder only after 300 ms, and say they're still working after 3 s. Since Batch 549 every screen does this, and PathScribe reconnects as soon as the network returns.
- **One build for every site (Live, Batch 547):** each deployment's addresses and sign-in settings are in its own `config.json`, read when PathScribe starts, so the same validated build is installed everywhere. A wrong setting stops start-up with a plain explanation instead of running wrongly. `docs/architecture/RUNTIME_CONFIG.md`.
- Always-on parts keep the 1-second screen refresh; background jobs run as short scheduled tasks.
- A small on-site agent reaches printers and file shares (version 1), and later instruments (version 2), over outbound HTTPS only (decision D3; contract `docs/architecture/SITE_AGENT_API.md`, Batch 546). Until it exists, network report printing can't be sent from the browser: such a print goes straight to the release's fallback channels.
- HL7 connections go through the interface engine over VPN or MLLP over TLS. A message is acknowledged only once it is stored durably. The engine runs hosted by ForMedrixAI or in the hospital, per hospital, from the same container (decision D6); contract: `docs/architecture/INTERFACE_ENGINE_EDGE.md` (Batch 545).
- The review covers markets and their hosting rules (HIPAA, France HDS/SecNumCloud, Germany C5, NHS, Korea, India, Australia, Canada). Source: `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`.

## Planned / Not Yet Built

- **SSO with Google** — single sign-on with Microsoft Entra ID or a
  generic OpenID Connect provider (such as Okta) is built (Batch 343,
  PS-60, `services/auth/`, `docs/architecture/AUTHENTICATION_OIDC.md`);
  Google sign-in needs the API server and isn't offered until then.
- **Workload Tracking & Charge Capture, AI part** — the rule-based part
  is built (`services/billing/`, real RVU on the Productivity tab); the
  AI/NLP suggestion drawer is not
  (`docs/product/WORKLOAD_AND_CHARGE_CAPTURE_SCOPE.md`).
- **Platform-level (ForMedrixAI-employee-only) admin restrictions** —
  built in the browser since Batch 371 (Superadmin is ForMedrixAI support
  only, `platform:` capabilities; corrected Sep 2026: this line said "not
  built"). The server side, a separate ForMedrix identity tenant
  (`docs/architecture/ACCESS_CONTROL_PLAN.md`), is not built.

*Corrected in the Batch 496 README audit (Oct 9, 2026): Microsoft SSO (Batch 343) and versioned case saves with an audited Overwrite (Batch 458, PS-71, `services/cases/caseWrite.ts`) are built and were removed from this list; charge capture is partly built.*
