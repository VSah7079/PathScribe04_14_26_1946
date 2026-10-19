# System capabilities (access control)

Generated Oct 17, 2026 from `src/services/authorization/capabilityCatalog.ts` and the English locale. This is the list of things a role can be granted that PathScribe actually enforces: every entry is checked by a service, and a guard test fails the build otherwise. It is **not** the voice and hotkey command list (see `ACTIONS_COVERAGE.md`), which does not widen access.

**308 capabilities in 23 groups.** Key format `domain:object:verb`. *High risk* = every check is written to the audit log, allowed or denied (every export is high risk). *Needs* = capabilities that must be granted with it. *Platform only* = ForMedrixAI support, held only through Superadmin; a hospital role can never hold it.

263 are high risk; 6 are platform only.

## Separation of duties

A role may not hold both of these (the role service refuses it):

- `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve`

## Screens: what each role can open (23)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `screen:accession:open` | Open Accession | See the Accession screen and its tile on the Home page. | standard |  |  |
| `screen:worklist:open` | Open Worklist | See the Worklist screen and its tile on the Home page. | standard |  |  |
| `screen:search:open` | Open Search | See the Search screen and its tile on the Home page. | standard |  |  |
| `screen:add-on-orders:open` | Open Add-On Orders | Open Add-On Orders from a case's report page. | standard |  |  |
| `screen:intraop-queue:open` | Open Intraop Queue | See the Intraop Queue screen and its tile on the Home page. | standard |  |  |
| `screen:cytology-qc-queue:open` | Open Cytology QC Peer Review Queue | See the Cytology QC Peer Review Queue in the Worklist. | standard |  |  |
| `screen:surgical-qa-worklist:open` | Open Surgical Post-Sign-Out QA | See the Surgical Post-Sign-Out QA in the Worklist. | standard |  |  |
| `screen:my-contributions:open` | Open My Contribution | See the My Contribution screen and its tile on the Home page. | standard |  |  |
| `screen:bench-contributions:open` | Open Bench Contributions | See the Bench Contributions screen and its tile on the Home page. | standard |  |  |
| `screen:tumor-board:open` | Open Tumor Board | See the Tumor Board screen and its tile on the Home page. | standard |  |  |
| `screen:batch-management:open` | Open Batch Management | See the Batch Management screen and its tile in the Pathology Workspace. | standard |  |  |
| `screen:cytology-workspace:open` | Open Cytology Workspace | See the Cytology Workspace screen and its tile in Pathology Workspace. | standard |  |  |
| `screen:microtomy:open` | Open Microtomy Workspace | See the Microtomy Workspace screen and its tile in Pathology Workspace. | standard |  |  |
| `screen:embedding:open` | Open Embedding Workspace | See the Embedding Workspace screen and its tile in Pathology Workspace. | standard |  |  |
| `screen:slide-distribution:open` | Open Slide Distribution Workspace | See the Slide Distribution Workspace screen and its tile in Pathology Workspace. | standard |  |  |
| `screen:molecular:open` | Open Molecular Workspace | See the Molecular Workspace screen and its tile in Pathology Workspace. | standard |  |  |
| `screen:margin-exception-review:open` | Open Margin Exception Review | See the Margin Exception Review screen and its tile in Pathology Workspace. | standard |  |  |
| `screen:audit-log:open` | Open Audit | See the Audit screen and its tile in Quality & Compliance. | standard |  |  |
| `screen:quality-assurance:open` | Open Quality Assurance | See the Quality Assurance screen and its tile in Quality & Compliance. | standard |  |  |
| `screen:autopsy-dashboards:open` | Open Autopsy Dashboards | See the Autopsy Dashboards screen and its tile in Quality & Compliance. | standard |  |  |
| `screen:outbound-queue:open` | Open Outbound Queue | See the Outbound Queue screen and its tile in Quality & Compliance. | standard |  |  |
| `screen:registry-exceptions:open` | Open Registry Exceptions | See every registry submission that needs a person: held, undelivered, rejected or unanswered. | standard |  |  |
| `screen:configuration:open` | Open Configuration | See the Configuration screen and its tile on the Home page. | standard |  |  |

