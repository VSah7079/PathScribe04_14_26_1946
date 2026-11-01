**Batch 725:** the in-app User Guide page scrolls (contents list and article each have their own scroll area). Styles only. See `src/i18n/README.md`.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

**Batch 721:** Accession screen in two columns on a wide window (`pages/AccessionPage/`, `hooks/useAccessionTwoColumn.ts`, `services/accessioning/resolveAccessionPanels.ts`). Changelog: `i18n/README.md`.

**Batch 711:** `services/staffPasswords/` gains the password reset request service; `components/Auth/PasswordResetRequest.tsx` is the sign-in step that uses it (demo, password sign-in only).

**Batch 675:** MFA policy service for the API server (`services/auth/mfa/`); browser side only, server routes not built. See `docs/architecture/ACCESS_SESSION_API.md` §5.

**Batch 668:** the Help buttons moved from floating buttons over the screen into the top bar, beside the microphone; they open in a remembered window, or a new tab if the browser refuses one.

**Batch 651 (audit gaps):** pool, delegation, team, comment, dictionary, language and deficiency actions are audited by their services; see `services/auditlog/README.md`.

**Batch 650:** registered voice and keyboard commands that no screen answered (Sign Out Case, History, Codes, Accept / Pass, Worklist tiles, Search, TAT tiles, Finalise) now do what their buttons do; the rest are listed with reasons in `docs/product/KNOWN_GAPS.md` and guarded by `services/actionRegistry/actionListeners.guard.test.ts`.

**Batch 649:** safety and access fixes. Screenshot redaction covers every `data-phi` / `data-pii` element; the barcode listener ignores script-made keystrokes; both surgical sign-out paths run the same review gates and write in a safe order; signatures are linked to the report version and PDF hash; 17 new capabilities, and `admin-override` no longer signs a case. See `i18n/README.md` (Batch 649).

## Batch 645 — Lockbox Drop-Off

After-hours specimens are scanned into a lockbox at a kiosk screen, and the morning team works from an Overnight folder. New: `services/lockbox/`, `pages/LockboxDropOffPage/`, `components/Lockbox/`, `lockboxCapabilities.ts`, `constants/lockboxActionGroup.ts`, `services/actionRegistry/lockboxVoiceCommands.ts`; changed: the Home tile, route, screen access, capability seeds, the Role Dictionary actions, voice and hotkeys, and the six locale files. Contract for the API server: `docs/architecture/LOCKBOX_API.md`.

## Batch 620 (part E) — US ePath (PS-800)

