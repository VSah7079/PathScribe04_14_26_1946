# Known gaps and release scope (PS-338)

A running list of what will and will not be in the first release, kept honest. Status words: **Live**, **Partial**, **Planned**, **Not in release**. Started Oct 16, 2026 (Batch 593) from the open follow-ups recorded in the batch changelog (`src/i18n/README.md`) and Jira. **Update this file in every batch that closes or opens a gap.** Items marked "Pete" need a decision.

## Waiting on a decision

| Item | Status | Needs |
|---|---|---|
| Billing unit: cores or specimen (PS-322) | Not started | A billing-expert decision (Pete) |
| Login bug | On hold | Pete's go-ahead |
| "Jurisdiction" search entry promised a SNOMED CT / ICD setting | Resolved in part (Batch 595) | It now opens Code Systems; the SNOMED CT release choice is still Planned (terminology server) |
| `organMapConfigChanged` event | Open | Decision (Pete) |
| Adding a country beyond the 13 | Planned | Priority (Pete) |

## ICD-11 transition (Batch 594)

| Item | Status | Notes |
|---|---|---|
| Code shape and per-jurisdiction policy (system, release, source, role, start date) | Built, not wired in | `src/services/coding/`; `docs/architecture/DIAGNOSIS_CODING.md` |
| Add Code window, sign-out and outbound messages use it | Planned | Touches shared types; wait for the India team's list of changed files |
| Config screen for the code systems of each jurisdiction | Built (Batch 595) | Configuration → System → Code Systems; saves the policy, nothing reads it yet |
| Terminology server, ICD-10 to ICD-11 maps, SNOMED CT and WHO licences | Planned | India team and legal; the ICD-11 AI suggestions need checking before a lab relies on them |

## Server side (India team)

| Item | Status | Notes |
|---|---|---|
| API server, SQL Server, audit logging | In progress (India team) | .NET 10 / C#; hosting not decided |
| HTTP services for the screens (PS-482 onward) | Planned | Built on the shared client `services/apiServer/apiHttpClient.ts` (Batch 592); waiting for India's list of services already converted |
| Server-side parts of exports, jobs, site agents, signed report versions | Partial | Browser side built; server planned (phase 2e) |
| Wall display Display Token check (401 on revoked, expired or unknown token; masked payloads) | Planned | Browser side Built (Demo) in Batch 603; server spec in `docs/architecture/DISPLAY_ACCESS_API.md` |
| Multi-factor authentication | Planned | With the OIDC / Entra sign-in work (`AUTHENTICATION_OIDC.md`) |
| Reference Server proposal | Reply sent by India | Pete to answer |
| Windows hang and India team answers | Open | Pete tracking |

## Not yet built or not yet verified

| Item | Status | Notes |
|---|---|---|
| Cytology-histology correlation print view still shows MRN | Open | Export is MRN-free (Batch 603); the printed report is a clinical document, Pete to decide |
| Terminology monitoring for SNOMED CT and ICD (nightly) | Planned | Shows "Coming Soon" on Governing Bodies |
| Vantage and Cerebro adapters | Planned | Deliberate stubs until vendor specifications arrive; vendor-neutral events in `docs/architecture/VENDOR_NEUTRAL_EVENTS.md` |
| Block deletion tiers 2 and 3 | Planned | Tier 1 is Live (Batch 588) |
| Real printer test with QZ Tray; QZ certificate "Test first" steps | Open | Batch 589 follow-up |
| Live error-monitoring project, BAA/DPA, source-map upload | Open | Batch 590; off until configured |
| Autopsy PAD release (PS-292) | Open | |
| Printing by role (PS-283) and PDF steps (PS-277, 283, 276) | Partial | Needs the `render_report` deployment |
| Deep-link step of sign-in (PS-60) | Open | Needs the demo password |
| Per-facility grant check in the Role Dictionary | Open | |
| Staff screen still stores role names (PS-262) | Known gap | |
| Known gap in PS-147 | Known gap | |

