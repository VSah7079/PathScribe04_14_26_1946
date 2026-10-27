**Batch 668:** the Help buttons moved from floating buttons over the screen into the top bar, beside the microphone; see `docs/product/GUIDE_UPDATES.md`.

**Batch 666:** `PHRASE_REVIEW_LIST.md` regenerated from the live registry (286 commands, with a Spanish column); `GUIDE_UPDATES.md` has the Batch 666 entry; `KNOWN_GAPS.md` lists the User Guide's remaining gaps.

**Batch 667:** the User Guide covers every control on the user-facing screens, checked by `scripts/user-guide/coverage.py` and a test; see `docs/user-guide/README.md` and `docs/product/GUIDE_UPDATES.md`.

**Batch 652:** `GAP_REGISTER.md` (new) lists every audited gap (Appendix A) with its status and where; `KNOWN_GAPS.md`, `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md` (retention, Spain, HPV, labels), `CAPABILITY_INVENTORY.md` (alerts, Patient History, EMR) and `DEMO_GUIDE.md` (Superadmin) corrected to match the code.

**Batch 650:** `KNOWN_GAPS.md` lists the registered commands with no screen handler and the decisions for Pete; `HOTKEY_DECISIONS.md` and `GUIDE_UPDATES.md` updated.

**Batch 649:** `GUIDE_UPDATES.md` (four voices) and `FEATURE_OVERVIEW.md` (Sign-out safety and permissions) describe the sign-out, permission and privacy fixes; `CAPABILITIES.md` is now 338 capabilities (287 high risk); `KNOWN_GAPS.md` lists what is not fixed; `PHRASE_REVIEW_LIST.md` notes that no voice commands were added.

**Batch 648:** `DEMO_GUIDE.md` has a Lockbox Drop-Off section (the six seeded receipts, barcodes to scan live, linking, and Demo Reset). `GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md` now describe Lockbox Drop-Off (Batch 645, which they had missed) and its demo seed.

## Capability inventory (Oct 17, 2026)

`CAPABILITY_INVENTORY.md`: 655 distinct capabilities from a complete read of every README and product/architecture document, each status checked against the code. `CAPABILITIES.md`: the 272 access-control capabilities. These two are the sources for the admin guide, user guide, workflows and the product-guide entry.

## Batch 601

`ACTIONS_COVERAGE.md` rewritten: all voice and shortcut commands are in the Role Dictionary; the 98 permission-only entries and the 67 hotkey clashes are listed.
`HOTKEY_DECISIONS.md` (new, Batch 614): the hotkey clashes that need your decision, with proposed fixes. `PHRASE_REVIEW_LIST.md` (new): every voice phrase awaiting native-speaker review. Hotkey clashes are now 52, not 67.

## Batch 600