## Case work (80)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `case:grossing:complete` | Complete grossing | Mark a case's grossing as complete once its required grossing fields are filled, moving it to Gross Complete. | high |  |  |
| `case:hold:place` | Place a case hold | Put a case on hold, stopping work on it until the hold is released, with a reason and a note. | high |  |  |
| `case:hold:release` | Release a case hold | Release a case from hold, with a note, so work can continue. | high |  |  |
| `case:retention-hold:place` | Place a retention hold | Stop a case's material from being disposed of (patient request, litigation, research), with a reason and a note. | high |  |  |
| `case:retention-hold:release` | Release a retention hold | Release a retention hold, with a note, so the material can be disposed of on its normal schedule. | high |  |  |
| `case:delegation:create` | Delegate a case | Hand a case or one of its synoptic reports to another pathologist or a pool. | high |  |  |
| `case:tumor-board:flag` | Flag a case for Tumor Board | Nominate a case for a Tumor Board/MDT's agenda. | high |  |  |
| `case:margin-exception:resolve` | Resolve a margin-distance exception | Manually tag the real distance for a margin-distance answer the extraction layer couldn't confidently read, or dismiss it with no numeric tag. | high |  |  |
| `case:tumor-board:manage` | Manage the Tumor Board queue | Manage a Tumor Board/MDT listing's status: mark it Presented or Deferred, or cancel a manual nomination. Scheduling the meeting itself (board, date/time, presenter) is the separate Schedule a Tumor Board meeting permission below. | standard |  |  |
| `case:tumor-board:schedule` | Schedule a Tumor Board meeting | Schedule a Tumor Board/MDT meeting in advance: set which board, the meeting date and time, and who presents — without the broader queue-management actions above. The permission a scheduling/administrative role needs. | standard |  |  |
| `case:tumor-board:dismiss` | Dismiss a Tumor Board flag | Dismiss an auto-generated Tumor Board/MDT flag with a reason, overriding what the rules engine raised. A clinical judgment call, never a queue-management action. | high |  |  |
| `case:team:manage` | Change a case's team | Add or remove people on a case's team (Case Team), including who its primary pathologist is. A cytotechnologist can't be put in a pathologist slot. | high |  |  |
| `patient:national-identifier:record` | Record a patient's national identifier | Record or remove the national healthcare identifier a registry keys on (NHS number, BSN, IHI and others). The check digit is run and the result kept. Audited. | high |  |  |
| `patient:registry-consent:record` | Record a patient's registry opt-out | Record or clear a patient's opt-out from screening programme reporting, and from cancer registry reporting where the law allows it. Audited. | high |  |  |
| `patient:other-cases:request-access` | Ask to see a patient's other cases | When a patient has other cases you cannot open, ask for access from the patient history or the case workup. You give a reason; the assigned pathologists and administrators are told. | standard |  |  |
| `patient:other-cases:decide-access` | Decide access to a patient's other cases | Approve, decline or end another person's access to a patient's other cases. Assigned pathologists decide for their own cases and administrators for any. Audited. | high |  |  |
| `cytology:report:correct` | Correct a signed-out cytology report | Release a corrected diagnosis for a signed-out cytology report. The original report stays on file and the correction is sent as a correction. | high |  |  |
| `cytology:report:addend` | Add an addendum to a signed-out cytology report | Release an addendum that adds to a signed-out cytology report and leaves its diagnosis standing. | high |  |  |
| `cytology:report:sign-out` | Sign out a cytology report | Sign out a cytology specimen, or release it for countersign. Signing authority and the cytotechnologist and countersign rules still apply. | high |  |  |
| `cytology:ct-report:sign-out` | Sign out a cytology report as a cytotechnologist | A cytotechnologist signing out a negative GYN case (or under the advanced-cytotechnologist exception). Remove it from the role where cytotechnologists may not sign reports. Also needs the sign-out permission. | high | `cytology:report:sign-out` |  |
| `cytology:review:record` | Record a cytology screening review | Save a screening or pathologist review of a cytology specimen in the Cytology Workspace, or edit your own. Workload limits and QC selection still apply. | high |  |  |
| `cytology:screening-hours:sign-off` | Sign off your screening hours | Confirm, or correct with a reason, your own screening hours for a day. The confirmed hours are your screening hours record, counted in the supervisor's workload report; a large correction is flagged for your supervisor. | high |  |  |
| `cytology:final-diagnosis:select` | Choose a cytology final diagnosis | Set which review is the specimen's final diagnosis, the one that is signed out. A review that needs a pathologist can still only be chosen by one. | high |  |  |
| `cytology:qc-flag:remove` | Remove a cytology QC flag | Remove a random or high-risk QC flag from a cytology specimen. While flagged, a cytotechnologist can't sign it out without the rescreen. Each removal is audited. | high |  |  |
| `cytology:retrospective-review:record` | Record a 5-year retrospective review | Record the outcome and any corrective action of the CAP 5-year retrospective review of a prior negative cytology result. | high |  |  |
| `cytology:histology-correlation:record` | Record a cyto-histologic correlation | Record whether a later biopsy agrees with a cytology diagnosis, or dismiss a candidate biopsy that isn't the relevant one. | high |  |  |
| `cytology:case:finalize` | Finalize a cytology case early | Finalize a cytology case before every one of its specimens is signed out, with a reason. Audited; the unsigned specimens are named and can still be signed out. | high |  |  |
| `cytology:revision:request` | Request a cytology review revision | Mark a note on someone's cytology review as requiring revision. A cytotechnologist can't sign the specimen out until the author revises or a pathologist records their own review. | high |  |  |
| `cytology:preliminary:release` | Send an urgent cytology preliminary report | Send one specimen's result as an urgent preliminary report before the case report. No role starts with it; grant it to the roles your laboratory allows. | high |  |  |
| `cytology:qc-review:record` | Record a cytology QC peer review | Take a case from the Cytology QC Peer Review Queue and record whether you concur with the primary interpretation or found a discrepancy. | high |  |  |
| `cytology:qc-review:bypass` | Bypass a cytology QC review (supervisor) | Force a case on the Cytology QC queue to final-approved, with a written justification that is kept in the audit log. | high |  |  |
| `surgical:qa-review:record` | Record a surgical post-sign-out QA review | Record a surgical peer review or biopsy-to-resection correlation review, or dismiss a correlation candidate as not relevant. | high |  |  |
| `case:peer-review:request` | Ask for a peer review before sign-out | Ask another pathologist for an independent review of a case before sign-out, withdraw the request, and record the consensus as the signing pathologist. | high |  |  |
| `case:peer-review:record` | Record a peer review | Record your own independent read of a case you were asked to review, agree or disagree, and the consensus that follows a disagreement. | high |  |  |
| `case:peer-review:override` | Sign out ahead of a required peer review | Where the peer-review sign-out gate is on, sign out before the review is complete for urgent patient care, with a reason. Audited; the review is still owed within 24 hours. | high |  |  |
| `case:clinical-mismatch:record` | Decide a clinical-pathologic mismatch | Decide a suggested mismatch between the clinical picture and the findings: Resolved, Unresolved (which recommends a CAPA) or, for a low-risk one, Deferred to secondary review. | high |  |  |
| `case:clinical-history:record` | Record clinical history after accession | Add or reconcile a case’s coded clinical history after accession (grossing, report review, sign-out), until the case is signed out. Pathologist, Fellow, Resident and PA by default. | high |  |  |
| `case:outside-consult:assess` | Assess an outside consult opinion | Record whether an outside consultant's opinion agrees with the case, differs slightly, or is a major discordance. A major discordance on a released report recommends a CAPA. | high |  |  |
| `case:consult-link:issue` | Issue an outside consult link | Give an outside consultant a time-limited, view-only link to a case or chosen slides. Recorded in the case's audit trail. | high |  |  |
| `case:consult-link:revoke` | Revoke an outside consult link | Switch off an outside consultant’s link before it expires. Recorded in the case’s audit trail. | high |  |  |
| `cytology:pathologist-review:take` | Take a positive GYN cytology case for review | Take a positive GYN cytology case from the Worklist's Cytology Review tile. You become the case's pathologist; the cytotechnologist stays on the case. | high |  |  |
| `add-on:order:place` | Place an add-on order | Order recuts, special stains, IHC or molecular/send-out tests on a case’s blocks, and cancel or modify an add-on order after a block exception. | high |  |  |
| `add-on:exception:approve-destructive-cut` | Approve destructive cutting | Allow an add-on order to be cut from a block that may be used up by it. | high |  |  |
| `batch:reconciliation:override` | Complete a batch reconciliation anyway | Mark a batch complete when items are missing or unexpected, with a reason. | high |  |  |
| `batch:run:abort` | Abort a batch | Abort a processing, staining or referral batch, with a reason. | high |  |  |
| `batch:cold-chain-excursion:acknowledge` | Acknowledge a cold-chain excursion | Acknowledge a temperature excursion on a batch, with a note, so it can be completed. | high |  |  |
| `referral:transit-status:update` | Update a referral batch’s transit status | Record that a batch sent to an external lab is in transit or delivered. The status only moves forward. | high |  |  |
| `wsi:scan-batch:load` | Load a WSI scan batch | Load slides from the scanning queue onto a slide scanner as a scan batch, for the scanner’s lab. | standard |  |  |
| `wsi:scan-batch:send` | Send a WSI scan batch to the scanner | Send a loaded batch’s manifest to the scanner through the interface engine. | standard |  |  |
| `wsi:scan-batch:unload` | Unload a WSI scan batch | Unload a scan batch once every slide has its result (or before it was sent). Slides that didn’t scan go back to the scanning queue. | standard |  |  |
| `retention:material:dispose` | Dispose of retained material | Scan wet tissue, blocks or slides on the Disposal Queue to mark them disposed once their retention period has passed. | high |  |  |
| `case:decant:delete` | Remove a decant | Remove a decant from a case’s material on the Material tab. Billing is recalculated. Audited. | high |  |  |
| `material:block:delete-in-process` | Delete a block in process | Delete a block that is still in process. Its pending cuts and stains are cancelled, a reason is recorded, and a credit item is queued for billing staff. The block stays on the case, marked Deleted. Audited. | high |  |  |
| `material:block:delete-signed-out` | Delete a block after sign-out | Delete a block on a signed-out case. It is marked Invalidated, never removed; a reason is recorded and a credit item is queued for billing staff. Audited. | high |  |  |
| `material:block:flag-amended` | Flag a block on an amended report | Mark a block Invalidated or Superseded on an amended report. Only a flag: the block is not deleted. Audited. | high |  |  |
| `batch:cold-chain-reading:simulate` | Try a simulated temperature reading | Send a labelled Simulated temperature reading for a storage unit or container, to see an excursion, a batch hold and a CAPA without a sensor. | standard |  |  |
| `retention:holds-queue:export` | Export the Retention Holds queue | Download the Retention Holds queue as CSV. It lists case accessions. | high |  |  |
| `config:cold-chain:manage` | Manage cold chain | Add and edit storage units and storage condition types. Audited. | high |  |  |
| `case:follow-up:expect` | Mark a follow-up specimen as expected | At surgical sign-out, mark that a resection or excision is expected, so the lab is told if none arrives in the biopsy-to-resection window. | standard |  |  |
| `report:organ-map:insert` | Insert the organ map into a report | Place the anatomical map, drawn from the synoptic answers, in the report, or take it out, before sign-out. Audited. | standard |  |  |
| `report:case-report:print` | Print a case report | Print or reprint a case report, or open a stored version's PDF. Every print is recorded in the audit log. | high |  |  |
| `report:case-images:attach` | Attach images to a report | Attach images (gross photographs, microphotographs) to a case's report, or take them off. They print after the report's own pages. Audited. | standard |  |  |
| `report:related-cases:attach` | Attach related cases to a report | Choose a patient's other released cases to send with the report being signed out. They are fixed when the report is signed out. Audited. | standard |  |  |
| `patient:summary:print` | Print a patient summary | Print a summary of a patient's released cases that you can view, from the patient history. It is labelled as a summary and not a signed report. Every print is audited. | high |  |  |
| `patient:break-glass:rebind` | Rebind a downtime patient identity (break-glass) | Rebind a flagged downtime (temporary) patient identity to the confirmed patient and re-point its cases. Needs a reason code and a written justification. Audited. | high |  |  |
| `report:restricted-case:print` | Print a restricted case | Print, reprint or open the PDF of a case carrying a flag that restricts printing (VIP, confidential consultation). Needs "Print a case report" as well. | high | `report:case-report:print` |  |
| `case:edit-conflict:override` | Save over someone else's newer version | On the report page's Edit Conflict dialog, "Save mine anyway": save this session's changes over a version someone else saved after the page was opened. Audited. | high |  |  |
| `retention:disposal-report:export` | Export the disposal report | Download the waste-tracking report of disposed material, which lists case accessions. | high |  |  |
| `search:case-results:export` | Export case search results | Download the cases matching a search as CSV. The export is recorded in the audit log. | high | `screen:search:open` |  |
| `search:case-report:export` | Export case search reports | Download a case search report (counts by group, or the chosen columns for each case) as CSV. The export is recorded in the audit log. | high | `screen:search:open` |  |
| `search:report-schedule:manage` | Schedule case search reports | Set up, change, pause or delete a schedule that runs a saved report and sends it to chosen users as CSV. Every change is recorded in the audit log. | high | `screen:search:open` |  |
| `contribution:trainee-case-reference:export` | Export my trainee case log | Download, from My Contributions, the cases a resident took part in as CSV. The export is recorded in the audit log. | high | `screen:my-contributions:open` |  |
| `contribution:case-mix-summary:export` | Export my case-mix progress | Download, from My Contributions, the case-mix progress summary as CSV. The export is recorded in the audit log. | high | `screen:my-contributions:open` |  |
| `molecular:batch:supersede` | Supersede a molecular run | Retire a molecular run with a reason and start its replacement (Clone & Supersede). | high |  |  |
| `molecular:order:assign-plate` | Assign molecular orders to a plate | Put queued in-house molecular orders on a draft plate, or take one off. | standard | `screen:molecular:open` |  |
| `molecular:order:cancel` | Cancel or re-route a molecular order | Cancel an in-house molecular order (and its add-on slide order), or send it out when its lab no longer runs the test in-house. | high | `screen:molecular:open` |  |
| `molecular:order:set-lab` | Choose a send-out molecular order’s reference lab | Choose or change the reference lab a queued send-out molecular order goes to (one of the test’s approved labs, or any active reference lab when it has none). | standard | `screen:molecular:open` |  |
| `grossing:margin-ink:record` | Record a margin ink application | Record ink applied to a surgical margin during grossing, and mark the margin examined. | standard |  |  |
| `case:inking-gate:override` | Override the inking sign-out gate | Administrative Override of a Severity 3 (compliance-critical) margin-ink issue blocking sign-out, with a mandatory reason. Audited. | high |  |  |
| `label:batch:reprint` | Batch label reprint | Reprint requisition, container and cassette labels for many cases at once. Each label is audited. | high |  |  |