## Batch 609 (part A): Report PDF and images in reports, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Fetching a linked image from a hospital system that needs sign-in or blocks other sites (CORS) | Built (Demo) | The browser fetches the link; such a link prints the Image Unavailable page. With the API server the server fetches it, with the hospital system's credentials |
| Private-address (SSRF) blocking when fetching image links | Planned | Server side, with the API server (`BLOB_STORAGE_API.md` section 6) |
| Audited opening of linked images | Planned | With the API server, as for other links |
| Document Style size unit | Open | Sizes are px and print at 0.75 pt each (7 pt floor), so the 10 px default prints at 7.5 pt; confirm this is the intended unit |
| Calibri, Verdana, Georgia in print | Open | Print as Helvetica or Times; embedding those fonts needs their licences |
| Cytology report header and footer parts | Not applicable | The cytology report has no template to hold them; it uses the lab's page setup and Document Style |
| Images print as an appendix after the report's pages | Open | Placing an image inside a report section needs template support |
| Report renderer redeploy | Needs deploy | `functions/` (main.py, report_layout.py, cytology_report.py) must be redeployed before page setup and Document Style print |

## Batch 605: Simulated interface engine, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Inbound HL7 listener for ADT and events | Planned | Server side; the browser processors are Built (Demo) |
| Interface engine: sending site on inbound orders | Planned | `IncomingOrder.siteId` and site crosswalk are ready |
| Vendor HL7 field layout for block orders and the engraver endpoint | Planned | `IHL7VendorAdapter` |
| Billing engine; X12 837P, KVDT, SESAM-Vitale | Planned | Charges and the financial-class payload reach the simulated engine only |
| Registry wire formats; licensed ICD-O-3 / ICD-11 terminology proxy | Planned | Seeded sample list and manual ICD-O-3 entry in the meantime |
| Server jobs API, interface monitoring API, Firebase project, LIS write-back | Planned | Simulated stand-ins show in the app |

## Quality and accessibility

| Item | Status | Notes |
|---|---|---|
| Native-speaker review of French, German, Dutch, Korean | Open | Korean first; Batches 588 to 590 added a lot of new wording |
| Screen-reader testing (PS-687); axe checks and keyboard access (PS-491) | Partial | |
| Firefox support (PS-722) | Not verified | |
| Duplicate CSS (PS-294) | Done | Batches 436 and 517 |
| Dead CSS (PS-520) | Done (Batch 598) | No unreferenced classes; the 517 classes built from a name prefix or suffix were checked: every variant word (`--warning`, `--overdue`, ...) appears in the code that builds the name. Guard keeps the count at 0 |
| Actions list vs roles (Batches 599-602) | Partial | All 245 voice/hotkey commands are in the Role Dictionary with default grants (Pete to review). Hotkey clashes resolved in Batch 602 (screen in focus wins; Alt+J reaches always-on commands). Open: 98 Role Dictionary entries have no voice or hotkey (voice needs handlers); bench roles start with few navigation commands |
| Keyboard access (PS-491) | Source checks done (Batches 524, 566, 567, 570) | Screen-reader testing (PS-687) and browser axe runs remain |
| Large-component splits (PS-497) | Ongoing | |
| 47 `src/` folders without a README | Open | |
| Review tests PS-261, PS-273, PS-493 | Open | |
| Lint errors in `serverJobsContract.ts` (3) | Open | |

## Moving to GitHub (PS-468, end of October)

`api/`, `api.zip` and raw logo source art are left out of the first repository. Before cut-over: list which `public/` files the app really uses, apply all delta zips to one copy, run `npm run cleanup:deleted`, create the repository, connect it to the session, then set up CI (PS-471).

- Batch 614: Mac Option and AltGr hotkey matching is fixed in code and tested with simulated key events (physical-key fallback, AltGr read as Alt, no hotkeys while typing a character). It has not been tried on a Mac or an AltGr keyboard. The Alt+J routes are now in the Role Dictionary action reference and the Actions tab. fr/de/nl/ko voice phrases and prefix strings need native review.

- Batch 604: the Simulated mail outbox and the simulated critical-alert channels are stand-ins. Real delivery needs the API mail service (`/api/notifications/email`, `/api/notifications/template-events`), an SMS gateway, a secure e-mail relay and an EHR push endpoint. The support "Ticket closed" button is a stand-in for the ticketing system; support audit entries still record no origin IP or country (server only).

