---
module: Quality & Compliance
screen: QA Dashboards and Inspection
slug: quality/qa-dashboards
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager]
keywords: [reconciliation, frozen vs final, enterprise rollup, QA dashboard, inspection mode, evidence binder, concordance, mandatory follow-up, clinical impact, root cause, CAPA threshold, jurisdiction]
routes: []
previous: quality/fppe-tracking
next: quality/cytology-qa
related: [quality, report/sign-out-and-release, audit-log]
status: Draft
---

# QA Dashboards and Inspection {#top}

## Overview

**Purpose.** This article covers the summary screens of Quality Assurance: the frozen-to-final **Discordance** (reconciliation) view, the **Enterprise Rollup**, the **QA Dashboard** and **Inspection Mode**, plus the **Clinical impact** and root cause fields used when a discordance is recorded.

**Intended users.** Quality staff and laboratory managers preparing reviews and inspections; pathologists who record discordances at sign-out.

**Where it fits.** The Discordance tile is on the **Operations** pillar. Enterprise Rollup, QA Dashboard and Inspection Mode are pillars of their own. See [Quality & Compliance](help:quality) for the queue itself.

## Screen Tour

![The QA Dashboard with overall figures, a monthly chart and the grouped tables](capture:quality-dashboards-overview)

### Field definitions

**Discordance (reconciliation).** The screen says "Loading reconciliation data…" while it opens. The chart shows the monthly concordance rate; an empty month says "No reconciliations this month". The tiles are Concordance Rate, Total Reconciliations, **High Severity Discordances** (red when above zero), Medium Severity Discordances, Requiring Escalation and Teaching Cases. Further columns and the 25-row limit are described in [Quality & Compliance](help:quality).

**Clinical impact and root cause fields.** When a pathologist records a discordance (at sign-out of a case that had a frozen section, or in a review form), the same group of fields appears:

| Field | What it means |
|---|---|
| Delta | Whether the final diagnosis is an upgrade, a downgrade or a minor variance compared with the first. |
| Clinical impact | Low, medium or high. A short hint below explains each level so colleagues apply the levels alike. |
| Root cause | Sampling error, interpretation error, technical artifact or Other. |
| Brief explanation | Appears only when the root cause is Other. Say in a few words what it was. |
| Comments | Free text. Do not type a patient's name. |

**Enterprise Rollup.** Figures are added up inside each jurisdiction first, then across the enterprise, so no case is ever shown across a jurisdiction boundary. The top card shows the number of jurisdictions and facilities, **Case Volume**, **Total Work RVU**, the AI-assisted share and **On-Target TAT**. The **By Jurisdiction** card has one line per jurisdiction with cases, facilities, RVU, AI share and on-target share. A notice states how many cases could not be placed in a known facility and were left out. If the data cannot be read the screen says "Unable to load enterprise rollup data."

**QA Dashboard.** The screen says "Loading QA Dashboard…" while it opens. The **Overall** card shows **Total Reviews**, Concordance, Discordant and **Mandatory Follow-Up** counts. A chart plots total and discordant records per month. Three tables then group the same records: **By Activity Type**, **By Organ System (Subspecialty)** and **By Reviewer**. Their columns are the group name (Activity Type, Organ System or Reviewer), Total, Concordant, Discordant, Concordance and Mandatory Follow-Up. With no records a table says "No real QA activity records on file yet."

**Inspection Mode.** The screen says "Loading Inspection Mode…" while it opens. Choose the **Window** (12, 24 or 36 months). The Summary card shows **Total Records in Window**, **Activity Types Represented** and the date range. Below, one card per activity type shows the regulatory bases set for it, its record count, discordant count and number meeting the CAPA threshold. Select a card to expand its records: Case, Specimen, Outcome, Severity, Recorded, Reviewer and **CAPA Threshold** (Yes, or a dash). Meeting the CAPA threshold means the record's severity reached the level the laboratory set for that activity; it does not mean a deficiency was raised.

### Toolbar

| Button | What it does |
|---|---|
| Scope switcher | Limits the report to an organisation or referring facility (not on Enterprise Rollup). |
| Export | On the Discordance view. Saves all reconciliations. |
| Export by Activity Type | On the QA Dashboard. Saves the By Activity Type table. |
| Download Full Binder (CSV) | On Inspection Mode. Saves every record in the window, grouped by activity type, as a spreadsheet file. |
| Export (Enterprise Rollup) | Saves the jurisdiction lines only; no case or patient data. |

All exports need the matching permission; the button is greyed out without it.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red count | Discordance, or a CAPA-threshold record, above zero. |
| ▲ / ▼ beside an activity type | Expanded or collapsed. |
| No jurisdiction configured for this activity | No regulatory basis has been set for the activity type. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. For an inspection, open **Inspection Mode** and choose the **Window**.
2. Select an activity type card to check its records.
3. Select **Download Full Binder (CSV)** to take the evidence with you.
4. For a regular review, open the **QA Dashboard**, read the Overall card, then the tables.
5. Select **Export by Activity Type** for the minutes.

### Alternative workflow

1. For groups of facilities, use **Enterprise Rollup** and read the By Jurisdiction lines.

### Exception handling

1. If a case is missing from Enterprise Rollup, its facility is not a known enterprise facility. The notice counts such cases.
2. If Inspection Mode shows no records, the window may be too short or the scope too narrow.

### Error recovery

1. Refresh the page if "Unable to load enterprise rollup data." appears.

## Tips and Best Practices

### Common mistakes

- Reading Mandatory Follow-Up as completed follow-up. It counts records that require follow-up.
- Treating the CAPA threshold column as proof a deficiency exists.

### Efficiency recommendations

- Pick the widest window once, then filter by activity type.

### Workflow recommendations

- Take the QA Dashboard to each quality meeting; take the binder to inspections.

## Related Features

### Upstream workflow

- [Report sign-out](help:report/sign-out-and-release): where discordances are recorded.

### Downstream workflow

- [Cytology QA](help:quality/cytology-qa): the cytology reports.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Dashboard is empty | No QA activity recorded in the scope. |
| A reviewer is missing | They recorded nothing in the scope. |

### Resolution steps

1. Widen the scope.
2. Refresh the page.

### When to contact support

Contact your laboratory's PathScribe support when totals differ from the cases recorded. Have the scope and window ready.
