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
| Accession, Worklist, Search, Add-On Orders, Intraop Queue, Cytology QC Peer Review Queue, Surgical Post-Sign-Out QA, My Contribution, Batch Management, Configuration | `screen:accession:open` … `screen:configuration:open` | Home |
| Cytology, Microtomy, Embedding, Slide Distribution and Molecular Workspaces | `screen:cytology-workspace:open` … `screen:molecular:open` | Pathology Workspace |
| Audit, Quality Assurance | `screen:audit-log:open`, `screen:quality-assurance:open` | Quality & Compliance |

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
