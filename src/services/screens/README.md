**Batch 645:** screen id `lockboxDropOff` (route `/lockbox-drop-off`, capability `screen:lockbox-drop-off:open`) and the Home tile id of the same name, so Home shows the tile only to someone who can open it. Seeded to Accessioner and Admin (`services/authorization/capabilitySeeds.ts`).

# services/screens — which screens a user may open (Batch 374)

Pete: "Home Page should only show tiles that the User has access to."

Each screen reached from the Home page, or from one of its two hubs, has a capability `screen:<name>:open` in the capability catalog (group "Screens"). Roles grant them like any other capability, and hospitals change them in the Role Dictionary.

- **Home** shows a tile only for a screen the user may open.
- **A hub tile** (Pathology Workspace, Quality & Compliance) shows when the user may open at least one screen inside it, and the hub then shows only those.
- **Routes** check again (`components/Common/ScreenGate.tsx`), so typing the address shows "You don't have access to this screen" instead.
- **The nav bar's quick case search** shows only with `screen:search:open`.

Case pages (a report, grossing) aren't screens here. A case is reached from a screen, and case access has its own rules (`auth/caseAccessControl`).

| Screen | Capability | Where |
|---|---|---|
| Accession, Worklist, Search, Intraop Queue, My Contribution, Bench Contributions, Tumor Board, Configuration | `screen:accession:open` … `screen:configuration:open` | Home |
| Cytology QC Peer Review Queue, Surgical Post-Sign-Out QA | `screen:cytology-qc-queue:open`, `screen:surgical-qa-worklist:open` | Views inside the Worklist (Batch 375) |
| Cytology, Microtomy, Embedding, Slide Distribution and Molecular Workspaces; Batch Management; Margin Exception Review | `screen:cytology-workspace:open` … `screen:molecular:open`, `screen:batch-management:open`, `screen:margin-exception-review:open` | Pathology Workspace |
| Audit, Quality Assurance, Registry Exceptions | `screen:audit-log:open`, `screen:quality-assurance:open`, `screen:registry-exceptions:open` | Quality & Compliance |
| Add-On Orders | `screen:add-on-orders:open` | An action on a case (report page), no Home tile (Batch 375) |

*Corrected in the Batch 496 README audit (Oct 9, 2026): table updated to `TILE_SCREENS` in `screenAccess.ts` — it still showed the pre-Batch 375 Home tiles and lacked the screens added in Batches 421, 488, 489 and 491.*