`ACTIONS_COVERAGE.md` now holds the default-grants matrix for the 60 commands added to the Role Dictionary (for Pete's review).

## Batch 599

New `ACTIONS_COVERAGE.md`: how the roles list and the voice and shortcut list relate, and the 60 record-changing actions that a role cannot yet grant (decision pending).

## Batch 588

New `BLOCK_DELETION.md`: the policy for deleting a block in process, after sign-out and on an amended report, and how billing reviews it. The in-process delete is Live; the later tiers are Planned.

## Batch 455 — Demo baseline

New folder README. New `DEMO_GUIDE.md`.

## Batch 456 — Sign-in lockout, password screening, demo seeds

`DEMO_GUIDE.md` covers the new seeds, the lockout and the password rules, and lists what the seeded data can't do. Corrected: Demo Reset is its own Configuration tab, not under System.

## Batch 457 — Metro General cancer registry, Molecular Order Queue seed

`DEMO_GUIDE.md`: the Molecular Order Queue row, what Resend does now, and the support-access row reworded (the request comes from ForMedrixAI support; the hospital's administrator approves).

## Batch 458 — PS-71 (review before saving over someone else's save)

`DEMO_GUIDE.md`: "Demo: two people in the same case", a two-tab walkthrough of the review box, the Edit Conflict box, the override permission and draft recovery. It was checked against the code.

## Batch 460

`DEMO_GUIDE.md`: demo steps for billing in the Cytology Workspace and at Microtomy, a matrix block at Microtomy, and Label Designer resize.

## Batch 463 — Mohs

New `MOHS_GUIDE.md` (user and administrator guide). `DEMO_GUIDE.md`: "Demo: Mohs stage maps" (S26-4463).

## Batch 463b

`MOHS_GUIDE.md` and `DEMO_GUIDE.md`: blocks are chosen, sign-out stops on unassigned blocks, new voice phrases, the Default histology from setting.

## Batch 464

`DEMO_GUIDE.md`: "Demo: colorectal maps" (S26-4465 polyp, S26-4464 rectal resection, changing a site's rule).

## Batch 465

`DEMO_GUIDE.md`: "Demo: head and neck maps" (S26-4466, oral cavity and neck dissection on one case; changing a site's close-margin rule).

## Batch 465b

`DEMO_GUIDE.md`: the head and neck demo shows the calculated totals, the blocked save for 5 positive of 3 examined, and an oral rule conflict.

## Batch 466

`DEMO_GUIDE.md`: "Demo: renal resection map" (S26-4467; whole-number node counts).

## Batch 466b

`DEMO_GUIDE.md`: the renal demo covers partial nephrectomy margins, derived margin questions, and the editor's count settings.

## Batch 466c

`DEMO_GUIDE.md`: the renal demo covers the partial nephrectomy drawing, and has a new step 7 on the editor's conditions and checked totals.

## Batch 466d

`DEMO_GUIDE.md`: malignant polyp step 5, on margins per component.

## Batch 467 — In-house molecular orders

`DEMO_GUIDE.md`: the in-house EGFR order demo.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

`DEMO_GUIDE.md`: the send-out, plate, sign-out and instrument steps.

## Batch 468 — Autopsy consent-scope enforcement, forensic chain-of-custody

`DEMO_GUIDE.md`: new "Demo: autopsy consent-scope enforcement, chain-of-custody" section (A26-4661's consent-exclusion warning; the new forensic seed A26-4663's custody log), and the Autopsy row in "Cases for specific screens" updated to match.

## Batch 526

New `CLINICAL_MISMATCH_CHECK.md` (Pete's decisions of Oct 11, 2026; PS-145 and PS-554). `FEATURE_OVERVIEW.md` has a new entry for it under Quality Assurance & Compliance.

## Batch 527

New `GUIDE_UPDATES.md`, with entries for Batches 521–527. `FEATURE_OVERVIEW.md` has a new section, "Security, Accessibility & Platform" (accessibility, no patient data on the workstation, fast first load, outside consult links, AI vendor choice).

## Batch 529

`CLINICAL_MISMATCH_CHECK.md`: the rules are built (Configuration → System → Clinical Mismatch Rules); sign-out and the AI instructions are still planned. `GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md` entries.

## Batch 530

`CLINICAL_MISMATCH_CHECK.md`: "How it works today" now describes the inline alert, sign-out held only for high risk, and the QA queues. `GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md` entries.

## Batch 531

`CLINICAL_MISMATCH_CHECK.md`: re-run on change; cytology inline alert. `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md` entries.

## Batches 532–534

`GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md` entries:
- 532: one cytology case report per accession;
- 533: urgent cytology preliminary;
- 534: every report output follows the release delay. New `REPORT_RELEASE_DELAY.md`.

## Batch 536

`CLINICAL_MISMATCH_CHECK.md` (governed AI instructions built; where the AI runs), `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`.

## Batch 538

`GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`: View as sent and the stored, hashed report document.

## Batch 540

`REPORT_RELEASE_DELAY.md`: corrections and addenda wait for the release delay (recall instead); a released PDF never carries the release-buffer watermark. `GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md` updated.

## Batch 544

`GUIDE_UPDATES.md`: signatures are links; QA reports for one facility. `FEATURE_OVERVIEW.md`: new "Images and attachments: links only"; the Quality Assurance entry gains "One facility or all".

## Batch 545

`FEATURE_OVERVIEW.md` (Hosting): the interface engine runs hosted or in the hospital (D6), and jobs and events use SQL Server tables (D1), not "a standard message broker". There's nothing new for users, so no `GUIDE_UPDATES.md` entry.

## Batch 546

- `GUIDE_UPDATES.md`: workstation label printing is no longer blocked by the browser's security policy, and a network report print that can't be sent goes straight to the fallback.
- `FEATURE_OVERVIEW.md`: the site agent contract (Hosting).

## Batch 547

`GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md`: one PathScribe build for every site; each site's settings in its `config.json`.

## Batch 548

`GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md`: the connection banner and the waiting states.

## Batch 572

`GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md`: "Someone else saved this case" and the screening hours sign-off.

## Batch 573

`GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md`: who else has the case open.

## Batch 574

`GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md`: the workload counter, night-shift sign-off, correction reasons.

## Batch 575

`GUIDE_UPDATES.md` and `FEATURE_OVERVIEW.md`: "Show their changes".

## Batch 576

`GUIDE_UPDATES.md`: workload cap limits; "editing" in presence.

## Batch 577

`GUIDE_UPDATES.md`: "Use their version"; presence in the tab bar.

## Batch 578

`GUIDE_UPDATES.md`: the workload cap screen's errors and pickers.

## Batch 579

`GUIDE_UPDATES.md`: template reviewer guide; billing codes saved at once.

## Batch 580

`GUIDE_UPDATES.md`: styled dropdown lists. `FEATURE_OVERVIEW.md`: supported browsers (Chrome, Edge, Firefox; Pete, Oct 15).

- **`ADMIN_GUIDE_JURISDICTIONS.md`** (Batch 593, PS-334): source text for the Admin Guide chapter on setting up jurisdictions.
- **`KNOWN_GAPS.md`** (Batch 593, PS-338): the running list of what will and will not be in the release. Update it in every batch that opens or closes a gap.

- `RECALL_SIGNOFF.md`: the self-collected HPV recall windows, wording and codes: what a lab's administrator sets, and the register-code handoff for the interface engine team (Oct 20, 2026; corrected Batch 641).

## Batch 641

`RECALL_SIGNOFF.md` is now the recall values and engine handoff (no sign-off needed for windows or wording).

`FEATURE_OVERVIEW.md` (Batch 644, Oct 20, 2026): every feature section now opens with four voices (practitioner, system administrator, marketing, FormedrixAI and partners), followed by the technical detail. New sections should do the same.
