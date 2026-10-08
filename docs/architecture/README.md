

# docs/architecture

Server contracts for the PathScribe API team. Each file is the browser's side of one area, written from the code.

## Batch 444

`AI_PROXY.md` (new): the AI, Gemini, OpenAI, managed, custom, Bedrock and UMLS routes the API server must provide, with the key it adds for each. The browser holds no key.

## Batch 446

- `AUTHENTICATION_OIDC.md`: Pete's decision (PS-345) that the API server holds the sign-in tokens and the browser gets only a session cookie scripts can't read.
- Case pages are addressed by support reference (`src/services/caseAddresses/`). The API server must issue and resolve references (`ISupportReferenceService.forRecord` / `recordIdFor`).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

New `CASE_MATERIAL_API.md`: the atomic decant change. It returns the tree and the affected billing lines, with a 409 on a stale `rowVersion`. `AUTHORIZATION_API.md` gains `config:cytology-histology-correlation:manage` and `case:decant:delete`.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`AUTHORIZATION_API.md` gains `config:biopsy-resection-correlation:manage`. The Cytology Workspace and Microtomy workstation now call the atomic decant change in `CASE_MATERIAL_API.md`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

- New `FOLLOW_UP_API.md`: tables, endpoints, the daily alert job and the email-transport gap.
- `AUTHORIZATION_API.md` gains the five follow-up capabilities.

## Batch 456 — Sign-in lockout, password screening, demo seeds

`AUTHENTICATION_OIDC.md` §4a: the sign-in lockout and password screening, with what the API server must enforce, and the `VITE_PWNED_CHECK` setting.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

New `CASE_API.md`: `row_version`, `If-Match`, 409 on a stale save, system retries, the Edit Conflict overwrite, pool claims.

## Batch 460

`AUTHORIZATION_API.md`: `billing:applied-code:review` in the catalog and both endpoint tables.

## Batch 461

- `ORGAN_MAPPING_API.md` (new): the organ-map contract for the API server: colour layers, bindings, the report figure (snapshot, stale, locked, hashed), SQL tables and SignalR events. Its first rule: the map's data comes from the synoptic answers.
- `AUTHORIZATION_API.md`: `report:organ-map:insert`, `config:organ-map-scheme:manage`, `config:organ-map-bindings:manage`, and an "Anatomical maps" section.

## Batch 462

`ORGAN_MAPPING_API.md`: breast (geometry, resolver, bindings, the colours, the close-margin threshold and its table). `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` also covers the thresholds.

## Batch 463

`ORGAN_MAPPING_API.md`: the Mohs binding, the stage question's answer keys and server tables, voice, maps that are always in the report, and the server PDF options. `SYNOPTIC_RESULT_API.md`: Mohs observations. New `REPORT_RENDERING_SERVICE.md`: the production report PDF service (Pete's decision: Microsoft.Playwright / headless Chromium) and its controls.

## Batch 463b

`ORGAN_MAPPING_API.md`: the Mohs block rule (no automatic letter; sign-out stops on a missing or uncut block, enforced by the server too) and the voice additions.

## Batch 464

`ORGAN_MAPPING_API.md`: colorectal bindings and maps; the involved-margin rules (Pete's parameter, operator enum, site-level only, the one rule every consumer calls). `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` covers those rules.

## Batch 465

`ORGAN_MAPPING_API.md`: the oral cavity margin rules and validation with what a layer inherits (§3); head and neck bindings and maps, and what "copyable mapping" covers (§4). `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` covers the oral rules.

## Batch 465b

`ORGAN_MAPPING_API.md`:
- Conflicts and the fallback guardrail (§3).
- The two-layer halo.
- Copying a map between blocks: Phase 1 as built, Phase 2 "Clone Layout to Block…" on the roadmap.
- Neck counts and totals (§4).

`AUTHORIZATION_API.md`: the strict rule, and conflicts warned and audited.

## Batch 466

- `ORGAN_MAPPING_API.md`: the kidney margin rules (§3), the renal binding and map (§4), and Batch 470 structured inking as planned (§7).
- `AUTHORIZATION_API.md`: `config:organ-map-scheme:manage` covers the kidney rules.

## Batch 466b

- `ORGAN_MAPPING_API.md`: partial nephrectomy margins; generic margin questions derived from the map (§4).
- `AUTHORIZATION_API.md`: `config:organ-map-bindings:manage` covers the derived questions.

## Batch 466c

- `ORGAN_MAPPING_API.md`:
  - partial nephrectomy anatomy (variant anatomy letters);
  - adenoma at the polyp margin counts as involved (lab option); (Replaced in Batch 466d by margins per component.)
  - the editor builds "unless" / "or also when" conditions and the checked hand-entered total.

## Batch 466d

`ORGAN_MAPPING_API.md`: margins per component, and how existing bindings are handled (brought up to date, or held for review).

## Batch 466e

`ORGAN_MAPPING_API.md`: oral dysplasia margins count as involved only when the dysplasia is high-grade.

## Batch 467

New `MOLECULAR_ORDERS_API.md`: the in-house molecular order engine — endpoints, state machine, well binding, result hydration, audit events, server tables. `AUTHORIZATION_API.md`: `molecular:order:assign-plate`, `molecular:order:cancel`.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

- `MOLECULAR_ORDERS_API.md` §7–9: send-out orders, the instrument and interface engine, and what remains for the server.
- `INTERFACE_TRANSACTIONS.md`: molecular worklists and results through the API server, with order ids.

## Batch 468 — Autopsy: consent-scope enforcement, forensic chain-of-custody

`AUTHORIZATION_API.md`: new `autopsy:custody:transfer` capability (220 → 221; Autopsy section now 2); its status line corrected from "220 as of Batch 467b" to "221 as of Batch 468." No new API doc file — see `src/services/autopsy/README.md` for the consent-scope and chain-of-custody detail; the server-side interface-engine gap (§8/§9 of `MOLECULAR_ORDERS_API.md`) is unrelated and still open from Batch 467b.

## Batch 469 — Autopsy: toxicology, organ-retention disposal, consent narrowing/revocation (PS-261 follow-up)

`AUTHORIZATION_API.md`: four new capabilities — `autopsy:toxicology:order`, `autopsy:toxicology:result`, `autopsy:retention-disposal:record`, `autopsy:consent:manage` (221 → 225; Autopsy section now 6); status line corrected to "225 as of Batch 469." No new API doc file — see `src/services/autopsy/README.md`.