Starting grants per built-in role are in `authorization/capabilitySeeds.ts` (`SCREEN_SEEDS`, Pete's matrix of Sep 28, 2026). A hospital's own roles are offered the screens their access implies (`customRoleScreenSeed`), so nobody loses a screen they could open before.

## Files

| File | What it holds |
|---|---|
| `screenAccess.ts` | Screen ids, their capabilities, the hubs, `canOpenTile` / `visibleTiles` (pure), and `createScreenAccessService` (the route check, through `authorizationService.enforce`). |
| `defaultScreenAccessService.ts` | The route check wired to this build's authorization service. |
| `screenAccess.test.ts` | The catalog and screen table agree; tile filtering; the route check. |

Opening a screen is standard risk, so it isn't audited; what is done on a screen is checked by that action's own capability. The API server checks the same capability on the screen's endpoints (phase 4, `docs/architecture/AUTHORIZATION_API.md`).

## Batch 375: fewer Home tiles

Pete moved three things off the Home page:
- **The Cytology QC Peer Review Queue and Surgical Post-Sign-Out QA** are views inside the Worklist. The Worklist tile shows for anyone who may open its case list or either queue (`TILE_SCREENS.worklist`). `worklistViews` / `resolveWorklistView` decide which views the Worklist offers and opens. `?view=cytologyQc` / `?view=surgicalQa` pick one, and the old addresses redirect there.
- **Add-On Orders** is an action on a case: "Add-on order" in the report page's block row opens `/add-on-orders?case=<id>` with the case loaded. The screen capability still decides who sees the action.
- **Batch Management** is inside the Pathology Workspace hub.

`TILE_SCREENS` maps each Home tile to the screens that open it. A tile shows, and its route opens, when the user may open any of them.

## Batch 421

Screen `registryExceptions` (`screen:registry-exceptions:open`), in the Quality & Compliance hub beside Audit and Quality Assurance.

## Batch 427: no way round the Configuration gate

Pete: "If you don't have permission to access configuration, you should [not] be able to backdoor in and see individual config pages." The pages opened from Configuration had their own addresses with no gate, so typing one opened it. Each now carries `ScreenGate screen="configuration"`:
- the template editor and template review (`/template-editor/…`, `/template-review/:templateId`);
- the Part Builder and Template Assembly pages (`/admin/parts/…`, `/admin/templates/…`);
- Migration Jobs, the Molecular Order Queue (Demo Reset) and the mock interface engine (a dev tool).

Template Authors and Approvers already hold `screen:configuration:open`, so nobody who uses these loses them.

`routeGating.guard.test.ts` reads App.tsx: every route must be gated or listed as open on purpose, with the reason (sign-in, Home, token links, the wall-screen dashboards, redirects, case pages with their own per-case check, and the EMR and slide-viewer stand-ins). A new ungated route fails the build.

## Batch 429: view-only sections, equipment log for the bench

`configSectionAccess.ts` (new): which capabilities make each Configuration section editable (any one of them), and which controls stay usable in a view-only section. Tested in `configSectionAccess.test.ts`. `routeGating.guard.test.ts` covers the new `/batch-management/equipment-log` route (Batch Management gate).

## Batch 430: personal settings per person; view-only fields

`configSectionAccess.ts`: in a view-only section only search and filter fields take changes (marked `data-config-nav`, type search, or a class naming search or filter); every other field keeps its value, so a dropdown that saves as soon as it changes can't fire.

## Batch 432

`SCREEN_ALSO_OPENED_BY`: an action capability that also opens a screen. Holding `cytology:qc-review:bypass` opens the Cytology QC queue (and the Worklist tile) for the override. The route check evaluates it without auditing (opening a screen isn't the action); `screenGranted` is the pure rule.

## Batch 438

`configSectionAccess.ts`: `revision_reasons` (System → Revision Reasons).

## Batch 439

`configSectionAccess.ts`: `peer_review_gate`.

## Batch 442

`configSectionAccess.ts`: `qa_trend_policy` needs `config:qa-trend-policy:manage`.

## Batch 447

`configSectionAccess.ts`: `feedback` needs `config:feedback:manage`.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

`configSectionAccess.ts`: the new `cytology_histology_correlation` section.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`configSectionAccess.ts`: the new Biopsy-to-resection correlation section is gated by `config:biopsy-resection-correlation:manage`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

`configSectionAccess.ts`: the Follow-up tracking section is gated by `config:follow-up-tracking:manage`.

## Batch 461

`configSectionAccess.ts`: Configuration → System → **Organ maps** (`organ_maps`) opens for `config:organ-map-scheme:manage` or `config:organ-map-bindings:manage`.

## Batch 482 — Structured Inking, Module 3 (PS-359 follow-up)

`configSectionAccess.ts`: Configuration → System → **Ink Colors** (`ink_colors`) opens for `config:ink-color:manage`.

## Batch 484 — PS-519 follow-up

`configSectionAccess.ts`: Configuration → System → **Inking Validation Mode** (`inking_validation_mode`) opens for `config:inking-validation-mode:manage`.

## Batch 488 — new Bench Contributions screen (PS-359 follow-up)

`screenAccess.ts`: new `ScreenId`/`HomeTileId` `benchContributions` (its own `screen:bench-contributions:open` capability, its own `TILE_SCREENS`/`checks` entries) — the four bench roles' own dedicated Home tile and page, separate from `myContributions`. Seeded in `capabilitySeeds.ts` to Accessioner, Histotechnologist, Cytotechnologist, and Molecular Technologist, alongside each role's existing screens.

## Batch 489 — new Tumor Board screen (Module 1 of Pete's Tumor Board / MDT Workspace spec; PS-359 follow-up)

`screenAccess.ts`: new `ScreenId`/`HomeTileId` `tumorBoard` (its own `screen:tumor-board:open` capability, its own `TILE_SCREENS`/`checks` entries) — the dedicated board-nomination workspace and its Home tile. Seeded in `capabilitySeeds.ts` to Pathologist, Fellow, Resident, and PA (the roles that gross/sign out and nominate cases to a board), alongside each role's existing screens.

## Batch 491 — new Margin Exception Review screen; Tumor Board Rules config section (PS-359 follow-up)

`screenAccess.ts`: new `ScreenId` `marginExceptionReview` (its own `screen:margin-exception-review:open` capability, its own `TILE_SCREENS`/`checks` entries) — the deferred Batch 490 margin-extraction review queue. Placed in the **Pathology Workspace** hub (`TILE_SCREENS.pathologyWorkspace`), not given its own standalone Home tile like `tumorBoard`, since it's a narrower, lower-traffic queue. Seeded in `capabilitySeeds.ts` to Pathologist, Fellow, Resident, and PA — the same roles as `tumorBoard` and the case-level `case:margin-exception:resolve` action this screen reaches.

`configSectionAccess.ts`: Configuration → System → **Tumor Board Auto-Flag Rules** (`tumor_board_rules`) opens for `config:tumor-board-rules:manage`.

## Batch 495

`routeGating.guard.test.ts`: `/report-preview/:caseId` added to `OPEN_ROUTES` — it has no screen gate because, like `/report/:caseId`, it runs the per-case access check (`openCaseForViewDefault`). The guard is what surfaced that the preview window lacked that check when its route was first added.

## Batch 497

`/report-preview/:caseId` removed from `OPEN_ROUTES` — the route is gone (window retired).

## Batch 522

`/consult` added to `OPEN_ROUTES`: outside consult links now carry the token after `#` (PS-290). `/consult/:token` stays, for links issued before.

## Batch 527

The route tests read both `App.tsx` and `SignedInApp.tsx`, where every route after sign-in now lives (PS-486).

## Batch 536

`configSectionAccess.ts`: the new AI Instructions section is editable with `config:ai-prompt:edit` or `…:approve`; the AI Behavior tab also with `config:ai-vendor-policy:manage`.

## Batch 550 (PS-539 phase 2d: exports through the server)

- `routeGating.guard.test.ts`: `/my-exports` is an open route, because it lists only the requester's own exports and each download checks the export's capability again on the server.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `configSectionAccess.ts`: `site_agents` opens with either site agent capability.

## Batch 595

`configSectionAccess.ts`: the Code Systems section (`code_systems`) is editable with `config:code-systems:manage`.

## Batch 610 (part A) — autopsyDashboards

New `ScreenId` `autopsyDashboards` (`screen:autopsy-dashboards:open`), in the Quality & Compliance hub.

- Batch 612 (part A): `configSectionAccess.ts` gains `PLATFORM_ONLY_SECTIONS` and `configSectionVisible`; the Interface Dictionary section is hidden from anyone without its manage capability.

## Batch 669 (ctl) — sub-screens
`SubScreenId` / `SUB_SCREEN_CAPABILITIES` / `subScreenGranted`: a page reached from another screen's button that has capabilities of its own and is no Home tile or hub screen (so no `screen:<name>:open`, CLAUDE.md rule 7 applies to Home/hub screens only). First one: `molecularControlRules`, open for `config:molecular-control-rules:view` or `:manage`. `ScreenGate`, `canOpenTile` and `screenAccessService.canOpen` accept it.
