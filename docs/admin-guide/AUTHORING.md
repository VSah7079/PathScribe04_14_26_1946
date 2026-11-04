# Administrator Guide: how a chapter is written (Batch 646)

The Administrator Guide is built from the Markdown files in `docs/admin-guide/src/` by `scripts/admin-guide/build.py` into HTML pages in `docs/admin-guide/html/`. This file is the writing standard. A chapter that does not follow it will not build cleanly (the builder reports every break).

**Who reads it.** Customer system administrators (pathology LIS admins, IT operations, clinical application specialists) and ForMedrixAI support, professional services and systems engineers. Write for an administrator who knows pathology but has never seen this screen.

**The rule that matters most: say only what the product does today.** Every screen, field and default is checked against the source (the screen's component in `src/components/Config/...` or `src/pages/...`, its service in `src/services/`, its text in `src/i18n/locales/en.json`, its capability in `src/services/authorization/capabilityCatalog.ts`). Anything not built is labelled, never described as working. The status words are fixed:

| Status | Meaning |
|---|---|
| **Built** | Works on the demo data and has a real service contract (`docs/architecture/*_API.md`) for the production server. |
| **Demonstration** | Works on the demo data in the browser only. The production server side is not connected yet. |
| **Partial** | Part of what the heading says is built; the section lists exactly which part. |
| **Planned** | Not built. A short paragraph says what is intended and what is known about timing. |
| **Not built** | Asked for in the outline, no screen or contract exists. The section says so in one sentence and names the nearest thing that does exist. |

Production database is Microsoft SQL Server, reached through an ASP.NET Core API with SignalR for live updates. Today most data services are browser-held demo services; the production API is being connected service by service. Do not describe Firebase as the production database.

## File and front matter

`docs/admin-guide/src/NN-short-name.md`, starting with:

```
---
chapter: 4
id: ch4
title: Tier 3: Workflow Engines and Operational Configuration
---
```

Then `# Title {#ch4}` as the only H1. Use `##` for a chapter's parts, `###` for each screen, `####` only inside a screen (for example "Edit window").

## Ids (deep links)

- Every heading gets an id with the attribute form `## Title {#id}`. Chapter ids `chN`, part ids `chN-slug`, screen ids `screen-<slug>`. A System-tab screen uses its real section id so the app can link to it: `screen-departments` for `?tab=system&section=departments`.
- Field rows get ids automatically (`f-<screen slug>-<field slug>`), glossary terms `g-<term>`, error codes `e-<code>`. Do not write these by hand.
- Link to another screen with `[Departments](#screen-departments)`. Links between chapters work the same way (the builder resolves which page holds the id). A link to an id that does not exist fails the build.

## Breadcrumb

First line under every `##` and `###` heading, exactly: `Breadcrumb: Home > Configuration > System > Clinical Lookups > Departments`. The builder turns it into the breadcrumb trail. Use the real tab and sidebar names from the screen (English `en.json` text).

## A maintenance screen (the seven parts, in this order)

```
### Department Dictionary {#screen-departments}
Breadcrumb: Home > Configuration > System > Clinical Lookups > Departments

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Clinical Lookups**
**2. Maintenance item:** Departments

**3. Business purpose and scope.** ...

**4. Prerequisites and dependencies.** One or two plain sentences on why the order matters, then the three machine-read lines below (the builder turns them into the "Setup sequence" box on the screen, checks every link, and builds the master setup-order checklist from them):

Setup step: Tier 2, step 6
Requires: [Grossing Templates](#screen-grossing-templates), [Retention](#screen-retention)
Unlocks: [Case Mask](#screen-case_mask_config), [Accessioning workflow templates](#screen-order-entry-templates)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-departments - Department Dictionary list]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:departments:manage`. ...
**Known limits.** ... (what is not built or demonstration only)
```

Rules for the parts:
- **Setup sequence (Pete, Oct 21, 2026: "each section should be clear on its dependency so the user is clear on the setup sequence").** Every maintenance screen carries all three lines. `Setup step: Tier N, step M` gives its place in the outline's order (Tier 1 to 7; step numbers run 1, 2, 3 within the tier, in the order an administrator should do them). `Requires:` lists the screens that must be configured first (write `None, this is a starting point.` when there are none); `Unlocks:` lists what it makes possible. A screen that is not part of setup (a log, a queue, a dashboard used day to day) writes `Setup step: Reference, not part of setup` and still gives Requires (what must be configured for it to show data) and Unlocks (`None.` is fine). Requires and Unlocks name only real screens in this guide, by link. Every `Requires` must be in the same tier at an earlier step, or in an earlier tier; the builder fails the build on a forward reference or a loop. Verify each dependency in the code (a picklist that reads another dictionary, a service that refuses without it), not from the outline, and say in one sentence what happens if it is skipped (an empty dropdown, a refused save).
- **Screenshot placeholder** uses the exact form `[SCREENSHOT PLACEHOLDER: <capture id> - <description>]`. The capture id is one of the ids in `docs/admin-guide/img/manifest.json` (listed in `docs/admin-guide/CAPTURE_IDS.md`): `system-<section id>`, `staff-members`, `tab-ai`, `screen-audit-log`, and so on. The builder replaces the placeholder with the real picture; if you need a picture that is not captured (a window that opens on a click, a sub-tab), keep the same form with a descriptive id of your own (`system-departments-edit`) and the builder shows the placeholder box and lists it in `MISSING_CAPTURES.md`.
- **Field reference** has exactly the five columns above. One row for every field the administrator can see or change on the screen, windows opened from it included (put the window's fields under a `####` sub-heading with the same table). Data type in plain terms (Text, up to N characters; Whole number of days; Choice of ...; Yes/No switch; Date; Picklist from [Screen](#...)). Required is Required or Optional (or "Required when ..."). Business logic says what the field changes elsewhere. System default is the value on a new record, or "None". Take limits from the code, not a guess.
- **Permissions** names the capability keys that really guard the screen and its actions, what each lets the person do, and which built-in roles hold it by default. The capability list is `src/services/authorization/capabilityCatalog.ts`; the seeds are `capabilitySeeds.ts`. Say whether the change is audited.
- **Known limits** is the plain reality: what is demonstration only, not built, or needs a decision. Keep it to what an administrator needs to plan around. If there is nothing, write "None known." and do not pad.
- Screens that are read-only reference pages, wizards or dashboards still use parts 1 to 5 and 7; a table in part 6 lists the columns, filters and buttons instead of form fields, with "Not applicable" where a column does not fit.

## ForMedrixAI internal only

A setting or screen that only ForMedrixAI deployment or service engineers may change (capability domain `platform:` or `platformOnly: true` in the catalog, or a screen shown only to such staff) gets the title prefix and the callout, exactly:

```
### [FORMEDRIXAI INTERNAL ONLY] Interface Dictionary {#screen-interface-dictionary}

> 🔒 **ForMedrixAI Internal Restricted Setting**
> **Scope:** Internal Service & Deployment Personnel Only.
> **Explanation:** What this controls at the system and database level, and why it is restricted: the operational, regulatory or integrity failure a change by an end user could cause.
```

The customer edition of the guide leaves these sections out; the internal edition keeps them. Do not guess which are internal: check the capability.

## Style

- Plain English, present tense, short sentences, the administrator addressed as "you". Spell out an abbreviation the first time in a chapter, then use it. Terms in the glossary (`docs/admin-guide/src/99-glossary.md`) are linked automatically on first use in a section.
- Use the button and field names exactly as on the screen. Put on-screen names in bold, keys and values in code style.
- Steps are numbered lists. Anything an administrator must do before something else is a prerequisite (part 4) and links to the screen that does it.
- No marketing wording. No "seamless", no "powerful". If a limit exists, state it.
- Vendor names and standards (HL7, FHIR, CAP, NAACCR, Epic) are never translated and are named only when the product really supports them; otherwise "Planned" or "Not built".
- Anything that decides a regulatory outcome (CLIA, CAP, ISO 15189, HIPAA, GDPR, UK GDPR) is stated as what the control does, never as "makes you compliant".
- Every number (a limit, a default, a count) is copied from the code. If the source disagrees with the outline's wording, follow the source and note the difference in `docs/admin-guide/OPEN_QUESTIONS.md`.

## Example (a complete screen, checked against the source)

### Department Dictionary {#screen-departments}
Breadcrumb: Home > Configuration > System > Clinical Lookups > Departments

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Clinical Lookups**
**2. Maintenance item:** Departments

**3. Business purpose and scope.** A department is the coarse classification of a specimen at intake (for example Surgical Tissue, Fluid / Cytology, Histology-Only / Consultation, Frozen Section). It decides which grossing template a case starts with, which case-number mask applies, and whether the department keeps records for a different length of time than its jurisdiction's default.

**4. Prerequisites and dependencies.** The default grossing template is a required choice, and the retention override is checked against the jurisdiction's floor, so both are set up first. Skip the templates and the Default Grossing Template list is empty, so the department cannot be saved.

Setup step: Tier 2, step 2
Requires: [Grossing Templates](#screen-grossing-templates), [Retention](#screen-retention)
Unlocks: [Case Mask](#screen-case_mask_config)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-departments - Department Dictionary list with search, status filter and Add Department]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Name | Text | Required | The department's name as staff see it at accessioning. | None |
| Description | Free text | Optional | What kinds of specimen belong here. Shown under the name in the list. | None |
| Default Grossing Template | Choice of the three templates (Standard Tissue Route A, Fluid / Cell Block Route B, Histology-Only / Direct Triage Route C) | Required | The grossing route a case in this department starts on. | None |
| Status | Active / Inactive switch | Optional | An inactive department is not offered at intake. Deactivating a department still referenced elsewhere asks you to confirm; the references are not removed. | Active |
| Retention Override (days) | Whole number of days, one box per material type | Optional | Leave blank to use the jurisdiction default. A value below the governing-body floor opens a confirmation that needs a typed justification. | Blank (uses jurisdiction default) |
| Laboratory Director Name | Text | Optional | Report-header branding for this department; falls back to the facility, then the enterprise. | Blank |
| CLIA / ISO Accreditation Number | Text | Optional | Same fallback as above. | Blank |
| Header Logo URL | https link | Optional | A hosted image address; PathScribe stores only the address, never the image. | Blank |

**7. Permissions.** Open the screen: `screen:configuration:open`. Add, edit, deactivate: `config:departments:manage` (high risk, audited). Admin and Lab Director hold it by default.

**Known limits.** Auto-created departments from order intake show as Unverified until someone selects **Verify**.

## Working rules for chapter authors

- Chapter N documents Tier N-1 (Chapter 2 is Tier 1 ... Chapter 8 is Tier 7). The screens each chapter owns, with the id to give each, are in `OWNERSHIP.md`. Write only the screens you own; link to the others by their canonical id. `Requires` may name only screens owned by your chapter at an earlier step or by an earlier chapter.
- The outline's wording is a target, not a fact. Where the outline names something the product does not have (for example FHIR endpoints, a named EHR connector, an AI module), look for it in the code first (whole repo, not only `src/`), then give it a section marked **Not built** or **Planned** with what does exist nearest to it. Never invent screens, fields or defaults.
- Fields come from the code: read the screen component and its sub-components, the `en.json` text, the validation in the service. Cite limits exactly.
- Notes that need Pete's decision, and any disagreement between the outline, the docs and the source, go in `docs/admin-guide/open-questions/ch<N>.md` (one short bullet each), not in the chapter.
- Do not edit `scripts/`, other chapters, `AUTHORING.md` or `OWNERSHIP.md`. Do not commit or push anything.
- Check your work by running `python3 scripts/admin-guide/build.py --no-convert`. Errors that only name ids owned by another chapter that is not written yet are expected; fix every other error.


## Translations (Batch 647)

The English chapters are the master. Any change to a heading id, link, table, status line or placeholder in English must be made in all five translations in the same change; `python3 scripts/admin-guide/parity.py <lang>` lists what no longer matches, and the build fails for a translation that differs. Rules: `TRANSLATION.md`.
