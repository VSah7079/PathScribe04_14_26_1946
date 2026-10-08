# src/

The application root. Loose files that sit directly here, with no folder of their own — nearly every subfolder has its own `README.md` (see `pages/README.md`, `services/README.md`, `types/README.md`, `components/README.md`, `utils/README.md`, etc.; `mocks/`, `orchestrator/`, `protocols/`, and `styles/` don't have one yet). For setup and scripts see the repo-root [`README.md`](../README.md).

## Standing rules for every change

No inline CSS, no business logic in components, and full international support (every UI string via `t()`, every key in all five locales). The full rules and the pre-delivery checklist are in the repo-root [`CLAUDE.md`](../CLAUDE.md); the i18n reference is [`i18n/README.md`](./i18n/README.md). Three tests enforce them: `i18n/localeParity.test.ts` (every key, every locale, project-wide), `services/participationTypes/standingRules.guard.test.ts` (all three rules, for the signing-authority screens), and `services/duplication/duplicatePolicy.guard.test.ts` (the Duplicate policy, localized copy names project-wide, and no inline CSS in the admin screens it covers).

## Duplicate policy (Sep 2026, PS-73)

Which admin records can be duplicated, and what a copy keeps or clears, is decided in [`services/duplication/`](./services/duplication/README.md). The rule of thumb: complex configuration, templates and multi-site variants can be copied; real people, flat lookups and audit records can't. Copy names always come from `t('common.copyOfName')`.

## Recent batches

- **Batch 409 (Sep 2026, PS-359):** Cytology Workspace.
  - Signing out a cytology specimen needs its own permission (Pete: keep today's users) and runs in a tested service instead of the page.
  - CT sign-out block reasons are translated.
  - The workspace is off the deployment baseline.
- **Batch 408 (Sep 2026, PS-359):** Batch Management closed out.
  - Times on the list follow the user's language.
  - The list's filtering and the reconciliation completion rule moved into services. The Complete button now follows the same rule as the service, cold-chain excursions included.
  - Tile colours moved into CSS.
- **Batch 407 (Sep 2026, PS-359):** The rest of Batch Management.
  - The New Container form is two columns in a wider dialog, so it fits on screen.
  - Every batch refusal is shown in the user's language.
  - Disposing of retained material and exporting the disposal report have their own permissions (Pete: keep today's users).
  - Patient identifiers on the disposal and pending pages are tagged for redaction.
- **Batch 406 (Sep 2026, PS-359):** The rest of the molecular pages.
  - Rack Loading requires the rack's barcode, every tube's sample ID, and the instrument and deck slot (slot only on multi-slot instruments). A scanned deck position fills the slot and warns when it's wrong.
  - Analysers get deck layouts, and assay control rules name their sample rack's slots.
  - Control rules need their own permission (Admin by default).
  - Every molecular page is off the deployment baseline.
  - The capability catalog (System Capabilities) is documented in full and kept in step by a test.
- **Batch 405 (Sep 2026, PS-359):** The molecular plate builder.
  - Field Requirements for creating a run.
  - Every patient well must name its specimen, by barcode or accession.
  - Clone & Supersede needs its own permission, given to the Molecular Technologist.
  - Create stays off until the plate is complete.
- **Batch 404 (Sep 2026, PS-359):** Batch Management.
  - Field Requirements for New Container.
  - A reason is now required to abort a batch.
  - Three permissions: completing a reconciliation anyway, aborting a batch, and acknowledging a cold-chain excursion. They're given to every role that had the screen.
  - The cold-chain acknowledgement is a proper dialog.
  - Demo batches for each.
- **Batch 403 (Sep 2026, PS-287/PS-359):** Add-On Orders.
  - Placing an order and approving destructive cutting each need a permission (Pathologist, Fellow, Resident).
  - Field Requirements for the order, exceptions and responses.
  - A send-out line always names its reference lab. The lab fills in from the test's approved labs, which are set in the Stain Dictionary, and the choices are limited to those labs.
  - Modify & Resubmit now edits the order.
  - Demo reference labs and demo orders.
- **Batch 402 (Sep 2026, PS-359):** Field Requirements for the Slide distribution station: physical checkout, scanner routing and a new exception note as switches, the scanner instrument locked, and a mandatory reason for a slide label reprint (new, Pete), with voice commands for confirm checkout and confirm scanner.
- **Batch 401 (Sep 2026, PS-359):** Field Requirements for the Embedding station: Confirm (observed piece count; mold size and orientation as switches), the comment drawer and the cassette reprint reason, with voice commands for confirm count and add comment; the foot pedal follows the same rules.
- **Batch 382 (Sep 2026, PS-359):** Field Requirements for the case report page's frozen-versus-final reconciliation and the two billing modals (post-sign-out reason, applied-code correction), each with a voice command. Correcting an applied billing code now needs its own capability, `billing:applied-code:correct`, given to every role that could before.
- **Batch 395 (Sep 2026):** The Worklist and Search result tables fill the window to the bottom and re-measure when the content above them changes; the Worklist's queue tiles wrap their labels; demo cases for the Surgical Post-Sign-Out QA and Cytology QC Peer Review queues (Pete Nimmo).
- **Batch 394 (Sep 2026, fix):** The Pretendard font files ship with the app (`public/fonts/pretendard/`) instead of coming from an npm package; without the package installed, 44 test files failed. No `npm install` needed.
- **Batch 393 (Sep 2026, PS-340 follow-up):** Korean in every report PDF: the surgical and autopsy renderer now prints Korean (or any Hangul, such as a Korean patient's name) in Pretendard, as cytology does. Autopsy reports reach the interface engine as one result each (PAD, FAD); before, an autopsy case without a synoptic report sent nothing.
- **Batch 392 (Sep 2026, PS-340 follow-up):** Every result sent to the interface engine carries its report PDF (before: cytology only); a result without one is held and retried (Pete). Surgical sign-out print jobs, which always failed for want of a PDF, now print the signed PDF. The surgical report's labels and date of birth follow the performing lab's language.
- **Batch 391 (Sep 2026, PS-340 follow-up):** Reports are written in the performing lab's language: a Report language setting per lab (from its jurisdiction by default), stored on the report at sign-out; the cytology PDF's labels and dates follow it, and Korean prints in Pretendard (new dependency, SIL OFL 1.1), which the screens and the editor also use for Korean text.
- **Batch 390 (Sep 2026, PS-340):** A signed-out cytology report can be corrected or given an addendum from the Cytology screening page: a mandatory reason (kept on the record and printed on the PDF), a permission for each (`cytology:report:correct`, `cytology:report:addend`, Pathologist), and the same released-report event as the original.
- **Batch 389 (Sep 2026, PS-359 follow-up):** The rest of the Microtomy workstation's text translated (label-fit warnings, label size); the page is now done apart from stored data.
- **Batch 388 (Sep 2026, PS-359):** Field Requirements for the Microtomy workstation's comment drawer and slide grid, with voice commands for add comment and add stain; their text and the page's scan errors are translated.
- **Batch 387 (Sep 2026, PS-359 follow-up):** The rest of the Cytology screening page's text is translated in all five languages (role and review-mode cards, workload banners, QC, HPV, review history, AI concordance prompt, toasts), with a guard test.
- **Batch 386 (Sep 2026, PS-359):** Field Requirements for the five forms on the Cytology screening page (Bethesda review, CISOE-A, 5-year retrospective review, manual histology correlation, last menstrual period), with four voice commands. The forms are now tested components and their text is translated; the rest of the page follows in Batch 387.
- **Batch 385 (Sep 2026, PS-359 follow-up):** Messaging: who a message can go to and the secure-email send moved from the drawer into the message service, and sending needs two new permissions (`message:internal:send`, `message:secure-email:send`), given to every role. A refused send keeps the draft.
- **Batch 384 (Sep 2026, PS-359):** Field Requirements for messaging: the New message drawer, reply box and Secure email window, with a voice command for sending a secure email. Fixed voice Send skipping the subject check.
- **Batch 383 (Sep 2026, PS-359):** Field Requirements for the two autopsy forms (authorization completion, body release) and the two sign-out gates (fixation time, collection/receipt dates), each with a voice command. Releasing an autopsy body now needs its own capability, `autopsy:body:release`, given to every role with case access. Case report group 3 is complete.
- **Batch 381 (Sep 2026, PS-359):** Field Requirements for the case report page's holds, comments, Delegate, biopsy arrays, and block cancellation and restains. Holds and delegation now need capabilities, given to every role that could use them before. The report page came off the deployment baselines.
- **Batch 380 (Sep 2026, PS-359):** Field Requirements reach the case report page: Add/Edit specimen, amendments and addenda, and critical findings, each with a voice save command. Fixed minor amendments and addenda that couldn't be saved from a new draft.
- **Batch 379 (Sep 2026, PS-359):** Grossing's protocol rule is required by default but switchable per organisation. Switched off, completing a specimen that has no protocol asks for confirmation and routes it for secondary review as an open QA deficiency.
- **Batch 378 (Sep 2026, PS-359):** Complete grossing. The Grossing screen can finish grossing, by button, voice or keyboard, once the organisation's Grossing field requirements are met. Cases move to Gross Complete, and it's audited.
- **Batch 376 (Sep 2026, PS-359):** Field Requirements. Each organisation chooses which fields a page requires before saving, and locked fields are always required. Accession is the first page.
- **Batch 375 (Sep 2026):** fewer Home tiles. The two peer-review queues are views in the Worklist, Add-On Orders is an action on a case's report page, and Batch Management is in the Pathology Workspace.
- **Batch 374 (Sep 2026):** the Home page shows only the tiles a user may open. Each screen is a capability that roles grant, and routes check it too. There are four new bench roles: Accessioner, Histotechnologist, Cytotechnologist and Molecular Technologist.
- **Batch 373 (Sep 2026):** every demo case belongs to an organisation. Hospital ids are linked to their organisations, and the international screening labs are organisations in their own right. Organisations with nobody to approve support access start at Always allowed in the demo.
- **Batch 372 (Sep 2026):** ForMedrixAI support access, controlled by each hospital.
  - **Policy per organisation:** Disabled, Approval required (default) or Always allowed, with an access window (default 2 hours).
  - **Just-in-time approval:** support requests access per ticket with a reason; the hospital's approvers get a message and approve or reject; access ends when the window runs out or either side ends it.
  - **The hospital's own support audit:** every request, decision, open, list, search and edit by support, hash-chained so changes show, exportable as CSV or JSON.
- **Batch 371 (Sep 2026):** Superadmin is reserved for ForMedrixAI support.
  - **Read-only for hospitals:** the role holds every capability and is read-only in a hospital's Role Dictionary.
  - **Platform-only capabilities** can't be put on a hospital role.
  - **Support access to other organisations' cases** is checked and audited.
  - **Demo sign-ins:** only ForMedrixAI people use Superadmin.
- **Batch 370 (Sep 2026, PS-356):** capabilities, phase 2.
  - **Closed a self-escalation gap:** anyone signed in could edit roles (their own capabilities included) and staff role assignments. That now needs `config:roles:manage`, `config:staff:edit` and `config:staff-access:assign`.
  - **Facility scope:** staff get a facility assignment that limits case actions and QA exports.
  - **Removed:** the role-level pediatric, orchestration and facility switches, which were never enforced.
  - **Demo reset:** the full reset needs a capability, and its logic moved to `services/demoReset/`.
- **Batch 369 (Sep 2026, PS-355):** capabilities. Access control is now enforced:
  - capabilities are checked by the service that does the work, audited with the granting role, and have no bypass;
  - they cover the change-history export and the 14 QA report exports;
  - the Role Dictionary has a grouped Capabilities tab with dependency prompts;
  - two new built-in roles, QA Reviewer and Superadmin.

  The old unenforced Permissions tab is now Commands. See `services/authorization/`.
- **Batch 368 (Sep 2026, PS-353):** report change log. Every case save is recorded: who, when, workstation, and every field changed old → new (`services/reportChangeLog/`). The report page has a Change history view with word-level diffs, and an audited CSV export (since Batch 369 it needs the capability `report:change-history:export`).
- **Batch 367 (Sep 2026, PS-74):** no inline CSS anywhere in the UI. The last ~120 inline styles moved into `pathscribe.css`, and colours built in JSX became `--ps-hue` + `color-mix()`. `services/styleRules/` checks the whole app with no exception list.
- **Batch 366 (Sep 2026, PS-68):** the unused `types/case/ReportSnapshot.ts` was removed; `ReportVersionRecord` is the one report release record.
- **Batch 365 (Sep 2026, PS-347):** Belgian French (fr-BE) regional variant (`i18n/`); Netherlands dates are DD-MM-YYYY; the order lookup writes and finds dates of birth in every jurisdiction's format (`utils/isoDateForSearch.ts`).
- **Batch 364 (Sep 2026, PS-349/PS-350):** support tickets no longer send the page address (it carried the case number); support references (`SR-7K2Q-9MXD`) stand in for case numbers, with a lookup for lab staff (`services/supportReferences/`).
- **Batch 363 (Sep 2026, PS-72):** every patient identifier the UI shows is tagged for redaction in support-ticket screenshots, and a structure-aware check (`services/phi/`) keeps it that way.
- **Batch 362 (Sep 2026):** Belgian Dutch (nl-BE) added as a regional variant of Dutch: Belgian wording where it differs, Dutch elsewhere, Belgian date formats (`i18n/`).
- **Batch 361 (Sep 2026):** a device with an open malfunction or past due is shown in red in the equipment register and the molecular batch instrument picker (flagged, not blocked).
- **Batch 360 (Sep 2026):** equipment maintenance and calibration records. Each device can have schedules and an append-only, audited service log; the register shows up-to-date, due-soon, overdue and open-malfunction status (`services/equipment/`).
- **Batch 359 (Sep 2026):** Printer Profiles and a new Grossing Hardware screen name their physical device from the equipment register; the register shows which settings point at each device.
- **Batch 358 (Sep 2026):** one equipment register for every device: identity, make, model, serial number, lab, station and status (`services/equipment/`, Configuration → System → Equipment). It replaced the Instruments list; molecular batches target its analysers. Workflow settings stay on their own screens.
- **Batch 357 (Sep 2026):** demo scan stations and instruments gain seed records added after a browser stored them (`services/mockSeedMerge.ts`), so the molecular bay appears without Demo Reset.
- **Batch 356 (Sep 2026):** PS-326: an instrument list (`services/instruments/`, Configuration → System → Instruments). Molecular batches pick their target instrument from it instead of typing it, and worklist dispatch checks the instrument's scan station.
- **Batch 355 (Sep 2026):** PS-346: deleted the orphaned informal-review banner (`pages/SynopticReportPage/components/InformalReviewBanner.tsx`), its CSS, its keys in all five languages, and the one rule only it used.
- **Batch 354 (Sep 2026):** Search's submitting-facility and performing-lab filters include every organisation under a chosen one, so a Trust finds its sites' cases (`services/facilities/facilityHierarchy.ts`, `services/caseSearch/`, `pages/SearchPage.tsx`).
- **Batch 353 (Sep 2026):** TAT targets and case delegations moved behind services the API server can own (`services/tatConfig/`, `services/delegations/`). Every screen and service that used them now goes through `tatTargetService` / `delegationService`, instead of the TAT screen's browser storage and the demo case service. Six files came off the deployment baselines. Contract: `docs/architecture/TAT_AND_DELEGATION_API.md`.
- **Batch 352 (Sep 2026):** facility records for the 11 ordering clients the Manchester, Midwest, Henry Ford and Desert Valley outreach demo cases pointed at, each linked to its performing lab, so Search by performing lab finds those cases (`services/facilities/`).
- **Batch 351 (Sep 2026):** Search section 3: the 15 new searchable kinds of case data: case type, sign-out/release date, pathologist role, revisions, holds, result flag, pending work, TAT, subspecialty, performing lab, location, intake, payer, CPT, autopsy (`services/caseSearch/`, `pages/SearchPage.tsx`).
- **Batch 350 (Sep 2026):** Search repaired, with results paged on the server (`services/caseSearch/`, `utils/search/`, `pages/SearchPage.tsx`). The broken filters work, export covers every match, saved searches use a service, and the page is off the deployment baseline. Contract: `docs/architecture/CASE_SEARCH_API.md`.
- **Batch 349 (Sep 2026):** quick UI fixes: PS-100 warning toasts stay until closed, PS-101 case search finds an MRN or other identifier on its own and searches all dates for one, PS-126 readable macro text and an administrators' "All" macro list grouped by type (`utils/toastPolicy.ts`, `utils/search/`, `services/macros/macroAccess.ts`).
- **Batch 348 (Sep 2026):** PS-67, one service result shape across the app: the AI services' older `{ success, data, error }` type (`types/serviceResult.ts`) is removed.
- **Batch 347 (Sep 2026):** PS-54, interface-engine print results reach the user over the live-update connection, with a manual Retry (`services/networkPrint/`); slide labels now print on that path.
- **Batch 346 (Sep 2026):** PS-52, a configurable agent port and an on-screen "queued / printing now" status line for agent print jobs (`components/Printing/`).
- **Batch 345 (Sep 2026):** each signature checked when it is saved, and stored (PS-60 follow-up).
  - **The check:** sign-out, countersign, finalize, cytology and autopsy signing all check the signer's confirmation, including the SSO sign-in token, before the signed change is written.
  - **The record:** a signature record keeps who signed, what it meant and how they were confirmed (`services/signatures/`).
  - **Staff → edit:** now lists a person's linked sign-in accounts, with Unlink.
- **Batch 344 (Sep 2026):** signer confirmation (PS-60 follow-up).
  - **What changed:** every signature now proves who is signing: the password again, or for SSO the hospital's sign-in page again.
  - **Where:** sign-out, countersign, finalize, cytology, autopsy PAD/FAD.
  - **Why:** before, the password fields were never checked.
  - **Lockout:** five failures lock signing for 15 minutes.
  - **Popup page:** `main.tsx` answers the sign-in popup's return page without starting the app.
- **Batch 343 (Sep 2026):** PS-60 single sign-on.
  - **SSO:** sign-in with the hospital's identity provider: OpenID Connect with PKCE, Entra ID first, Okta and others generically. No client secret is needed. Only provisioned, active staff get in.
  - **Password sign-in:** the demo accounts' plain-text passwords are gone from the code and the bundle (hashed, and left out of SSO-only builds).
  - **Specs:** the API server's part is specified in `docs/architecture/AUTHENTICATION_OIDC.md`.
- **Batch 342 (Sep 2026):** PS-262 live updates.
  - **What:** OR Suite Live Boards and the Intraop Queue update across devices through a SignalR hub on the ASP.NET Core API server (Pete's decision). The client reconnects forever, falls back to polling, and shows a connection badge.
  - **Without a hub:** same-browser windows still update instantly.
  - **Hub spec:** in `docs/architecture/`.
- **Batch 341 (Sep 2026):** PS-344 follow-up.
  - **React Router 7:** upgraded from 6.30.6 to 7.18.4, which closes the last React Router advisory. The app now imports from `react-router`; the `react-router-dom` package is gone.
  - **Node 24 LTS:** the project is standardised on it (`engines` 24.x, `.nvmrc`).
  - **Audit:** `npm audit` is down to 2 moderate findings, both in legacy Firebase tooling.
- **Batch 340 (Sep 2026):** PS-344 dependency security.
  - **Findings:** `npm audit` went from 54 (8 high, 46 moderate) to 4 moderate.
  - **Updates:** TipTap 3.23.4 → 3.31.3 (all editor packages), React Router 6.30.4 → 6.30.6, vitest 4.1.10 → 4.1.11 and js-yaml 4.3.2, plus a patched minimatch for typescript-eslint through `overrides`.
  - **Mitigated:** React Router 6's remaining open-redirect advisory is fixed only in React Router 7. PathScribe now guards the one navigation target that comes from stored data (`utils/safeInternalPath.ts`, used for message config links in `AppShell`).
- **Batch 339 (Sep 2026):** PS-342 dictionary build step for the licensed clinical vocabularies.
  - **What it does:** drop the SPECIALIST Lexicon, SNOMED CT editions and LOINC into `spellcheck-data/licensed/`, then run `npm run spellcheck:build`. The build derives word lists for every language: English dialects follow SNOMED's language reference sets, and translations come from the national editions and LOINC's linguistic variants. US/UK pairs become regional-variant rules. SNOMED/LOINC words also appear in suggestions.
  - **Tested:** end to end on synthetic sample files, and in the browser. Waiting on the licences (PS-343).
- **Batch 338 (Sep 2026):** PS-342 spell checking in the report screens.
  - **Where:** the report editor and every report text box (synoptic text fields, report modals, cytology notes, intraop quick gross and frozen diagnosis). Squiggles appear about 300 ms after typing stops, with no effect on typing speed; right-click for suggestions, Ignore, or Add to my / the facility dictionary.
  - **Language:** the case's own choice (a control in each report screen), else the assigned pathologist's preference (Staff → edit), else the ordering facility's default.
  - **Retired:** the AI spelling check on Accept.
  - **Fix:** suggestions are now ranked by closeness, so "specimin" offers "specimen" first.
  - **Clean-up:** `PathScribeEditor.tsx` has no inline CSS or browser storage left.
- **Batch 337 (Sep 2026):** PS-342, German spell checking added under the GPL (per Pete).
  - **How it ships:** the dictionary ships unmodified, as a separate file, with the full GPL texts and a source offer.
  - **Before release:** a lawyer's confirmation and a source-request contact are needed.
  - **Gap:** German has no medical word list yet.
- **Batch 336 (Sep 2026):** PS-342 spell-check engine.
  - **Engine:** real Hunspell (WebAssembly) in a Web Worker, checking through the personal → facility → regional check → medical → clinical → base tiers, with codes passed through. It checks 5,000 words in about 25 ms in the browser.
  - **Content:** a PathScribe pathology lexicon (English with US/UK pairs; a Korean seed list), and dictionaries for English (4 variants), French, Dutch and Korean.
  - **Personal and facility dictionaries:** facility words are audited.
  - **Fix:** a malformed CSS comment in `pathscribe.css` had been breaking `vite build`.
  - **Next:** the editors are wired up in Batch 338.
- **Batch 335 (Sep 2026):** PS-341 completed.
  - **Country Signing Rules:** a new System screen where a platform administrator edits each participation type's rules per country. It covers the local title, signing flags and regulatory basis, and whether a country-scoped role is offered. Every change is audited with a reason.
  - **Fix:** saved signing-rule changes now reach the sign-out check without a page reload.
- **Batch 334 (Sep 2026):** PS-89 screens.
  - **Code Import (Bulk):** a new System screen uploads a CSV, matches its columns, lists refused rows with reasons, and imports one job for a second person to approve. Every job is listed with rollback.
  - **Pending approvals:** an import job is approved or rejected as a whole.
  - **Audit:** every step is audited.
  - **Database:** the docs now record Microsoft SQL Server as the production database.
- **Batch 333 (Sep 2026):** PS-89, Generic Code Engine (rules and storage).
  - **Billing rules:** they carry a vocabulary and a country.
  - **Bulk imports:** each is one PENDING_APPROVAL job, decided as a whole under four-eyes, with rollback.
  - **Fix:** approving a future-dated rule no longer retires the current rule early.
- **Batch 332 (Sep 2026):** PS-327 completed for Cytology.
  - **Pathologist track:** per-lab and country signing authority now applies to Cytology's pathologist track. The cytotechnologist track's CLIA rules are unchanged.
  - **Translated:** Cytology's sign-out text and the Autopsy body-release banner.
- **Batch 331 (Sep 2026):** PS-327. Autopsy PAD/FAD signing now checks signing authority. Before this, anyone reaching the button could sign.
  - **All autopsies:** they use Surgical Pathology's per-lab and country rules, with the coroner jurisdiction choosing the country profile.
  - **Forensic cases:** these also need an active jurisdictional appointment. There's no admin override.
  - **Recording appointments:** the new Staff credentials editor records them.
- **Batch 330 (Sep 2026):** deployment-readiness guard.
  - **What it checks:** UI code may not import mock services, browser storage or Firebase directly.
  - **Existing files:** they are listed in a baseline that only shrinks. So the screens stay deployable to public or private cloud while the real backend is built.
  - **New helper:** `utils/uiPreferences.ts` for display preferences.
- **Batch 329 (Sep 2026):** PS-63.
  - **Drafting:** limited to Template Author, and Admin inherits it. The editor opens read-only otherwise.
  - **Built-in roles:** Template Author, Template Approver and Lab Director are built-in roles with fixed ids, so renaming them doesn't break the rules. Existing sites gain them automatically.
- **Batch 328 (Sep 2026):** PS-63, template review rules enforced.
  - **Approving and publishing:** limited to Template Approver / Lab Director / Admin, and never by the template's own authors unless the site allows it.
  - **Required Reviewers:** a site setting, 1 by default.
  - **SNOMED:** diagnostic templates need 80% SNOMED coverage to publish.
  - **Settings:** System → Template Review.
- **Batch 327 (Sep 2026):** HTTPS everywhere PathScribe makes a connection.
  - **Workstation agent:** it now connects over encrypted WebSocket only (`wss://`), with a certificate unique to each workstation.
  - **Report renderer and interface receiver:** production builds require `https://` URLs and refuse to fall back to `http://localhost`.
  - **Grossing scale:** its agent address must be `https://`.
  - The deployed app itself was already HTTPS-only: Vercel redirects HTTP and sends HSTS.
- **Batch 326 (Sep 2026):** PS-63.
  - **Admin Guide:** a section on building, reviewing and publishing synoptic templates (`components/Config/Protocols/README.md`), written from an end-to-end walkthrough in the app.
  - **Fix:** refreshing the template editor after the first save no longer creates a second copy.
  - **Found and left for a decision:** the "≥80% SNOMED before publishing" rule isn't enforced, and authors can publish their own templates.
- **Batch 325 (Sep 2026):** PS-52, PathScribe's side of the workstation PathScribe Agent (`utils/labels/pathscribeAgent/`).
  - **Discovery:** it tries ports 9100, 9101 and 9102 and trusts only a real agent handshake.
  - **Printing:** each print gets a job ID and waits for that job's own success or error.
  - **Contract:** the agent's developers build to the WebSocket contract in its README.
  - Printers set to Bridge Type **PathScribe Agent** now print through it; the agent program itself is still to be built.
- **Batch 323 (Sep 2026):**
  - **PS-87, LIS ingestion layer (Pete's design):** HL7 v2, JSON webhook and polling adapters feed one staging queue, and the Assist AI-draft worker reads only from it. Admin screen: **Assist LIS Ingestion**. See `services/lisIngestion/README.md`.
  - **PS-62, native dropdowns:** every native `<select>` shares one dark open-list style. See `components/Common/README.md`.
- **Batch 322 (Sep 2026):** PS-87, Assist-mode LIS polling. PathScribe polls the external LIS.
  - **Gross Complete:** the AI picks the synoptic templates and fills what the gross supports.
  - **Microscopic/Diagnosis Complete:** the AI completes the draft.
  - **Review:** every draft waits for pathologist review in the existing report editor.
  - Admin screen: System → Integrations → Assist LIS Polling. Details in `services/assistPolling/README.md`.
- **Batch 321 (Sep 2026):** Admin Guide material on how a site prints labels, and what a customer's IT must agree to before the PathScribe Agent is installed (PS-52). It is in `services/printerProfiles/README.md`; no code changed.
- **Batch 320 (Sep 2026):** PS-58. AI models are now a global ForMedrixAI catalog plus per-organisation adoption records (Pete's Option 2).
  - Status, default and case counts belong to each organisation.
  - The store's "Download" is now **Adopt**.
  - The old unscoped model list is migrated on first load.
  - `firestore.rules` covers `/modelCatalog` and `/organisations/{orgId}/adoptedModels`.
  - Details in `services/models/README.md`.
- **Batch 319 (Sep 2026):** PS-78. `pathscribe.css` lost 130 dead `ps-msg-*` rules (70 classes no source file uses, left over from a pasted earlier Messages UI spec), about 830 lines. A browser computed-style comparison of the live message drawer found no visual change. Full account in `docs/ARCHIVE.md`. The same batch also fixed a timeout in `pages/__tests__/ConfigurationPage.test.tsx`: the page was imported dynamically inside the first test, which timed out on a loaded machine and cascaded into six more failures.
- **Batch 318 (Sep 2026):**
  - **PS-137:** abnormal-detection agreement signals are tagged with the covering Validation Study.
  - **PS-86:** Audit Log → Interfaces → **Outbound Dispatches** shows each OrderCreated send and its outcome, and opens the exact JSON payload.
  - Details: `services/abnormalDetection/`, `services/interfaceEngine/`, `pages/README.md`, and the Batch 318 entry in `i18n/README.md`.

## Application entry & routing

- **`main.tsx`** — real React entry point, mounts `App` and imports the two root stylesheets. Batch 344: on `/auth/signing/<provider>` (the signature-confirmation popup) it only passes the identity provider's answer back to the opener and never starts the app.
- **`App.tsx`** — the route table (every `<Route path=...>` in the app), lazy-loaded page imports, `ToastContainer`.
- **`ProtectedRoute.tsx`** — auth gate: redirects unauthenticated users to `/login`, passing the page they wanted as `from` (Batch 343), and wires idle-timeout and session-supersede detection.
- **`MobileRestrictedRoute.tsx`** — real device-based route restriction for the Intraop Queue mobile/OR workflow (viewport width + `pointer:coarse`, not width alone, plus a `sessionStorage` override escape hatch — see `utils/deviceDetection.ts`'s own header for the full reasoning).

## Stylesheets

- **`pathscribe.css`** — the main, real stylesheet. Very large (20,000+ lines) — every `.ps-*` class family referenced throughout every component's own README lives here.

  **Real, found-and-fixed accessibility bug across the whole file, per direct report ("occasional text that is dark and pretty much impossible to read")**: systematically audited every plain `color:` declaration for real, computed low luminance (never assumed from a color's name — actually computed relative luminance for every match), then, for each dark match, checked its own real CSS rule block for a genuinely light background before deciding it was actually broken — a dark color is completely correct when its own rule also sets a light/bright background (e.g. dark text on a bright accent-colored button), and several real print-only rules (`@media print`, `#ps-copilot-print-area` and its own real print override for `.ps-copilot-report-diff-current`) are correctly dark-on-white, confirmed directly by tracing them into their real `@media print` block rather than assumed.

  **Root cause, confirmed with two directly-verified examples before fixing anything at scale**: `#0f172a`/`#1e293b` — this app's own darkest background-palette colors — were being used as *text* color in ~75 real places, almost certainly copy-pasted from rules originally written for a light-themed context and never updated for this dark theme. `.rp-shell` (the ReportPreviewPage window's own root container) set `background: #1a2332; color: #1a1a1a;` on the *same rule* — its own default text color was dark while its own background was also dark, so anything inside it without a more specific override was silently invisible. `.ps-orch-chev`/`.ps-orch-hint` sat right between a dozen correctly-light-colored sibling rules using `#1e293b` instead — and `.ps-orch-chev`'s own `:hover` state correctly used `#64748b`, meaning the chevron icon was genuinely invisible until hovered, exactly matching the "occasional" symptom reported.

  **60 real instances fixed**, each replaced by exact line number (never a blanket find/replace, since the same offending color values also appear correctly elsewhere in genuinely fine, bright-background contexts that were deliberately left untouched) — `#0f172a`/`#1a1a1a`/`#0d1117`/`#0b1120` (the darkest, "primary/heading" role in the original mistaken source) mapped to this app's own real primary light text color, `#e2e8f0`; `#1e293b`/`#1f2937`/`#333` (slightly lighter, "secondary/body" role) mapped to this app's own real secondary/muted light text color, `#94a3b8`. One real, selector-informed exception: `.ps-orch-synoptic-lock`'s own `#1e3a2f` (a dark, muted green — clearly intended as a status/badge indicator, per its own class name) mapped to `#34d399`, this app's own already-established success-green (`.ps-orch-badge--done`), rather than the generic primary/secondary mapping. Verified directly, not assumed: re-ran the same detection script afterward and confirmed zero remaining real matches; confirmed brace balance (6,375 open / 6,375 close) wasn't disturbed by the automated, line-targeted edits.

  **Real, deliberately NOT touched, and why**: ~15 instances of dark text on a genuinely bright button/badge background (e.g. `#0f172a` on `.ps-btn-pill`'s own `#0ea5e9` blue) — real, readable, intentional design, confirmed by computing the actual background luminance rather than assuming; the full `.ps-copilot-print-area`/`.ps-copilot-report-diff-current` print-only cluster, confirmed genuinely inside `@media print` by tracing brace depth back to the actual `@media print` line, not assumed from the selector name alone.

  **Real, per direct follow-up ("let's check for inline use too")**: the same systematic, luminance-based search run across every real `.tsx`/`.ts` file for inline `style={{...}}` color declarations. Most of the 30 initial matches turned out to be genuine false positives on closer inspection — standalone print/email/label HTML template strings that correctly render on white outside this app's own UI entirely (`ValidationStudiesSection.tsx`, `printLabels.ts`, `CopilotReportViewModal.tsx`, `enhancementEmailTemplates.ts`), light-background modals/dropdowns with `background: 'white'`/`'#fff'` on their own enclosing container (`SynopticEditor.tsx`, several `PathScribeEditor.tsx` popovers), and tab/filter-configuration objects where a `color:` field is decorative data, not CSS text color at all (`QualityAssurancePage.tsx`, `WorklistPage.tsx`). 5 real bugs confirmed and fixed, documented at each affected component's own README: `components/Editor/README.md` (the most significant one — a real, user-reachable bug where `PathScribeEditor.tsx`'s own dark-mode toggle correctly switched the toolbar chrome but left the actual report text hardcoded to the light theme's own color, found to be a real follow-up gap in an *earlier* theming fix to this same component), `components/Config/Protocols/README.md` (two lifecycle-stepper separator characters), `components/Config/Templates/README.md` (the same separator pattern, independently confirmed), and `components/ClientDictionary/README.md` (a save button, borderline-readable against its own teal background state, matching the exact pattern already fixed in `.ps-login-submit` above).

- **`index.css`** — base/reset styles loaded alongside `pathscribe.css`.
- **`login-brand.css`** — login-page-specific branding styles.
- **`research-ticker.css`** — styles for the PubMed literature feed ticker (`ps-litfeed-*` namespace).

## Type declarations

- **`vite-env.d.ts`** — standard Vite client type reference.
- **`global.d.ts`** — global `Window` interface augmentation (e.g. `window.find`).
- **`talisman.d.ts`** — type declaration for the untyped `talisman/phonetics/double-metaphone` module (used by patient-matching phonetic search).

## Real findings

**`NETFLIX_SETUP.md`, `ACCESS_CONTROL_PLAN.md`, `PRIORITY_FIXES.md`** — corrected Sep 2026: an earlier version of this note said none of these existed anywhere and the reason was "genuinely unclear". Both claims were wrong; `docs/ARCHIVE.md` records exactly what happened. `ACCESS_CONTROL_PLAN.md` moved to [`docs/architecture/`](../docs/architecture/ACCESS_CONTROL_PLAN.md) and still exists. `NETFLIX_SETUP.md` was retired as completed one-time setup. `PRIORITY_FIXES.md` was retired on 2026-08-19, when its open items became Jira PS-57 to PS-71, so the many `PRIORITY_FIXES.md #N` citations in folder READMEs are historical references, not broken links to a live file.

**`css-audit.cjs`** — confirmed real and present, distinct from (not identical to) `scripts/css-audit.js` — different line counts (134 vs. 146), so likely a diverged copy rather than a simple duplicate. Every other similar audit script in this codebase lives in `scripts/`, matching this file's own header comment ("Place anywhere in the project and run..."), which suggests it was designed to be portable and just never got moved. Worth a real decision on whether to consolidate with `scripts/css-audit.js` or confirm they've genuinely diverged for a real reason.

**`FHIR_DISPATCH_ARCHITECTURE_PLAN.md`** — a real, deliberate, forward-looking planning document (`Status: PLANNED, not built`), same spirit as the access-control planning once described above. Records the confirmed target architecture for standardizing external registry/EHR dispatch on FHIR JSON via a boundary adapter layer (cytology's own domain model stays untouched), and — critically — a real research finding made before any of it was built: cytology sign-out must never drive cancer-registry dispatch for cervical findings, at any severity, since national reportability standards (NAACCR/SEER) explicitly require histologic confirmation, not a cytology impression alone.

**`FRONTEND_AS_SPEC_CAVEATS.md`** — real, per direct guidance: "the team is using the front end to help them define the backend." Consolidates every place in this codebase where the mock/demo implementation contains a deliberate simplification, an honest documented gap, or a client-side-only mechanism that would produce a wrong or dangerously incomplete real backend if read as literal spec. Leads with the most severe finding by far: `getSessionUser()` reads role and permissions directly from unauthenticated, client-editable `localStorage` — every authorization rule built on top of it is real, careful logic worth porting, but the trust boundary itself must never be. Also covers: four real national-ID gaps (MRN standing in for KCCR/PPSN/Health+Care Number/Medicare) that would get real registry submissions rejected if not fixed before going live; the workload-cap report's Enterprise-only simplification versus the real three-tier cascade already enforced elsewhere; the Cancer Registry/cytology boundary rule that currently exists only as prose in `FHIR_DISPATCH_ARCHITECTURE_PLAN.md`, not as any enforced type constraint; and the QA report aggregation logic being a reference for correct *behavior*, not code meant to be ported line-for-line into a real, server-side query.

## Batch 396: case privacy model; QA verdicts on the case screen

A case the reader can't open now looks exactly like one that doesn't exist (`docs/architecture/CASE_PRIVACY_MODEL.md`). Cytology QC and surgical post-sign-out QA verdicts can be recorded on the case screen itself, and the Worklist's two review-queue tiles show their counts. See `i18n/README.md` → Batch 396.

## Batch 397: Field Requirements for Intraop, Add Orders and matrix blocks

See `i18n/README.md` → Batch 397.

## Batch 398

The case report page's Gross Complete applies the Grossing field requirements and permission. See `i18n/README.md` → Batch 398.

## Batch 399

Structured intraoperative verbal report, critical results dictionary and "Surgeon unavailable" reasons. See `i18n/README.md` → Batch 399.

## Batch 400

The Intraop verbal report can be dictated and parsed by AI. See `i18n/README.md` → Batch 400.

## Batch 401

Field Requirements for the Embedding station. See `i18n/README.md` → Batch 401.

## Batch 402

Field Requirements for the Slide distribution station; a slide label reprint there now needs a reason. See `i18n/README.md` → Batch 402.

## Batch 403

Add-On Orders: permissions, Field Requirements, and reference labs linked to tests, plus demo data. See `i18n/README.md` → Batch 403.

## Batch 404

Batch Management: Field Requirements, three override permissions, a required abort reason, and demo batches. See `i18n/README.md` → Batch 404.

## Batch 405

Molecular plate builder: Field Requirements, a required specimen on every patient well, and a supersede permission. See `i18n/README.md` → Batch 405.

## Batch 406

The rest of the molecular pages: rack loading with deck-slot checks, analyser deck layouts, a control-rules permission, and the capability catalog in `docs/architecture/AUTHORIZATION_API.md`. See `i18n/README.md` → Batch 406.

## Batch 407

The rest of Batch Management:
- a two-column New Container form that fits on screen;
- every batch refusal translated;
- permissions for disposing of retained material and for exporting the disposal report;
- patient identifiers tagged;
- the last Batch Management pages off the deployment baseline.

Also the first browser check of Batch 406. See `i18n/README.md` → Batch 407.

## Batch 408

Batch Management closed out: localized list times, logic moved to `services/batches/batchListView.ts`, one completion rule for the button and the service, and tile colours in CSS. See `i18n/README.md` → Batch 408.

## Batch 409

Cytology Workspace: sign-out as a tested service with its own permission, translated block reasons, and off the deployment baseline. See `i18n/README.md` → Batch 409.

## Batch 410

Cytology Workspace: all its logic now lives in services, with five new permissions (review, final diagnosis, QC flag removal, 5-year lookback outcome, cyto-histo correlation), and each later review stores its agreement with the initial screen. See `i18n/README.md` → Batch 410.

## Batch 411

Cytology Workspace: multi-specimen cases get a tab per specimen, sign-out per specimen, and the case finalizes only when every cytology specimen is signed out (or early, with `cytology:case:finalize` and a reason). See `i18n/README.md` → Batch 411.

## Batch 412

Cytology Workspace: reviewers leave notes on parts of each other's reviews, and "Requires revision" blocks a cytotechnologist only. Pathologists can "Revise and sign out" in one step (the CT's review is kept as it was), and every edit keeps the earlier version. See `i18n/README.md` → Batch 412.

## Batch 413

Country check of the Cytology Workspace changes. A Non-GYN specimen is no longer sent to a cervical screening registry, and the UK CSMS eligibility flag is added once per case. See `i18n/README.md` → Batch 413.

## Batch 414

Cervical screening registries: a configurable engine (`services/screeningRegistry/`) with twelve programmes. Labs map codes in Configuration, and results that aren't ready are held, not sent half-coded. This also fixes the Configuration screen, which had been saving to a store sign-out never read. See `i18n/README.md` → Batch 414.

## Batch 415

Cytology: the US-only CLIA workload cap and CAP 5-year lookback are features, automatically on for US labs only and switchable per enterprise or facility. A cytotechnologist's sign-out has its own permission, so each country's lab can decide. See `i18n/README.md` → Batch 415.

## Batch 416

Worklist: no more empty space under the case table. It fills the screen by CSS layout instead of a measured height. See `i18n/README.md` → Batch 416.

## Batch 417

National patient identifiers: the number each registry keys on (NHS number, BSN, IHI and ten more), stored apart from the MRN with its check digit verified, captured at accession and from HL7 ADT, used by the registry engines. First step of the Registry Engine SRS v2.1 build order. See `i18n/README.md` → Batch 417.

## Batch 418

Registry consent: a patient's opt-out from screening programme reporting excludes the submission (audited, never retried); a cancer registry opt-out is overridden by statute unless the lab's settings honour it. Step 2 of the Registry Engine SRS v2.1 order. See `i18n/README.md` → Batch 418.

## Batch 419

Registry payload header: a stable submission id, versions linked by a master id, NEW / CORRECTION / AMENDMENT, test vs production, duplicate-retry flag. Cytology corrections and addenda now reach the screening registry. Step 3 of the Registry Engine SRS v2.1 order. See `i18n/README.md` → Batch 419.

## Batch 420

Registry acknowledgements: the registry's answer (HL7 ACK, FHIR OperationOutcome or status JSON; since Batch 425 only the interface engine's normalised JSON) moves each submission to accepted, accepted with warnings, rejected fixable or rejected outright; silence or failed delivery escalates after 72 hours. Cancer registry reports are now actually sent. Step 4 of the Registry Engine SRS v2.1 order. See `i18n/README.md` → Batch 420.

## Batch 421

Registry Exceptions worklist (Quality & Compliance): held, undelivered, rejected, unanswered or conflicting registry submissions, with the registry's findings and raw acknowledgement, and Re-validate and resend. Step 5 of the Registry Engine SRS v2.1 order. See `i18n/README.md` → Batch 421.

## Batch 422

Cancer registries: thirteen, as definitions (added NCRI Ireland, Public Health Scotland, NICR Northern Ireland, NKR/IKNL Netherlands, Belgian Cancer Registry), each with its national identifier and wire format on the payload; the Configuration screen's saves now need a permission. Step 6 of the Registry Engine SRS v2.1 order. See `i18n/README.md` → Batch 422.

## Batch 423: registry go-live gate (SRS v2.1 step 7)

A registry reaches its live register only through a go-live approval:
- pre-checks and test evidence;
- re-entered credentials;
- the approver's capacities stamped on a permanent statement;
- Template Review-style approval settings, with one person by default.

Registry templates are versioned `vYYYY.Q.X`. A newer minor or breaking version makes re-approval due, then holds live results; they are never dropped to test. The Registry Exceptions worklist can raise a row as a CAPA. See `services/registryGoLive/`.

## Batch 424: validation and production instances for registries

- **Two instances.**
  - A validation instance sends only synthetic test cases, and only to registries' test systems.
  - Production sends real results, only to live registers, and only once go-live is approved.
  - The instance comes from `VITE_APP_ENV`. Unset counts as validation.
- **Evidence and the catch-up.** Go-live on production needs the validation record exported from the validation instance, for the same release and template. Results held until go-live is approved are resent on approval.
- **The overlay.** Template versions list what they changed. Local customisations are stamped with their baseline version and flagged for review when a release touches them.
- **Correction.** The interface engine is ForMedrixAI's, shipped with PathScribe.

## Batch 425: registry revisions, live badge, transmission audit, patient details, mandatory-data hold

Built with Pete's developer's recommendations:
- A registry's revision of accepted data raises a CAPA deficiency and shows on Registry Exceptions until reviewed.
- A live exception badge appears on the top nav and the Quality & Compliance tiles, scoped to the user's organisation.
- One transmission audit download covers screening and cancer.
- National identifiers and registry opt-outs arrive as JSON from the hospital's system (newest wins) and are prefilled at accessioning. A change made after accessioning sends an A08. An opt-out badge shows on the patient card.
- A cancer report missing its registry's mandatory data is held (`HOLD_MISSING_MANDATORY_DATA`), never the sign-out.
- Template review settings need `config:template-governance:manage`.

Registry answers are now JSON only. `pathscribe.css` has the new badge and hue rules. See `i18n/README.md` → Batch 425.

## Batch 426: synoptic results to the LIS, one PDF per workup, keep-or-update

Built from Pete and his developer's approved plan (Oct 1, 2026). **Assist mode now sends the case's synoptic workups to the LIS**, which puts them into its own report:
- on Finalize (before, nothing was sent), and on each correction and addendum (before, a placeholder sentence);
- each workup carries the v1.0.0 structured result (codes with system and version, staging, observations, suggested CPT without modifiers, the LIS order numbers echoed back) and its own PDF.

**Orchestration results carry the same block.** The template editor tags staging and block fields, gives numeric fields a unit, and records the staging edition. A re-evaluated field the pathologist set asks "keep or update?" instead of being dropped silently, and a confirmed field is no longer reset.

Spec: `docs/architecture/SYNOPTIC_RESULT_API.md`. See `i18n/README.md` → Batch 426.

## Batch 427: one combined PDF per case (testing facility setting), workups across parts

- A performing lab whose LIS takes one PDF per accession can be set to get one combined PDF of the case's synoptic workups. It is resent whole when a workup changes; the structured data still goes per workup.
- A draft synoptic workup can cover several parts (Independent / Combined). The AI doesn't propose a duplicate workup for a covered part and is told the parts.
- `App.tsx`: every page opened from Configuration has the Configuration gate on its route, so nobody without Configuration access can open one by typing its address. A guard test checks every route.

See `i18n/README.md` → Batch 427.

## Batch 428: every Configuration section checks its own permission

- Pete asked for a scan of every Configuration section after Batch 427 closed the address backdoor. Before, anyone who could open Configuration could change any section. Now each section's service checks its own capability (84 new, one per section): Admin and Lab Director start with them (Lab Director all but drafting synoptic protocols), Template Author and Template Approver only the protocol and template ones, a hospital's own roles none.
- A refused change saves nothing and the page names the missing permission (`components/Config/ConfigRefusalBanner.tsx`).
- Fixed along the way: billing rule versions can't skip approval; standard QA types can't be switched off; the retention policy is saved through a service; audit and approval records name the signed-in person; four unused screen files deleted (which also clears the four long-standing type-check errors).

See `i18n/README.md` → Batch 428.

## Batch 429: view-only Configuration sections; equipment log for the bench

- Someone without a section's capability sees it view only: a note names the permission, and action buttons and toggles are greyed and do nothing (`components/Config/ConfigSectionGate.tsx`).
- Recording equipment maintenance and calibration is its own capability, for the bench roles too, from a new Batch Management tile, Equipment log.
- `docs/architecture/AUTHORIZATION_API.md` lists every Configuration write and the capability the API server must check (PS-345).

See `i18n/README.md` → Batch 429.

## Batch 430: personal settings per person; view-only fields

- The voice accent, dictation's learned corrections and the personal AI override are kept per signed-in person, not per browser (`services/userSettings/`). Foot pedal bindings stay per workstation on purpose.
- Voice macros: your own are yours; shared ones need `config:macros:manage`.
- View-only sections no longer let a dropdown that saves on change fire; search and filters still work.

See `i18n/README.md` → Batch 430.

## Batch 431

Data hygiene: no browser copy of AI drafts; access requests recorded and closed; per-person language, worklist sort and Billing Log searches; lab-wide settings and template review work behind services; the Configuration search covers every section. `main.tsx` removes retired browser copies at start-up.

## Batch 432

Wired the unwired actions from the Batch 431 check: deny access requests, resolve audit errors, retire AI models, QC escalate and supervisor bypass, referral transit status, peer-review risk weights, spelling dictionaries and learned voice commands per person.

## Batch 433

Biometric signing policy; one billing correction engine (code, modifier, reversal, missing charge; reason required; audited; without opening the case); Start correction and charges awaiting approval in Quality Assurance → Financials; "Charges need billing approval" per enterprise with facility overrides; new capability `billing:charge:approve`.

See `i18n/README.md` → Batch 433.

## Batch 434

WSI scan batches have a screen (Batch Management → Slide scanning: queue, load, send, unload), and the unload bug is fixed. Scanners come from the Equipment register. Three new capabilities. Batch 433 follow-ups: the performing lab is found for legacy tenant ids, a correction updates the case's coding, and the QC buttons follow the permission.

See `i18n/README.md` → Batch 434.

## Batch 435

Batch 434 follow-ups:
- the engine's routing list for every outbound interface message (`docs/architecture/INTERFACE_TRANSACTIONS.md`), with the development receiver fixed to accept all of them;
- Slide scanning updates live;
- Admin sees Batch Management;
- the developer tool can play the slide scanner.

See `i18n/README.md` → Batch 435.

## Batch 436

Quick fixes from the Jira review: search flags (PS-101), QA client scope (PS-356), 377 duplicate rules removed from `pathscribe.css` with a guard (PS-294), dead backend-document references and `firestore.rules` marked not deployed (PS-40), a reworded Configuration search entry (PS-335), and instrument names on the Molecular workcenter (PS-326).

## Batch 437

- PS-128: unsaved changes anywhere in Configuration, warned on every way out.
- PS-282: every print, reprint and export audited, with an optional reprint reason.
- PS-357: 8 export capabilities.
- PS-329: the AI badge counts Must Have fields only.
- Also fixed: Audit Log times were shifted by the viewer's UTC offset.

## Batch 438

CAPA recommendations (PS-144 to PS-148), clinically significant revision reasons (PS-146), the outside-click guard on Configuration dialogs, a fix for the first keystroke lost in Batch 437, and audit times on three more screens. Details in `i18n/README.md`.

## Batch 439

Peer review before sign-out (PS-144), clinical-pathologic mismatch detection (PS-145) and outside-consult discordance (PS-148). Details in `i18n/README.md`.

## Batch 440

GYN cytology QC is an unassigned, shared queue in the Cytology Workspace. A rescreener's own primary screens are shown with a badge, and a rescreen of them is refused. Positive GYN cases reach pathologists through a Cytology Review tile on the main Worklist.

## Batch 441

Cytotechnologists can never hold a pathologist slot on a case (Case Team, delegation, pool claims, the role catalog). Case Team saves need `case:team:manage`. The Cytology Worklist page's logic moved to services.

## Batch 442

PS-147: discordance patterns over time (per pathologist and per specimen type) against each site's own policy, recommended to the Lab Director and never a CAPA by themselves.

## Batch 443

A demo Lab Director (Dr. Rachel Okafor) in the staff directory.

## Batch 444

No key or password reaches the browser bundle. A production build was found carrying the demo passwords, because a few files read `import.meta.env` as a whole object; those reads now name their variable, and `services/security/envExposure.guard.test.ts` enforces it. The AI providers' direct-to-vendor key paths are removed. `vite-env.d.ts` drops `VITE_AI_API_KEY`, `VITE_AI_DEV_MODE` and `VITE_GEMINI_API_KEY`.

## Batch 445

The report page is translated, with a guard test that parses the page's files for literal on-screen text. Dates of birth on the report page use the shared, timezone-safe helper.

## Batch 446

No patient identifier in a page address. Case pages are addressed by the case's support reference instead of the accession number, and the demo EMR window by case reference instead of MRN. `services/caseAddresses/caseAddresses.guard.test.ts` enforces it.

## Batch 447

The QA feedback button and its recipients are a Configuration setting (`services/feedback/`), defaulting from the instance type. `VITE_QA_ENABLED`, `VITE_QA_EMAIL` and `VITE_QA_ADMIN_CC` are gone.

## Batch 448

Staff passwords are set and reset from the Staff screen (`services/staffPasswords/`), with "must change at next sign-in". The script is no longer how passwords are changed.

## Batch 449

Configuration search covers every tab, section and inner tab, with no stale or placeholder entries (test-enforced).

## Batch 450 — test evidence for Priority 1 and 2 tickets

27 new test files proving Priority 1 and 2 tickets; logic moved out of nine screens into services; three bugs fixed (see `services/README.md`).

## Batch 451 — screen-level test evidence for Priority 2 tickets

Screen-level tests for the remaining Priority 2 points; plate-grid layout bug fixed.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

The Batch 452 changes:
- The four review gaps closed: code-side negation, inline finding highlights, and Quality Flags reading case flags.
- PS-156: the correlation window runs from collection and is configurable.
- Decants sync with billing through a single store.
- Worklist tile counts match their rows.
- Modifier Dictionary upload errors are visible.
- Contact bleeding can record "no".

## Batch 453 — The Batch 452 open items, and the native-speaker review register

The Batch 453 changes:
- Pre-Batch 452 cytology sign-outs are backfilled with a correlation window.
- The surgical biopsy-to-resection window is configurable.
- The Cytology Workspace and Microtomy save decants through the atomic store save.
- The Microscopic entry panel highlights findings.
- A native-speaker review register: [`docs/quality/TRANSLATION_REVIEW.md`](../docs/quality/TRANSLATION_REVIEW.md).

## Batch 454 — Follow-up not received: report, alerts and clinician email

The Batch 454 changes:
- Expected follow-ups are tracked: histology after abnormal cytology, and a resection after a surgical case marked at sign-out.
- A "Follow-up not received" management report records outcomes.
- Lab worklist tiles and internal alerts flag follow-ups due soon or overdue.
- Staff can email the ordering clinician, never automatically.
- Settings per enterprise and facility.

## Batch 455 — Demo baseline: people, pools, cases and the reset

The demo baseline:
- A sign-in for every role.
- Pools that accept demo users.
- 19 cases covering the missing workflows.
- A repeatable Full Reset.
- `docs/product/DEMO_GUIDE.md`.

## Batch 456 — Sign-in lockout, password screening, demo seeds

Sign-in lockout (5 tries, 15 minutes, audited) and a common/breached-password block for passwords PathScribe itself checks. Demo seeds for registry exceptions, a critical alert, support access, a consult link, molecular runs, decants, a matrix block and autopsy cases. Seeded cytology reviews and an FPPE record that named the wrong people are corrected. See `src/i18n/README.md`.

## Batch 457 — Metro General cancer registry, Molecular Order Queue seed

Demo data: Metro General's cancer registry and the Molecular Order Queue. See `src/i18n/README.md`.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

PS-71 optimistic locking finished. See `src/i18n/README.md` Batch 458.

## Batch 459 — PS-152 discordance report, follow-up after sign-out

- Quality Assurance → Cytology has a "Primary vs Final Diagnosis" report: each case's primary screen compared with the review chosen as its Final Diagnosis (PS-152).
- A signed-out surgical case can be marked "follow-up expected" from the report page's action bar, not only in the sign-out modal.
- Stale README notes corrected (cytology correction and addendum, autopsy authorization form).

## Batch 460 — Billing at the bench, matrix blocks at Microtomy, slide levels, Label Designer resize

- **Cytology Workspace:** full billing review in a drawer (Pete).
- **Microtomy:** read-only charges, with a full-review switch for people who may change billing (Pete).
- **New permission:** `billing:applied-code:review`, given to everyone who works cases today.
- **Shared billing code:** the report page's billing logic moved into shared services.
- **Microtomy:**
  - opens matrix blocks;
  - its saves are re-applied to the newest case instead of being lost on a conflict;
  - batch prints follow the grid order.
- **Slide levels:** a slide's level is the one printed on its label everywhere (scans, location updates, disposal, queues, reprints), so reordering or removing slides can't make a barcode point at the wrong slide.
- **Label Designer:** drag-resize handles, with fields kept inside the label (PS-245).

## Batch 461: organ mapping (prostate)

Anatomical maps beside the synoptic: `services/organMapping/`, `components/OrganMap/`, Configuration → Organ maps. **The map's cancer data comes from the synoptic report**: a map is worked out from the synoptic answers every time it is drawn and stores nothing of its own. Contract: `docs/architecture/ORGAN_MAPPING_API.md`.

## Batch 462: breast maps

The anatomical map companion now covers breast: clock face with quadrants, numbered foci, and the six margins (clear / close / positive, the close threshold set per site). **The map's cancer data comes from the synoptic report**: the breast map is worked out from the synoptic answers every time it is drawn and stores nothing of its own.

## Batch 463: Mohs

PathScribe's own **Mohs Micrographic Surgery** synoptic, copied and changed by labs like any other. Its stage question draws each stage's margin as 12 clock sectors around the deep margin, with an accessible checklist beside it; a positive sector gets the tumour type as histology (editable) and its block chosen from the stage's blocks (Batch 463b; superseded: the automatic letter), plus perineural invasion. Voice in all five languages. The stage maps are always part of the report (no Insert button). Guide: `docs/product/MOHS_GUIDE.md`.

Corrected: the footer below said `mocks/` and `orchestrator/` had no README; both have one.

## Batch 463b: Mohs open items

Mohs blocks are chosen (A up to Blocks cut) instead of auto-lettered, and sign-out stops until every positive sector has one; voice understands noon/midi and Korean number words and can name the block; the template editor sets which question gives the default histology.

## Batch 464: colorectal maps

A malignant-polyp map drawn by its Paris type, with the Haggitt or Kikuchi level of invasion and the margins judged by the site's rule (Pete: a distance and an operator, 1.0 mm with ≤ by default, set per site, never per user), and a rectal resection map (cross-section with the CRM, long view with the peritoneal reflection and distal margin, the TME plane).

## Batch 465: head and neck maps

An oral cavity map (the subsites with tumour, the peripheral and deep margins judged by the site's involved and close rules — < 1 mm and 1–5 mm by default, RCPath — dysplasia at the mucosal margin, depth of invasion) and a neck dissection map (a row per level and side, metastasis, nodes, ENEmi / ENEma), from two PathScribe synoptics that sit on one case.

## Batch 465b: Pete's follow-ups to 465

- Nodes positive can't exceed nodes examined: the draft save and sign-out stop.
- Neck totals are calculated from the levels grid.
- A total that differs from its grid is a warning the person can go past.
- Oral margin rules must keep involved below close. Conflicts a higher level leaves in lower ones are warned about, and maps fall back to the default close rule.
- Map outlines have a two-layer halo.

## Batch 466: renal resection map

A renal resection map from the CAP/ICCR kidney synoptic, covering poles, halves and aspect, the pT compartments with the pT they point to, and the three margins. The soft tissue and parenchymal margins are judged by a site rule (0.0 mm on ink by default). Negative or decimal node counts are refused.

## Batch 466b: Pete's follow-ups to 466

- Partial nephrectomy margins: parenchymal and capsular soft tissue only, with non-standard vein and ureter margins added by hand.
- The template's generic margin questions are calculated from the map and locked, for every mapped organ.
- The Synoptic Editor has count settings: whole number, "can't exceed", and total from grid.

## Batch 466c: the three items 466b left open

- The Synoptic Editor builds "unless" and "or also when" visibility conditions, and a hand-entered total checked against a grid.
- The partial nephrectomy drawing leaves out the vein, vena cava and ureter unless they're reported.
- Adenoma at a polyp's lateral margin counts as involved in the derived margin status. A lab can turn this off. (Replaced in Batch 466d by margins per component.)

## Batch 466d: margins per component (Pete)

- Invasive carcinoma margins are reported apart from adenoma, DCIS and dysplasia margins.
- Colorectal Local Excision's margins are CAP's two blocks.
- Older bindings are brought up to date or held for review.
- Sign-out warns about unreported carcinoma margins.

## Batch 466e

Low-grade dysplasia at the oral mucosal margin counts as not involved; only high-grade involves the margin (Pete).

## Batch 467 — In-house molecular orders

In-house molecular orders (Pete's engine spec): orders flow from add-ons into the Molecular Workcenter's Order Queue, onto plates, through the run, and their results fill the bound synoptic question (or open an addendum after sign-out). `pathscribe.css`: `.ps-molq-*`, `.ps-syn-molecular-delta*`.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

The molecular order loop is closed on the front end:
- send-out results reach their orders;
- plates show their orders;
- sign-out warns about result differences;
- colorectal and HER2 questions are bound;
- the development mock engine plays the instrument.

The server endpoints and the BridgeLink channels remain.

## Batch 469 — Autopsy: toxicology, organ-retention disposal, consent narrowing/revocation (PS-261 follow-up)

The Autopsy Pathology Module's three remaining PS-261 gaps are built: toxicology ordering/result recording, organ-retention disposal recording (HTA-governed jurisdictions only), and a write site for narrowing or revoking an already-granted hospital consent, enforced one-directionally in the merge function itself (an independent review found the first cut only documented that enforcement, and didn't actually do it). Four new capabilities. See [services/autopsy/](./services/README.md).

## Batch 471 — Autopsy: toxicology cancellation, organ-retention detail, consent reinstatement (PS-261 follow-up)

The three items Batch 469 itself disclosed as open are now built: cancelling an open toxicology order (clearing its ancillary hold only if the hold hasn't moved on to a different reason since); a recipient/location record for organ retention while it's ongoing, distinct from the final-disposal record; and a way to reinstate consent once narrowed or revoked, kept in a wholly separate function and capability from the narrow-only write site so the two can never interfere. Three new capabilities. See [services/autopsy/](./services/README.md).

## Batch 472 — Autopsy: capability-greying, retention-tier reason, punctuation sweep (PS-261 follow-up)

Three small Front End items: every autopsy action button now greys out ahead of a click for a user without its capability; the organ-retention tier itself can now carry a reason, alongside the existing recipient/location detail; and two pre-existing hard-coded-punctuation lines in the custody and consent panels are fixed. Four further Front End features raised in the same conversation — per-organ tagging, a dedicated autopsy worklist, toxicology specimen barcoding, a unified timeline — need Pete's own scoping before they're built, and aren't part of this batch. See [services/autopsy/](./services/README.md).

## Batch 473 — Autopsy case-type key migration (PS-261 follow-up)

First of several batches toward front-end feature-complete this week. `AutopsyCaseAuthority`'s forensic-path value renamed, `'medicolegal_forensic'` → `'statutory_judicial'` — a jurisdiction-neutral key ahead of the dedicated autopsy worklist (still to come) and the international terminology differences Pete's spec called out. Touches 39 files; no shape or behavior change. See [services/autopsy/](./services/README.md).

## Batch 475 — Autopsy Module 3: toxicology specimen barcode & chain-of-custody link (PS-261 follow-up)

Second of several batches toward front-end feature-complete this week. Toxicology orders get a required, real specimen barcode. The existing forensic-only custody log can now link a transfer to a specific toxicology specimen (one new optional field, no new mechanism), and each order shows its own linked custody trail. See [services/autopsy/](./services/README.md).

## Batch 474 — Two non-autopsy quick fixes from this week's gap list (PS-359)

Gross-update reason capture moves off a blocking `window.prompt()` onto the app's own `ReasonPromptModal`. The molecular workcenter's batch table now flags a batch whose target instrument is in service alert, matching the Equipment register and the plate-builder picker (one item in the gap list had mis-described this as a missing import — re-verified against source, corrected, and built as the real, smaller display gap it actually was). See [pages/SynopticReportPage/README.md](./pages/SynopticReportPage/README.md) and [pages/MolecularWorkcenterPage/README.md](./pages/MolecularWorkcenterPage/README.md).

## Batch 476 — Autopsy Module 4: unified case timeline (PS-261 follow-up)

Third of several batches toward front-end feature-complete this week. A new, read-only "Case Timeline" on the report page merges every dated event already recorded anywhere on an autopsy case — forensic orders, consent, custody transfers, toxicology, organ retention/disposal, ancillary hold, PAD/FAD signing, addenda — into one chronological list. Built as a pure read-model off existing data, not a new persisted event log, and not built on either existing case-history mechanism in this app (the audit log is action-compliance, not clinical; the Firestore-backed dispatch-history pattern isn't extended, per this project's SQL Server production decision). See [services/autopsy/](./services/README.md).

## Batch 477 — Autopsy Module 5: worklist badges (PS-261 follow-up)

Fourth of several batches toward front-end feature-complete this week. Pete's own scoping call: the Worklist's Autopsy branch tab already groups cases (added in September, per his own "can we just group the records?"), so the real gap was per-case state, not a second screen. Rows now show case authority, an active ancillary hold, PAD/FAD signed, and the jurisdiction's TAT/SLA target as a tooltip. See [components/Worklist/](./components/README.md) and [services/autopsy/](./services/README.md).

## Batch 478 — Autopsy Module 6: gross-exam gate override, per-organ tagging (PS-261 follow-up)

Fifth of several batches toward front-end feature-complete this week, closing both of Pete's remaining locked-in scoping decisions for the autopsy module. Verified before building (per this project's own "verify, don't trust" rule) that the module's own documented "hard validation block" — `resolveAutopsyGrossExaminationGate.ts` — had never actually been wired to block anything; it only drove a warning banner. Now a real hard stop in `signAutopsyReport.ts`, with a new, audited override capability (nobody by default, same as `cytology:qc-review:bypass`) for the rare case that needs to proceed anyway. Separately, a new per-organ tagging log lets a pathologist record a finding against an individual organ during the gross exam, using the existing 31-code organ vocabulary (SNOMED mapping still deferred, pending PS-343). Both show in the existing Case Timeline. See [services/autopsy/](./services/README.md).

## Batch 479 — fix: gross-exam gate's blocked-reason text now translated (PS-261 follow-up)

Per Pete's standing instruction for this first release ("fix a disclosed-not-fixed gap in the next batch, unless it would rise to a new feature"): closes the one gap Batch 478 disclosed rather than fixed — `resolveAutopsyGrossExaminationGate.ts`'s `blockedReasons` were hardcoded English sentences, shown verbatim in the gate-blocked banner. Now reason codes, translated through `t()` in all five locales. A related, same-shaped gap found by the same grep in `resolveAutopsyBodyReleaseGate.ts` is flagged, not fixed — out of the scope Pete named for this batch. See [services/autopsy/](./services/README.md).

---
*Subfolder READMEs: [pages/](./pages/README.md) · [services/](./services/README.md) · [types/](./types/README.md) · [components/](./components/README.md) · [utils/](./utils/README.md) · [hooks/](./hooks/README.md) · [contexts/](./contexts/README.md) · [data/](./data/README.md) · [i18n/](./i18n/README.md) · [api/](./api/README.md) · [audit/](./audit/README.md) · [loaders/](./loaders/README.md) · [firebase/](./firebase/README.md) · [theme/](./theme/README.md) · [constants/](./constants/README.md) · [mock/](./mock/README.md) · [mocks/](./mocks/README.md) · [orchestrator/](./orchestrator/README.md). No README yet: `protocols/`, `styles/`.*

## Batch 480 — Structured Inking, Module 1: Margin and Ink Application data model (PS-359 follow-up)

Sixth of several batches toward front-end feature-complete this week, and the first to work on structured inking: Pete's own concrete "Margin and Ink Application Data Model" requirement, supplied after a codebase search confirmed no real spec existed for the originally-named "GML/JOL/SOL" terms. Builds the data model (margins as discrete entities, attached at the Tissue Block or parent Specimen, each with a polymorphic, append-only list of ink applications), the recording service, the severity engine (site-configurable, defaulting to warn-only per Pete's own table), and a new per-site settings store — data model + severity engine + site setting only this batch, per Pete's own explicit scoping choice; the grossing-screen UI and ink-colour admin palette are later batch(es). See [services/grossing/](services/README.md).

## Batch 481 — Structured Inking, Module 2: grossing-screen UI (PS-359 follow-up)

Seventh of several batches toward front-end feature-complete this week. Builds the UI Batch 480 deliberately deferred: `GrossingScreenPage.tsx` gets a "Margins & Ink Applications" section per specimen, listing recorded margins (on the specimen or a block) with their ink history, and inline forms to add a margin or append a further ink application, wired to the existing `recordMarginInkApplication.ts` service and capability-gated. The severity engine's advisory display stays out of scope — it needs a real `Case` → `Site` link that doesn't exist yet. See [pages/GrossingScreenPage/](pages/README.md).