## Billing (6)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `billing:applied-code:correct` | Correct an applied billing code | Correct billing for a case: change a code or modifier, reverse a charge or add a missing one. The original charge is credited and rebilled, with a reason, and audited. | high |  |  |
| `billing:applied-code:review` | Review a case's billing codes | Approve, reject, override, add and delete a case's billing codes. Each change charges or credits the case, and is audited. | high |  |  |
| `billing:smart-capture:review` | Review Smart Capture suggestions | Ask for suggested charge lines on a case and accept or reject each one. Prototype, not compliance-reviewed. Nothing is sent. | standard |  |  |
| `billing:smart-capture:approve` | Approve Smart Capture lines | Confirm the accepted Smart Capture lines for a case. Pathologist only. Prototype, not compliance-reviewed. | high |  |  |
| `billing:smart-capture:send` | Send approved Smart Capture lines | Send the approved lines to the charge path. In the demo this goes to the simulated engine; to a real engine it is refused until the production gate is open. | high |  |  |
| `billing:charge:approve` | Approve charges | Approve, reject, hold and release charges waiting for billing approval, for the labs the person is assigned to. Nobody approves a charge they drafted. | high |  |  |

## Autopsy (12)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `autopsy:body:release` | Release an autopsy body | Record the release of a body to a funeral home or family, ending the mortuary's custody. | high |  |  |
| `autopsy:custody:transfer` | Record an autopsy custody transfer | Log a forensic autopsy case’s body, evidence, or personal effects changing hands — who held it, who received it, when. | high |  |  |
| `autopsy:consent:manage` | Narrow or revoke autopsy consent | Narrow an already-granted hospital next-of-kin consent (exclude organs, limit retention) or revoke it outright, with a note. Never widens consent back. | high |  |  |
| `autopsy:retention-disposal:record` | Record organ/tissue retention disposal | Record how and when retained organs or tissue were disposed of, with a note. | high |  |  |
| `autopsy:toxicology:order` | Order postmortem toxicology | Order a postmortem toxicology test on a specimen, naming the lab and analytes requested. | standard |  |  |
| `autopsy:toxicology:result` | Record a toxicology result | Record the result of an ordered postmortem toxicology test, and clear the hold it started if it's still open. | high |  |  |
| `autopsy:toxicology:cancel` | Cancel a toxicology order | Cancel a postmortem toxicology order that is still pending, with a reason, and clear the hold it started if it's still open. | high |  |  |
| `autopsy:retention-detail:record` | Record organ/tissue retention detail | Record who holds retained organs or tissue and where, while retention is ongoing. | high |  |  |
| `autopsy:retention-tier:record` | Record the organ/tissue retention tier | Choose an autopsy case's organ or tissue retention tier and its reason, within what the consent on file permits. | high |  |  |
| `autopsy:consent:reinstate` | Reinstate autopsy consent | Restore an already-narrowed or revoked hospital next-of-kin consent, with a required note. A separate action from narrowing or revoking. | high |  |  |
| `autopsy:gross-exam-gate:override` | Override the autopsy authorization gate | Sign a PAD/FAD despite a blocked authorization gate (missing legal order, or revoked consent), with a required reason. Every override is logged, on the case and in the audit trail. | high |  |  |
| `autopsy:organ-tag:record` | Record a per-organ gross-exam finding | Tag an individual organ's gross-exam finding (normal, abnormal, or not examined), with an optional note. | standard |  |  |

