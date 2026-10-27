---
chapter: 8
id: ch8
title: Tier 7: Billing, Revenue Cycle Management and Registry Reporting
---

# Tier 7: Billing, Revenue Cycle Management and Registry Reporting {#ch8}

This chapter covers how PathScribe decides what to charge, when a charge may leave the system, and which cancer and screening registries a case is reported to. It also covers the payment lookups that the charge payload uses and the System Logs page where you watch financial events.

Read these three points first, because they set what you can and cannot expect.

1. **What PathScribe does with money.** PathScribe resolves each charge once, at finalisation, into a fixed record: CPT or HCPCS code, relative value units (RVU), and modifier. It does not hold prices. **Fee schedules: Not built.** There is no dollar amount, price or payer rate field anywhere in the billing rules. The charge payload carries no dollar amounts. Reimbursement is worked out by your billing system or the interface engine, not by PathScribe.
2. **What PathScribe does with registries.** PathScribe decides whether a case is reportable, checks the mandatory data, and builds a structured JSON payload. It does not itself write NAACCR XML, COSD XML or any registry wire format. The interface engine (ForMedrixAI's engine, shipped with PathScribe) translates and transmits. No registry specification in the product is confirmed against the registry's own published specification unless the section says so.
3. **Most of this chapter is Demonstration today.** Production storage is Microsoft SQL Server behind an ASP.NET Core API. The services behind these screens are browser-held demonstration services, and the API contracts in `docs/architecture` say nothing there was tried against a real server. Each screen carries its own status.

## Setup order for Tier 7

Do the screens in this order. Each screen's own "Setup sequence" box shows what it requires.

1. [CPT Modifier Dictionary](#screen-modifier_dictionary): the modifier list that the Billing Dictionary offers.
2. [RVU Code Map](#screen-rvu_code_map): the CPT and relative value list that every billing rule points to.
3. [Billing Dictionary (Charge Capture)](#screen-billing_dictionary): the versioned billing rules.
4. [NCCI Edit Rules](#screen-ncci_edit_rules): the bundling pairs (you upload them; none ship).
5. [Pending Billing Rule Approvals](#screen-pending_approvals): a second person approves steps 1 to 4 before anything takes effect.
6. [Charge Release Triggers](#screen-billing_type_triggers): the case milestone at which each billing type creates its charge.
7. [Billing Release](#screen-billing_release): hold and batch rules for charges that are ready.
8. [Master Payment Type Dictionary](#screen-master_payment_types): the payment categories.
9. [Jurisdiction Payment Mapping](#screen-jurisdiction_payment_mappings): local payer schemes mapped to those categories.
10. [Billing Export Preview](#screen-dft_export_preview): check what a real case would send.
11. [Cancer Registry Reporting](#screen-cancer_registry_settings): the registry per facility and the go-live approval.
12. [UK Cancer Registry (COSD)](#screen-cosd_destination): England destination settings.
13. [US Electronic Pathology](#screen-us_epath): state profiles for the US ePath feed.
14. [Cytology Registry Reporting](#screen-cytology_registry): cervical screening programme settings.
15. [Registry Batch Files](#screen-batch_registry_feed): file-based registry deliveries.

The [System Logs financial tab](#screen-audit-financial) is a reference page. It is not part of setup.

Not built in this chapter: fee schedules, AI or natural-language billing suggestions from report text, X12 837P, KVDT and SESAM-Vitale output, NAACCR XML batch files, and MIPS and MACRA quality reporting.

## Billing engine architecture {#ch8-billing-architecture}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups

**How a charge is modelled.** PathScribe splits a charge into a technical component, a professional component, or both together. The product calls these billing types:

| Billing type | On-screen label | What it covers | Modifier set |
|---|---|---|---|
| TC | Technical (TC) | Laboratory work: grossing, processing, slides, stains | `-TC` |
| 26 | Professional (26 Prof.) | The pathologist's interpretation | `-26` |
| Global | Combined (Global) | Both parts billed together | Neither |

PathScribe sets the modifier from the billing type with no exceptions: TC takes `-TC`, 26 takes `-26`, Global takes none. Other modifiers are informational only.

**When a charge is created.** By default the technical component is created when the specimen is grossed. The professional and global components are created at final sign-out. You can change this for the whole enterprise or for one site on [Charge Release Triggers](#screen-billing_type_triggers).

**Charges are fixed once created.** At finalisation PathScribe resolves the charge once into an immutable charge record that keeps a snapshot of the CPT, HCPCS, RVU and modifier. Later edits to a billing rule do not change a charge already made. A correction after sign-out uses a credit and rebill pair, not an edit.

**Billing rules are versioned.** A billing rule is identified by billing code, scope and version. Versions are only ever added. The statuses are DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED and RETIRED. The person who drafts or submits a version cannot approve it (the Four-Eyes principle, enforced in the services). On approval, the new version takes effect and the version it replaces ends.

**Scope.** A rule applies enterprise-wide or to one Site. The word Site is used on these screens, not Facility.

**Split cases.** When the technical component is performed at a different laboratory than the professional reading, the case carries a technical component facility and the performing facility. The release decision checks for this (see [Billing Release](#screen-billing_release)).

**Where charges go.** Ready charges go to the Outbound Queue. A charge in PENDING_APPROVAL or HOLD status is skipped by the outbound sweep. The interface engine does the transport, translation and retries. PathScribe only decides what is released and when.

**Optional charge approval.** A charge can be held for approval. The approval capability `billing:charge:approve` is checked per performing laboratory. It is in the capability catalog but no built-in role holds it by default, so grant it through [Roles](#screen-staff-roles) if you use charge approval.

### Charge Release Triggers (TC/26/Global) {#screen-billing_type_triggers}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Charge Release Triggers (TC/26/Global)

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** Charge Release Triggers (TC/26/Global)

**3. Business purpose and scope.** Sets the case milestone at which each billing type creates its charge. The defaults are: TC at specimen grossed, 26 and Global at case signed out. You can override a default for the whole enterprise or for one site. A site with no override of its own uses the enterprise setting.

**4. Prerequisites and dependencies.** A site override can only be set for a site that exists, so set up facilities first. Without a site in the list you can still set enterprise-wide triggers.

Setup step: Tier 7, step 6
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Billing Release](#screen-billing_release)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-billing_type_triggers - Charge Release Triggers with one milestone list per billing type]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Scope selector | Choice of Enterprise or one Site | Required | Chooses whose triggers you are viewing and changing. | Enterprise |
| Technical (TC) trigger | Choice of case milestones | Required | The milestone at which the technical charge is created. Saving the dropdown saves immediately. | Specimen grossed (`SPECIMEN_GROSSED`) |
| Professional (26 Prof.) trigger | Choice of case milestones | Required | The milestone at which the professional charge is created. Saves immediately. | Case signed out (`CASE_SIGNED_OUT`) |
| Combined (Global) trigger | Choice of case milestones | Required | The milestone at which the global charge is created. Saves immediately. | Case signed out (`CASE_SIGNED_OUT`) |
| Reset to default | Button | Optional | Removes the override for the chosen scope and returns it to the built-in default. | Not applicable |

**7. Permissions.** Open the screen: `screen:configuration:open`. Change: `config:billing-triggers:manage`. Admin and Lab Director hold it by default. Each change writes an audit event ("Charge release trigger changed", "Charge release triggers reset to default").

**Known limits.** Demonstration service only. A trigger change affects charges created from then on and does not change charges already created.

## Charge capture rules, CPT/HCPCS mapping and fee schedules {#ch8-charge-capture}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups

**Fee schedules: Not built.** The outline asks for fee schedules. There is no screen, contract or field for a dollar amount, price or payer-specific rate. A billing rule carries only the CPT code, HCPCS code, and RVU values for work, practice expense (PE) and malpractice (MP). The nearest things that exist are the RVU values on the [Billing Dictionary](#screen-billing_dictionary) and the [RVU Code Map](#screen-rvu_code_map). The check called `ZERO_FEE_MAPPING_ERROR` is worded as a fee check, but it tests for a charge that resolved with zero RVU across work, PE and MP and has no suppression advisory.

**Bulk loading codes.** To load CPT, HCPCS or other code lists in bulk, use [Code Import (Bulk)](#screen-code_import). It is documented with the other lookups.

**Auto-coding.** See the status paragraph under [Auto-coding engine and billing hold rules](#ch8-autocoding-holds).

### CPT Modifier Dictionary {#screen-modifier_dictionary}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > CPT Modifier Dictionary

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** CPT Modifier Dictionary

**3. Business purpose and scope.** The list of CPT modifier codes (for example 26, TC, 59, XS) that the Billing Dictionary's Coding Rules tab offers. Modifiers here are informational. PathScribe does not check or add a modifier other than the fixed TC and 26 rule described in the chapter introduction.

The shipped descriptions are placeholders such as "Modifier 59", marked synthetic, because the American Medical Association (AMA) text is licensed. If you hold a licence, load your own descriptions.

**4. Prerequisites and dependencies.** This is a starting point. Every change becomes a new version waiting for approval, so a second person with approval rights is needed before a change takes effect.

Setup step: Tier 7, step 1
Requires: None, this is a starting point.
Unlocks: [Billing Dictionary (Charge Capture)](#screen-billing_dictionary), [Pending Billing Rule Approvals](#screen-pending_approvals)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-modifier_dictionary - CPT Modifier Dictionary with active version and code list]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Version label | Text, read-only | Not applicable | The active dictionary version. Seed version id `modifier-v-seed-2026`. A second, pending licensed version is also seeded. | Seed version |
| Code | Text, read-only | Not applicable | The modifier code. Seeded: 26, TC, 22, 52, 53, 59, XE, XS, XP, XU, 76, 77, 90, 91, 92 (15 codes). | 15 seeded codes |
| Description | Text | Required when editing a row | The description shown to staff. Saving creates a new version in PENDING_APPROVAL; it is never activated automatically. | "Modifier {code}" (synthetic) |
| License status | Text, read-only | Not applicable | Shows `synthetic` for the shipped placeholders. | synthetic |
| Upload CSV | File, CSV | Optional | Replaces the dictionary from a file with columns Code and Description. Template: `ModifierDictionaryTemplate.csv`. Creates a pending version. | None |
| Licence confirmation | Checkbox | Required to upload | You confirm you hold the right to use the uploaded descriptions. The upload does not proceed without it. | Not ticked |
| Version label for the upload | Text | Optional | Names the pending version. | None |

**7. Permissions.** Open the screen: `screen:configuration:open`. Create or edit: `config:billing-modifiers:manage`. Approve, reject or activate a version: `config:billing-tables:approve`, used on [Pending Billing Rule Approvals](#screen-pending_approvals). Admin and Lab Director hold both by default. The person who submitted a version cannot approve it.

**Known limits.** The dictionary is a list only. No screen or check enforces a modifier on a charge. The shipped text is synthetic.

### RVU Code Map (Productivity) {#screen-rvu_code_map}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > RVU Code Map (Productivity)

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** RVU Code Map (Productivity)

**3. Business purpose and scope.** A small curated list of CPT codes with their relative value units, used for pathologist productivity (work RVU) and as the source list the Billing Dictionary picks CPT codes from. It is not a billing system and carries no dollar amounts. The seed is a subset of the CMS 2026 physician fee schedule relative value file, labelled "CMS 2026 (April update)" (version id `rvu-v-seed-2026`). Several rows have no work RVU and show as Unverified.

**4. Prerequisites and dependencies.** This is a starting point. A pending or rejected version is never used to resolve a charge, so nothing you upload counts until a second person approves it.

Setup step: Tier 7, step 2
Requires: None, this is a starting point.
Unlocks: [Billing Dictionary (Charge Capture)](#screen-billing_dictionary), [Pending Billing Rule Approvals](#screen-pending_approvals)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-rvu_code_map - RVU Code Map table with upload and edit]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Version | Text, read-only | Not applicable | The active version label. | CMS 2026 (April update) |
| Search | Text | Optional | Filters the table. | None |
| Upload CSV | File, CSV | Optional | Columns: Code or HCPCS, Description, WorkRVU. Honours the CMS status code (only A, R and T rows are payable) and skips modifier rows. Uploaded rows get their level inferred from the description (default specimen) and billing type Global. Creates a pending version. Template: `RvuCodeMapTemplate.csv`. | None |
| Version label for the upload | Text | Optional | Names the pending version. | None |

#### Edit window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Code | Text | Required | The CPT code. Locked when you edit an existing row. A duplicate code is refused. | None |
| Billing Code | Text | Required | The PathScribe billing code. Locked when you edit. | None |
| Description | Text | Optional | Plain description. | None |
| Level | Choice: specimen, block, stain, decant | Required | What the code is counted against. | specimen |
| Component Type | Choice: TC, 26, Global | Required | The billing type this row applies to. | Global |
| Work RVU | Positive number | Optional | Leave blank to mark the row Unverified. | Blank |
| RVU PE | Number | Optional | Practice expense RVU. | Blank |
| RVU MP | Number | Optional | Malpractice RVU. | Blank |
| HCPCS | Text | Optional | Level II code if one applies. | Blank |

**7. Permissions.** Open the screen: `screen:configuration:open`. Edit or upload: `config:billing-rvu:manage`. Approve: `config:billing-tables:approve`. Admin and Lab Director hold both by default. Four-Eyes applies.

**Known limits.** The list is a curated subset, not the full CMS file. Specimen-level base code selection (88302, 88305, 88309) cannot be worked out from the case data, so it is not automatic.

### Billing Dictionary (Charge Capture) {#screen-billing_dictionary}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Dictionary (Charge Capture)

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** Billing Dictionary (Charge Capture)

**3. Business purpose and scope.** The versioned list of billing rules. Each rule ties a PathScribe billing code to a CPT code, an optional HCPCS code, a billing type and RVU values, for the enterprise or for one site. A site override takes the place of the enterprise rule for that site. Charges are resolved from these rules when a case is finalised.

**4. Prerequisites and dependencies.** The CPT picker reads the RVU Code Map and the modifier checkboxes read the CPT Modifier Dictionary. Skip them and the CPT search is empty and no modifiers are offered.

Setup step: Tier 7, step 3
Requires: [RVU Code Map](#screen-rvu_code_map), [CPT Modifier Dictionary](#screen-modifier_dictionary)
Unlocks: [Pending Billing Rule Approvals](#screen-pending_approvals), [Billing Release](#screen-billing_release)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-billing_dictionary - Billing Dictionary table with site selector]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Viewing | Choice of Enterprise or one Site | Required | Whose rules the table shows. | Enterprise |
| Billing Code | Text, column | Not applicable | The PathScribe billing code. | None |
| CPT | Text, column | Not applicable | The CPT code. | None |
| Description | Text, column | Not applicable | The rule description. | None |
| RVU (Work) | Number, column | Not applicable | Work RVU. A "Code Map: N" flag shows when the stored RVU differs from the RVU Code Map. | None |
| Effective From | Date, column | Not applicable | The date the active version starts. | None |
| Scope | Text, column | Not applicable | Enterprise-Wide, Site Override or Inherited. | None |
| Status | Text, column | Not applicable | The version status. | None |
| Versions | Number, column | Not applicable | How many versions exist. | None |
| Actions | Buttons | Optional | History, Duplicate, New Version. | Not applicable |

#### New Version window, tab Billing & RVU

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Billing Code | Text | Required for a new code | The code this rule belongs to. | None |
| Scope | Choice of Enterprise or a Site | Required | Where the rule applies. | The viewed scope |
| Country | Choice: US, UK, AU, CA, the 27 EU states, NZ | Optional | The country the code is meant for. | None |
| HCPCS Code | Search | Optional | Searches the embedded public-domain HCPCS Level II dictionary. | Blank |
| CPT Code | Search of RVU Code Map entries | Required | The CPT code to bill. | None |
| Description | Text | Optional | Rule description. | Blank |
| Level | Choice: specimen, block, stain, decant | Required | What the code is counted against. | specimen |
| Component Type | Choice: TC, 26, Global | Required | The billing type. | Global |
| RVU Work, PE, MP | Numbers | Optional | The three RVU values. | Blank |
| Effective From | Date | Required | Start date of the version. | None |
| Change Reason | Text | Required when the scope already has versions | Kept on the version for audit. | Blank |
| Notes | Text | Optional | Free notes. | Blank |

#### New Version window, tab Coding Rules

These are informational and never enforced.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Modifiers Commonly Associated | Checkboxes from the CPT Modifier Dictionary | Optional | Reminder of modifiers that often go with this code. | None ticked |
| Quantity Rule | Text | Optional | Advice on units. | Blank |
| Bundling Rule | Text | Optional | Advice on bundling. NCCI pairs are held on [NCCI Edit Rules](#screen-ncci_edit_rules). | Blank |
| Documentation Requirements | Comma-separated text | Optional | What the record should show. | Blank |
| Suppression Advisory | Text | Optional | Marks a zero-RVU rule as intended, so the zero-fee check stays quiet. | Blank |

#### History window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Version | Number, column | Not applicable | Version number. | None |
| CPT | Text, column | Not applicable | CPT on that version. | None |
| RVU (Work) | Number, column | Not applicable | Work RVU. | None |
| Effective From, Effective To | Dates, columns | Not applicable | The period the version applied. | None |
| Status | Text, column | Not applicable | DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED or RETIRED. | None |
| Change Reason | Text, column | Not applicable | The reason entered. | None |
| Actions | Buttons | Optional | Duplicate. Submit for Approval (DRAFT versions). Retire (ACTIVE versions). | Not applicable |

A new version is always saved as DRAFT. **Submit for Approval** moves it to PENDING_APPROVAL.

**7. Permissions.** Open the screen: `screen:configuration:open`. Create, submit and retire: `config:billing-rules:manage`. Approve or reject: `config:billing-tables:approve`. Admin and Lab Director hold both by default. Audit events are written for submitted, approved and rejected ("Billing rule submitted for approval").

**Known limits.** There is no price or fee field (see Fee schedules above). Coding Rules are advice only.

## Auto-coding engine and billing hold rules {#ch8-autocoding-holds}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups

**Auto-coding engine: Partial.** What is built is rule-based and always confirmed by a person:

- Suggested codes from structured case data: stain categories, 88312 for a special stain, 88342 and +88341 for immunohistochemistry per specimen, and 88331 or 88332 for a frozen section.
- A fallback list of default codes. It is not billing-ready.
- Manual code entry in the code window and the billing review panel.

**Not built:** suggestions from the report text by AI or natural-language processing. That work is gated on attorney and compliance input. Base specimen codes (88302, 88305, 88309) are not worked out automatically. The nearest configuration screen is [Smart Capture](#screen-smart_capture).

**Sign-out billing checks.** At sign-out PathScribe runs six checks and records a deficiency for each finding:

| Trigger | Code | Severity |
|---|---|---|
| A | `UNSUPPORTED_CPT_LEVEL` | COMPLIANCE_WARNING |
| B | `NCCI_BUNDLING_VIOLATION` (only pairs with modifier indicator 0) | CRITICAL_REJECTION_RISK |
| C | `MISSING_DIAGNOSTIC_ICD10` | CRITICAL_REJECTION_RISK |
| D | `UNATTACHED_ANCILLARY_ORDER` | COMPLIANCE_WARNING |
| E | `MODIFIER_MISMATCH` | CRITICAL_REJECTION_RISK |
| F | `ZERO_FEE_MAPPING_ERROR` | REVENUE_LEAKAGE |

`MISSING_CHARGE`, `POST_SIGNOUT_CORRECTION` and `BLOCK_DELETED` are raised outside sign-out. These checks never stop the pathologist signing out. A toast says billing items were flagged for QA and the findings go to QA. They do block export: a case cannot be exported while any deficiency is OPEN or UNDER_REVIEW. The statuses are OPEN, UNDER_REVIEW, RESOLVED and OVERRIDDEN_WITH_JUSTIFICATION.

### NCCI Edit Rules (Bundling) {#screen-ncci_edit_rules}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > NCCI Edit Rules (Bundling)

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** NCCI Edit Rules (Bundling)

**3. Business purpose and scope.** Holds the National Correct Coding Initiative (NCCI) procedure-to-procedure pairs: a column 1 code and a column 2 code that may not be billed together. A pair with modifier indicator 0 raises a deficiency at sign-out. Real CMS data is not shipped. The seed is one synthetic pair (88305 with 88300, indicator 0, quarter `DEMO`) and the screen shows a warning. The licence holder uploads the CSV.

**4. Prerequisites and dependencies.** This is a starting point. An upload or edit becomes a pending import, so approval is needed before the pairs are used.

Setup step: Tier 7, step 4
Requires: None, this is a starting point.
Unlocks: [Pending Billing Rule Approvals](#screen-pending_approvals)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-ncci_edit_rules - NCCI Edit Rules with synthetic data warning and pair table]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Quarter Version | Text, for example `2026Q3` | Required to upload | Names the import. | None |
| Upload CSV | File, CSV | Optional | Columns: Column 1, Column 2, Modifier Indicator (0, 1 or 9), Effective Date, Deletion Date. Template: `NcciPtpEditTemplate.csv`. Creates a pending import. | None |
| Pair table | Table, read-only | Not applicable | Column 1, Column 2, indicator, dates for the active import. | One synthetic pair |
| Synthetic data warning | Notice | Not applicable | Shown while the active import is the synthetic seed. | Shown |

#### Edit window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Modifier Indicator | Choice: 0 never bypass, 1 can bypass with a modifier, 9 edit does not apply | Required | Only 0 pairs raise a deficiency at sign-out. | Current value |
| Deletion Date | Date | Optional | The date the pair stops applying. | Blank |

Each edit sends the whole table again as a new PENDING_APPROVAL import named "Manual edit" with the pair.

**7. Permissions.** Open the screen: `screen:configuration:open`. Upload or edit: `config:billing-ncci:manage`. Approve: `config:billing-tables:approve`. Admin and Lab Director hold both by default.

**Known limits.** No real NCCI data ships. Indicators 1 and 9 do not raise a deficiency.

### Pending Billing Rule Approvals {#screen-pending_approvals}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Pending Billing Rule Approvals

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** Pending Billing Rule Approvals

**3. Business purpose and scope.** The second-person approval queue. Billing rule versions, modifier dictionary versions, NCCI imports, RVU versions and code import jobs wait here. Nothing takes effect until a person other than the submitter approves it.

**4. Prerequisites and dependencies.** The queue only shows items that the earlier screens have submitted. The person approving needs the approve capability and must not be the submitter.

Setup step: Tier 7, step 5
Requires: [CPT Modifier Dictionary](#screen-modifier_dictionary), [RVU Code Map](#screen-rvu_code_map), [Billing Dictionary (Charge Capture)](#screen-billing_dictionary), [NCCI Edit Rules](#screen-ncci_edit_rules)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-pending_approvals - Pending Billing Rule Approvals and Pending Dictionary Updates tables]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Billing Code | Text, column | Not applicable | Rules table: the rule's code. | None |
| CPT | Text, column | Not applicable | Rules table. | None |
| RVU (Work) | Number, column | Not applicable | Rules table. | None |
| Effective From | Date, column | Not applicable | Rules table. | None |
| Scope | Text, column | Not applicable | Rules table. | None |
| Drafted By | Text, column | Not applicable | Rules table: the person who drafted. | None |
| Submitted By | Text, column | Not applicable | Rules table: the person who submitted. | None |
| Change Reason | Text, column | Not applicable | Rules table. | None |
| Dictionary | Text, column | Not applicable | Dictionary table: which dictionary (code import, modifier, NCCI, RVU). | None |
| Label | Text, column | Not applicable | Dictionary table: version or job label. | None |
| Approve | Button | Optional | Activates the item. For a code import it applies the whole job. If you submitted it the button is locked and a hint says why. | Not applicable |
| Reject | Button | Optional | Opens a reason box; **Confirm Reject** ends the item. | Not applicable |
| Rejection reason | Text | Required to reject | Stored with the decision. | Blank |

**7. Permissions.** Open the screen: `screen:configuration:open`. Approve and reject: `config:billing-tables:approve`. Admin and Lab Director hold it by default. Decisions write audit events.

**Known limits.** On a one-person system nobody can approve, because the submitter cannot approve their own item.

### Billing Release {#screen-billing_release}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Billing Release

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** Billing Release

**3. Business purpose and scope.** The hold rules. Each rule says which charges it matches and what to do with them: release at once, hold for a time, or release in a scheduled batch, with or without manual review. The most specific matching rule wins. PathScribe decides what and when. The interface engine moves the message.

**Specificity points:** facility 100, billing type 8, case types 4, ordering site 4, pathologist 2, amendment 1.

**When no rule matches:** release at the milestone, manual review on, auto-release on.

**Always applies:** an amendment change is parked for review; a charge whose CPT has no mapping is parked (`unmappedCpt`); a split case with no technical facility is parked (`missingTechnicalFacility`).

**4. Prerequisites and dependencies.** A rule can name a facility or ordering site, so set those up first. A scheduled batch is sent on a timetable defined in Delivery Schedules.

Setup step: Tier 7, step 7
Requires: [Facility Dictionary](#screen-facility-dictionary), [Charge Release Triggers](#screen-billing_type_triggers), [Delivery Schedules](#screen-delivery_schedules)
Unlocks: [Billing Export Preview](#screen-dft_export_preview)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-billing_release - Billing Release rule list with Try a charge panel]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Billing type | Choice: TC, 26, Global, any | Required | Criterion. | any |
| Case types | Comma-separated list | Optional | Criterion. | Blank (any) |
| Ordering site | Choice of sites | Optional | Criterion. | Any |
| Primary pathologist | Choice of staff | Optional | Criterion. | Any |
| Amendment | Choice: any, original, amended | Required | Criterion. | any |
| Release mode | Choice: DYNAMIC_WITH_HOLD, SCHEDULED_BATCH | Required | Release after a hold, or at the next batch. | DYNAMIC_WITH_HOLD |
| Hold duration (minutes) | Whole number, 0 to 43,200 | Required for a hold | How long to hold before release. | 0 |
| Batch schedule | Schedule settings | Required for a batch | Editor starts at weekly, Monday to Friday, 22:00, America/New_York. | See left |
| Auto-release on complete | Yes/No | Optional | Release when the hold ends. | On |
| Manual review required | Yes/No | Optional | A person reviews before release. | On |
| Try a charge | Test panel | Optional | Runs the decision for a sample charge and shows the rule that matched. | Not applicable |

Rule checks raise these problem codes: `billingTypeInvalid`, `modeInvalid`, `holdInvalid`, `batchRequired`, `amendmentInvalid`, `caseTypesInvalid`. Three enterprise rules (TC, 26, Global) are seeded, each DYNAMIC_WITH_HOLD, 0 minutes, auto-release on, manual review on.

**7. Permissions.** Open the screen: `screen:configuration:open`. Change: `config:billing-release:manage`. Admin and Lab Director hold it by default. Saves are audited. Releasing, holding, retracting and resending messages are separate interface capabilities (`interface:outbound:release`, `hold`, `retract`, `resend`), held by Admin.

**Known limits.** Wired to the Outbound Queue in the demonstration service only.

### Billing Export Preview {#screen-dft_export_preview}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Export Preview

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** Billing Export Preview

**3. Business purpose and scope.** Look up a case and see what PathScribe would send for billing. The JSON payload is what PathScribe sends. The HL7 DFT^P03 text is a preview of what the interface engine would build. PathScribe does not make or send HL7. X12 837P, KVDT and SESAM-Vitale do not exist.

**4. Prerequisites and dependencies.** You need a finalised case with charges. If the case has an open billing deficiency the export is blocked.

Setup step: Tier 7, step 10
Requires: [Billing Dictionary (Charge Capture)](#screen-billing_dictionary), [Billing Release](#screen-billing_release), [Jurisdiction Payment Mapping](#screen-jurisdiction_payment_mappings)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-dft_export_preview - Billing Export Preview with JSON payload and HL7 preview]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Case id or accession | Text | Required | The case to preview. | Blank |
| JSON payload | Text, read-only | Not applicable | The webhook payload plus the financial class. | None |
| HL7 DFT^P03 preview | Text, read-only | Not applicable | Illustration only. | None |
| Send to billing engine | Button | Optional | Sends to the simulated engine ("Simulated" badge). Blocked while a deficiency is open. | Not applicable |
| Send financial class (preview) | Button | Optional | Shows the financial class payload. | Not applicable |

**7. Permissions.** Open and use: `config:interface-preview:view`. Admin and Lab Director hold it by default.

**Known limits.** Sending is simulated. No real billing engine is connected.

## Cancer registry configuration {#ch8-cancer-registry}
Breadcrumb: Home > Configuration > System > Lab Materials & Workflows

**What exists.** PathScribe has 14 cancer registry definitions and 12 cervical screening registry definitions. Every cancer registry is marked `configurable`, meaning the specification is not verified against the registry's published specification. Of the screening registries, three are marked verified: the UK cervical screening management system (CSMS), PALGA in the Netherlands and the Australian National Cancer Screening Register (NCSR).

| Cancer registry id | Wire format named |
|---|---|
| `naaccr_us` | NAACCR XML |
| `epath_npcr_us` | HL7 v2 ORU |
| `cpac_canada` | NAACCR XML |
| `cosd_uk` | COSD XML (GB_EW) |
| `phs_scotland` | HL7 v2 ORU |
| `nicr_northern_ireland` | HL7 v2 ORU |
| `ncri_ireland` | HL7 v2 ORU |
| `nkr_netherlands` | PALGA protocol |
| `inca_france` | CDA CR-ACP |
| `adt_gekid_germany` | oBDS XML |
| `bcr_belgium` | HD-S4S JSON |
| `aihw_australia` | HL7 v2 ORU |
| `nz_cancer_registry` | HL7 v2 ORU |
| `kccr_korea` | HL7 v2 ORU |

**What each format means today.** PathScribe builds one structured JSON payload. The named format is the target the interface engine would translate to. PathScribe does not write NAACCR XML, COSD XML, oBDS, CDA or the other formats. **There is no Spain cancer registry or Spain screening registry**, although Spain is a jurisdiction in the product. **NAACCR XML as a batch file: Not built.** **MIPS and MACRA: Not built** (see [Quality and public health reporting](#ch8-quality-reporting)).

**Reporting rules built in.**

- The trigger is surgical pathology sign-out only. Cytology never triggers a cancer report. Reporting is fire-and-forget and never holds sign-out.
- Mandatory data: date of birth, diagnosis date, primary diagnosis and ICD-O code. A registry that keys on a patient identifier also needs that identifier. A report with missing data is held as `HOLD_MISSING_MANDATORY_DATA` and appears on Registry Exceptions.
- Reportability: only the documented NAACCR exclusions are built (cervical carcinoma in situ and CIN III, prostatic intraepithelial neoplasia III, and skin basal and squamous cell carcinoma). The list is not exhaustive.
- Send gate: a validation instance never sends real cases. A production instance holds a report until go-live is approved for that registry.
- Patient opt-out: the **Honours opt-out** setting is off by default. When off, an opted-out patient is still reported and the audit log records that.

### Cancer Registry Reporting {#screen-cancer_registry_settings}
Breadcrumb: Home > Configuration > System > Lab Materials & Workflows > Cancer Registry Reporting

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Lab Materials & Workflows**
**2. Maintenance item:** Cancer Registry Reporting

**3. Business purpose and scope.** Chooses which cancer registry the enterprise reports to by default and lets a facility override it. It also holds the go-live approval for each registry. Each registry row shows its specification status badge, its jurisdictions, its identifier and its wire format.

**4. Prerequisites and dependencies.** Facility overrides pick from the facility list, so set up facilities first. Without a registry chosen, no cancer report is made.

Setup step: Tier 7, step 11
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Registry Batch Files](#screen-batch_registry_feed), [UK Cancer Registry (COSD)](#screen-cosd_destination), [US Electronic Pathology](#screen-us_epath)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-cancer_registry_settings - Enterprise default registry, facility overrides and registry connection panel]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Enterprise Default registry | Choice of None plus the 14 registries | Required | The registry used for any facility with no override. | None (the demonstration seed sets Metro General to `naaccr_us`) |
| Honours opt-out | Checkbox | Optional | When ticked, a patient who has opted out is not reported. | Off |
| Save | Button | Optional | Saves the two fields above. | Not applicable |
| Registry (go-live) | Choice | Required when more than one registry is in use | Chooses which registry the connection panel below shows. | The first in use |
| Add Override | Button | Optional | Opens a new facility override row. | Not applicable |
| Facility | Choice of facilities | Required for an override | The facility the override applies to. | None |
| Registry | Choice of the 14 registries | Required for an override | The registry for that facility. | None |
| Save, Cancel, Remove | Buttons | Optional | Save or discard an override, or remove a saved one. | Not applicable |

#### Registry connection panel (go-live)

The same panel appears on [Cytology Registry Reporting](#screen-cytology_registry). It runs a registry through Pending, Testing, Validated and Live. An instance has one of two roles. A validation instance never sends real data and only runs the test suite. A production instance sends real results only to live registers with a current approval; results are held otherwise and caught up on approval.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Template version and status | Text, read-only | Not applicable | The registry template version and whether it is current. | None |
| What changed | List, read-only | Not applicable | Changes since the version you last confirmed. | None |
| Agreement reference | Text | Required to record | The data-sharing agreement reference. **Record agreement** saves it. | Blank |
| Run test suite | Button (validation instance) | Optional | Runs the synthetic test cases (`SYN-` patients): 3 screening and 2 cancer. At least 1 accepted result is needed (`REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS`). | Not applicable |
| Export validation record | Button (validation instance) | Optional | Downloads the validation record file. | Not applicable |
| Validation record file | JSON file (production instance) | Optional | Imports a record exported from a validation instance. | None |
| Go-live pre-checks | List, read-only | Not applicable | `agreementRecorded`, `templateCurrent`, `validationRecord`, `testEvidence`, `specificationConfirmed`, `codesMapped`, `identifierHold`, `overridesReviewed`. | None |
| Registry test sign-off reference | Text | Optional | The registry's own sign-off reference. | Blank |
| Specification confirmed | Checkbox | Required for `configurable` registries | You confirm the specification against the registry's own. | Not ticked |
| Request go-live | Button | Optional | Starts the approval. | Not applicable |
| I am approving as | Choice: Site Administrator, Lab Director, Delegated Lab Director designee | Required to approve | The capacity you approve in. | None |
| Approve with my credentials | Button | Optional | Asks you to re-enter your credentials, then records the approval. | Not applicable |
| Withdraw request, Stop live reporting | Buttons | Optional | Cancel a pending request, or stop a live registry. | Not applicable |
| Part of the template | Choice | Required for a local rule | Which part of the template a local change touches. | None |
| What the rule does | Text | Required for a local rule | Describes the local change or adapter rule. | Blank |
| Add rule, Remove, Confirm reviewed | Buttons | Optional | Manage local rules and confirm they were reviewed. | Not applicable |
| The person who requests go-live may also approve it | Yes/No (production only) | Optional | Allows the requester to approve. | On |
| Approvals required | Whole number, 1 to 3 (production only) | Optional | How many approvals are needed. | 1 |
| Go-live history | List, read-only | Not applicable | Every request, approval and stop. | None |

**7. Permissions.** Open the screen: `screen:configuration:open`. Change the registry settings: `config:cancer-registry:manage`. Run the test suite: `registry:test-suite:run`. Approve go-live: `registry:live-register:approve`. Admin holds these by default; the Lab Director does not hold `config:cancer-registry:manage`, and holds the go-live approval through its own seed. Approval requires a credential re-entry.

**Known limits.** ICD-O-3 capture is open: the code window's ICD-O tab stores SNOMED morphology identifiers, not codes such as `8500/3`. The registry specifications are unverified. This screen has no section-level change capability in the access table; its buttons grey out through the capability buttons.

### UK Cancer Registry (COSD) {#screen-cosd_destination}
Breadcrumb: Home > Configuration > System > Administration & Compliance > UK Cancer Registry (COSD)

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** UK Cancer Registry (COSD)

**3. Business purpose and scope.** Destination settings for the Cancer Outcomes and Services Dataset (COSD), shown on screen as COSD (England). You set the transport label, the correction window and the non-working dates, once for the enterprise and optionally once per facility. The element names in the check panel are PathScribe's simplified model, not the official COSD schema.

**4. Prerequisites and dependencies.** Choose the COSD registry on the cancer registry screen first. Removing a facility entry sends that facility back to the enterprise settings.

Setup step: Tier 7, step 12
Requires: [Cancer Registry Reporting](#screen-cancer_registry_settings)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-cosd_destination - COSD destination settings with check panel and correction due calculator]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Scope | Enterprise or one facility | Required | One entry per scope. | Enterprise |
| Transport | Choice: restMtls, sftp, portalUpload | Required | A label only. The interface engine holds the address and credentials. | Secure API (restMtls) |
| Correction working days | Whole number, 1 to 30 | Required | Working days allowed to correct a rejected submission. | 5 |
| Non-working dates | List of dates, YYYY-MM-DD | Optional | Days not counted as working days. None are assumed. | None |
| Remove | Button | Optional | Facility entries only; reverts to enterprise settings. | Not applicable |

#### Check a sample submission

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| NHS number | Text | Required | The sample patient. | Blank |
| Date of birth | Date | Required | Sample. | Blank |
| Diagnosis date | Date | Required | Sample. | Blank |
| ICD-O-3 | Text | Required | Sample. | Blank |
| Primary diagnosis | Text | Required | Sample. | Blank |

#### When is a correction due?

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Rejected on | Date | Required | Counts the correction working days forward, skipping weekends and your non-working dates. | Blank |

**7. Permissions.** Open the screen: `screen:configuration:open`. Change: `config:cosd-destination:manage`. Admin and Lab Director hold it by default.

**Known limits.** The items still to be confirmed against the real COSD specification are: element names, the mandatory item list, code list values, date rules, the submission envelope, rejection codes and the correction window start.

### US Electronic Pathology {#screen-us_epath}
Breadcrumb: Home > Configuration > System > Administration & Compliance > US Electronic Pathology

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** US Electronic Pathology

**3. Business purpose and scope.** Electronic pathology (ePath) reporting to US state cancer registries. A generic National Program of Cancer Registries (NPCR) base message (HL7 v2.5.1 ORU^R01) is adjusted by a state profile and sent over a transport (PHIN-MS, SFTP, Direct TCP or an HTTPS API). The state is picked from the performing facility's state, never the patient's address. Only a labelled example profile ships.

**4. Prerequisites and dependencies.** The facility needs its state set in the facility dictionary. With no facility or profile, the report is parked (`routing:noFacility`, `routing:noProfile`) and sign-out is not held.

Setup step: Tier 7, step 13
Requires: [Facility Dictionary](#screen-facility-dictionary), [Cancer Registry Reporting](#screen-cancer_registry_settings)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-us_epath - US ePath profile list and assignments]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Assignment scope | Enterprise or one facility | Required | Where a profile applies. A facility falls back to a profile for its own state, then to the enterprise default. | Enterprise |
| Assigned profile | Choice of profiles | Required | The profile used. | None |

#### Profile window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| State | Two letters | Required | The state the profile is for. | None |
| Name | Text | Optional | Display name. | Blank |
| Required fields | List of segment-field codes such as `PID-11` | Optional | Must be filled. Never `MSH`. Cannot overlap Optional fields. | None |
| Optional fields | List of segment-field codes | Optional | Sent when present. | None |
| Transport | Choice: PHIN-MS, SFTP, Direct TCP, HTTPS API | Required | Transport label for the interface engine. | None |
| Which facility decides the state | Choice: technical component facility, reading facility | Required | Picks the facility whose state selects the profile. | Technical component |
| Final report only | Yes/No | Optional | Check. | Off |
| ICD-O morphology required | Yes/No | Optional | Check. | Off |
| SNOMED required | Yes/No | Optional | Check. | Off |
| Specimen identifier required | Yes/No | Optional | Check. | Off |
| Provider NPI required | Yes/No | Optional | Check. Fails on demonstration cases, which have no NPI. | Off |
| State-specific fields | Rows of field, mode (required or fixed), value | Optional | Extra state rules. | None |

A report that fails a check is held for review (`HOLD_EPATH_PROFILE`).

**7. Permissions.** Open the screen: `screen:configuration:open`. Change: `config:us-epath:manage`. Admin and Lab Director hold it by default.

**Known limits.** The OBR and OBX identifiers are defaults, to be confirmed against the NPCR guide. No state profile is verified.

### Cytology Registry Reporting {#screen-cytology_registry}
Breadcrumb: Home > Configuration > Cytology > Registry Reporting

**Status:** Demonstration

**1. Navigation:** Configuration tab **Cytology** > section **Registry Reporting**
**2. Maintenance item:** Registry Reporting

**3. Business purpose and scope.** Cervical screening programme reporting, separate from cancer registries. A screening result never triggers a cancer report. There are 12 definitions: `csms_uk`, `nicsp_northern_ireland`, `sccrs_scotland`, `cervicalcheck_ireland`, `palga_netherlands`, `germany_okfe`, `france_crcdc`, `belgium_chr`, `ncsr_australia`, `ncsp_new_zealand`, `canada_provincial` and `kncsp_kccr_korea`. There is no US or Spain screening registry. Each registry's mapping connects your cytology categories to the registry's codes for adequacy, primary interpretation, additional interpretation and recommendation.

**4. Prerequisites and dependencies.** The mapping table lists your cytology interpretation categories, so those come first. Skip them and the table is empty.

Setup step: Tier 7, step 14
Requires: [Interpretation and Recommendations](#screen-cytology_categories), [Nomenclature System](#screen-cytology_nomenclature), [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Registry Batch Files](#screen-batch_registry_feed)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: cytology-cytology_registry - Cytology Registry Reporting with enterprise default, overrides and mapping table]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Enterprise Default registry | Choice of None plus the 12 registries | Required | Used by any facility with no override. | None |
| Save | Button | Optional | Saves the default. | Not applicable |
| Add Override | Button | Optional | Starts a facility override. | Not applicable |
| Facility | Choice of facilities | Required for an override | The facility. | None |
| Registry | Choice of the 12 registries | Required for an override | The registry for it. | None |
| Save, Cancel, Configure, Remove | Buttons | Optional | Save or discard an override, open its configuration, or remove it. | Not applicable |

#### Registry configuration

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Registry | Choice | Required | The registry being configured. | The first |
| Hold a result until every category it uses has a registry code | Checkbox | Optional | Disabled for built-in registries. | Off |
| Hold a result unless the patient has a verified identifier | Checkbox | Optional | Shown only when the registry has an identifier format. | Off |
| Category | Text, column | Not applicable | Your cytology category. | None |
| Field | Text, column | Not applicable | Adequacy, primary interpretation, additional interpretation or recommendation. | None |
| Registry code | Text | Optional | The registry's code. | Blank |
| Registry text | Text | Optional | The registry's text, for registries that use text coding. | Blank |
| Save registry configuration | Button | Optional | Saves the mapping. | Not applicable |

The **Registry connection panel** is described under [Cancer Registry Reporting](#screen-cancer_registry_settings). Here it uses the screening capabilities.

**7. Permissions.** Open the screen: `screen:configuration:open`. Change: `config:screening-registry:manage`. Run the test suite: `registry:test-suite:run`. Approve go-live: `registry:live-register:approve`. Admin holds these by default. The Lab Director does not hold `config:screening-registry:manage` by default.

**Known limits.** Three registries are marked verified (CSMS, PALGA, NCSR); the others are configurable and unverified. Germany, France and Belgium are batch-file registries (see Registry Batch Files).

### Registry Batch Files {#screen-batch_registry_feed}
Breadcrumb: Home > Configuration > System > Lab Materials & Workflows > Registry Batch Files

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Lab Materials & Workflows**
**2. Maintenance item:** Registry Batch Files

**3. Business purpose and scope.** For a registry that takes files rather than messages, a batch profile says which records go in, how the file is laid out and how it is named. Formats: CSV, XML and NAACCR XML. **NAACCR XML is listed but Not built**: the shipped NAACCR profile is disabled. One example profile ships (based on `germany_okfe`, CSV, `;` delimiter, 10 columns, off) and is not a programme specification. Real programme layouts are Not built.

**4. Prerequisites and dependencies.** A batch is made on the timetable in Delivery Schedules and sent by the interface engine over SFTP. Choose the registry on the cancer or cytology screen first.

Setup step: Tier 7, step 15
Requires: [Cancer Registry Reporting](#screen-cancer_registry_settings), [Cytology Registry Reporting](#screen-cytology_registry), [Delivery Schedules](#screen-delivery_schedules)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-batch_registry_feed - Registry Batch Files profile cards]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Waiting | Counts, read-only | Not applicable | **Check what is waiting** shows waiting, due now, held back, overdue and next file. | None |
| Make the file now | Button | Optional | Makes a file by hand. It downloads once and is never stored. A manifest lists SHA-256, sequence, counts and held-back records. | Not applicable |
| Turn on, Turn off | Button | Optional | Enables the profile. | Off |
| Edit | Button | Optional | Opens the profile editor. | Not applicable |
| Remove | Button | Optional | Not available for shipped profiles. | Not applicable |
| Run status | Text, read-only | Not applicable | awaitingAck, accepted, partlyRejected or rejected. | None |

#### Profile editor

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Program name | Text | Required | Names the programme. | Blank |
| Registry | Choice of all 26 registries (screening and cancer) | Required | Which registry. | None |
| File format | Choice: CSV, XML, NAACCR XML | Required | NAACCR XML is refused (`formatNotAvailable`). | CSV |
| Delimiter | Choice: comma, semicolon, tab | Required for CSV | Column separator. | Comma |
| First row holds headings | Yes/No | Optional | Writes a heading row. | On |
| Protect against spreadsheet formulas | Yes/No | Optional | Guards text that starts like a formula. | On |
| XML root and record element | Text, two boxes | Required for XML | Valid and different names. | Results, Result |
| Code in file name | Text, 1 to 20 letters, digits, hyphen or underscore | Optional | The programme code in the file name. | Blank |
| File name pattern | Text using {program} {date} {time} {seq} | Required | Must contain {date} or {seq}. | `{program}_{date}_{seq}` |
| Columns | List: field (15 fields), Heading, Required, move up, move down, remove, Add a column | Required | Each field once. A record missing a required column is held back as `REGISTRY_NOT_READY`. | None |
| Live preview | Text, read-only | Not applicable | Shows the file layout. | None |

**7. Permissions.** Open the screen: `screen:configuration:open`. Manage profiles: `config:batch-registry-feed:manage` (Admin and Lab Director). Make a file: `registry:batch-file:generate` (Admin, and it needs the first capability).

**Known limits.** A single-record resend from Registry Exceptions still sends a message for a batch programme. The schedule comes from Delivery Schedules. SFTP delivery belongs to the interface engine.

## Quality and public health reporting (MIPS/MACRA) {#ch8-quality-reporting}
Breadcrumb: Home > Configuration > System > Lab Materials & Workflows

**Status:** Not built

PathScribe has no Merit-based Incentive Payment System (MIPS), Medicare Access and CHIP Reauthorization Act (MACRA) or Quality Payment Program measure, screen, export or contract. A search of the source and documents found none. Nothing here calculates a quality measure or builds a submission file.

**The nearest things that exist:**

- The [Reporting feed](#screen-bi_feed) sends case data to a business intelligence tool, where you can build your own measures.
- Exports: users with the right capability can download exports from the application, and the [System Logs financial tab](#screen-audit-financial) exports billing events as CSV.
- Cancer and cervical screening registry reporting (above) is the public health reporting that is built, in the limits described.

## Jurisdiction payment mappings, master payment types and the financial log {#ch8-payment-reference}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups

PathScribe describes who pays in two layers. A **master payment type** is a category used everywhere (for example commercial insurance). A **jurisdiction payment mapping** says that a local scheme (for example `DE_GKV`) belongs to one category and which outbound format it is meant for. The financial class that goes with a charge is built from both. The outbound formats named on the mapping are labels only: X12 837P, KVDT and SESAM-Vitale are Planned and none is generated.

### Master Payment Type Dictionary {#screen-master_payment_types}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Master Payment Type Dictionary

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** Master Payment Type Dictionary

**3. Business purpose and scope.** The payment categories that mappings, accessioning and the charge payload use. Eleven are seeded: SELF_PAY, PATIENT_COPAY_GAP, COMMERCIAL_INSURANCE, MUTUELLE_COMPLEMENTARY, STATUTORY_SOCIAL_HEALTH, PUBLIC_UNIVERSAL_BENEFIT, PUBLIC_NHS (identifier label "NHS Number"), RECIPROCAL_INTERNATIONAL, SPONSOR_CLINICAL_TRIAL, OCCUPATIONAL_WORKERS_COMP (identifier label "Claim #") and DIRECT_CONTRACT_INSTITUTIONAL.

**4. Prerequisites and dependencies.** This is a starting point for payment. Mappings can only pick an active type here.

Setup step: Tier 7, step 8
Requires: None, this is a starting point.
Unlocks: [Jurisdiction Payment Mapping](#screen-jurisdiction_payment_mappings)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-master_payment_types - Master Payment Type Dictionary list]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Id | Text | Required | Stored in capitals, spaces become underscores. Locked after you create it, because mappings refer to it. A duplicate is refused. | None |
| Display name | Text | Required | The name staff see. | None |
| Requires subscriber id | Yes/No | Optional | Staff must enter a subscriber or policy number. | Off |
| Subscriber id label | Text | Optional | The label for that number (for example "Claim #"). | Blank |
| Requires guarantor | Choice: required, optional, not required | Required | Whether a guarantor is needed. | not required |
| Supports split billing | Yes/No | Optional | Whether technical and professional parts may go to different payers. | Off |
| Notes | Text | Optional | Free notes. | Blank |
| Active | Yes/No | Optional | **Deactivate** and **Reactivate** buttons. | Active |

**7. Permissions.** Open the screen: `screen:configuration:open`. Change: `config:payment-types:manage`. Admin and Lab Director hold it by default.

**Known limits.** Deactivating a type is not checked against the mappings that use it.

### Jurisdiction Payment Mapping {#screen-jurisdiction_payment_mappings}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Jurisdiction Payment Mapping

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Financial & Revenue Lookups**
**2. Maintenance item:** Jurisdiction Payment Mapping

**3. Business purpose and scope.** Maps each local payer scheme to a master payment type. The Accessioning "Outside Patient Data" tab reads these (Primary Jurisdiction selector), and the financial class payload uses them. Thirteen rows are seeded: US_MEDICARE, US_COMMERCIAL, CA_OHIP (country code CA_ON), UK_NHS_TRUST, DE_GKV, DE_BG, FR_CPAM, FR_MUTUELLE, NL_BASIS, BE_MUT, AU_MBS, NZ_ACC and KR_NHIS. **There is no row for Spain, Scotland, Northern Ireland or Ireland**, although the code defines 14 jurisdictions including Spain.

**4. Prerequisites and dependencies.** The master type list must hold the category first. Only active types are offered.

Setup step: Tier 7, step 9
Requires: [Master Payment Type Dictionary](#screen-master_payment_types), [Jurisdiction overview](#screen-jurisdiction_overview)
Unlocks: [Billing Export Preview](#screen-dft_export_preview)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_payment_mappings - Jurisdiction Payment Mapping list with country filter]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Country filter | Choice of countries | Optional | Narrows the list. | All |
| Show inactive | Yes/No switch | Optional | Includes inactive rows. | Off |
| Country code | Text | Required | Stored in capitals. Free text, not checked against the jurisdiction list. | None |
| Local scheme code | Text | Required | Stored in capitals. | None |
| Local display terminology | Text | Required | The name staff see. | None |
| Master payment type | Choice of active master types | Required | The category. | None |
| Primary outbound format | Text | Required | A label such as X12 837P. No file is generated. | None |
| Notes | Text | Optional | Free notes. | Blank |
| Active | Yes/No | Optional | Inactive rows are hidden from the Primary Jurisdiction selector. | Active |

**7. Permissions.** Open the screen: `screen:configuration:open`. Change: `config:payment-mappings:manage`. Admin and Lab Director hold it by default.

**Known limits.** There is no duplicate check on country and scheme code. X12 837P, KVDT and SESAM-Vitale output are Planned.

### System Logs: Financial {#screen-audit-financial}
Breadcrumb: Home > System Logs > Financial

**Status:** Demonstration

**1. Navigation:** **System Logs** page > tab **Financial**
**2. Maintenance item:** Not applicable, this is a log page.

**3. Business purpose and scope.** A read-only view of billing events and of failed or queued outbound charges. It has two sub-tabs: **Billing Logs** and **Outbound DLQ** (dead letter queue, the list of charges that failed to send).

**4. Prerequisites and dependencies.** It shows data only after charges exist.

Setup step: Reference, not part of setup
Requires: [Billing Dictionary (Charge Capture)](#screen-billing_dictionary), [Billing Release](#screen-billing_release)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-audit-financial - System Logs Financial tab, Billing Logs filters and results]

**6. Field reference.**

#### Billing Logs filters

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Case Number | Text | Optional | Filter. | Blank |
| Patient Name | Text | Optional | Filter. | Blank |
| Patient Name Range (A-Z) | Two letters | Optional | Filter. | Blank |
| Patient ID (MRN/MPI) | Text | Optional | Filter. | Blank |
| Billing Event Date from, to | Dates | Optional | Filter on the event date. | Blank |
| Date of Service from, to | Dates | Optional | Filter. | Blank |
| Report Sign-out Date from, to | Dates | Optional | Filter. | Blank |
| Type | Choice: Charge, Credit, Deficiency, Code Review, Dispatch, Amendment, Audit | Optional | Filter. | All |
| Billing Type | Choice | Optional | Filter. | All |
| Status | Choice: Draft, Pending Approval, Approved, Exported, Rejected, Hold | Optional | Filter. | All |
| Staff, Signing Pathologist, Ordering Facility | Lookups (Browse) | Optional | Filters. | Blank |
| Detail text search | Text | Optional | Searches the detail text. | Blank |
| Saved queries | Choice and Save | Optional | Kept as personal settings. | None |
| Clear, Search | Buttons | Optional | Reset or run. | Not applicable |
| Export CSV | Button | Optional | Needs `audit:billing-log:export`. | Not applicable |

#### Billing Logs results

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Case, Patient, Patient ID | Columns | Not applicable | Patient data is tagged as protected health information. | None |
| Timestamp, Type, Billing Type, Status, Event, Detail | Columns | Not applicable | The event. | None |
| Staff, Pathologist, Facility | Columns | Not applicable | Who and where. | None |

The search shows at most 50 cases. A "Case limit reached" message appears when more match.

#### Outbound DLQ

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Lab filter | Choice, "All Performing Labs" | Optional | Limits both tables. | All Performing Labs |
| Failed: Case, Performing Lab, Component, Error, Retries | Columns | Not applicable | Error codes: `MISSING_ICD10`, `MISSING_PROVIDER_NPI`, `DISPATCH_TIMEOUT`, `DISPATCH_REJECTED`. The last two appear only through the test buttons. | None |
| Fix & Retry: Save & Re-queue | Button | Optional | Attaches an ICD-10 code or provider NPI to the case (audited) and re-queues. | Not applicable |
| Fix & Retry: Retry Dispatch | Button | Optional | Tries again. | Not applicable |
| CAPA: Capture as CAPA | Button | Optional | Raises a deficiency of type `def-outbound-dispatch-failure`. | Not applicable |
| Queued: Case, Performing Lab, Component, Trigger | Columns | Not applicable | Charges waiting to send. | None |
| Simulate Timeout, Simulate Rejected | Buttons | Optional | For testing only. Real dispatch is not built. | Not applicable |

**7. Permissions.** Open: `screen:audit-log:open`, held by Admin, Lab Director and QA Reviewer by default. Export billing logs to CSV: `audit:billing-log:export`. The same page has the Audit Log, Error Log, Interface Log, Quality Assurance, Critical Alerts, Consult links and Server jobs tabs; see [Interface logs](#screen-audit-interfaces) and [Audit Log](#screen-audit-log).

**Known limits.** The dispatch simulation is a testing aid. No live billing system receives charges.

