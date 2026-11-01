---
chapter: 2
id: ch2
title: Tier 1: Primary System Prerequisites (Configure First)
---

# Tier 1: Primary System Prerequisites (Configure First) {#ch2}

Tier 1 is the part of Configuration that every other setting stands on. It answers four questions before anything else can be set up: which laboratory sites exist, who may do what, which physical devices the sites use, and which organisation-wide rules apply. Later tiers read from it. A department asks for a facility. A report template routes by role. A label prints through a printer profile. If a Tier 1 screen is empty, the screens that depend on it show empty pickers or refuse to save.

Configure Tier 1 in this order. Each screen below carries a **Setup sequence** box with the same information, and the builder checks that no screen requires one that comes after it.

1. [Facility Dictionary](#screen-facility-dictionary): the organisation, its performing laboratories and ordering clients.
2. [Participation Types](#screen-participation_types): the case roles (primary, resident, consultant) and who may sign out.
3. [Roles](#screen-staff-roles): what each job may open and change.
4. [Delegation Types](#screen-delegation_types): the ways a case or report can be handed over.
5. [Members](#screen-staff-members): the people.
6. [Credentialing](#screen-staff-credentialing): supervised-practice reviews for new staff.
7. [Session Security](#screen-session_security): idle sign-out, second factor and sign-out policy.
8. [Support Access](#screen-support_access): whether ForMedrixAI support may reach your data.
9. [Equipment](#screen-equipment): the register of every device.
10. [Printer Profiles](#screen-printer_profiles): what each label printer can do and how a browser reaches it.
11. [Site agents](#screen-site_agents): the program that prints and moves files on a site's network.
12. [Scan Stations](#screen-scan_stations): the benches a terminal can identify itself as.
13. [Print Settings](#screen-print_settings): label sizes, barcode rules and print behaviour.
14. [Label Designer](#screen-label_designer): the layout of each label.
15. [Workstations](#screen-workstations): registered computers with a token.
16. [Workstation Groups](#screen-workstation_groups): benches grouped by discipline and area.
17. [Grossing Hardware](#screen-grossing_hardware): cameras and scales at the grossing benches.
18. [Data Retention](#screen-retention): how long records are kept.
19. [Case Mask Configuration](#screen-case_mask_config): accession numbering.
20. [Field Requirements](#screen-field_requirements): which fields a page needs before it can be saved.
21. [External Resources](#screen-external_resources): reference links.

Five screens are references, not setup steps: the [System tab](#screen-tab-system), the [Staff tab](#screen-tab-staff), the [Scope reference](#screen-scope_reference), the [Jurisdiction overview](#screen-jurisdiction_overview) and the [Simulated print log](#screen-simulated_print).

**Status words.** Each screen shows one of the five status words defined in the authoring standard: Built, Demonstration, Partial, Planned, Not built. Today most data services run on the browser's demo data, and the production API is connected service by service. Where a screen already has a production service and a contract in `docs/architecture`, it is **Built**. Where the screen works only in the browser, or its effect is not applied anywhere yet, it is **Demonstration**.

## Part A: Enterprise and Facilities Management {#ch2-enterprise-facilities}
Breadcrumb: Home > Configuration > System

This part holds the System tab that contains every screen in Parts A, C and D, and the one screen that defines your organisation's structure.

**How the hierarchy works.** There is no separate "Enterprise" screen and no "hospital" or "clinic" type. Everything is a facility on the [Facility Dictionary](#screen-facility-dictionary). A facility marked as an Enterprise is the top level (your organisation). Other facilities point to it as their Parent Enterprise, and are the affiliates. What a facility does is set by its roles (Performing Lab, Ordering Facility and so on), not by a type. Locations (ward, room, bed) hang under one facility. The [Scope reference](#screen-scope_reference) lists which settings are set once for the enterprise and which are set per facility.

**Where date, time, timezone and language are set.** There is no single "global date and time" screen. Each is set in a different place:

| What | Where it is set | Scope |
|---|---|---|
| Time zone | One **Facility Timezone** choice on the [Contribution Dashboard](#screen-contribution_settings) settings screen. It decides which day or month a signed-out case is counted in, and the year used by accession numbering. | Whole organisation. Default `America/Phoenix`. |
| Date and number format | Follows the display language chosen in the top bar. The Identifier Formats tab of the facility editor shows the jurisdiction's date format, time format and locale read-only. | Each user's browser. |
| Display language | The language button in the top bar. Choices: English, French, French (Belgium), German, Dutch, Dutch (Belgium), Korean, Spanish. Stored in the browser as `pathscribe_language`. | Each user, each browser. |
| Report language | **Report language** on the facility's General tab. | Each performing lab. |
| Spelling language | **Spelling language** on the staff member's record. | Each person. |
| Site agent update window | Times in the site's local time on the [Site agents](#screen-site_agents) screen. | Each site. |

Stored times are always UTC. Nothing in Tier 1 changes that.

### System tab {#screen-tab-system}
Breadcrumb: Home > Configuration > System

**Status:** Built

**1. Navigation:** Configuration tab **System**. A direct link such as `/configuration?tab=system&section=print_settings` opens a section.
**2. Maintenance item:** System (the container for every System section)

**3. Business purpose and scope.** The System tab holds the lab's reference data and operating settings. It has six groups, shown as buttons across the top: **Workstation & Hardware**, **Lab Materials & Workflows**, **Clinical Lookups**, **Financial & Revenue Lookups**, **Administration & Compliance** and **Integrations**. Choosing a group lists only that group's screens in the left-hand sidebar. The System tab is the default tab when Configuration opens.

**4. Prerequisites and dependencies.** Opening Configuration needs the capability `screen:configuration:open`. Each section then checks its own capability. If you lack it, the section opens read-only with a note, and its controls are disabled.

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: [Facility Dictionary](#screen-facility-dictionary), [Print Settings](#screen-print_settings)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: tab-system - System tab with group buttons and sidebar]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Group buttons | Six buttons | Not applicable | Selecting a group shows that group's sections in the sidebar and opens its first section. | Workstation & Hardware |
| Sidebar | List of sections | Not applicable | One button per section in the active group, sorted by name. A section only a ForMedrixAI engineer may use is hidden unless you hold its platform capability. | Print Settings selected |
| Facility: (selector) | Picklist of active performing laboratories, plus **All Facilities** | Optional | Shown only in the Workstation & Hardware group. It filters Print Settings, Printer Profiles, Scan Stations, Site agents, Equipment and Grossing Hardware to one site. It is remembered only until you leave the System tab, and is not saved. | All Facilities |
| Unsaved-changes prompt | Confirmation | Not applicable | Moving to another section or group with unsaved changes asks you to keep editing or discard. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Each section's own capability is listed on that section. Admin and Lab Director hold the configuration screen capability by default.
**Known limits.** The facility selector is not kept when you reload the page. Workstations and Workstation Groups do not use it: Workstations has its own facility column and Workstation Groups its own Performing Lab filter.

### Facility Dictionary {#screen-facility-dictionary}
Breadcrumb: Home > Configuration > System > Integrations > Facility Configuration

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Integrations** > **Facility Configuration**. The page heading reads "Facility Configuration". It is the same screen that Chapter 3 lists as [Facility Configuration](#screen-clients).
**2. Maintenance item:** Facility Dictionary

**3. Business purpose and scope.** A facility is any site or organisation PathScribe knows about: your own laboratories, the clinics and hospitals that send you specimens, and the reference laboratories you send work to. Each facility carries its roles, contact details, the codes that match inbound orders to it, its turnaround targets, report delivery choices and print routing. The top-level organisation is a facility with **Enterprise** ticked. Almost every other screen asks for a facility, so this is the first screen to fill.

**4. Prerequisites and dependencies.** Nothing comes before it. The Place of Service Code list on the General tab reads the code dictionary, and the Model list on the AI & Performance tab lists only models with a passing validation study. Both are optional. Skip the facility and every other screen's facility picker is empty.

Setup step: Tier 1, step 1
Requires: None, this is a starting point.
Unlocks: [Participation Types](#screen-participation_types), [Delegation Types](#screen-delegation_types), [Members](#screen-staff-members), [Equipment](#screen-equipment), [Case Mask Configuration](#screen-case_mask_config), [Departments](#screen-departments)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-facility-dictionary - Facility list with search, status and role filters and Add Facility]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Matches facility name, assigning authority, contact name and email. | Blank |
| Status filter | Tabs: All, Active, Inactive, Unverified | Optional | Unverified facilities were created automatically from an inbound order and wait for someone to check them. | All |
| Role filter | Tabs: All Types, Performing Lab, Ordering Facility | Optional | Narrows by role. | All Types |
| Result count | Text (N of M) | Not applicable | Shows how many facilities match. | Not applicable |
| Facility column | Text | Not applicable | Name, assigning authority code, address, and an "affiliate" marker. | Not applicable |
| Roles column | Badges | Not applicable | The facility's roles and its jurisdiction. | Not applicable |
| Contact column | Text | Not applicable | Contact name and email. | Not applicable |
| TAT column | Text | Not applicable | Shows "Nh 1st touch", "Nh total", or Default. | Not applicable |
| Status column | Text | Not applicable | Active, Inactive or Unverified. An "Auto-created" note shows when the facility came from an order. | Not applicable |
| + Add Facility | Button | Not applicable | Opens the editor with a blank facility. | Not applicable |
| Verify | Row button | Not applicable | Shown for Unverified facilities only. Marks the facility as checked. | Not applicable |
| Edit | Row button | Not applicable | Opens the editor. | Not applicable |
| Duplicate | Row button | Not applicable | Copies the organisation-level setup into a new facility. It clears the assigning authority, CLIA or ISO number, address and contact details, director, legacy tenant ids, pediatric authorisations, interface endpoint and credentials. The name becomes "Copy of" plus the original. | Not applicable |
| Deactivate / Activate | Row button | Not applicable | Not shown for Unverified facilities. Deactivating a facility still in use opens **Facility still in use** and asks you to confirm. References are not removed. | Not applicable |

#### Editor window: General tab

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Facility Name | Text | Required | How the facility appears on orders, reports and labels. Error: "Facility name is required". | Blank |
| Assigning Authority | Text, up to 10 characters, forced to upper case | Required | Inbound HL7 orders are matched to the facility by this code, so it must be unique (not case sensitive). | Blank |
| Status | Choice: Active, Inactive (Unverified is shown only when already set) | Required | Inactive facilities are not offered on new work. | Active |
| Roles | Check boxes: Performing Lab, Internal Submitting Location, Internal Ordering Facility, External Ordering Facility, Specimen Acquisition, Reference Lab | Required | At least the roles that describe what the site does. Performing Lab unlocks the AI & Performance tab and the lab-only fields below. | External Ordering Facility |
| Place of Service Code | Picklist from the place of service codes | Optional | Needs the Specimen Acquisition role. | None |
| CLIA/ISO Accreditation Number | Text | Optional | Needs Performing Lab or Enterprise. Used in report headers. | Blank |
| Laboratory Director Name | Text | Optional | Needs Performing Lab or Enterprise. Used in report headers. | Blank |
| Header Logo URL | https link | Optional | Needs Performing Lab or Enterprise. Only the address is stored, never the image. | Blank |
| Charges need billing approval | Choice: Same as the enterprise, On, Off | Optional | Performing Lab or Enterprise only. "Same as the enterprise" is offered to non-enterprise labs only. | Same as the enterprise |
| Addendum Page Policy: Force addenda onto a dedicated page | Yes/No switch | Optional | Performing Lab only. | Off |
| Report language | Choice of the eight display languages | Optional | Performing Lab only. The default follows the jurisdiction. | By jurisdiction |
| Abnormal Detection: Enabled at this facility | Yes/No switch | Optional | Performing Lab only. | Off |
| Jurisdiction | Choice of 14: US, CA, GB_EW, GB_SCT, GB_NIR, IE, AU, NZ, KR, BE, NL, DE, FR, ES | Required | Sets the facility's country rules, date format, spell check and patient ID standard (shown on Identifier Formats). | US |
| National screening registry ID | Text | Optional | The facility's identifier with a national screening registry. | Blank |
| Letters or numbers for labels | Three choices, **Specimens**, **Blocks** and **Slides**, each Letters or Numbers (a Preset menu offers the old pair: "Specimen A, B, C / Block A1, A2, A3" and "Specimen 1, 2, 3 / Block 1A, 1B, 1C") | Optional | On the Enterprise facility the choice is the default for every lab under it. On any other facility each choice can also be "Same as enterprise (value)", which is the default for a new facility. A live example ("Specimen A · Block 1 · Slide L1") shows the result. A note appears when Specimens and Blocks both use letters or both use numbers, because a label such as AA or 11 can then be read two ways. A change applies to new cases only. See [Choose letters or numbers for specimens, blocks and slides](#ch11-lbl-numbering). | Specimens letters, Blocks numbers, Slides numbers (Specimen A, Block 1, Slide L1) |
| Enterprise | Check box: "This is a top-level Enterprise institution" | Optional | Marks the facility as the top level. Unlocks the enterprise-only fields (Interface Engine Connection, Secure messaging). | Off |
| Parent Enterprise | Picklist of other enterprise facilities | Optional | Makes this facility an affiliate of that enterprise. | None |
| Contact Prefix | Choice: Mr., Mrs., Ms., Mx., Dr. | Optional | Title of the contact person. | Blank |
| Contact Suffix | Choice of presets, or Other | Optional | For example Jr. or MD. | Blank |
| Given Names, Family Names, Preferred Name | Text | Optional | The contact person. | Blank |
| Email | Text, must contain "@" | Optional | Contact email. | Blank |
| Phone, Fax | Text | Optional | Contact numbers. | Blank |
| Address, City, State/province/region, Postal code | Text | Optional | Postal address. | Blank |

Which contact fields are required comes from [Field Requirements](#screen-field_requirements) page **Facility editor**: name, assigning authority, email, phone, fax, address, city, region, postal code and contact person. The footer lists what is still required.

#### Editor window: LIS Integration tab

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Interface Engine Connection: endpoint | Text | Required once configured | Enterprise only. Where PathScribe sends messages to the interface engine. | Blank |
| HL7 version | Choice: 2.3, 2.4, 2.5, 2.5.1, 2.6 | Optional | Enterprise only. | 2.5.1 |
| Auth Type | Choice: none, basic, oauth2, api_key | Optional | Enterprise only. | none |
| Credential Configured | Yes/No | Optional | Enterprise only. Records that a credential is set up. The secret itself is not entered here. | No |
| The connected LIS owns major case statuses | Yes/No switch | Optional | Enterprise only. | Off |
| Pathologists can initiate Addendum/Amendment directly in PathScribe | Yes/No switch | Optional | Enterprise only. | Off |
| Override Enterprise routing | Yes/No switch | Optional | Non-enterprise facilities only. Off means the facility inherits its parent's connection. | Off |
| Sending Facility ID (MSH-4) | Text | Required once configured | Identifies the facility in outbound HL7. | Blank |
| Receiving Facility ID (MSH-6) | Text | Optional | The receiving system's code. | Blank |
| Outbound Channel Override | Text | Optional | A different engine channel for this facility. | Blank |
| Send one combined PDF per case | Yes/No switch | Optional | Performing Lab only. | Off |
| Organ map delivery: Send the organ map | Choice: Off, Text only, Text and image file | Optional | Performing Lab only (Batch 751). On an Assist case PathScribe never places the organ map in the report. This sends it to the laboratory system with the synoptic data: the map's findings as text lines, and with a file the map drawn at finalising from the final answers. Saved on its own with `config:organ-map-delivery:manage` and audited. A failed delivery never holds up finalising; it appears in the outbound queue, with retry. | Off |
| Organ map delivery: File format | Choice: PNG image, PDF document | Optional | Shown for Text and image file. | PNG image |
| Organ map delivery: Destination for the files | Text | Required for Text and image file | A folder, an SFTP address or an interface engine channel. Never a user name or password. File names carry the accession, the map type and the time, never a patient name. | Blank |

#### Editor window: Identifier Formats tab

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Override toggle | Yes/No switch | Optional | Non-enterprise facilities only. Off uses the parent's formats. | Off |
| Format rows | List grouped as Tier 1 (search: a slide barcode opens the case) and Tier 2 (internal mapping) | Not applicable | Each row has an enabled switch, a test box, and a show-pattern button. Patterns are fixed by the system and cannot be edited. | By jurisdiction |
| LIS preset filter | Choice | Optional | Narrows the rows to a preset. | All |
| Simulate a scan | Text | Optional | Type or scan a value to see which format matches. | Blank |
| Locale information | Read-only text | Not applicable | Shows the jurisdiction, date format, time format, locale, spell check and patient ID standard. | Not applicable |
| Save Changes | Button | Not applicable | Saves the override. | Not applicable |

#### Editor window: Reporting tab

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Report Format | Choice: PDF, HL7, Both | Required | How reports go to this facility. | PDF |
| Delivery Method | Choice: Email, Fax, Portal, HL7 | Required | How reports reach it. | Portal |
| Auto-release reports on finalization | Yes/No switch | Optional | | Off |
| Copy report to referring physician | Yes/No switch | Optional | | Off |

#### Editor window: TAT & Escalation tab

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| First Touch Target | Whole number of hours, 1 to 168 | Optional | Blank uses the system default. | Blank (system default 4 hours) |
| Total Case TAT Target | Whole number of hours, 1 to 720 | Optional | Blank uses the system default. | Blank (system default 24 hours) |
| Escalation Priority | Choice: high, critical | Optional | Priority of an overdue alert. | high |
| Escalation Targets | Check boxes: Pathology Group, Lab Administrator, Referring Physician | Optional | With none ticked, alerts are suppressed for this facility. Restricted (pediatric) cases always escalate at Critical. | None |

#### Editor window: AI & Performance tab (Performing Lab only)

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Narrative Auto-Draft | Choice: inherit, on, off | Optional | | Inherit |
| Idle session timeout override | Choice: inherit, 5, 10, 15, 20, 30, 60 minutes | Optional | Overrides the organisation default on [Session Security](#screen-session_security) for cases at this lab. | Inherit |
| Code review random sampling rate | Whole number, 0 to 100 | Optional | Percentage of cases sampled for code review. Blank means none. Changing it is written to the audit log as "Code review random sampling rate changed". | Blank |
| Release buffer | Choice: inherit or override | Optional | Override reveals Buffer enabled, duration (1 to 30 minutes) and Bypass for STAT. | Inherit (override default 10 minutes) |
| Model | Picklist: inherit, or models with a passing Validation Study | Optional | Edit mode only. | Inherit |

#### Editor window: Locations tab (edit mode only)

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Point of Care | Text | Required | Matched by print routing rules and workstations. | Blank |
| Room, Bed, Building, Floor | Text | Optional | Parts of the location. | Blank |
| Location Status | Choice (HL7 table 0306) | Optional | | Blank |
| Person Location Type | Choice (HL7 table 0305) | Optional | | Blank |
| Verify, Activate, Deactivate | Buttons | Not applicable | Locations created automatically from an inbound PV1 segment arrive as Unverified. | Not applicable |

#### Editor window: Printing tab (edit mode only; has its own Save)

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Print released reports | Yes/No switch | Optional | Performing Lab only. | Off |
| Delivery | Choice: QZ Tray named printer, Network printer direct, Interface engine or print server | Required when printing is on | Performing Lab only. | None |
| Paper size | Choice: Default (Letter), Letter, A4, Legal | Optional | Performing Lab only. | Default |
| Printer name | Text | Required for QZ Tray | | Blank |
| Printer kind | Choice: Site agent printer, Printer address | Required for direct | | None |
| Protocol | Choice: RAW 9100, LPR/LPD, IPP | Required for direct | | RAW 9100 |
| Address, Port | Text, whole number 1 to 65535 | Required for direct | | Blank, 9100 |
| Queue name, IPP path, Display name | Text | Optional | Queue for LPR, path for IPP. | Blank |
| Paper tray | Choice: Report default, Tray 1 letterhead, Tray 2 plain | Optional | Any facility. | Report default |
| Sides | Choice: Report default, Double-sided, Single-sided | Optional | Any facility. | Report default |
| Allow direct printing from the browser (Batch 734) | Yes/No switch, saved at once | Optional | Performing Lab only. Lets bench screens send labels straight from the browser to a printer on the bench (QZ Tray, the PathScribe agent, Zebra Browser Print, BarTender). Off: in a server deployment those prints are refused and the bench uses the interface engine or the browser print dialog. Every direct print and every refused one is recorded in the audit log. The demo always allows it. The printer's own address stays on its printer profile. | Off |

#### Editor window: Secure messaging tab (edit mode only, Enterprise only)

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Gateway rows | NHSMAIL, EGRESS, ACCURX, PAUBOX, VIRTRU, ZIX, HEALTHLINK, MEDICAL_OBJECTS, REFERRALNET, KR_HIE | Optional | One row per gateway. | Off |
| Enabled | Yes/No switch | Optional | | Off |
| Default | Radio | Optional | The gateway used by default. | None |
| Sender address or ID | Text | Optional | | Blank |
| Agreement on file, reference, signed-on, expires-on | Yes/No, text, dates | Optional | Patient details go out only while an agreement is in force. | No |

#### Editor window: Spelling tab (edit mode only, Performing Lab only)

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Word list | Text list | Optional | Words the spell check accepts at this facility. Changes are audited. | Empty |

**How spell check uses this list.** The checker tries a word against, in order: the person's own dictionary, this facility word list (the list of the case's performing laboratory), the regional spelling rule, PathScribe's pathology word list, and the language's standard dictionary. The first list that accepts the word wins. Words with digits, capital-letter abbreviations of up to six letters, and web or e-mail addresses are never checked. The language comes from the case, then the pathologist's **Spelling language** on the Staff record, then the facility's jurisdiction, then US English. Each addition or removal here is recorded in the audit log under "Facility spelling dictionary word added" or "removed". Only single words can be added. The pathology word lists for French, German, Dutch, Spanish and Korean are starter lists that still need native-speaker review, so expect some correct specialist terms to be underlined until you add them here.

**7. Permissions.** Open: `screen:configuration:open`. Add, change, deactivate, reactivate and verify: `config:facilities:manage`. Printing tab: `config:print-settings:manage`; the direct-printing switch: `config:direct-device-printing:manage`. Secure messaging tab: `config:secure-messaging:manage`. Admin and Lab Director hold these by default. Field-level changes the page audits are listed above.
**Known limits.** Sending by secure messaging is simulated: `messageService.sendSecureEmail` records the message but no real gateway transport exists yet (PS-332). The AI & Performance tab text points the release buffer default at "Configuration > System > LIS Integration", but that default lives on [Post-Sign-Out Release Buffer](#screen-release_buffer).

### Scope reference {#screen-scope_reference}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Scope reference

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **Scope reference**
**2. Maintenance item:** Scope reference (read-only)

**3. Business purpose and scope.** A page that answers one question: is this setting made once for the organisation, once per facility, or at several levels? It also defines the words enterprise, performing facility and ordering facility. It changes nothing.

**4. Prerequisites and dependencies.** None. It reads a fixed list kept in the product. Only nine settings are listed, and the page says that areas not listed have not been checked.

Setup step: Reference, not part of setup
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-scope_reference - Scope reference table and definitions]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| What the words mean | Three definitions | Not applicable | Enterprise (the whole organisation), Performing facility (one laboratory site) and Ordering facility or client (whoever sends the case). | Not applicable |
| Setting area | Text | Not applicable | The setting: Second-factor sign-in policy, Idle sign-out time, Print settings, Print routing rules, Turnaround targets, Site agents, Scan stations, Equipment, Workstations. | Not applicable |
| Where it is set | Text | Not applicable | One of: Enterprise, Enterprise default with facility override, Each facility, Several levels (most specific wins). | Not applicable |
| How it works | Text | Not applicable | One sentence per setting. A link opens the screen where the setting lives. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. There is nothing to change and no section capability.
**Known limits.** The list covers nine settings. Do not read a missing setting as either enterprise-wide or per facility.

### Jurisdiction overview {#screen-jurisdiction_overview}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Jurisdiction overview

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **Jurisdiction overview**
**2. Maintenance item:** Jurisdiction overview (read-only)

**3. Business purpose and scope.** One card per country showing what is set up for it, so you can see gaps without opening seven screens. It lists the countries that have country sign-out rules, plus any country a facility or the lab uses. Every row has a **Change** link to the screen where that setting is edited. The page says: "This page only shows what is set up."

**4. Prerequisites and dependencies.** It reads the facilities, so add them first. An empty country card means the facility list or the rules behind it are empty.

Setup step: Reference, not part of setup
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-jurisdiction_overview - Country cards with a row per setting]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Facilities | Text list | Not applicable | The facilities in that country. An inactive facility shows "(inactive)". Change opens [Facility Configuration](#screen-clients). | Not applicable |
| Roles offered | Count | Not applicable | Participation roles offered. Change opens [Participation Types](#screen-participation_types). | Not applicable |
| Sign-out rules | Text | Not applicable | "Can sign out" roles and "Needs a countersign" roles. Change opens [Country Signing Rules](#screen-country_signing_rules). | Not applicable |
| Code systems | Text list | Not applicable | Each system with required or optional. Change opens [Code Systems](#screen-code_systems). | Not applicable |
| Cancer registries | Text list | Not applicable | Registries set up for the country. Change opens [Cancer Registry Reporting](#screen-cancer_registry_settings). | Not applicable |
| AI policy | Text | Not applicable | One of: No restrictions, All AI services allowed, Allowed (a list), Limited to data-region providers, plus a count of facility rules. Change opens the AI Behavior tab. | Not applicable |
| Retention rules from | Text | Not applicable | "Saved for this country" or "Built-in default". Change opens [Governing Bodies](#screen-governing_bodies). | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. There is nothing to change here. Each Change link needs the capability of the screen it opens.
**Known limits.** None known.

## Part B: User Management, Roles and the Permission Matrix {#ch2-users-roles}
Breadcrumb: Home > Configuration > Staff

This part covers who can sign in and what each person may do. Access in PathScribe is built from capabilities. A capability is one permission written as `domain:object:verb`, for example `config:roles:manage`. A role is a named bundle of capabilities. A person gets capabilities through their roles, limited to the facilities on their record. Capabilities marked high risk are written to the audit log when they are used.

**The permission matrix.** The matrix is the capability list on the Roles screen: every capability, grouped, with a check for each role. The catalog and the starting assignments are fixed in the product (`capabilityCatalog.ts` and `capabilitySeeds.ts`). Four rules matter when you plan roles:

- **Built-in roles.** Pathologist, Resident, Fellow, PA, Admin, Physician, OR Staff, Template Author, Template Approver, Lab Director, QA Reviewer, Superadmin, Accessioner, Histotechnologist, Cytotechnologist and Molecular Technologist ship ready-made. A role you add yourself starts with no configuration capabilities.
- **Admin and Lab Director.** Admin holds every configuration capability. Lab Director holds the same set except two groups: the administration group (`config:roles:manage`, `config:staff:edit`, `config:staff-access:assign`, `config:staff-password:manage`, `config:field-requirements:manage`, `auth:mfa-enrolment:reset`, `config:demo-data:reset`) and drafting protocols. So only Admin and Superadmin manage roles, staff and field requirements.
- **Superadmin.** A ForMedrixAI role. It holds every capability except `config:ai-prompt:approve`, a hospital cannot change it, and a hospital cannot assign it to its own staff.
- **Separation of duties.** `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve` cannot be held together by one role or one person. The save is refused.

A refused configuration change shows the reason `CONFIG_NOT_PERMITTED`. A section you cannot change opens read-only.

### Staff tab {#screen-tab-staff}
Breadcrumb: Home > Configuration > Staff

**Status:** Built

**1. Navigation:** Configuration tab **Staff**
**2. Maintenance item:** Staff (the container for Members, Roles and Credentialing)

**3. Business purpose and scope.** One tab for the people side of configuration. It has three sub-tabs: **Staff Members**, **Role Dictionary** and **Credentialing Review**. A link such as `/configuration?tab=staff&section=roles` opens a sub-tab (`members`, `roles` or `credentialing`).

**4. Prerequisites and dependencies.** Opening Configuration needs `screen:configuration:open`. Each sub-tab checks its own capability.

Setup step: Reference, not part of setup
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Members](#screen-staff-members), [Roles](#screen-staff-roles), [Credentialing](#screen-staff-credentialing)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: tab-staff - Staff tab with its three sub-tabs]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Staff Members | Sub-tab | Not applicable | The people. See [Members](#screen-staff-members). | Selected |
| Role Dictionary | Sub-tab | Not applicable | The roles. See [Roles](#screen-staff-roles). | Not applicable |
| Credentialing Review | Sub-tab | Not applicable | Supervised-practice assignments. See [Credentialing](#screen-staff-credentialing). | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Each sub-tab's capability is on its own screen.
**Known limits.** None known.

### Participation Types {#screen-participation_types}
Breadcrumb: Home > Configuration > System > Clinical Lookups > Participation Types

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Clinical Lookups** > **Participation Types**
**2. Maintenance item:** Participation Types

**3. Business purpose and scope.** A participation type is the part a person plays on a case: primary pathologist, resident, consultant, grossing and so on. It is also where signing authority is decided: whether that part may issue the final report, whether the report needs a countersignature, whether the person sees the whole case, and whether more than one person can hold the part. Roles are then given the types their holders may serve as.

**4. Prerequisites and dependencies.** The per-facility sign-out authority section needs the facilities to exist. The Roles screen reads this list for its Case Participation tab, so set the types before the roles. Skip it and a role has no types to offer.

Setup step: Tier 1, step 2
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Roles](#screen-staff-roles), [Members](#screen-staff-members)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-participation_types - Participation type list with capability badges]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Placeholder "Search participation types". | Blank |
| Filter | Tabs, starting with All | Optional | | All |
| Type, Description, Capabilities, Status | Columns | Not applicable | Capabilities show as short badges: Finalise, Countersign, Template, Full View, Multi. A "built-in" badge marks system types. | Not applicable |
| Footer count | Text | Not applicable | "N active, M total". | Not applicable |
| + Add Type | Button | Not applicable | Opens the editor. | Not applicable |
| Edit, Duplicate | Row buttons | Not applicable | Duplicate opens a copy for editing. | Not applicable |

The product ships these system types: primary, resident, attending, grossing, cytotechnologist, consultant, frozen, second_opinion, provisional_hire, biomedical_scientist and bms_advanced_practitioner. System types cannot be deleted. For a built-in type you can edit the label, description and colour. The finalise flag of `primary` is locked.

#### Editor window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Label | Text | Required | Must be unique. Errors: "Label is required" and "A participation type named ... already exists". | Blank |
| Abbreviation | Text, up to 12 characters | Required | Must be unique. Shown on case headers and lists. | Blank |
| Description | Text | Optional | | Blank |
| Colour | Preset swatches or a custom colour | Optional | | `#8AB4F8` |
| Can Finalise / Sign Out | Yes/No switch | Optional | This role can issue the final signed report. | Off |
| Requires Countersign | Yes/No switch | Optional | Reports from this role must be countersigned by an attending. | Off |
| Can Use Report Template | Yes/No switch | Optional | This role can be assigned a report template for structured reporting. | Off |
| Can View Whole Case | Yes/No switch | Optional | Full case access including all specimens and prior reports. | Off |
| Allows Multiple Per Case | Yes/No switch | Optional | More than one person can hold the role on one case at once. | On |
| Status | Active / Inactive | Optional | | Active |
| Facility-Level Sign-Out Authority | One block per performing lab | Optional | Each lab inherits its jurisdiction's regulatory default, or the platform default. Override only for a local exemption or credentialing scheme. | Inherited |
| Requires Countersign at this lab, Can Finalise / Sign Out at this lab, Can View Whole Case at this lab | Yes/No overrides | Optional | Each shows its source: platform default, jurisdiction default, or "Overridden at facility level by name on date". **Revert to inherited default** removes the override on save. | Inherited |
| Justification | Text | Optional | Recorded in the audit log with the override. | Blank |

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, duplicate, override: `config:participation-types:manage` (high risk, audited; facility overrides are written to the audit log with the justification). Admin and Lab Director hold it by default.
**Known limits.** None known.

### Role Dictionary {#screen-staff-roles}
Breadcrumb: Home > Configuration > Staff > Role Dictionary

**Status:** Built

**1. Navigation:** Configuration tab **Staff** > sub-tab **Role Dictionary**
**2. Maintenance item:** Roles

**3. Business purpose and scope.** A role is a bundle of capabilities and a list of the participation types its holders may serve as. This screen is the permission matrix: you tick which capabilities each role holds, and you add roles of your own. It also holds the voice and keyboard command set for the role, which is a convenience and not access control.

**4. Prerequisites and dependencies.** The Case Participation tab lists the participation types, so set them first. Skip it and the tab offers no types. The roles are then chosen for people on the Members screen.

Setup step: Tier 1, step 3
Requires: [Participation Types](#screen-participation_types)
Unlocks: [Members](#screen-staff-members), [Support Access](#screen-support_access)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: staff-roles - Role Dictionary list with case and configuration access]

**6. Field reference.**

#### List page

**Permissions added in October 2026 (Batches 654 to 669).** Give these to the roles that need them: *Print a report during its release hold (supervisor override)* (Lab Director and Admin have it by default; used by the Release Hold Print Policy), `qa:management-review:submit`, `config:molecular-control-rules:view` (seeded to Administrator, Laboratory Director, Quality Reviewer and Molecular Technologist; changing the rules still needs the manage permission), `add-on:exception:flag` and `add-on:block:mark-retrieved` (offered once to Pathologist, Fellow, Resident, Histotechnologist and custom roles with case access), and `config:macros:manage` (replaces the role-name test for seeing every macro and creating Enterprise macros). A facility-limited person can now act on cases at their own facility (Batch 653); a case with no facility on record is still refused.

**Permissions added in Batch 731 (exhausted blocks and end states).** `material:end-state:record` (record a block's or slide's end state with a reason; seeded to roles with the Microtome or Slide Distribution screen), `material:reembed:request` (ask for an exhausted block to be re-embedded from Add-On Orders; Pathologist, Fellow, Resident) and `material:reembed:complete` (mark the block re-embedded at the Embedding Station; roles with the Embedding screen). Give them to any custom role that needs them.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Placeholder "Search roles". | Blank |
| Role | Badge and name | Not applicable | Marks built-in roles, and roles "managed by ForMedrixAI". | Not applicable |
| Description | Text | Not applicable | | Not applicable |
| Case Access | Yes/No | Not applicable | Whether the role works on cases. | Not applicable |
| Config Access | Yes/No | Not applicable | Whether the role opens Configuration. | Not applicable |
| Capabilities | Count (n of total) | Not applicable | | Not applicable |
| Commands | Bar | Not applicable | Voice and keyboard commands enabled. | Not applicable |
| Edit / View, Duplicate | Row buttons | Not applicable | A role you cannot change opens as View. Duplicate forces the copy to be a custom (not built-in) role. | Not applicable |

#### Role window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Name | Text | Required | | Blank |
| Colour | Colour picker | Optional | | `#8AB4F8` |
| Description | Text | Optional | | Blank |
| Case Access | Check box | Optional | | Off |
| Config Access | Check box | Optional | | Off |
| Capabilities tab | Check boxes, grouped | Optional | One box per capability. High-risk ones carry an **Audited** tag. A box shows "Needs" when it depends on another capability and "Needed by" when others depend on it. | None ticked |
| Commands tab | Check boxes | Optional | Voice and keyboard commands for the role. They do not control access. | Role defaults |
| Case Participation tab | Check boxes of active participation types | Optional | The types this role's holders may serve as. A Cytotechnologist role cannot hold pathologist types. | None |
| Action Reference tab | Read-only list | Not applicable | A cheat sheet of the actions. | Not applicable |

Save is refused, with a message, in these cases: you lack permission; a capability is not valid; the change would put `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve` together on one role, or on a role held by one person (separation of duties); the change would leave no assignable role with `config:roles:manage` (at least one must keep it); the role is Superadmin (read-only); or a Cytotechnologist role is given a pathologist participation type. A change to a role's capabilities is written to the audit log as "Role capabilities changed".

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, duplicate: `config:roles:manage` (high risk, audited). Admin and Superadmin hold it by default. Lab Director does not.
**Known limits.** Superadmin cannot be changed by a hospital. A custom role starts with no configuration capabilities, so tick the ones its people need.

### Members {#screen-staff-members}
Breadcrumb: Home > Configuration > Staff > Staff Members

**Status:** Built

**1. Navigation:** Configuration tab **Staff** > sub-tab **Staff Members**
**2. Maintenance item:** Members

**3. Business purpose and scope.** The record of each person who works in PathScribe: name, contact details, roles, the facilities they work at, professional identifiers, signature, sign-in password and status. Roles decide what they can do. Facilities limit where those capabilities apply.

**4. Prerequisites and dependencies.** The Facilities list reads the Facility Dictionary and the Role list reads the Roles screen. Subspecialties come from the subspecialty dictionary in [Subspecialties](#screen-subspecialties). Skip the roles and a person cannot be saved: at least one role is required.

Setup step: Tier 1, step 5
Requires: [Facility Dictionary](#screen-facility-dictionary), [Roles](#screen-staff-roles)
Unlocks: [Credentialing](#screen-staff-credentialing), [Session Security](#screen-session_security), [Support Access](#screen-support_access)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: staff-members - Staff list grouped by primary role]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Matches name, email, credentials, NPI, GMC number, licence and phone. | Blank |
| Role filter | Picklist of roles (Physician is excluded) | Optional | A "No Matching Role" group shows people whose role no longer exists. | All |
| Staff Member | Name, credentials, badges | Not applicable | Peds and Orch badges, and "+N" for extra roles. Grouped by primary role, with a count. | Not applicable |
| Email, Role, Subspecialties, Status | Columns | Not applicable | | Not applicable |
| Add Staff | Button | Not applicable | Needs `config:staff-access:assign`. | Not applicable |

#### Editor window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| First name, Middle name, Last name | Text | Required by Field Requirements | See the note below the table. | Blank |
| Email | Text matching name@domain.tld | Required by Field Requirements | Checked with the pattern `\S+@\S+\.\S+`. | Blank |
| Role(s) | Check boxes | Required | At least one. Physician and roles that cannot be assigned are not offered. Locked without `config:staff-access:assign`. | None |
| Phone | Text | Optional | | Blank |
| Subspecialties | Picklist from the subspecialty dictionary | Optional | | None |
| Credentials | Text | Optional | For example MD. | Blank |
| NPI | Text | Optional | United States provider number. | Blank |
| GMC Number | Text | Optional | United Kingdom registration number. | Blank |
| License Number | Text | Optional | | Blank |
| Voice Profile | Choice from the voice profiles | Optional | | Blank |
| Spelling language | Choice of languages | Optional | The language used for this person's spell check. | Blank |
| Cytology QC reviewer pools | Text, comma-separated role codes, forced to upper case | Optional | | Blank |
| Facilities | Check boxes | Optional | Empty means all facilities. It limits where the person's capabilities apply. It does not change which cases they can open. Since Batch 653 the limit also applies to case-level actions, using the case's ordering facility; a case with no facility on record is still refused for a facility-limited person, so fix the order's facility. A person with no facility limit sees no change. | Empty (all) |
| Pediatric Access | Yes/No switch | Optional | Needs `config:staff-access:assign`. | Off |
| Orchestration Access | Yes/No switch | Optional | Needs `config:staff-access:assign`. | Off |
| Quick Auth PIN | Four digits | Optional | Shown only when the person holds the OR Staff role. | Blank |
| Jurisdictional credentials | Rows | Optional | Each row: Type (IBMS_ASD, UK_HO_REGISTERED_FORENSIC_PATHOLOGIST, MEDICOLEGAL_APPOINTMENT, NL_KCA_ADVANCED, DE_ZYTO_ASSISTENT_ADV), Issuing body, Jurisdiction, Effective date (required), Expiry date (optional, not before the effective date). | None |
| Sign-in password | Text, 12 to 128 characters | Optional | Edit only. Refused if breached, common or patterned. Options: "must change at next sign-in", and remove. Needs `config:staff-password:manage`. Setting it also closes any open reset request from that person (see Known limits). | None |
| Linked sign-in accounts | List | Not applicable | Edit only. **Unlink** removes a link to an outside identity. | None |
| Status | Active / Inactive switch | Optional | | Active |
| Signature image link | https link | Optional | Preview is shown. PathScribe stores the link, not the image. | Blank |

Which of first name, middle name, last name, role, subspecialties, facilities, email, phone, credentials, NPI, GMC number, licence and signature are required is set on [Field Requirements](#screen-field_requirements), page **Staff**. Role is always required.

Saving checks the capabilities above and refuses a change that breaks separation of duties. Changing roles, facilities or the access flags writes "Staff access changed" to the audit log. Changing credentials writes "Staff credentials changed".

**7. Permissions.** Open: `screen:configuration:open`. Edit the record: `config:staff:edit`. Roles, facilities, access flags and credentials: `config:staff-access:assign` (needs `config:staff:edit`). Passwords: `config:staff-password:manage`. All high risk. Admin and Superadmin hold them by default.
**Known limits.** The Quick Auth PIN is for the OR Staff role only. **Reset requests (demonstration, password sign-in only).** On the sign-in screen a person who forgot their password selects **Forgot password?**, then **Ask my administrator to reset my password**. PathScribe writes "PASSWORD_RESET_REQUESTED" to the audit log and sends an urgent message to every other active staff member who holds `config:staff-password:manage`. The message names the person and email and its link opens their Staff record. Open the record, use **Sign-in password**, set a temporary one and tick "must change at next sign-in". The request is then marked handled: each administrator's message gets a reply "Handled: a new sign-in password was set in Staff" and the audit log records "PASSWORD_RESET_REQUEST_HANDLED". The same confirmation shows whether or not the email has an account, one request per email is accepted every 10 minutes, and an email with no active staff record is audited but sends nothing. Confirm the person's identity before you pass the password on. Not built: a handled flag on the message itself, a list of open requests on the Staff screen, and any notice outside PathScribe (email or text). With single sign-on there is no PathScribe password and no request action; the identity provider resets it.

### Delegation Types {#screen-delegation_types}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delegation Types

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **Delegation Types**
**2. Maintenance item:** Delegation Types

**3. Business purpose and scope.** A delegation type is a named way to hand a case or report to someone else: reassign it, send it to a pool, ask for a second opinion, send it for teaching review. Each type says whether ownership moves, whether a note is needed and whether several people can receive it.

**4. Prerequisites and dependencies.** The Performing Lab choice reads the Facility Dictionary. Skip it and only **All Labs** is offered.

Setup step: Tier 1, step 4
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Field Requirements](#screen-field_requirements)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-delegation_types - Delegation type list with lab filter]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Lab filter | Picklist: All, Global, or a lab | Optional | Narrows the list. | All |
| Label | Text | Required | | Blank |
| ID | Text, upper case, up to 24 characters | Required | Derived from the label as you type. Locked after the type is created. | Derived |
| Description | Text | Required | | Blank |
| CPT Hint | Text | Optional | | Blank |
| Performing Lab | Picklist | Optional | | All Labs |
| Accent colour | Preset swatches | Optional | | First preset |
| Active | Yes/No switch | Optional | | On |
| Transfers Ownership | Yes/No switch | Optional | | Off |
| Requires Note | Yes/No switch | Optional | The sender must write a note. | Off |
| Allows Multiple Recipients | Yes/No switch | Optional | | Off |
| Delete | Row button | Not applicable | Custom types only. Asks Yes or No. | Not applicable |

The product ships seven system types: REASSIGN, POOL, SECOND_OPINION, CASUAL_REVIEW (inactive), TUMOR_BOARD (inactive), TEACHING and CONSULT_EXT. A system type allows only the active toggle. Custom types can be edited and deleted.

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, delete, toggle: `config:delegation-types:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** The screen's subtitle says a system type can be "duplicated into a new custom type", but no Duplicate button exists. To make a variant, add a new type.

### Credentialing {#screen-staff-credentialing}
Breadcrumb: Home > Configuration > Staff > Credentialing Review

**Status:** Built

**1. Navigation:** Configuration tab **Staff** > sub-tab **Credentialing Review**
**2. Maintenance item:** Credentialing

**3. Business purpose and scope.** Two kinds of supervised-practice assignment. A **Focused Professional Practice Evaluation (FPPE)** pairs a newly hired pathologist with a proctor until a set number of cases or days has been reviewed. A **cytotechnologist competency** assignment pairs a new cytotechnologist with a supervisor until a number of assessments is done. Both appear as Active and Completed tables with a facility filter.

**4. Prerequisites and dependencies.** The people picked must already exist on [Members](#screen-staff-members), and the lab on [Facility Dictionary](#screen-facility-dictionary). Skip them and the pickers are empty.

Setup step: Tier 1, step 6
Requires: [Facility Dictionary](#screen-facility-dictionary), [Members](#screen-staff-members)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: staff-credentialing - FPPE and cytotechnologist competency assignment tables]

**6. Field reference.**

#### FPPE assignment

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Provisional Hire | Picklist of staff | Required | The person being evaluated. | None |
| Proctor | Picklist of staff | Required | Must be a different person. | None |
| Performing Lab | Picklist | Required | | None |
| Subspecialty scope | Picklist | Optional | Limits the review to one subspecialty. | All |
| Review ends on | Choice: case count, duration, either | Required | | Either |
| Case count | Whole number | Required when used | Must be above 0. | 20 |
| Duration | Whole number of days | Required when used | Must be above 0. | 90 |
| Graduate Now | Row button | Not applicable | Ends the review early. | Not applicable |
| Facility filter | Picklist | Optional | Filters both tables. | All |

#### Cytotechnologist competency assignment

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| New Cytotechnologist | Picklist of staff | Required | | None |
| Supervisor | Picklist of staff | Required | | None |
| Performing Lab | Picklist | Optional | | None |
| Subspecialty scope | Picklist | Optional | | All |
| Assessments required | Whole number | Required | | 2 |

**7. Permissions.** Open: `screen:configuration:open`. FPPE: `config:fppe:manage`. Cytotechnologist competency: `config:cytotech-competency:manage`. Both high risk, audited. Admin and Lab Director hold them by default.
**Known limits.** The cytotechnologist competency table shows dates in the browser's own format, not the display language.

### Session Security {#screen-session_security}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Session Security

**Status:** Partial

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **Session Security**
**2. Maintenance item:** Session Security

**3. Business purpose and scope.** Four organisation-wide controls on how people prove who they are: the idle sign-out time, biometric re-checks, second-factor (MFA) policy, and the sign-out authentication policy for signing reports. A performing facility can override the idle time (on the facility's AI & Performance tab) and the sign-out policy.

**4. Prerequisites and dependencies.** The facility overrides and the enrolment table read the Facility Dictionary and the staff list. Skip them and the overrides table is empty, but the organisation defaults still work.

Setup step: Tier 1, step 7
Requires: [Facility Dictionary](#screen-facility-dictionary), [Members](#screen-staff-members)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-session_security - Idle timeout, biometric, MFA and sign-out policy cards]

**6. Field reference.**

#### Idle timeout

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Organisation default | Choice: 5, 10, 15, 20, 30, 60 minutes | Required | Saves when you change it. A warning shows 60 seconds before sign-out. A facility override replaces it for that lab. | 15 minutes |

#### Biometric policy

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Enabled | Yes/No switch | Optional | A deployment can force it off. | Off |
| Cadence | Choice: per_sign_off, per_session, per_days, never | Optional | How often to re-check. | per_sign_off |
| Days | Whole number, 1 to 365 | Required for per_days | | 30 |

#### MFA policy

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Mode | Choice: off, signing_roles, all | Required | Who must use a second factor. | off |
| Step-up minutes | Whole number, 1 to 720 | Optional | How long a second-factor check stays valid. | 30 |
| Session hours | Whole number, 1 to 72 | Optional | | 12 |
| Enrolment table | List with **Reset enrolment** | Not applicable | Reset needs `auth:mfa-enrolment:reset`. | Not applicable |

**On a server build (Batch 675).** The policy is read from and saved to the API server, which checks `config:session-security:manage` itself and writes `MFA_POLICY_ENABLED`, `MFA_POLICY_DISABLED` and `MFA_STEPUP_CHANGED` to the audit log with the old and new values. If the policy cannot be read at sign-in, nobody is let in (the "sign-in service unavailable" message appears). **Known limit:** the two server routes (`/api/session-security/mfa-policy/get` and `/save`) are specified in `ACCESS_SESSION_API.md` but not built, so a live build cannot yet load or save the policy, and the server does not yet enforce it on API requests. Only Microsoft Entra ID, Okta and Keycloak have documented set-up notes (`MFA.md`).

#### Sign-out policy

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Enterprise default | Choice: strict, session | Required | How a report is authenticated at sign-out. | strict |
| Timeout | Choice: 15, 30, 60, 240 minutes | Optional | | 30 minutes |
| Second factor | Yes/No switch | Optional | | Off |
| Lock facility overrides | Yes/No switch | Optional | Stops a facility changing the policy. | Off |
| Per-facility overrides | Table, one row per performing facility | Optional | | Inherit |
| Export | CSV button | Not applicable | | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:session-security:manage` (high risk, audited). Reset an MFA enrolment: `auth:mfa-enrolment:reset`. Admin and Lab Director hold the first. Only Admin and Superadmin hold the second.
**Known limits.** The authenticator is simulated in the demonstration. With single sign-on, the identity provider asks for the second factor. The sign-out policy screen says restricting remote sign-out needs the API server and is deferred. The screen warns that sign-out authentication relates to 21 CFR Part 11 (11.200); the control sets what is asked, and does not make a lab compliant by itself.

### Support Access {#screen-support_access}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Support Access

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **Support Access**
**2. Maintenance item:** Support Access

**3. Business purpose and scope.** You decide whether ForMedrixAI support may reach your organisation's data. The screen sets the policy, shows requests waiting for approval and active access, and keeps a separate record of everything support did. "Support access" means a Superadmin session reaching an organisation the person is not staff of. Your own users are never affected.

**4. Prerequisites and dependencies.** Someone must be able to approve: a member of your organisation who holds `config:support-access:approve`, who is not the person asking. Set up roles and people first. If nobody can approve and the policy is Approval required, requests wait unanswered.

Setup step: Tier 1, step 8
Requires: [Roles](#screen-staff-roles), [Members](#screen-staff-members)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-support_access - Policy, pending requests, active access and support activity]

**6. Field reference.**

#### Policy

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Support access policy | Choice: Disabled, Approval required, Always allowed | Required | Disabled: support cannot open, list or search your data. Approval required: support asks per ticket with a reason, and an approver approves. Always allowed: no request needed, everything is still recorded. | Approval required |
| Access window | Choice: 30 minutes, 1, 2, 4, 8 hours | Required | How long an approval lasts. Support or you can end it sooner. | 2 hours |
| Save policy | Button | Not applicable | | Not applicable |

#### Requests and active access

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Waiting for approval | Table | Not applicable | Columns: Support agent, Ticket, Reason, Requested. Buttons **Approve** and **Reject**. You cannot approve your own request. | Not applicable |
| Active support access | Table | Not applicable | Columns: Support agent, Ticket, Approved by, Time left. Button **Revoke**. | Not applicable |

#### Support activity

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Audit table | Table | Not applicable | Columns: Timestamp, Support agent name, Originating IP, Originating country, Ticket ID, Action taken, Case IDs, Detail. Each entry is chained to the one before by a hash, so a changed or removed entry shows as "Record altered at entry N". | Not applicable |
| Export CSV, Export JSON, Export PDF | Buttons | Not applicable | Needs `config:support-audit:view`. | Not applicable |

#### [FORMEDRIXAI INTERNAL ONLY] Request support access panel {#screen-support_access-request}

> 🔒 **ForMedrixAI Internal Restricted Setting**
> **Scope:** Internal Service & Deployment Personnel Only.
> **Explanation:** This panel appears only for a Superadmin session, which is a ForMedrixAI support login. It opens a ticket-bound window onto a customer organisation's data. A customer administrator never sees it, and a change here by anyone but support would let a person reach protected health information without the customer's approval.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Organisation | Picklist | Required | The customer to reach. | None |
| Support ticket ID | Text | Required | For example SUP-1234. | Blank |
| Reason | Text, at least 10 characters | Required | What needs looking at and why. | Blank |
| Request access, End access | Buttons | Not applicable | | Not applicable |
| Ticket closed (simulated) | Button | Not applicable | Simulates the ticketing system closing the ticket: ends access and records it. No ticketing system is connected. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Set policy and window: `config:support-access:policy`. Approve, reject, revoke: `config:support-access:approve`. See and export the audit: `config:support-audit:view`. All high risk. Admin and Superadmin hold them by default. The approver must belong to the organisation and cannot be the requester, even though a Superadmin holds every capability.
**Known limits.** The browser version is complete, but the server side is not connected: the policy gate, ticket-bound sessions, the append-only audit table, notification of approvers and the PDF export are specified in `AUTHORIZATION_API.md` and not yet built. Notification email is simulated. The originating IP and country in the audit can only be recorded truthfully by the server, so in the browser version they are not real.

## Part C: Workstation, Printer, Label Generator and Scanner Mappings {#ch2-hardware}
Breadcrumb: Home > Configuration > System > Workstation & Hardware

This part covers the physical side: the register of devices, the printers and the program that drives them, the benches that scan and print, and the rules for labels. Most of these screens are in the **Workstation & Hardware** group, which shows a shared **Facility** selector above the sidebar. Choose a site there once and Print Settings, Printer Profiles, Scan Stations, Site agents, Equipment and Grossing Hardware all show that site. Workstation Groups is in the **Lab Materials & Workflows** group.

**Suggested order.** Register the devices first (Equipment), then say what each printer can do (Printer Profiles), then install and configure the site agent, then name the benches (Scan Stations), then set the print rules and the label layouts, then register computers and group the benches.

**What a label needs.** A printed label goes through four things. Print Settings picks the label size, barcode type and printer profile. Label Designer lays out the fields. Printer Profiles says how a browser reaches the printer. The Facility editor's Printing tab and the site agent say where reports and labels go on the site's network. With no API server, nothing reaches a real printer: each print is recorded on the [Simulated print log](#screen-simulated_print).

### Equipment {#screen-equipment}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Equipment

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Equipment**
**2. Maintenance item:** Equipment

**3. Business purpose and scope.** One register of every device in the lab: analysers, stainers, tissue processors, slide scanners, cameras, scales, label printers, engravers and storage units. Each item belongs to one performing lab and can sit at one scan station. Other screens point at the register: a printer profile links to a label printer, grossing hardware links to a camera or scale, and a molecular batch targets an active analyser. A service log records maintenance, calibration and malfunctions.

**4. Prerequisites and dependencies.** The Performing Lab list reads the Facility Dictionary, and the Scan Station list reads [Scan Stations](#screen-scan_stations) for that lab. Skip the facility and the item cannot be saved. The scan station is optional and can be set later.

Setup step: Tier 1, step 9
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Printer Profiles](#screen-printer_profiles), [Grossing Hardware](#screen-grossing_hardware)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-equipment - Equipment register with kind and status filters]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Name, code, make, model or serial number. | Blank |
| Kind filter | Picklist: All kinds, or one kind | Optional | | All kinds |
| Status filter | Tabs, starting with All | Optional | | All |
| Columns | Equipment, Code, Kind, Make and Model, Performing Lab, Scan Station, Service, Settings, Status, Actions | Not applicable | Service shows Up to date, Due soon, Overdue, Not yet done, Not scheduled or Malfunction, with the next due date. Settings links to the printer profile or grossing hardware record that uses the device. | Not applicable |
| + Add Equipment, Edit, Log, Deactivate / Reactivate | Buttons | Not applicable | Deactivate, not delete, because batches and printed labels carry the code. | Not applicable |

#### Add and edit window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Code | Text, letters, numbers, "_" and "-" | Required | The ID other records carry, for example PANTHER_02 on a molecular batch and its deck barcode. Must be unique. Cannot be changed after creation. | Blank |
| Name | Text | Required | | Blank |
| Kind | Choice: Analyser, Stainer, Tissue processor, Liquid-based cytology processor, Slide scanner, Camera, Scale, Label printer, Engraver, Storage unit, Other | Required | Active analysers are what molecular batches can target. | Analyser |
| Make, Model | Text | Optional | | Blank |
| Serial Number | Text | Optional | | Blank |
| Performing Lab | Picklist | Required | Changing it clears the scan station. | Selected site |
| Scan Station | Picklist of stations in that lab | Optional | Where it sits. For an analyser, worklist dispatch checks it is sent from this station. A station in another lab is refused. | None |
| Calibration Every (days) | Whole number, 1 to 3650 | Optional | Blank means no schedule. Due dates count from the last passing entry in the service log. | Blank |
| Maintenance Every (days) | Whole number, 1 to 3650 | Optional | Same rule. | Blank |
| Lowest temperature (°C), Highest temperature (°C) | Numbers, lowest below highest; either may be blank | Optional | Batch 730: the range a Temperature check in the Equipment Log is held to. A reading outside it is a Fail; the range is copied onto each entry when it is made. | Blank |
| Takes large-format slides | Tick box, stainers and slide scanners only | Optional | Batch 732: the device takes large-format (megablock) slides. Slide Distribution sends a large-format slide only to a scanner with this ticked. | Not ticked |
| Status | Active / Inactive | Optional | | Active |
| Deck layout | Rows, analysers only | Optional | The slots on the analyser's deck. Each row: Deck or bay, Slot ID (letters, digits, "_", no two alike), and Takes (Extraction plate, Reagent cartridge, Sample tube rack; at least one). Rack Loading offers only slots that fit. The slot ID is printed on the deck-position barcode. | None |

#### Service log window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| History | Table: Date, Type, Outcome, By, Notes | Not applicable | Entries cannot be changed or deleted. Correct a mistake with a new entry. An "Open malfunction" note shows until a passing repair or function check is recorded. | Not applicable |
| Type | Choice: Maintenance, Calibration, Function check, Repair, Malfunction | Required | | Maintenance |
| Date Done | Date | Required | Cannot be in the future. | Today |
| Done By | Text | Required | Staff member or service engineer. | Your name |
| Outcome | Choice: Pass, Fail, Not applicable | Required | | Pass |
| Notes | Text | Required for a failure or malfunction | | Blank |

#### Staining racks

Batch 737. Shown below the register when the lab has reusable staining racks (engraved RACK- ids). Each row is a rack with the tick box **Takes large-format slides**, saved at once (needs `config:equipment:manage`). Batch Management refuses a large-format slide (cut from a megablock) scanned onto a staining carrier that does not take large-format slides; a disposable staining carrier takes them when **Takes large-format slides (megablocks)** is ticked in New Container. The demo has one such rack, RACK-STAIN-LF-01.

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, deactivate: `config:equipment:manage`. Record a service log entry: `equipment:maintenance:record`. Both high risk. Admin and Lab Director hold both. The Histotechnologist, Cytotechnologist and Molecular Technologist roles also hold the log permission.
**Known limits.** Service due dates are worked out in the facility's time zone on the Contribution Dashboard settings.

### Printer Profiles {#screen-printer_profiles}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Printer Profiles

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Printer Profiles**
**2. Maintenance item:** Printer Profiles

**3. Business purpose and scope.** A printer profile records what a label printer can really do (resolution, DataMatrix and GS1 support, module size) and how a browser reaches it (the bridge). PathScribe uses it to pick the right label template and to refuse a job the printer cannot handle before it is sent.

**4. Prerequisites and dependencies.** The Register Device list reads [Equipment](#screen-equipment) and offers label printers only. The Facility list reads the Facility Dictionary. Skip Equipment and the profile still saves, but is not linked to a device. A device that is not a label printer is refused: "The register device must be a label printer."

Setup step: Tier 1, step 10
Requires: [Facility Dictionary](#screen-facility-dictionary), [Equipment](#screen-equipment)
Unlocks: [Print Settings](#screen-print_settings), [Scan Stations](#screen-scan_stations), [Label Designer](#screen-label_designer)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-printer_profiles - Printer profile table]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Columns | Printer ID, Model, Vendor, Bridge, Facility, Register Device, DPI, GS1 / DataMatrix, Status, Actions | Not applicable | GS1 / DataMatrix shows Both, DataMatrix only, GS1 only, or a dash. A shared printer shows "Global". | Not applicable |
| + Add Printer Profile, Edit, Duplicate, Remove | Buttons | Not applicable | Remove deletes the profile. | Not applicable |

#### Add and edit window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Printer ID | Text | Required | For example ZEBRA-192.168.12.85. | Blank |
| Model | Text | Required | For example ZT411. | Blank |
| Vendor | Choice: Zebra (ZPL), Citizen, SATO, Leica CEREBRO, Sakura Tissue-Tek, Other | Optional | | Zebra (ZPL) |
| ZPL Version | Text | Optional | For example 7.0. | Blank |
| Bridge Type | Choice: QZ Tray, Zebra Browser Print, BarTender Automation, Direct via Interface Engine, PathScribe Agent, OS Print Dialog | Required | How a browser reaches the printer at this site. Only QZ Tray sends labels today. **Zebra Browser Print and BarTender Automation are Planned**: the choice is saved but no Zebra or BarTender connection is built. The PathScribe Agent and Direct via Interface Engine need server-side parts that do not exist yet. | OS Print Dialog |
| Agent Port | Whole number, 1024 to 65535 | Optional | Shown for the PathScribe Agent bridge. Leave empty unless IT moved the agent off its standard ports (9100 to 9102). | Blank |
| Facility | Picklist, or Global | Optional | A shared network printer used from several sites has no single owner: leave on Global. | Selected site, or Global |
| Register Device | Picklist from Equipment | Optional | The physical printer. | Not linked |
| DPI | Whole number | Required | | 300 |
| Max Print Density | Whole number | Required | | 300 |
| DataMatrix Module Size | Whole number, in dots | Required | Affects scannability at this printer's resolution. | 4 |
| IP Address | Text | Optional | For example 192.168.12.85. | Blank |
| Port | Whole number | Optional | | 9100 |
| Supports DataMatrix | Yes/No switch | Optional | | On |
| Supports GS1 | Yes/No switch | Optional | | On |
| Active | Yes/No switch | Optional | | On |

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, duplicate, remove: `config:printers:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** Only a profile on the QZ Tray bridge actually sends labels today. Any other bridge falls back to the browser print dialog.

### Site agents {#screen-site_agents}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Site agents

**Status:** Partial

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Site agents**. Choose a site in the Facility selector first.
**2. Maintenance item:** Site agents

**3. Business purpose and scope.** A site agent is a PathScribe program installed on a site's network. It prints reports and labels to the site's printers and writes and picks up files on the site's network shares. This screen enrols agents, sets which printers and shares an agent may use, revokes an agent, and sets the time window in which it may update itself.

**4. Prerequisites and dependencies.** An agent belongs to a performing lab, so add the facility first. The screen shows "Choose a site (a performing lab)" until you pick one. Printer ids set here are the destination ids that Workstations and the Facility editor's Printing tab refer to.

Setup step: Tier 1, step 11
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Workstations](#screen-workstations), [Scan Stations](#screen-scan_stations)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-site_agents - Agents, agent printers, file shares and update window]

**6. Field reference.**

#### Agents

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| New enrolment code | Button | Not applicable | Makes a one-time code to enter when installing the agent. It expires, is shown once, and can be copied. Needs `config:site-agents:enroll`. | Not applicable |
| Agents table | Machine, Status, Version, Last checked in, Certificate expires, Printers, Actions | Not applicable | Status is Online, Needs attention, Offline or Revoked. Printers shows "N of M reachable". | Not applicable |
| Revoke | Row button | Not applicable | Cuts the agent off at once. | Not applicable |
| Reason for revoking | Choice: May be compromised, Enrolled by mistake, Moved to another site, Machine replaced, Machine retired, Other | Required | | None |
| Note | Text, up to 500 characters | Required for Other | | Blank |

#### Agent printers

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Printer id | Text | Required | Must be unique at the site. | printer-1, printer-2 and so on |
| Name | Text | Optional | | Blank |
| Kind | Choice: Report, Label | Required | Label printers use Raw 9100 only. | Report |
| Protocol | Choice: Raw 9100, LPR, IPP, IPPS (confirms printing) | Required | IPPS is preferred: the printer confirms each report. Raw 9100 and LPR can only confirm it was sent. | IPPS |
| Address | IP address or host name | Required | IPv6 is not supported yet. | Blank |
| Port | Whole number, 1 to 65535 | Required | | By protocol: 9100, 515, 631 |
| LPR queue | Text | Optional | Shown for LPR. | Blank |
| IPP path | Text | Optional | Shown for IPP and IPPS. | Blank |
| Add printer, Remove | Buttons | Not applicable | Add needs `config:site-agent-config:manage`. | Not applicable |

#### File shares

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Direction | Write or Pickup | Required | Set by **Add write share** or **Add pickup share**. | By button |
| Share id | Text | Required | Must be unique at the site. | share-1, share-2 |
| Share path | Text such as \\server\share\folder | Required | | Blank |
| File pattern | File name pattern such as *.hl7 | Required for pickup | A name only, no folders. PDFs and images are not picked up: they stay links. | Blank |
| Unchanged for (s) | Whole number of seconds | Required for pickup | At least 5 seconds. | 30 |
| Largest file (MB) | Whole number, 1 to 500 | Required for pickup | | 50 |
| After hand-over | Choice: Move to "processed", Delete | Required for pickup | Deleting clinical files is not recommended. | Move to processed |
| Hand to | Choice: PathScribe import (Orders or Results), Interface engine channel | Required for pickup | | Interface engine channel |
| Engine channel | Text, with suggestions | Required for a channel | | Blank |
| Refused files go to | Folder name of letters, numbers, spaces, - or _ (up to 64 characters) | Required for pickup | | rejected |
| Credential entry name | Text | Optional | The name of the entry that holds the share password. Passwords are never entered in PathScribe. | Blank |

#### Agent updates

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Update window from, to | Time such as 02:00, in the site's local time | Optional | Give both times or neither. They cannot be equal. The window may cross midnight. With no window the agent updates when the server says. | No window |
| Save printers and shares, Discard | Buttons | Not applicable | The agent picks up a saved change at once. An "Unsaved changes" note shows until you save. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Enrol and revoke agents: `config:site-agents:enroll`. Printers, shares, update window: `config:site-agent-config:manage`. Admin and Lab Director hold them by default.
**Known limits.** In the demonstration no agent can enrol, so the agents list is empty. You can still make a code and set up printers and shares. Production uses the server contract in `SITE_AGENT_API.md`. The agent refuses any printer outside the subnets and ports your IT allowed on its machine.

### Scan Stations {#screen-scan_stations}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Scan Stations

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Scan Stations**
**2. Maintenance item:** Scan Stations

**3. Business purpose and scope.** The physical benches a terminal can identify itself as, at sign-in and in the top bar, and that a printed station label switches to mid-workflow. Eight stations are set up to start with. Name, barcode code and workflow stage are yours to set. Equipment can sit at a station, and Workstation Groups group stations.

**Who sees which station.** A person is offered only the active stations at the facilities on their staff record (Staff > Facilities). An empty list means all facilities, which is also how a ForMedrixAI support sign-in resolves, so they see every station. "No station" is always offered. If the station stored on a computer belongs to a facility the signed-in person is not assigned to, it counts as no station for them and the sign-in station window appears again; the stored setting is kept for the next person. A station barcode scan for such a station is refused. This is a screen rule today; the production API server must apply the same rule when it records a scan.

**4. Prerequisites and dependencies.** The Facility list reads the Facility Dictionary (performing labs only). A station that supports printing needs a cassette and slide printer profile from [Printer Profiles](#screen-printer_profiles). Skip it and the save is refused: "Required when Supports Printing is on."

Setup step: Tier 1, step 12
Requires: [Facility Dictionary](#screen-facility-dictionary), [Printer Profiles](#screen-printer_profiles)
Unlocks: [Print Settings](#screen-print_settings), [Workstation Groups](#screen-workstation_groups), [Grossing Hardware](#screen-grossing_hardware)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-scan_stations - Scan station list with Print Label and Print All Active Station Labels]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Name or barcode code. | Blank |
| Status filter | Choice: All, Active, Inactive | Optional | | All |
| Columns | Station, Barcode Code, Facility, Workflow Stage, Status, Actions | Not applicable | | Not applicable |
| Print Label, Print All Active Station Labels | Buttons | Not applicable | Print the station's barcode label. | Not applicable |
| + Add Scan Station, Edit, Deactivate / Reactivate | Buttons | Not applicable | Deactivate, not delete. | Not applicable |

#### Add and edit window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Station Name | Text | Required | For example Grossing Station 4. | Blank |
| Barcode Code | Text | Required | Printed on the station's label as `STATION:` plus the code. For example GROSSING-04. | Blank |
| Facility | Picklist of performing labs | Required | The lab the bench is in, not a referring facility. | Selected site |
| Workflow Stage | Choice: Accessioning, Grossing, Decal / Special Processing, Processing, Embedding, Microtome / Sectioning, Staining, Slide Distribution, Checkout, External Referral, Cytology Processing, Cytology Staining, Cytology Imaging, Slide Archival, Other | Required | Batch 726: the stage decides which carriers the station's workstation lists and opens (Slide Distribution works on Checkout and External Referral carriers). Set it on every bench that scans carriers. Without a station on a computer, nothing scanned there is recorded. | Accessioning |
| Printer IP | Text | Optional | The network label printer on this bench. Separate from the printer profile. | Blank |
| Supports Engraving | Yes/No switch | Optional | Engraving hardware such as Leica CEREBRO. Sending to the engraver is a placeholder until the vendor integration is built. | Off |
| Supports Printing | Yes/No switch | Optional | Prints GS1 DataMatrix cassette and slide labels here. | Off |
| Cassette/Slide Printer Profile | Picklist of printer profiles | Required when Supports Printing is on | | None |
| Status | Active / Inactive | Optional | | Active |

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, deactivate: `config:scan-stations:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** Sending to an engraver is a placeholder.

### Print Settings {#screen-print_settings}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Print Settings

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Print Settings** (the section the System tab opens on)
**2. Maintenance item:** Print Settings

**3. Business purpose and scope.** The default label-printing behaviour for the lab: print each cassette label as it is logged, or in a batch; the label sizes; the barcode type and prefixes; which printer profile each kind of label goes to; and the physical layout of cassette and slide labels. With no Facility chosen you edit the system default. Choosing a facility shows its settings: until you create an override it inherits the system default and is read-only. **+ Create Facility Override** copies the default so the facility can differ, and **Revert to System Default** removes the override. A facility keeps only the fields it wants to differ on.

**4. Prerequisites and dependencies.** The three printer profile pickers read [Printer Profiles](#screen-printer_profiles). Skip them and each offers only "Use browser print dialog". The facility selector reads the Facility Dictionary.

Setup step: Tier 1, step 13
Requires: [Facility Dictionary](#screen-facility-dictionary), [Printer Profiles](#screen-printer_profiles), [Scan Stations](#screen-scan_stations)
Unlocks: [Label Designer](#screen-label_designer)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-print_settings - Print Settings cards with the facility override banner]

**6. Field reference.** Every control saves as you change it. A "Saving" note shows while it saves.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Default Print Behavior | Choice: On-Demand (per block or container), Batch (per case or order) | Required | On-Demand prints each cassette label as it is logged during grossing. Batch defers printing to one per-case action. | On-Demand |
| Enforce On-Demand Guardrails | Yes/No switch | Optional | When on, the default is fixed lab-wide and accessioners cannot switch a case to Batch. | Off |
| Require Scan Verification | Yes/No switch | Optional | Requires scanning the new cassette or container barcode before moving to the next block. | Off |
| Ask for a reason when a report is reprinted | Yes/No switch | Optional | A reprint of a printed report needs a reason, kept in the audit log with the print. | Off |
| Container Label Size | Choice of label size presets (full-page requisition sizes are not offered) | Required | Standard Specimen (CLSI AUTO12, 2.0 by 1.0 in), Secondary Cassette/Slide Overlay (1.0 by 0.25 in), Medium Container (3.0 by 2.0 in), Large Surgical Container (4.0 by 2.0 in), Requisition Sticker (4.0 by 2.0 in), Requisition / Transport Pouch (4.0 by 6.0 in). | Standard Specimen |
| Requisition Label Size | Choice of every preset, including Full-Page Requisition US Letter and A4 | Required | The requisition sticker sheet. | Requisition / Transport Pouch (4.0 by 6.0 in) |
| Container Label Printer Profile | Picklist of profiles, or Use browser print dialog | Optional | With a QZ Tray profile, container labels go straight to that thermal printer. | Use browser print dialog |
| Molecular Label Printer Profile | Same | Optional | For molecular plate, rack, specimen and deck location labels. | Use browser print dialog |
| Requisition Label Printer Profile | Same | Optional | For the requisition sticker sheet. | Use browser print dialog |
| Container Barcode Symbology | Choice: Code 128 (1D), QR Code (2D), DataMatrix (2D) | Required | Applied to Batch Management's Master Batch Barcode labels. | Code 128 |
| Disposable Label prefix | Text, up to 12 characters, upper case | Required | Printed as prefix-TYPE-YYYYMMDD-XXXX. | CONT |
| Reusable Rack prefix | Text, up to 12 characters, upper case | Required | Printed as prefix-TYPE-NN. | RACK |
| GS1 GTIN (Cassette / Slide Labels) | Text, up to 14 characters | Required for GS1 DataMatrix printing | The AI(01) value on every cassette and slide GS1 DataMatrix label. Needs a GS1 Company Prefix registered for ForMedrixAI LLC (GS1 US or the regional member organisation). Empty by default: each real GS1 print is refused with an error until you enter one. | Blank |
| Cassette Label Layout: preset | Choice: 45 degree cassette (about 28.2 by 8.0 mm), 35 degree cassette (about 28.5 by 7.0 mm) | Optional | Fills the four boxes below. | 45 degree |
| Face width (mm) | Number, at least 1 | Required | Physical width of the cassette face. | 28.2 |
| Face height (mm) | Number, at least 1 | Required | | 8.0 |
| Barcode module size (mm) | Number, at least 0.05 | Required | | 0.25 |
| Text line height (mm) | Number, at least 0.5 | Required | | 1.4 |
| Cassette layout fit check | Warning or "has room" message, and a live preview at 10 times scale | Not applicable | Warns when the barcode or text will not fit the configured face. | Not applicable |
| Send a real test print | Picklist of printer profiles, Test GTIN, **Send Test Print** | Optional | Prints sample data through a real profile. Hold the result against an actual cassette before use. | None |
| Slide label layout: Face width, Face height, Barcode module size, Text height (mm) | Numbers (minimums 1, 1, 0.05, 0.5) | Required | These set the dot sizes and text position in the slide label that prints. Has its own preview, fit check and test print. | 20.0, 8.0, 0.2, 1.2 |
| Container Type Codes | One text box (up to 8 characters, upper case) per type: Staining Rack, Tissue Processor Basket, Archive Storage Tray, Decal Vessel, Ad-Hoc Batch | Required | The short code in every Master Batch Barcode. | STAIN, PROC, TRAY, DECAL, ADHOC |

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:print-settings:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** Only a QZ Tray profile dispatches directly. Any other bridge falls back to the browser print dialog. A facility without an override cannot be edited. Check cassette dimensions against the real cassette, because a wrong size prints past the edge.

### Label Designer {#screen-label_designer}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Label Designer**
**2. Maintenance item:** Label Designer

**3. Business purpose and scope.** A drag-and-drop editor for the layout of each label: you place fields on a label of fixed size, set their exact position and size, and decide when each shows. Layouts are kept per label type, as an enterprise default and, for some types, a facility override. A layout can be exported as printer code to test on a printer or viewer before use.

**4. Prerequisites and dependencies.** The facility override choice reads the Facility Dictionary. Print Settings chooses which printer receives the label, so set it up first. Skip the facilities and only the Enterprise Default is offered.

Setup step: Tier 1, step 14
Requires: [Facility Dictionary](#screen-facility-dictionary), [Print Settings](#screen-print_settings)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-label_designer - Label canvas, available fields and inspector]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Label Type | Choice: Requisition, Specimen (Container), Block (Cassette), Slide, Decant Container, Molecular Specimen, Molecular Plate, Molecular Rack, Molecular Deck Location | Required | Each type has a fixed label size: 101.6 by 152.4 mm, 50.8 by 25.4, 25.4 by 12.7, 25.4 by 9.5, 50.8 by 25.4, 25.4 by 12.7, 50.8 by 19.05, 38.1 by 12.7, 38.1 by 12.7 (in that order). The size is not editable. | Requisition |
| Scope | Choice: Enterprise Default, or a facility "(override)" | Required | Only Requisition, Specimen and Decant allow a facility override. Block, Slide and the four Molecular types show **Enterprise Standard: Locked** and can be edited only at the enterprise default. | Enterprise Default |
| Available Fields | List | Not applicable | Fields for this label type not yet on the canvas. Drag one onto the canvas. "All fields placed" shows when none remain. | Not applicable |
| Canvas | Drag-and-drop area | Not applicable | Live preview with sample data, at the label's true size. Drag a field to move it, or drag a handle to resize (hover text "Drag to resize"). Handles show only on the selected field. A barcode field draws a real sample barcode; if the barcode cannot be drawn the field shows "barcode render failed" instead. | Not applicable |
| Inspector | Panel | Not applicable | The settings of the selected field. With nothing selected it reads "Select a placed field to edit it." | Not applicable |
| X (mm), Y (mm) | Number | Required | Position of the selected field. A field is kept inside the label. | Where dropped |
| Width (mm), Height (mm) | Number | Required | Size of the selected field. | Field default |
| Font Size (mm) | Number | Required for text fields | | Field default |
| Show this field | Choice: Always, Condition | Required | Condition shows a second choice: another field, then "when that field has a value", "when that field is empty", or "when that field equals" with a **Value to match**. | Always |
| Preview with that field empty | Check box | Optional | Shows the label as it prints when the tested field is empty. | Off |
| Remove Field | Button | Not applicable | Takes the selected field off the canvas. | Not applicable |
| Fit to label | Button | Not applicable | Appears when a field goes past the edge. The save is refused until fixed: "Not saved: a field goes past the edge of the label." | Not applicable |
| Save Layout | Button | Not applicable | Saves for the chosen type and scope. Messages: "Enterprise default saved." or "Facility override saved."; when the save fails for a reason the screen cannot name, "Unknown error saving this layout." | Not applicable |
| Reset to Default | Button | Not applicable | Removes the saved layout for that type and scope and clears the canvas. The message reads "Layout reset to default." | Not applicable |
| Version history | Button and list | Not applicable | Each save is a version, shown as "Version N, saved when by who". **Restore this version** saves it as the newest version. The list is headed "Saved versions of this layout". A layout that has never been saved shows "This layout has not been saved yet." | Not applicable |
| Export ZPL, Export EPL, Export DPL | Buttons | Not applicable | Shows printer code translated from the layout. Test it in the viewer the screen names (labelary.com) at 203 dpi, or on your own printer. Barcode commands differ a little between printer models. The result appears in a box headed "Exported ZPL" (for EPL and DPL a note says it is a starting point). Select the text to copy it. ZPL is the language PathScribe sends (through QZ Tray). **EPL and DPL are export text only**: PathScribe never sends them to a printer, so you copy or save the text and send it yourself. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Change, reset, restore: `config:label-layouts:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** Export is a starting point to test, not a guarantee that every printer model prints it identically. The box is headed "Exported ZPL" even after you choose Export EPL or Export DPL; read the note above the text to see which language it holds. Cassette and slide dimensions for the print itself also come from [Print Settings](#screen-print_settings).

### Workstations {#screen-workstations}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Workstations

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Workstations**
**2. Maintenance item:** Workstations

**3. Business purpose and scope.** A register of each computer that prints or runs a PathScribe agent. Each gets a long-lived token and is bound to the facility, room and role it works in, so print routing can target it. A computer can also be marked as "This computer" so the browser knows which workstation it is.

**4. Prerequisites and dependencies.** The Facility list reads the Facility Dictionary. The bound printers are the destination ids from the site agent's printer list, so set [Site agents](#screen-site_agents) first. Skip it and you can type any id, but it matches nothing at print time.

Setup step: Tier 1, step 15
Requires: [Facility Dictionary](#screen-facility-dictionary), [Site agents](#screen-site_agents)
Unlocks: [Print Destination Routing Rules](#screen-print_routing_rules)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-workstations - Workstation list with token status and Register workstation]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Columns | Workstation, Facility, Room, Role, Printers, Token, Last seen, Status, Actions | Not applicable | Status is Active, Expires soon (within 30 days), Token expired or Revoked. Token shows the last characters and expiry date. A revoked row shows who revoked it and why. | Not applicable |
| Register workstation | Button | Not applicable | Opens the form. | Not applicable |
| Edit | Row button | Not applicable | | Not applicable |
| New token | Row button | Not applicable | Issues a new token. The previous token keeps working for 24 hours so the agent can be updated. | Not applicable |
| Revoke | Row button | Not applicable | Choose a reason (May be compromised, Enrolled by mistake, Moved to another site, Machine replaced, Machine retired, Other). A note is required for Other. The token stops working at once. | Not applicable |
| Use this computer / Stop using this computer | Row button | Not applicable | Binds this browser to the workstation. | Not applicable |
| Test a token | Text and **Check** button | Optional | Shows how the server would answer a pasted token: Accepted, or Refused as expired, revoked, unknown or malformed. | Blank |

#### Register and edit form

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Name | Text, up to 60 characters | Required | Must be unique among active workstations at the facility. | Blank |
| Facility | Picklist | Required | | None |
| Room | Text, up to 60 characters | Optional | For example Gross room 2. | Blank |
| Point of care | Text, up to 60 characters | Optional | Print routing rules for a location match on this. | Blank |
| Discipline | Choice: Histology, Cytology, Molecular, Autopsy | Optional | | Not set |
| Functional area | Picklist for that discipline | Optional | Must belong to the discipline. | Not set |
| Report printer, Label printer | Text with suggestions | Optional | A destination id from the site agent's printer list. | Not set |
| Register and show token, Save | Buttons | Not applicable | The new token is shown once: copy it into the workstation's agent. PathScribe keeps only a fingerprint and cannot show it again. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Register, edit: `config:workstations:manage`. New token, revoke, test a token: `config:workstation-tokens:manage`. All high risk. Registering, changing, rotating and revoking, and refused check-ins, are written to the audit log. Admin and Lab Director hold them by default.
**Known limits.** A token lasts 365 days unless replaced. In the demonstration tokens are checked in the browser; in production the API server checks them. A check-in in the demonstration is labelled Simulated.

### Workstation Groups {#screen-workstation_groups}
Breadcrumb: Home > Configuration > System > Lab Materials & Workflows > Workstation Groups

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Lab Materials & Workflows** > **Workstation Groups**
**2. Maintenance item:** Workstation Groups

**3. Business purpose and scope.** A workstation group collects scan stations by discipline and functional area, scopes them to a performing lab, and sets what loads when a technician selects one: the quality-control mode, a default action group, a default action and an optional dedicated page.

**4. Prerequisites and dependencies.** The Performing Lab list reads the Facility Dictionary. The Default Action Group list reads [Action Groups](#screen-action_groups) and the Default Action list reads the action registry; both are optional, and each offers "None" without them. Grouping stations means [Scan Stations](#screen-scan_stations) exist. Autopsy has no functional areas yet, so an Autopsy group cannot be saved (see PS-261).

Setup step: Tier 1, step 16
Requires: [Facility Dictionary](#screen-facility-dictionary), [Scan Stations](#screen-scan_stations)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-workstation_groups - Workstation group list with search]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Name or functional area. | Blank |
| Columns | Name, Discipline / Area, Performing Lab, QC Mode, Status, Actions | Not applicable | | Not applicable |
| Add Workstation Group, Edit, Deactivate / Reactivate | Buttons | Not applicable | | Not applicable |

#### Add and edit window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Name | Text | Required | For example Grossing Bench Group. | Blank |
| Discipline | Choice: HISTOLOGY, CYTOLOGY, MOLECULAR, AUTOPSY | Required | Decides which functional areas are offered. | HISTOLOGY |
| Functional Area | Picklist for the discipline | Required | | None |
| Performing Lab | Picklist | Required | | None |
| QC Enforcement Mode | Choice: Auto-Resolve, Enforced, Hybrid | Optional | | Not set |
| Default Action Group | Picklist | Optional | | None |
| Default Action (fires on next scan) | Picklist | Optional | | None |
| Dedicated Page Route | Text such as /microtomy-workstation | Optional | Leave blank until a real bench page exists. | Blank |
| Active | Yes/No switch | Optional | | On |

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, deactivate: `config:workstation-groups:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** Autopsy has no functional areas, so it cannot be used yet.

### Grossing Hardware {#screen-grossing_hardware}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Grossing Hardware

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Grossing Hardware**
**2. Maintenance item:** Grossing Hardware

**3. Business purpose and scope.** Cameras and scales at the grossing benches, and how PathScribe reaches each one. The physical device is chosen from the equipment register.

**4. Prerequisites and dependencies.** The Register Device list reads [Equipment](#screen-equipment), and the Scan Station list reads [Scan Stations](#screen-scan_stations). Skip Equipment and the device is not linked. A device of the wrong kind is refused.

Setup step: Tier 1, step 17
Requires: [Facility Dictionary](#screen-facility-dictionary), [Equipment](#screen-equipment), [Scan Stations](#screen-scan_stations)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-grossing_hardware - Grossing hardware list]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Columns | Name, Kind, Connection, Register Device, Scan Station, Status, Actions | Not applicable | Empty message: "No grossing hardware for this facility." | Not applicable |
| + Add Grossing Hardware, Edit, Deactivate / Reactivate | Buttons | Not applicable | | Not applicable |
| Kind | Choice: Camera, Scale | Required | | Camera |
| Name | Text | Required | For example Grossing Station 3 macro camera. | Blank |
| Connection | Choice: Browser (no install), PathScribe Agent, Manual entry | Required | Camera: Browser or Agent. Scale: Agent or Manual entry. Other combinations are refused. Browser reaches a standard USB camera directly. Manual entry means the weight is typed into the grossing template. | Browser (no install) |
| PathScribe Agent Address | https link such as https://127.0.0.1:9100 | Required for Agent | Must start with https://. | Blank |
| Register Device | Picklist from Equipment of the same kind | Optional | | Not linked |
| Scan Station | Picklist, or Any station | Optional | | Any station |
| Status | Active / Inactive | Optional | | Active |

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, deactivate: `config:grossing-hardware:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** None known.

### Simulated print log {#screen-simulated_print}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Simulated print

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Workstation & Hardware** > **Simulated print**
**2. Maintenance item:** Simulated print log (read-only, with a clear button)

**3. Business purpose and scope.** With no API server, labels and reports are not sent to a real printer. Each print is recorded here as Simulated, so you can see what would have printed, where and how many. Nothing listed here reached a printer. A switch makes simulated prints fail, to test the failure path.

**4. Prerequisites and dependencies.** None. It shows what the print screens produce, so print something first.

Setup step: Reference, not part of setup
Requires: [Printer Profiles](#screen-printer_profiles)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-simulated_print - Simulated print log table]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Make simulated prints fail | Check box | Optional | Makes each simulated print fail, so you can test the failure message. | Off |
| Count | Text | Not applicable | "N simulated prints". | Not applicable |
| Clear the log | Button | Not applicable | Asks to confirm, then clears every record. Cannot be undone. | Not applicable |
| When | Date and time | Not applicable | In the display language's format. | Not applicable |
| What | Text | Not applicable | Site agent print, Slide or cassette engraving, Label, Molecular label, Network print job, Report, Label for a scan. | Not applicable |
| Sent by | Text | Not applicable | The route used. | Not applicable |
| Destination | Text | Not applicable | | Not applicable |
| Copies | Whole number | Not applicable | | Not applicable |
| Outcome | Text | Not applicable | "Simulated: sent to printer" or "Simulated: failed". | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. The section's capability is `config:printers:manage`. Admin and Lab Director hold it by default.
**Known limits.** The log is kept in the browser's own storage, so it is per browser and not shared. It is replaced by real printing when the API server is connected.

## Part D: Global System Preferences, Date/Time/Timezone, Specimen and Accession Numbering {#ch2-global-preferences}
Breadcrumb: Home > Configuration > System > Administration & Compliance

This part holds the organisation-wide rules: how long records are kept, how accession numbers are built, which fields pages require, and the reference links staff see. There is no single "global preferences" screen. For date, time, time zone and language, see the table in [Part A](#ch2-enterprise-facilities): the time zone is one organisation-wide choice on the [Contribution Dashboard](#screen-contribution_settings) settings, date format follows the display language, and report and spelling languages are set on the facility and the person. The read-only [Jurisdiction overview](#screen-jurisdiction_overview) is in Part A.

### Data Retention {#screen-retention}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Data Retention

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **Data Retention**
**2. Maintenance item:** Data Retention

**3. Business purpose and scope.** The lab's own retention periods: how long PathScribe is to keep AI suggestions, the audit log, case snapshots and the report archive. The screen records the policy. Department-level overrides and the governing-body minimums are set on [Departments](#screen-departments) and [Governing Bodies](#screen-governing_bodies).

**4. Prerequisites and dependencies.** None. Consult your institution's data governance policy before reducing any period.

Setup step: Tier 1, step 18
Requires: None, this is a starting point.
Unlocks: [Departments](#screen-departments)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-retention - Four retention periods with Save Changes and Reset to Defaults]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| AI Suggestions | Whole number of days, 30 to 730 | Required | AI-generated field suggestions and confidence scores kept per case. | 90 days |
| Audit Logs | Whole number of days, 90 to 3650 | Required | All user actions, sign-outs, amendments, voice events and system events. The minimum is 90 days. Reductions below regulatory minimums need sign-off from your compliance officer. | 365 days |
| Case Snapshots | Whole number of years, 1 to 30 | Required | Full case data captured at each finalisation and sign-out event. | 7 years |
| Report Archive | Whole number of years, 1 to 30 | Required | Signed-out reports kept for medicolegal and pathology review. | 10 years |
| Save Changes | Button | Not applicable | Shows "Retention policy updated. Takes effect at next purge cycle." A value outside its range is ignored as you type. | Not applicable |
| Reset to Defaults | Button | Not applicable | Puts the four defaults in the boxes. You still select Save Changes. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:retention-policy:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** The policy is saved in the browser only. No purge job reads it yet: nothing is deleted or kept differently because of it (PS-345). The message "takes effect at next purge cycle" describes the intended behaviour, not a built one.

### Case Mask Configuration {#screen-case_mask_config}
Breadcrumb: Home > Configuration > System > Integrations > Case Mask Configuration

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Integrations** > **Case Mask Configuration**
**2. Maintenance item:** Case Mask Configuration (accession numbering)

**3. Business purpose and scope.** A case mask is the pattern of an accession number: a prefix, the year and a running sequence, for example `MFT26-0029`. Each mask has its own prefix, pattern and counter, and belongs to one scope: the enterprise, a performing-lab facility, or a department. When a case is accessioned, PathScribe looks for a mask in this order: its department, then its performing lab, then the enterprise. A case with no mask anywhere in that chain uses the default pattern `O` plus a two-digit year, a hyphen and a four-digit sequence. An accession number is permanent and tied to physical tissue and chain of custody, so saving a mask changes the pattern going forward only and never resets the counter.

**4. Prerequisites and dependencies.** The Facility and Enterprise scopes read the Facility Dictionary. A department scope reads [Departments](#screen-departments), which is set up in a later tier. Skip the facility and no facility or enterprise mask can be added; cases then use the default pattern. A scope that already has a mask is not offered again: use Edit.

Setup step: Tier 1, step 19
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: [Departments](#screen-departments)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-case_mask_config - Case masks grouped by Enterprise, Facility and Department]

**6. Field reference.**

#### List page

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Groups | Enterprise, Facility, Department | Not applicable | Each group lists its masks, or "No scope-level Case Mask defined yet". | Not applicable |
| Columns | Prefix, Mask Pattern, Current Sequence, Reset Annually, Actions | Not applicable | | Not applicable |
| + Add Case Mask, Edit, Delete | Buttons | Not applicable | Delete acts at once and has no confirmation. | Not applicable |

#### Add and edit window

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Scope | Choice: Department, Enterprise, Facility (Performing Lab), then a picklist of that kind | Required | Locked when editing. Every performing lab with a mask is left out when adding: "Every real performing-lab facility already has its own Case Mask." | Department |
| Prefix | Text | Required | For example MFT. | Blank |
| Mask Pattern | Text with tokens `{PREFIX}`, `{YEAR:4}`, `{YEAR:2}`, `{SEQ:N}` | Required | For example `{PREFIX}{YEAR:2}-{SEQ:4}` gives `MFT26-0029`. | `{PREFIX}{YEAR:2}-{SEQ:4}` |
| Sequence Digits | Whole number, 1 or more | Required | Used when the pattern has no explicit digit count. | 4 |
| Reset sequence annually | Yes/No switch | Optional | Starts the sequence at 1 each new year, in the Facility Timezone, never the device's time zone. | On |
| Preview Next Number | Button | Not applicable | Shows the next number without using one. | Not applicable |
| Current sequence, last reset, last updated by | Read-only text | Not applicable | Shown when editing. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, delete: `config:case-masks:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** The year and the annual reset use the organisation's Facility Timezone ([Contribution Dashboard](#screen-contribution_settings) settings). The **Preview Next Number** example is built with the time zone of the browser you are using, so near New Year it can show a different year from the number a case would actually receive.

### Field Requirements {#screen-field_requirements}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Field Requirements

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **Field Requirements**
**2. Maintenance item:** Field Requirements

**3. Business purpose and scope.** Chooses which fields each page needs before it can be saved, for your organisation. Some fields are locked as always required, with the reason shown, because a record is unsafe or unusable without them. The rest you can turn on or off. Pages pick the choice up when they save: for example Staff members and the Facility editor read their required fields here.

**4. Prerequisites and dependencies.** The screen applies to the organisation of the person signed in. A person with no linked organisation sees the defaults and cannot change them. Nothing else has to be set first.

Setup step: Tier 1, step 20
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-field_requirements - Page picker and grouped Required switches with locked fields]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Page | Picklist of 16 pages: Accession, Add-On Orders, Batch Management, Clinical history (cytology), Cytology screening, Embedding station, Facility editor, Grossing, Intraoperative consultation, Messaging, Microtome workstation, Molecular plate builder, Molecular rack loading, Case report, Slide distribution station, Staff | Required | Shows the fields of one page, in groups. | Accession |
| Settings for (organisation) | Text | Not applicable | The organisation you are changing. | Your organisation |
| Required | Check box, one per field | Optional | Turns the requirement on or off. A note shows "Changed from default" when you have changed it. | Per field |
| Always required | Locked badge and reason | Not applicable | The field cannot be turned off. The reason is shown, for example that laboratory standards require two patient identifiers. | Locked |
| Hints | Text under a field | Not applicable | For example "Checked on every specimen", "Filled in automatically if left blank", or a condition such as "Cytology and FNA cases only". | Not applicable |

Sex on the Accession page is a locked required field with no default (Batch 661): the accessioner must choose it. The Downtime Reason on the Accession page is required, and submit is blocked without one (Batch 658).

A refused change shows one of: "That field is always required.", "You don't have permission to change field requirements.", "You can only change your own organisation's settings.", "That field can't be configured." or "That page can't be configured." Each change you make is written to the audit log with the page, the field and the new value.

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:field-requirements:manage` (administration group). Admin and Superadmin hold it by default. Lab Director does not, and sees the screen read-only: "You can see these settings but not change them."
**Known limits.** Settings are kept in the browser's storage in the demonstration. The production server has a contract only for the permission check (`AUTHORIZATION_API.md`), not for storing the settings. Switching off a protocol requirement on Grossing routes specimens completed without a protocol for secondary review.

### External Resources {#screen-external_resources}
Breadcrumb: Home > Configuration > System > Administration & Compliance > External Resources

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance** > **External Resources**
**2. Maintenance item:** External Resources

**3. Business purpose and scope.** The reference links shown in the Resources panel: CAP protocols, the WHO classification, internal lab systems and similar. The Quick Links on the Search and Audit Log screens come from this list (Batch 659), so a link added here appears there. An enterprise-wide link is visible to everyone. A lab-scoped link is visible only at the performing lab it is tied to.

**4. Prerequisites and dependencies.** A lab-scoped link needs a performing lab from the Facility Dictionary. Skip it and only enterprise-wide links can be saved: "Select a performing lab for a lab-scoped resource."

Setup step: Tier 1, step 21
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-external_resources - Resource list grouped by Protocols, References and Systems]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| List | Resources grouped by category | Not applicable | Each row shows its title, link and scope: "Enterprise-wide" or "Lab: name". Empty message: "No external resources configured yet." | Not applicable |
| + Add Resource, Edit, Delete | Buttons | Not applicable | Delete asks "Delete (title)? This cannot be undone." | Not applicable |
| Title | Text | Required | For example CAP Cancer Protocols. | Blank |
| URL | Web address starting https:// or http:// | Required | Error: "Enter a valid URL, including https://". | Blank |
| Category | Choice: Protocols, References, Systems | Required | | Protocols |
| Scope | Choice: Enterprise-wide, Specific performing lab | Required | | Enterprise-wide |
| Performing Lab | Picklist | Required for a lab scope | | None |

**7. Permissions.** Open: `screen:configuration:open`. Add, edit, delete: `config:external-resources:manage` (high risk, audited). Admin and Lab Director hold it by default.
**Known limits.** Only the address is stored. PathScribe does not check that the link works.
