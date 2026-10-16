
## Batch 518

- **quality/evidence/**: new. The Xray execution file for each batch is kept here, starting with Batch 518.
- **architecture/**: new interface transaction types, and the new capabilities `interface:outbound:resend` and `label:batch:reprint`.

- **architecture/** (Batch 519): `ORGAN_MAPPING_API.md` specifies the free-text node count checks the API server must repeat (PS-494).
- **quality/evidence/** (Batch 519): `PathScribe-Batch519-xray.json`.

- **architecture/** (Batch 520): `REPORT_DELIVERY_API.md`, the e-fax and file-drop contract for the API server (PS-280).
- **quality/evidence/** (Batch 520): `PathScribe-Batch520-xray.json`.

- **architecture/** (Batch 521): retries and fax confirmations in `REPORT_DELIVERY_API.md`; `ReportDeliveryStatus` in `LIVE_UPDATES_SIGNALR.md` (PS-281).
- **quality/evidence/** (Batch 521): `PathScribe-Batch521-xray.json`.

- **architecture/** (Batch 522): `CONSULT_ACCESS_API.md` (PS-290).
- **quality/evidence/** (Batch 522): `PathScribe-Batch522-xray.json`.
- **quality/evidence/** (Batch 523): `PathScribe-Batch523-xray.json`.

## Batch 526

New `product/CLINICAL_MISMATCH_CHECK.md`: the mismatch check explained for customers and staff, including the approved redesign (PS-554). `architecture/AUTHORIZATION_API.md` has the planned capabilities and the separation-of-duties rule.

## Batch 527

New `product/GUIDE_UPDATES.md`: a per-batch log for the guide owners, training, marketing and RFP answers (Pete, Oct 11).

## Batch 529

The mismatch rules are built (PS-554, part 1): `product/CLINICAL_MISMATCH_CHECK.md`, `architecture/AUTHORIZATION_API.md`.

## Batch 530

The mismatch alert and gates are built (PS-554, part 2): `product/CLINICAL_MISMATCH_CHECK.md`, `architecture/AUTHORIZATION_API.md`.

## Batch 531

Mismatch check: re-run on change and cytology alert (`product/CLINICAL_MISMATCH_CHECK.md`).

## Batches 532–534

`product/REPORT_RELEASE_DELAY.md` (new, Batch 534): the release delay on every report output, and Recall. Cytology case report, urgent preliminary and release delay entries are in `product/GUIDE_UPDATES.md` and `product/FEATURE_OVERVIEW.md`. Quality evidence for each batch is in `quality/`.

## Batch 536

Governed AI instructions and separation of duties (`product/CLINICAL_MISMATCH_CHECK.md`, `architecture/AUTHORIZATION_API.md`); the AI vendor policy's server contract (`architecture/AI_PROXY.md`).

- **architecture/** (Batch 537): `DEPLOYMENT_READINESS_REVIEW.md`, the PS-539 deployment readiness review (serverless, private cloud, on site; markets and hosting rules; decisions for Pete).
- **quality/evidence/** (Batch 537): `PathScribe-Batch537-xray.json`.

## Batch 538

`architecture/REPORT_DOCUMENT_STORE_API.md` (new): released report documents. The review's D2 is decided and F6 corrected.

## Batch 539

`architecture/`: the cytology report template (`REPORT_RENDERING_SERVICE.md` §7); F6 fixed.

## Batch 540

`product/REPORT_RELEASE_DELAY.md`: no correction or addendum during the release delay.

## Batch 541

`architecture/DEPLOYMENT_READINESS_REVIEW.md`: phase 2b decided (D1–D7), with Pete's verification checks.

## Batch 542

`architecture/MESSAGE_BUS_API.md` and `architecture/ASYNC_EXPORT_API.md` (new, PS-539 phase 2c contracts for decisions D1 and D7); findings F8 and F9 added to the readiness review.

## Batch 543

`architecture/BLOB_STORAGE_API.md` (new): file storage contract. Findings F8 and F9 fixed.

## Batch 544

`architecture/BLOB_STORAGE_API.md`: links only for images and attachments (corrects Batch 543). `architecture/ASYNC_EXPORT_API.md`: single-facility QA exports. `product/`: guide and feature entries.

## Batch 545

`architecture/INTERFACE_ENGINE_EDGE.md` (new): the interface engine edge contract (D6). The readiness review §6.2 is corrected, and findings F10 to F12 are added.

## Batch 546

`architecture/SITE_AGENT_API.md` (new): the site agent contract (D3). F3 and F4 are fixed, and several printing claims are corrected across the contracts.

## Batch 547

`architecture/RUNTIME_CONFIG.md` (new): runtime configuration, so one build serves every deployment (phase 2d).

## Batch 548

Phase 2d item 2: the connection banner and the waiting states. See `architecture/DEPLOYMENT_READINESS_REVIEW.md` §9.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- Batch 553: site agent printers in routing (`architecture/SITE_AGENT_API.md` §3). *(Batch 552's architecture notes weren't summarised here in Batch 552.)*

## Batch 554 (PS-539 phase 2d: interface monitoring)

- Batch 554: interface monitoring (`architecture/INTERFACE_ENGINE_EDGE.md` §9a).

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: the browser's stand-ins for server jobs (`architecture/DEPLOYMENT_READINESS_REVIEW.md` §7).

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: reading report documents through the API (`architecture/REPORT_DOCUMENT_STORE_API.md` §2).

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: the API server's `/api/config` and the hosting regions (`architecture/RUNTIME_CONFIG.md` §5a).

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: report versions through the API, and why held releases need no browser endpoint (`architecture/BLOB_STORAGE_API.md` §11).

## Batch 559 (PS-539 phase 2d: data topics)

- Batch 559: push instead of polling, the hub's data topics (`architecture/LIVE_UPDATES_SIGNALR.md` §14).

## Batch 560 (PS-539 phase 2d: push instead of polling)

- Batch 560: the screens that refreshed on a timer are updated by the live-update hub (`architecture/LIVE_UPDATES_SIGNALR.md` §14).

## Batch 561 (PS-539 phase 2d)

- Batch 561: how the server retries a held result message (`architecture/MESSAGE_BUS_API.md` §5).

## Batch 562 (PS-539 phase 2d)

- Batch 562: the last polling screens on live updates; readiness review §9 items 3 and 8 closed (`architecture/DEPLOYMENT_READINESS_REVIEW.md`).

## Batch 563 (PS-622)

- Batch 563: the connection banner and waiting states checked in a browser (`quality/evidence/PathScribe-Batch563-browser.txt`).

## Batch 564

- Batch 564: every screen checked for accessibility in a browser (`quality/evidence/PathScribe-Batch564-browser.txt`).

## Batch 565

- Batch 565: the rest of the faint text and the screens' other states (`quality/evidence/PathScribe-Batch565-browser.txt`).

## Batch 566

- Batch 566: rows that hold buttons and view tiles that say which is on (`quality/evidence/PathScribe-Batch566-browser.txt`).

## Batch 567

- Batch 567: no control inside another in the inbox and the report editor (`quality/evidence/PathScribe-Batch567-browser.txt`).

## Batch 568

- Batch 568: no control inside another, app-wide (`quality/evidence/PathScribe-Batch568-browser.txt`).

## Batch 569

- Batch 569: focus after a keyboard delete; the wider source check (`quality/evidence/PathScribe-Batch569-browser.txt`).

## Batch 570

- Batch 570: focus after deleting a saved search (`quality/evidence/PathScribe-Batch570-browser.txt`); `architecture/DEPLOYMENT_READINESS_REVIEW.md` section 0, the status after phases 2a to 2d.

## Batch 571

- Batch 571: the live-update decision (one general `DataChanged` event on `/hubs/live`), recorded in `architecture/`.

## Batch 572

- Batch 572: contracts for the `caseReport` live topic and the screening hours sign-off (`architecture/`); guide and feature entries (`product/`); quality evidence (`quality/`).

## Batch 573

- Batch 573: presence on an open case (`architecture/LIVE_UPDATES_SIGNALR.md` §15, `architecture/CASE_API.md` §8); guide and feature entries; quality evidence.

## Batch 574

- Batch 574: cytology workload counter and night-shift sign-off (`architecture/CYTOLOGY_QC_API.md` §5); guide and feature entries; quality evidence, and Batch 571's missing Xray file.

## Batch 575

- Batch 575: "Show their changes" in place; guide entry; quality evidence.

## Batch 576

- Batch 576: cap checks, presence "editing", theme colours; quality evidence.

## Batch 577

- Batch 577: "Use their version" in `architecture/CASE_API.md`; guide entry; quality evidence.

## Batch 578

- Batch 578: workload cap screen follow-ups; guide entry; quality evidence.

## Batch 579

- Batch 579: reviewer guide (PS-63); billing codes and the Sequencer saved; guide entry; quality evidence.

## Batch 580

- Batch 580: the styled dropdown list (PS-62); supported browsers in `product/FEATURE_OVERVIEW.md`; guide entry; quality evidence.