## Messaging (2)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `message:internal:send` | Send a message or reply | Send an internal message, or reply to one, to other staff. | standard |  |  |
| `message:secure-email:send` | Send a secure email | Send a secure email to an address outside the organisation. | high |  |  |

## Report history (1)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `report:change-history:export` | Export report change history | Download a case's report change history (who changed which field, when, and at which workstation) as CSV. | high |  |  |

## Quality assurance: Operations (13)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `qa:deficiencies:export` | Export deficiencies | Download the case and specimen deficiency queues (open, escalated to CAPA and closed) as CSV. | high |  |  |
| `qa:intraop-linkage:export` | Export frozen section linkage | Download the frozen section to final diagnosis linkage report as CSV. | high |  |  |
| `qa:reconciliation:export` | Export discordance and reconciliation | Download the discordance and reconciliation report as CSV. | high |  |  |
| `qa:follow-up:export` | Export follow-ups not received | Download the Follow-up not received list as CSV. | high |  |  |
| `qa:follow-up:record` | Record follow-up outcomes | Close an expected follow-up with what happened (done elsewhere, declined, not indicated…), or reopen it. Audited. | high |  |  |
| `qa:follow-up-clinician:email` | Email the ordering clinician about a follow-up | Send a reviewed email asking the ordering clinician about a follow-up that is due soon or overdue, where the facility allows it. Never automatic. Audited. | high |  |  |
| `qa:countersign-turnaround:export` | Export countersign turnaround | Download countersignature turnaround times as CSV. | high |  |  |
| `qa:fppe-tracking:export` | Export credentialing review (FPPE) | Download focused professional practice evaluation (FPPE) tracking as CSV. | high |  |  |
| `qa:drift-correction:export` | Export post-final drift corrections | Download corrections made after a report was finalised as CSV. | high |  |  |
| `qa:patient-match-review:export` | Export patient match review | Download the patient match review queue as CSV. | high |  |  |
| `qa:access-request-response:export` | Export access requests | Download patient access requests and their response times as CSV. | high |  |  |
| `qa:ai-discordance:export` | Export AI discordance | Download the AI discordance rate for each AI product, or the list of AI results that have gone unanswered too long, as CSV. | high |  |  |
| `qa:registry-transmission-audit:export` | Export the registry transmission audit | Download what was sent to screening and cancer registries: when it was sent, the registry's status and its response code. No patient names or MRNs. Audited. | high |  |  |

## Quality assurance: CAPA (4)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `qa:management-reviews:export` | Export management reviews | Download CAPA management review records as CSV. | high |  |  |
| `qa:capa-recommendation:decide` | Confirm or dismiss CAPA recommendations | Open a recommended CAPA and assign its owner, or dismiss the recommendation with a reason. Both are audited. | high | `screen:quality-assurance:open` |  |
| `qa:pathologist-trend:view` | View discordance patterns | See discordance patterns over time — a pathologist's reviewed work, or a specimen type — in Quality Assurance. Personnel-sensitive. | high | `screen:quality-assurance:open` |  |
| `qa:pathologist-trend:decide` | Decide a discordance pattern | Start a review of a discordance pattern, conclude it with a CAPA, or dismiss it with a reason. Audited. | high | `qa:pathologist-trend:view` |  |

## Quality assurance: Financials (1)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `qa:billing-deficiencies:export` | Export billing deficiencies | Download open and resolved billing and coding deficiencies as CSV. | high |  |  |

## Quality assurance: Cytology (1)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `qa:cytology-histology-correlation:export` | Export cytology–histology correlation | Download or print the cytology–histology correlation report. | high |  |  |