- Batch 606: the Simulated print log and the simulated routes (BarTender, Zebra Browser Print, Direct via Interface Engine, the PathScribe Agent with no program running, engraving, scan-event labels, report print to network and site-agent printers) are stand-ins. Real sending needs each vendor's service, the site agent program and the API server. EPL and DPL export carry positions, text and barcode type, but barcode command syntax differs by printer model, so it must be checked on the lab's own printer. A saved Label Designer layout for the requisition replaces the whole sticker sheet with one label. The simulated gross weight is random (5 to 85 g) and is flagged as simulated on the specimen. The technical-component block is sent in the surgical report request (`technicalBranding`) and the page size and margins as `pageSetup` in both report requests; since Batch 609 the renderer reads `pageSetup` (and the Document Style and header/footer parts) in both templates, since Batch 618 it also reads `technicalBranding` (name and address line on a signed-out report; director and CLIA are never drawn). Label Designer layouts apply per facility only where the label type allows an override; the active facility is not yet passed to the print paths, so they use the enterprise default.

- Batch 607: the ICD-10 to ICD-11 pairs are a small Simulated sample, not the WHO mapping tables (needs the WHO tables through the server). OPCS-4 search and applying codes need an NHS TRUD licence and a server feed; the five sample codes shown are for orientation only. The ICD-O-3 table is a common-terms subset (about 55 morphology codes), not the full licensed edition. The sign-out override records no typed reason (confirm or stop only). The policy is applied in the Add Code window, sign-out and the charge message; other outgoing messages (cancer registry export, HL7 report) do not yet carry per-system codes, so there is nothing to filter there. The case jurisdiction is the performing laboratory facility's, falling back to the laboratory setting.

## Batch 608: Cytology and screening, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Proficiency test provider exchange (real grades) | Planned | The panel builder and a Simulated graded result are Built (Demo); a real grade arrives through the interface engine |
| Prior cervical procedure from an ADT PR1 segment | Planned | Picker entry at accessioning is Built; the ADT processor does not parse PR1 yet |
| Country screening interval rules | Open | The interval table is editable; the starting values are examples, not a programme's published rules |
| Molecular QC runs carry organisation only for the seeded instruments | Open | Real runs need the instrument's site from the interface engine |
| Autopsy and cytology Return to Trainee: notification to the trainee | Open | The trainee sees the banner on opening the case; no e-mail is sent |
| Reviewer pool codes are free text | Open | A picker needs the rule pools to be a managed list |

## Batch 609 (part C): AI models, dictation languages, medical spell check

| Item | Status | Notes |
|---|---|---|
| Model settings (output length, confidence threshold) | Built (Demo) | Saved per organisation in the browser-side model service. Firestore model service and emulator-tested rules were dropped with Firebase; the SQL Server model API is the server's job. Only these two settings exist; others are refused until something reads them |
| Store licensing for models | Planned | Mock store; needs the real licence service |
| German, French, Dutch medical word lists | Built (starter) | About 190, 155 and 170 plain entries from `spellcheck-data/{de,fr,nl}/`. Needs native-speaker clinical review; no machine-translated terms. Extension from the national SNOMED CT editions needs the licences (PS-343) |
| Medical terms not in a starter list are still flagged | Open | Add through the facility dictionary meanwhile |
| Dictation refinement wording for French, German, Dutch, Korean | Built, needs review | Shown in Configuration, System, Voice for the reviewer. Machine-assisted |
| Translated voice commands | Partial | The English fuzzy-match switch only matters for actions that have translations (`voiceTriggersByLanguage`); translations still need native-speaker review |

## Batch 609 (part B): Templates, amendments and Upload Protocol, still waiting on others