New `services/usEpath/` (state profiles, routing by the performing facility's state, checks, transport adapter contract, the prepare step), `services/hl7/epathBuilder.ts` (the NPCR ePath base message, HL7 v2.5.1 ORU^R01) and Configuration > System > US ePath. Contract: `docs/architecture/US_EPATH_API.md`. Only a labelled example profile ships; real profiles come from each state's published specification.

## Batch 620 (part S) — registry batch files (PS-800)

New `services/batchRegistryFeed/` (profiles for screening programmes and registries that take a CSV or XML file, file building with checksums, records held back when a required field is missing, the registry's answer to a file applied to each record, the programmes' submissions on the Outbound Queue) and Configuration > System > Registry Batch Files. A batch programme's sign-out result is queued and goes in the next file. A labelled example profile ships; the NAACCR XML feed is a slot that cannot be turned on yet. Capabilities `config:batch-registry-feed:manage` and `registry:batch-file:generate`; contract `docs/architecture/BATCH_REGISTRY_FEED_API.md`.

## Batch 620 (part C) — UK cancer registry (COSD) destination, checks and correction window (PS-800)

New `services/cosd/` (destination settings with enterprise and performing-facility overrides, offline checks on a UK submission, a labelled simplified preview, working-day correction due dates) and Configuration > System > UK Cancer Registry (COSD). The preview is not the official COSD schema; the rules that still need the published specification are listed in `docs/architecture/UK_COSD_API.md`.

## Batch 618 (part C) — server version of case material (PS-482)

`caseMaterialService` is now a service with a demo version and an API-server version (`services/material/`, `docs/architecture/CASE_MATERIAL_API.md`): one `POST /api/material/case-material/apply-decant-change` returns the whole updated material tree and the affected billing lines. Exported from `@/services`; `applyDecantChangeLive` calls the chosen version. The optimistic store and selection state stay in the browser. Nothing was tried against a real server.

## Batch 617 (part R) — one route style for every server version of a service (PS-488 dev notes, Pete)

- **One route style.** Every server (HTTP) version now uses `/api/<area>/<service>/<method-kebab>`; a read whose arguments are all plain values is `GET` (arguments in the query string), everything else is `POST`; `PUT`, `PATCH` and `DELETE` are no longer used and no id or text is in the path. About 85 services written as REST resources were converted (code, fake-fetch tests, contract docs); the earlier-to-current path of every call is in `docs/architecture/HTTP_ROUTE_MAPPING.md`.
- **Why method routes:** the interface already has one method per action, so the server's route table is the interface's method list; the kit generates the path, so it cannot be misspelt; commands carry what they change in a body, which keeps patient text out of URLs and logs.
- **Guard:** `src/services/apiServer/httpRoutes.guard.test.ts` fails on any other verb or path shape. Three files keep their own contracts (job polling and binary downloads): `exports/httpExportApi.ts`, `reportDocuments/httpReportDocumentService.ts`, `reports/httpReportVersionService.ts`.
- **Wire changes the server author must know:** an id that was in the path is now in the query string or the body (`update(id, changes)` sends `{ id, changes }`); `deny` and `revoke` still send only the reason (plus `id`); the audit log and error log filters are sent as a body (the value `all` is still left out); a case list sends its filters as a body and ignores a cursor with no page size, as before; the follow-up commands send only the key and the choice.
- Screens are unchanged. No new permissions, no new strings. Not built: the endpoints themselves (India team).

**Batch 618 (part B):** the partial nephrectomy drawing shows Gerota's fascia and the adrenal only when the extent reports them (PS-492); a size guard stops source files over 1,000 lines from growing (PS-497).


**Batch 618 (part A):** a second facility for the technical component of a split case (PS-336): `services/accessioning/resolveTechnicalFacilityOffer.ts`, `services/billing/resolveChargeFacilities.ts`, `pages/AccessionPage/AccessionTechnicalFacilityField.tsx`.

## Batch 638

Batch 638 (Oct 20, 2026): CSMS messages wait for the eligibility check; Belgian Dutch dictation option; colleague reassignment room prorated by logged hours; surgical demo patients in the patient index. See `src/i18n/README.md` and `docs/product/GUIDE_UPDATES.md`.

## Batch 639

Batch 639 (Oct 20, 2026): hotkey decisions answered. Print Current Cassette moves to Alt+Shift+O; Discard Unsaved Changes asks for confirmation. See `docs/product/HOTKEY_DECISIONS.md`.

## Batch 640

Batch 640 (Oct 20, 2026): self-collected HPV recall windows and wording are set per country (Australia, New Zealand) by the laboratory's administrator, from a dropdown. See `docs/architecture/HPV_RESULT_INBOUND.md` section 8.

## Batch 641

Batch 641 (Oct 20, 2026): recall documentation corrected (no sign-off needed for windows or wording; codes belong to the interface engine); PS-539 readiness status refreshed; recall card loading fix.

## Batch 642

Batch 642 (Oct 20, 2026): sign-out authentication policy. An administrator sets, in Session Security, whether signing a case out asks for a password every time (default) or once per session, with an optional second factor, an enterprise default, per-performing-facility overrides and a lock; the Sign Out button shows "(Password Required)" when a password is needed; every policy change, authentication, in-session sign-out and expiry is audited with full context. Remote sign-out limits and workstation lock need the API server (phase 2e). See `docs/architecture/SIGN_OUT_AUTHENTICATION.md`.

## Batch 650 (650a)

Voice engine: Report Draft phrases register, Enter Gross / Micro / Diagnosis move dictation into their section, AI-refined dictation replaces instead of repeating, corrections are learned in the report editors, six risky commands are said twice, voice uses the keyboard's eligibility rule, and spoken commands are audited. `services/voice/README.md`.



## Batch 651: AI answers checked in code
See `services/aiIntegration/aiSuggestionRules.ts`, `services/coding/aiCodeSuggestions.ts`, `orchestrator/narrativeProvenance.ts` and `docs/product/GUIDE_UPDATES.md` (Batch 651).

## Batch 652 — Specimen pipeline gaps

Specimen pipeline gaps closed (triage gate as a service, intraoperative findings carried to the case, every frozen specimen reconciled, pool routing from both grossing screens and the Assignment Timeout, Lockbox receipt linked to its case, repeatable report PDFs). Details: `docs/product/GUIDE_UPDATES.md`, `docs/product/GAP_REGISTER.md`.

## Batch 652 (defect fixes)

Defect fixes: see `i18n/README.md` (Batch 652, defect fixes) for the files.

- Batch 669b: the User Guide route (`/help/*`) moved into the no-top-bar shell in `SignedInApp.tsx`, so the guide window shows only the guide.

- Batch 669c: old embedded guide PDFs and the About-menu guide links removed; guides open only from the top-bar Help buttons.

- Batch 669d: the top-bar Help buttons now appear on Configuration (the page publishes its open tab and section through `services/help/helpAnchorStore.ts`, `hooks/usePublishHelpAnchor.ts`), the ? shows on every screen, and the Administrator Guide re-scrolls to the section as screenshots load (`scripts/admin-guide/guide.js`).

- Batch 669e: fixes for ws-8, ws-10, ws-11, ws-16, ws-17, everyday-17, everyday-22, access-1, access-11 (see `docs/product/GUIDE_UPDATES.md`).

- Batch 669f: second group of findings fixed (workstations, molecular, operations, messaging, cytology); three new capabilities (see `docs/product/CAPABILITIES.md`).

- Batch 669g: unrecognised secondary cytology code blocked with an inline message; a reply moves its conversation up; Mark as unread disabled when you wrote last.

- Batch 669h: Control Rules has its own view permission; External Consult is masked by default (audited opt-in for full identity); the Home footer status is real and the static compliance claims are removed.

- Batch 669i: External Consult links stop at 3 views or 48 hours after signature; Audit Log can preview identity; date of birth is fixed DD-MMM-YYYY.

Batch 670: audit writes (and the rest of the audit path) now go through the switched `auditService`; see `src/services/apiServer/README.md`.

- Batch 679: `services/regulatoryProfile/` (documentation / clinical_support switch); `docs/product/REGULATORY_PROFILE.md`.

- Batch 680: `services/aiGovernance/` (audit of AI accept/reject/code binding); sign-out gate for unaccepted AI narrative.

- Batch 682: AI settings follow the regulatory profile (mismatch rules note; unused confidence checkbox removed).

- Batch 683: the clinical-pathologic mismatch flag shows two checked source quotes.

- Batch 685: mismatch evidence quotes are saved with the QA record; forced-colors cue for unreviewed AI values.

**Batch 713:** scan stations are offered only to people who may use them (sign-in prompt, header list, `STATION:` barcode switch); see `services/scanStations/README.md`.

**Oct 28, 2026:** Feedback destination and validation routing (Oct 28, 2026): Enhancement Requests can be delivered to a website address set in Configuration > System > Feedback or pre-seeded in config.json (`VITE_ENHANCEMENT_REQUEST_URL`); QA feedback has an AI / Template validation category that links a validation study and template and goes to its own recipients (`FEEDBACK_ROUTED_TO_VALIDATION`). See `docs/architecture/FEEDBACK_DESTINATION.md`.

**Batch 715 (Oct 28, 2026):** letters or numbers for specimens, blocks and slides, set per enterprise with a per-lab override (Configuration > System > Integrations > Facility Configuration). Rules and gaps: `services/labeling/README.md`.

## Batch 726

Lab Workflow & Batch spec, first part: the bench workstations read batches, every station scan is recorded (`services/stationScans/`), a carrier keeps its batch from step to step.

## Batch 727

Wall displays: add-ons on Embedding & Microtome with time X, the Stations view (spec section 9's live set), every label translated.

## Batch 728

Research cases and batch purposes (spec Decision 4): `services/researchCases/`, `services/batches/batchPurposes.ts`, Configuration → System → Research Cases & Batch Purposes.

## Batch 729

Station tracking part 2: matrix blocks at Embedding and Slide Distribution, the scan history panel, printed/completed events, wrong-case check at Grossing, not-scanned and loose items on the Stations view.

## Batch 730

Lab Workflow Reports (`services/labWorkflowReports/`, Batch Management → Workflow Reports), BI feed datasets, "print labels at" (`services/labelPrintRoutes/`), Equipment Log temperature checks.

## Batch 731

Exhausted-block rule (Lab Workflow spec §10.6, as decided), item end states (§10.5) and lineage (§10.4). See `src/i18n/README.md` Batch 731.

## Batch 732

Batch 732: megablocks and multi-piece blocks (Lab Workflow spec §11): block type, piece map, slide size, sections and levels per slide, orders for a piece, partial exhaustion. See `src/i18n/README.md` Batch 732.

## Batch 745

Batch 745: S6 autopsy seed (`services/cases/demoBaselineCases.ts`, the autopsy dictionary entry, patients).

## Batch 744

Batch 744: S14 fluid and FNA seed (`services/cases/demoFluidCases.ts`, batches, instrument orders, patients, TTF-1); Cytology Worklist names.

## Batch 743

Batch 743: Assist cases: the Attachments window keeps references only (`services/caseAttachments/reportEditState.ts`, `services/imageAssociation/caseReportImages.ts`, `components/CaseAttachments/CaseAttachmentsModal.tsx`).

## Batch 742

Batch 742: case attachments and images inside report sections: `services/caseAttachments/` (new), `services/imageAssociation/` (placements in sections), `components/CaseAttachments/` (new; replaces `components/ReportImages/`), `hooks/useCaseAttachments.ts`, `hooks/useReportPlacements.ts`, the report page, the Cytology Workspace and the report preview.

## Batch 741

Batch 741: `services/material/specimenDivision.ts`, `components/Material/DivideSpecimenPanel.tsx`, `hooks/useSpecimenDivision.ts`.

## Batch 740

Batch 740: `pages/CytologyPrepStationPage/` (new), `services/cytology/cellBlockHandoff.ts`, capabilities `screen:cytology-prep:open` and `cytology:cell-block:hand-off`.

## Batch 739

Batch 739: aliquot decants (`types/case/Material.ts`, `utils/aliquotMigration.ts`, `utils/decantTypeText.ts`), liquid-based Pap protocols, processor on the instrument order, cytospin suggestion.

## Batch 738

Batch 738: demo seed data (`services/protocols/surgicalDemoProtocols.ts`, `services/cases/demoSignOutReadyCase.ts`, orders, stations, printer, users), colon template wording (`data/templates/generic/`), review window labels (`services/reports/synopticReviewEntries.ts`).

## Batch 737

Batch 737: matrix add-on orders (`services/addOnOrders/`), megablock cassette template (`utils/labels/`), exhausted and large-format checks in Batch Management (`services/batches/`, `utils/`), staining racks in Equipment (`components/Config/System/StainingRacksPanel.tsx`).

## Batch 736

Batch 736: bench reasons in the Reason Dictionary (`services/reasons/benchReasons.ts`, `components/Config/System/BenchReasonsSection.tsx`), reason codes on add-on exceptions and batches, header search above the keyboard.

## Batch 735

Batch 735: station touch layout (`components/Touch/`, `SignedInApp.tsx` wraps the station routes), `StationScanField`, `QuickReasonPicks`, `utils/touch/`, `services/scanner/scanRoutePolicy.ts`; unused scan-field CSS removed from `pathscribe.css`.

## Batch 734

Batch 734: ad-hoc carriers move silently (`services/batches/`); direct browser printing per facility (`services/printing/directDevicePrinting.ts`, `components/FacilityDictionary/DirectPrintingSetting.tsx`).

## Batch 733

Batch 733: one flag per exhausted block and one answer for every waiting slide; destructive cutting only while tissue may remain (Pete's decisions, Oct 30, 2026).

## Batch 746

Batch 746: S7 molecular seed (`services/cases/demoMolecularCases.ts`, `services/molecular/molecularRunHistoryDemoSeed.ts`, control rule, reagent lots, patients).

## Batch 747

Batch 747: S8 wall displays (the facility fix in `services/facilityOpsDashboard/caseFacility.ts`, the wall-volume seed, the demo display tokens card on the Demo Reset tab).