## Quality assurance: Dashboard, inspection and enterprise (23)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `audit:consult-links:view` | See outside consult links | Audit Log → Consult links: every link issued to an outside consultant, on every case. | high | `screen:audit-log:open` |  |
| `qa:activity-dashboard:export` | Export QA dashboard | Download QA review totals by activity type as CSV. | high |  |  |
| `audit:error:resolve` | Resolve an Audit Log error | Mark an error in Audit Log → Error Log as resolved. Recorded with who resolved it and when. | high |  |  |
| `print:job:hold` | Hold or release a print job | Put a queued or failed print job on hold in Audit Log → Interfaces → Print Queue, or release it. Recorded with who did it. | high |  |  |
| `print:job:cancel` | Cancel a print job | Cancel a print job in the Print Queue so it is never printed. Recorded with who cancelled it. | high |  |  |
| `print:job:redirect` | Redirect a print job | Send a network print job to a different printer from the Print Queue. Recorded with the new printer and who chose it. | high |  |  |
| `print:job:retry` | Retry a print job | Resend a failed print job from the Print Queue, using the report as it was first printed. | high |  |  |
| `interface:outbound:resend` | Resend interface messages | Send, resend or simulate a failure for a failed or waiting outbound interface message, in any queue. Audited. | high |  |  |
| `interface:outbound:hold` | Hold outbound messages | Hold a waiting or failed outbound message so nothing sends it until it is released. Audited. | high | `screen:outbound-queue:open` |  |
| `interface:outbound:release` | Release held outbound messages | Let a held outbound message go again. Audited. | high | `screen:outbound-queue:open` |  |
| `interface:outbound:mark-not-reportable` | Mark rejected messages not reportable | Close a message a registry rejected as not reportable, with a reason. Nothing more is sent for it. Audited. | high | `screen:outbound-queue:open` |  |
| `interface:outbound:retract` | Retract queued charges | Cancel a queued charge before release because its case was amended or retracted, with a reason. Terminal. Audited. | high | `screen:outbound-queue:open` |  |
| `interface:outbound:override-release` | Release charges ahead of schedule | Force an immediate release of a queued or held charge, ahead of its delivery schedule. Recorded by user id. Audited. | high | `screen:outbound-queue:open` |  |
| `interface:engine-status:view` | View interface engines | See each hospital's interface engine in Audit Log → Interfaces → Engines: its listeners and channels, what is waiting and the dead letters. No patient data. | standard | `screen:audit-log:open` |  |
| `jobs:server-job:view` | View server jobs | See the PathScribe server's background jobs: what is waiting or running, the recurring jobs, and the jobs that failed for good (System Logs → Server jobs). No patient data is shown beyond the case number. | standard | `screen:audit-log:open` |  |
| `jobs:server-job:requeue` | Requeue server jobs | Send a server job that failed for good again: a delivery, a held release, a charge, an export or an event. Interface and print jobs are resent from Interfaces with their own permissions. Audited. | high | `jobs:server-job:view` |  |
| `qa:inspection-evidence:export` | Export inspection evidence binder | Download every QA review record in the inspection window, case by case, as CSV. | high | `qa:activity-dashboard:export` |  |
| `qa:enterprise-rollup:export` | Export enterprise rollup | Download jurisdiction-level volume, workload and turnaround figures as CSV. | high |  |  |
| `audit:audit-log:export` | Export the Audit Log | Download Audit Log → Audit Log as CSV. The export is recorded in the audit log. | high | `screen:audit-log:open` |  |
| `audit:error-log:export` | Export the Error Log | Download Audit Log → Error Log as CSV. The export is recorded in the audit log. | high | `screen:audit-log:open` |  |
| `audit:interface-log:export` | Export the Interface Log | Download Audit Log → Interface Log as CSV (patient merge and identifier exceptions). The export is recorded in the audit log. | high | `screen:audit-log:open` |  |
| `audit:qa-log:export` | Export the Quality Assurance log | Download Audit Log → Quality Assurance as CSV, the record shown to inspectors. The export is recorded in the audit log. | high | `screen:audit-log:open` |  |
| `audit:billing-log:export` | Export the Billing Log | Download Audit Log → Billing Log as CSV. It contains patient names and identifiers. The export is recorded in the audit log. | high | `screen:audit-log:open` |  |