| Item | Status | Notes |
|---|---|---|
| Licensed CAP and RCPath protocol content (about 1,500 placeholder field labels) | Planned | Needs the CAP / RCPath licence; the library works with the placeholder labels meanwhile |
| Import of CAP eCC (SDC) XML and Excel protocol files | Planned | Both are checked for format and reported as Unverified; converting them to a protocol needs the bodies' sample files and field mapping. JSON files exported from PathScribe import as drafts today |
| Mismatch release setting is lab-wide | Open | One setting for the whole laboratory; per facility or specialty is not offered |
| Autopsy addenda | Built (Demo) | Checked with the report's diagnosis, same as surgical; the autopsy FAD-specific sections are not added to an addendum's text |
| Template audit entries live in the browser audit log | Built (Demo) | The SQL Server audit store (PS-468 follow-on) keeps them once the API server is in place |
| Autopsy turnaround: public holidays | Built (Demo) | Working-day targets (for example UK 14-21 working days) skip weekends only; a holiday calendar per jurisdiction would move the deadline later, never earlier |
| Autopsy dashboards: cause of death | Built (Demo) | Only Simulated cases carry a cause category; a live case holds it in the signed report text, so it shows as not recorded until the report stores it as data |
| Autopsy dashboards: data source | Built (Demo) | Figures come from the browser-side case service plus Simulated cases; the SQL Server reporting store comes with the API server |
| Tumor board criteria rules: matching | Built (Demo) | Diagnosis and biomarker criteria match the signed report text (case-insensitive); structured coded results (SNOMED, LOINC) match once the API server supplies them |
| AI discordance: data source | Built (Demo) | Figures come from the browser-side AI result store and Simulated results; the real AI vendor feed and SQL Server reporting store come with the API server |
| Delegation completion | Built (Demo) | Signing the case out completes the signed-in user's pending delegations on it; a consult answered without a sign-out (for example a verbal reply) is completed by the server workflow once it exists |

## Batch 610 (part B): Targets, client service levels and the jurisdiction overview

| Item | Status | Notes |
|---|---|---|
| Performance targets: where they are kept | Built (Demo) | Saved in the browser; the SQL Server store comes with the API server |
| Performance targets: per person or facility | Open | One set of targets for the whole laboratory; none per pathologist or per facility |
| Performance targets: dashboard coverage | Built (Demo) | The Productivity dashboard measures the monthly cases and RVU targets; the TAT and QC targets are kept for reports and are not charted there |
| Client service levels: where they are kept | Built (Demo) | Saved in the browser; the SQL Server store comes with the API server |
| Client service levels: clock | Built (Demo) | Hours run continuously from the received time (no business-hours calendar or client holidays), so a late case can be shown a little later than a contract that skips weekends would count |
| Client service levels: client matching | Built (Demo) | A case is matched to its client by the facility's assigning authority; a case from a facility with no authority is not measured |
| Jurisdiction overview | Built | Read-only by design; every setting is changed on its own screen |

### Batch 611 (part H): multi-factor sign-in (#157)

| Item | Status | Needs |
|---|---|---|
| Second factor for hospital staff | Built (Demo) | The identity provider must be set to require and report MFA (`amr` / `acr`); the API server must re-check the verified token and enforce the policy, session time and step-up on the server (`docs/architecture/MFA.md`) |
| Simulated authenticator for demo accounts | Built (Demo), Simulated | Demonstration only: the secret derives from a documented seed and is checked in the browser. A real password deployment needs a server-generated, server-held secret |
| Recovery codes and enrolment reset | Built (Demo) | Server-side storage of the hashes and the same-organisation reset check |
| Policy, enrolments and failed-code counts | Built (Demo) | Browser demo data (`ps_mfa_*`); the API server holds them in production |
| Native-speaker review of the new fr/de/nl/ko wording | Open | Pete |

### Batch 611 (part F): legacy file import and biometric prompt (#132, #166, #158)

- Legacy file import runs in the browser (up to 2,000 records, CSV or JSON) and creates draft cases marked Simulated bulk import. Server-side bulk import jobs, large files and OCR of scanned legacy reports need the interface engine.
- Biometric signing uses the device prompt with a challenge made in the browser, so no server verifies the signature or stores the public key. A server-issued challenge and verification (PS-345 API server) is what makes it a Part 11 / Annex 11 e-signature. Until then it is labelled Simulated on screen and in the audit log.