## Administration: staff, roles and system (18)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:roles:manage` | Manage roles | Add, edit and duplicate roles in the Role Dictionary, including which capabilities each role grants. | high |  |  |
| `config:staff:edit` | Edit staff records | Add staff and edit their details: name, contact, license, voice and spelling preferences, signature, OR PIN and status. | high |  |  |
| `config:staff-access:assign` | Assign roles and access to staff | Change what a staff member may do or see: their roles, facility assignment, pediatric, orchestration and cross-tenant QA access, and jurisdictional credentials. | high | `config:staff:edit` |  |
| `config:staff-password:manage` | Manage staff sign-in passwords | Set, reset or remove a staff member's sign-in password, where PathScribe signs people in with a password (not single sign-on). The password is stored only in scrambled form. Audited. | high | `config:staff:edit` |  |
| `config:demo-data:reset` | Reset all demo data | Clear every tester's demo data and restore the starting data. Demo builds only. | high |  |  |
| `config:field-requirements:manage` | Manage field requirements | Choose which fields each page requires before saving, for your organisation. Locked fields stay required. | high |  |  |
| `auth:mfa-enrolment:reset` | Reset a second-factor enrolment | Remove a colleague's Simulated authenticator enrolment in your organisation (a lost device) so they enrol again at next sign-in. Audited. | high |  |  |
| `config:intraop-critical-results:manage` | Manage the intraoperative critical results dictionary | Add, change or deactivate the entries that flag a frozen result as a critical result. | high |  |  |
| `config:molecular-control-rules:manage` | Manage molecular assay control rules | Add, change or delete the controls each molecular assay's plates need and the deck slots its sample rack may go in. | high |  |  |
| `config:screening-registry:manage` | Manage screening registry reporting | Choose which cervical screening registry each facility reports to, and set each registry's code mappings and what to hold rather than send. Audited. | high |  |  |
| `config:cancer-registry:manage` | Manage cancer registry reporting | Choose which cancer registry each facility reports to, whether results go to its test or live system, and whether the jurisdiction honours a patient's opt-out. Audited. | high |  |  |
| `config:cytology-compliance:manage` | Manage country-specific cytology rules | Switch the CLIA daily workload cap and the CAP 5-year retrospective lookback on or off, for the enterprise or a facility. Audited. | high |  |  |
| `registry:submission:resend` | Resend a registry submission | Re-validate a held, undelivered, unanswered or rejected registry submission against today's data and send it again (the same submission, or a new version when the data changed). Audited. | high | `screen:registry-exceptions:open` |  |
| `registry:live-register:approve` | Approve a registry go-live | Approve switching a registry from its test system to the live register, in stated capacities, re-entering your credentials. Goes live when the approvals the lab requires are in. Audited permanently. | high |  |  |
| `config:registry-go-live:manage` | Manage registry go-live approval settings | Whether the person who requests a registry go-live may also approve it, and how many approvals are required (the template review settings' shape). Audited. | high |  |  |
| `registry:test-suite:run` | Run the registry test suite | Send the synthetic test cases (fictitious patients only) to a registry's test system, on a validation instance only. Audited. | high |  |  |
| `registry:revision:review` | Mark a registry revision reviewed | Mark a registry's change to data it had already accepted as reviewed, so it leaves the Registry Exceptions worklist. The CAPA deficiency raised with it stays open in Quality Assurance. Audited. | high | `screen:registry-exceptions:open` |  |
| `config:template-governance:manage` | Manage template review settings | Change the template review settings: whether authors may approve their own templates, and how many independent reviewers a template needs. Audited. | high |  |  |

## Configuration: protocols and report templates (7)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:protocol:draft` | Draft synoptic protocols | Save, submit and delete synoptic protocol drafts. Audited. | high |  |  |
| `config:protocol:approve` | Review synoptic protocols | Approve a synoptic protocol, request changes, or return it to draft. Audited. | high |  |  |
| `config:protocol:publish` | Publish synoptic protocols | Put an approved synoptic protocol into use. Audited. | high |  |  |
| `config:protocol:retire` | Retire synoptic protocols | Take a synoptic protocol out of use, including a published one, or restore it as a draft. Audited. | high |  |  |
| `config:report-template:manage` | Edit report templates and parts | Create, edit, copy, archive and delete report layouts and their parts. Audited. | high |  |  |
| `config:report-template:publish` | Publish report templates and parts | Put a report layout or part into use. Audited. | high |  |  |
| `config:template-routing:manage` | Manage template routing rules | Choose which report template a case gets. Audited. | high |  |  |

## Configuration: AI, voice, actions and macros (7)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:ai-behavior:manage` | Manage AI features | Turn the AI features (gross, microscopic and others) on or off for everyone. Audited. | high |  |  |
| `config:ai-provider:manage` | Manage the AI service | Choose the AI service the lab uses and the default reporting mode. Audited. | high |  |  |
| `config:ai-model:manage` | Choose the default AI model | Set the model clinical suggestions come from. Audited. | high |  |  |
| `config:ai-vendor-policy:manage` | Manage the AI vendor policy | Set which AI services and hosting regions each jurisdiction, or facility, allows. Audited. | high |  |  |
| `config:actions:manage` | Manage keyboard and voice commands | Change the shortcuts and voice commands for everyone. Audited. | high |  |  |
| `config:voice:manage` | Turn voice on or off | Turn voice input on or off for the whole deployment. Audited. | high |  |  |
| `config:macros:manage` | Manage shared macros | Add, edit and deactivate enterprise and facility report macros. Everyone manages their own macros. Audited. | high |  |  |

## Configuration: cytology (10)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:cytology-categories:manage` | Manage cytology categories | Add, edit and deactivate the gyn and non-gyn diagnostic categories. Audited. | high |  |  |
| `config:cytology-nomenclature:manage` | Manage cytology nomenclature | Choose the cytology reporting system for the lab and each facility. Audited. | high |  |  |
| `config:cytology-routing:manage` | Manage cytology routing | Choose where cytology cases go, for the lab and each facility. Audited. | high |  |  |
| `config:cytology-screening-strategy:manage` | Manage the screening strategy | Choose the primary cervical screening method, for the lab and each facility. Audited. | high |  |  |
| `config:cytology-histology-correlation:manage` | Manage the correlation window | Set how long after an abnormal Pap a biopsy is matched for cyto-histo correlation, and the date it starts from, for the lab, each jurisdiction and each facility. Audited. | high |  |  |
| `config:cytology-instrumentation:manage` | Manage cytology instruments | Set the imaging and preparation instruments, for the lab and each facility. Audited. | high |  |  |
| `config:cytology-qc-rates:manage` | Manage QC rescreen rates | Set the random rescreen percentage for the lab, each facility and each person. Audited. | high |  |  |
| `config:cytology-workload-cap:manage` | Manage the slide workload cap | Set the daily slide limit for the lab, each facility and each person. Audited. | high |  |  |
| `config:cytology-severity-mapping:manage` | Manage histology severity mapping | Map SNOMED CT histology codes to the severities used in cyto-histo correlation. Audited. | high |  |  |
| `config:cytology-qc-rules:manage` | Manage cytology QC rules | Choose which Pap cases get mandatory review. Audited. | high |  |  |

## Configuration: lab dictionaries and case workflow (19)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:case-flags:manage` | Manage case flags | Add and edit the flags users can put on cases and specimens. Audited. | high |  |  |
| `config:subspecialties:manage` | Manage subspecialties | Add and edit subspecialties and the specimen types assigned to them. Audited. | high |  |  |
| `config:specimen-dictionary:manage` | Manage the specimen dictionary | Add and edit specimen types and their defaults. Audited. | high |  |  |
| `config:stain-dictionary:manage` | Manage the stain dictionary | Add and edit stains, sectioning protocols, order macros and molecular targets. Audited. | high |  |  |
| `config:ink-color:manage` | Manage the ink colour dictionary | Add, edit and deactivate the margin ink colours used at grossing and validated at sign-out. Audited. | high |  |  |
| `config:processing-protocols:manage` | Manage processing protocols | Add and edit grossing and processing protocols, and restore earlier versions. Audited. | high |  |  |
| `config:container-types:manage` | Manage container types | Add and edit containers and their fixatives. Audited. | high |  |  |
| `config:reagent-lots:manage` | Manage reagent lots | Add and edit stain reagent lots. Audited. | high |  |  |
| `config:delegation-types:manage` | Manage delegation types | Choose who may act for whom. Audited. | high |  |  |
| `config:deficiency-types:manage` | Manage deficiency types | Add and edit report deficiency and resolution types. Audited. | high |  |  |
| `config:tat-targets:manage` | Manage turnaround targets | Add, edit and delete turnaround targets. Audited. | high |  |  |
| `config:case-routing:manage` | Manage case routing rules | Choose which pool or pathologist gets a new case. Audited. | high |  |  |
| `case:routing:run` | Route unassigned cases now | Reassign every unassigned case at once by the routing rules. Audited. | high |  |  |
| `config:grossing-routes:manage` | Manage grossing route overrides | Choose where specimens are grossed when the usual route doesn't apply. Audited. | high |  |  |
| `config:facilities:manage` | Manage facilities | Add and edit facilities, their roles, LIS and billing setup, and their locations. Audited. | high |  |  |
| `config:physicians:manage` | Manage the physician directory | Add, edit, verify and deactivate physicians. Audited. | high |  |  |
| `config:departments:manage` | Manage departments | Add and edit departments and their retention overrides. Audited. | high |  |  |
| `config:asset-locations:manage` | Manage storage locations | Add and edit where material and bodies are kept. Audited. | high |  |  |
| `config:case-masks:manage` | Manage case number formats | Set how case numbers are built. Audited. | high |  |  |

## Configuration: results, reporting and quality (24)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:biopsy-resection-correlation:manage` | Manage the biopsy-to-resection window | Set how long after a surgical biopsy a resection is matched for correlation, and the date it starts from, for the lab, each jurisdiction and each facility. Audited. | high |  |  |
| `config:tumor-board-rules:manage` | Manage Tumor Board auto-flagging rules | Set the margin-distance thresholds that auto-flag a case for Tumor Board/MDT, for the enterprise and each facility's own override. Audited. | high |  |  |
| `config:follow-up-tracking:manage` | Manage follow-up tracking | Set the warning period for overdue follow-ups, whether staff may email the ordering clinician, and that email’s wording, for the enterprise and per facility. | high |  |  |
| `config:participation-types:manage` | Manage participation types | Decide who may sign which reports. Audited. | high |  |  |
| `config:release-buffer:manage` | Manage the release buffer | Set how long a signed report waits before it is released. Audited. | high |  |  |
| `config:delivery-rules:manage` | Manage report delivery rules | Choose where reports are sent. Audited. | high |  |  |
| `config:delivery-schedules:manage` | Manage delivery schedules | Choose when reports, billing and feeds go out, for the enterprise and each performing facility. Audited. | high |  |  |
| `config:billing-release:manage` | Manage billing release rules | Choose when generated charges are released to billing, per billing type, for the enterprise and each performing facility. Audited. | high |  |  |
| `config:abnormal-triggers:manage` | Manage abnormal result rules | Choose what counts as an abnormal result, and turn detection on or off. Audited. | high |  |  |
| `config:concordance-review:manage` | Manage concordance review | Set the lab's concordance review default. Audited. | high |  |  |
| `config:qa-types:manage` | Manage QA activity types | Add and edit QA activity and supervision types. The standard ones can't be switched off. Audited. | high |  |  |
| `config:revision-reasons:manage` | Manage revision reasons | Change the reason dictionary (amendment, correction and other reasons), including which revision reasons are clinically significant. | high |  |  |
| `config:peer-review:manage` | Manage the peer-review sign-out gate | Choose where sign-out waits for the independent peer review of a first-time malignancy: the organisation, each facility, each department. Off by default. | high |  |  |
| `config:qa-trend-policy:manage` | Manage the discordance trend policy | Set when a discordance pattern is flagged: the window, the minimum reviews, what counts as major, the count and rate thresholds, and what it produces. For the organisation and each performing lab. | high |  |  |
| `config:validation-studies:manage` | Manage validation studies | Create, edit, submit, activate and close method validation studies. Audited. | high |  |  |
| `validation:approval:record` | Record validation approval | Record a committee's approval of a validation study. Audited. | high |  |  |
| `config:retention-policy:manage` | Manage the retention policy | Set how long material and records are kept. Audited. | high |  |  |
| `config:fppe:manage` | Manage FPPE assignments | Start and end focused professional practice evaluations. Audited. | high |  |  |
| `config:cytotech-competency:manage` | Manage cytotechnologist competency | Start and end cytotechnologist competency reviews. Audited. | high |  |  |
| `config:clinical-mismatch-rules:manage` | Change the clinical mismatch rules | Set, per kind of mismatch and specimen type, the confidence at which the mismatch check alerts and acts, and whether it holds up sign-out (Block), warns or only logs to QA. No built-in role has it: grant it to your own role. | high | `config:clinical-mismatch-rules:view` |  |
| `config:clinical-mismatch-rules:view` | View the clinical mismatch rules | Read the mismatch rules, so a pathologist can see why a case was held. Pathologist, QA Reviewer and Lab Director by default. | standard |  |  |
| `config:ai-prompt:view` | View the AI instructions | Read the instructions the clinical mismatch check gives the AI, their versions and who approved them. Lab Director and QA Reviewer by default. | standard |  |  |
| `config:ai-prompt:edit` | Edit the AI instructions | Change the instructions the mismatch check gives the AI. An edit is a new version that waits for approval; the check keeps using the approved one. No built-in role has it: grant it to your own role. | high | `config:ai-prompt:view` |  |
| `config:ai-prompt:approve` | Approve the AI instructions | Approve or reject an edited version of the AI instructions; nobody can approve text they edited. Lab Director by default. Can't be held together with changing the mismatch rules (separation of duties). | high | `config:ai-prompt:view` |  |

## Configuration: printing, labels and benches (14)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:printers:manage` | Manage printers | Add, edit and delete printer profiles. Audited. | high |  |  |
| `config:print-settings:manage` | Manage print settings | Change the print rules and on-demand limits, for the lab and each facility. Audited. | high |  |  |
| `config:print-routing:manage` | Manage print routing | Choose which printer gets which print job. Audited. | high |  |  |
| `config:label-layouts:manage` | Manage label layouts | Change what prints on labels. Audited. | high |  |  |
| `config:cassette-routing:manage` | Manage cassette routing | Change how cassettes are printed and routed. Audited. | high |  |  |
| `config:cassette-colors:manage` | Manage cassette colours | Change the cassette colour coding. Audited. | high |  |  |
| `config:scan-stations:manage` | Manage scan stations | Add and edit scan stations, their steps and printers. Audited. | high |  |  |
| `config:equipment:manage` | Manage equipment | Add and edit equipment and record maintenance and calibration. Audited. | high |  |  |
| `equipment:maintenance:record` | Record equipment maintenance | Record maintenance, calibration and malfunctions in an instrument's service log (Batch Management → Equipment log). Audited. | high |  |  |
| `config:grossing-hardware:manage` | Manage grossing hardware | Add and edit grossing devices and their connections. Audited. | high |  |  |
| `config:workstation-groups:manage` | Manage workstation groups | Set the QC mode at each bench. Audited. | high |  |  |
| `config:action-groups:manage` | Manage action groups | Choose which actions each workstation allows. Audited. | high |  |  |
| `config:or-suite-terminals:manage` | Manage operating room terminals | Choose where frozen section results show. Audited. | high |  |  |
| `config:display-profiles:manage` | Manage wall display profiles | Choose what the wall dashboards show. Audited. | high |  |  |

## Configuration: integrations and intake (14)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:vendor-integrations:manage` | Manage vendor integrations | Add and edit slide, image and AI vendor connections. Audited. | high |  |  |
| `config:site-agents:enroll` | Enrol and revoke site agents | Make a one-time enrolment code for installing a site agent, and revoke an agent (cut off at once). At the site's facility. Audited. | high |  |  |
| `config:site-agent-config:manage` | Manage site agent printers and shares | Add, change or remove the printers and file shares a site's agent uses. The hospital's own allow-list on the agent's machine still decides what it may reach. Audited. | high |  |  |
| `config:workstations:manage` | Manage registered workstations | Register a named workstation and change its facility, room, area, point of care and bound printers. Audited. | high |  |  |
| `config:workstation-tokens:manage` | Manage workstation tokens | Rotate or revoke a workstation's token and run the token test. Audited. | high |  |  |
| `config:bi-feed:manage` | Change the reporting feed settings | Switch the reporting feed on or off and choose the datasets and facilities it offers. Audited. | high |  |  |
| `config:bi-feed-tokens:manage` | Issue, replace and revoke reporting feed tokens | Create a feed token limited to some datasets and facilities, replace it, revoke it at once, and test a pull. Audited. | high |  |  |
| `config:bi-feed-identified:approve` | Approve identified data in the reporting feed | Record who approved identified (not de-identified) feed tokens and why, or withdraw that approval. Audited. | high |  |  |
| `config:crosswalk:manage` | Manage the specimen code crosswalk | Change how incoming specimen codes are mapped. Audited. | high |  |  |
| `config:secure-messaging:manage` | Manage secure messaging gateways | Choose the lab’s secure messaging gateways and record each one’s BAA or data processing agreement. Audited. | high |  |  |
| `config:migration-mappings:manage` | Manage migration field mappings | Change how legacy data is imported. Audited. | high |  |  |
| `config:assist-polling:manage` | Manage Assist LIS polling | Set how often and where PathScribe polls the LIS in Assist mode. Audited. | high |  |  |
| `assist:lis-message:ingest` | Process LIS messages by hand | Poll the LIS now, paste a message in, or retry failed messages. These change cases and run the AI. Audited. | high |  |  |
| `config:interface-preview:view` | Preview interface messages | See an outbound message or charge export for a patient or case by its identifier. Audited. | high |  |  |

## Configuration: billing tables (10)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:billing-rules:manage` | Manage billing rules | Create, submit and retire billing rule versions. Audited. | high |  |  |
| `config:billing-tables:approve` | Approve billing tables | Approve or reject billing rules, modifiers, RVU, NCCI and code imports. You can't approve your own upload. Audited. | high |  |  |
| `config:billing-code-import:run` | Import billing codes | Import billing codes in bulk, or roll an import back. Audited. | high |  |  |
| `config:billing-modifiers:manage` | Manage CPT modifiers | Prepare new versions of the modifier table (they need approval). Audited. | high |  |  |
| `config:billing-rvu:manage` | Manage the RVU code map | Prepare new versions of the RVU values (they need approval). Audited. | high |  |  |
| `config:billing-ncci:manage` | Manage NCCI edits | Import a quarter's NCCI edits (they need approval). Audited. | high |  |  |
| `config:billing-triggers:manage` | Manage billing triggers | Choose when charges fire, for the lab and each site. Audited. | high |  |  |
| `config:payment-types:manage` | Manage payment types | Add and edit the payment type list. Audited. | high |  |  |
| `config:payment-mappings:manage` | Manage payment mappings | Map payment types by jurisdiction. Audited. | high |  |  |
| `config:smart-capture:manage` | Manage Smart Capture settings | Switch the Smart Capture prototype on or off and tick the production checklist. Every change is audited. | high |  |  |

## Configuration: security and system (10)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:inking-validation-mode:manage` | Manage the inking validation mode | Choose whether a site warns (default) or hard-blocks at sign-out when a margin isn't examined or inked. Audited. | high |  |  |
| `config:code-systems:manage` | Manage the code systems | Set which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT and others) each jurisdiction uses, whether each is optional or required, and from what date. Audited. | high |  |  |
| `config:session-security:manage` | Manage session timeout | Set the idle sign-out time for everyone. Audited. | high |  |  |
| `config:report-appearance:manage` | Manage report appearance | Choose the approved fonts and the default text styles on reports. Audited. | high |  |  |
| `config:organ-map-scheme:manage` | Set organ map colours and patterns | Change the colours, patterns, legend wording and thresholds of the organ maps (the breast close-margin distance; the malignant-polyp and rectal CRM involved-margin rules; the oral cavity involved- and close-margin rules; the kidney parenchymal and soft tissue involved-margin rules) for the enterprise, a jurisdiction or a facility. Audited. | high |  |  |
| `config:organ-map-bindings:manage` | Bind synoptic questions to organ maps | Choose which questions of a lab’s own synoptic templates, and which answers, feed the organ maps, and which of the templates’ generic margin questions the maps calculate. Audited. | high |  |  |
| `config:contribution-settings:manage` | Manage contribution settings | Choose whether pathologists see peer averages, and set the facility time zone. Audited. | high |  |  |
| `config:external-resources:manage` | Manage external links | Add, edit and delete the links shown to users. Audited. | high |  |  |
| `config:research-feed:manage` | Manage the research feed | Change the literature feed's search. Audited. | high |  |  |
| `config:feedback:manage` | Manage feedback settings | Choose whether the top bar shows the QA feedback button and where QA feedback is emailed. Audited. | high |  |  |

## Support access: ForMedrixAI support in this organisation (3)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `config:support-access:policy` | Set the support access policy | Decide whether ForMedrixAI support may reach this organisation's data (disabled, approval required, or always allowed) and how long an approval lasts. | high |  |  |
| `config:support-access:approve` | Approve support access | Approve, reject or revoke a ForMedrixAI support request to reach this organisation's data. | high |  |  |
| `config:support-audit:view` | View and export the support audit | See everything ForMedrixAI support did in this organisation, check the record hasn't been altered, and export it as CSV or JSON. | high |  |  |

## ForMedrixAI platform support (6)

| Key | Name | What it allows | Risk | Needs | Notes |
|---|---|---|---|---|---|
| `platform:cross-tenant-cases:view` | Open other organisations' cases (support) | PathScribe support access to a case outside the user's own organisation. Every such open is recorded in the audit log. | high |  | Platform only |
| `platform:governing-bodies:manage` | Manage governing-body content | Choose which governing bodies' content (CAP, RCPath, ICCR, RCPA) syncs into the platform's synoptic library. | high |  | Platform only |
| `platform:signing-rules:manage` | Manage country signing rules | Set the national signing rules for each country. ForMedrixAI support only. Audited. | high |  | Platform only |
| `platform:interface-dictionary:manage` | Manage vendor interface profiles | Create vendor profiles, edit their field mappings and test them against a sample message. ForMedrixAI support only. Audited. | high |  | Platform only |
| `platform:interface-dictionary:publish` | Publish vendor interface profiles | Make a tested vendor profile live, roll back to the version before, or switch it off. ForMedrixAI support only. Audited. | high | `platform:interface-dictionary:manage` | Platform only |
| `platform:interface-dictionary:simulate` | Apply a sample vendor message to a case | Demo only: add the fields from a pasted vendor message to a case so the Vendor fields panel can be seen. Labelled Simulated. ForMedrixAI support only. | high | `platform:interface-dictionary:manage` | Platform only |
