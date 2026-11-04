---
module: Quality & Compliance
screen: Cytology QA
slug: quality/cytology-qa
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager, Cytotechnologist, Pathologist]
keywords: [cytology QA, rescreening, workload tracking, ASC-US, HPV reflex, histology correlation, 5-year lookback, registry transmission, UK failsafe, EU compliance, HPV positivity, molecular QC, proficiency testing, unscreened backlog, secondary screening]
routes: []
previous: quality/qa-dashboards
related: [quality, cytology, cytology/screening-case, molecular]
status: Draft
---

# Cytology QA {#top}

## Overview

**Purpose.** Cytology QA gathers the quality and compliance reports for gynaecological cytology in one place: agreement between screeners and pathologists, workload limits, HPV testing, registry reporting, proficiency testing and backlog. Each report is a tile; choosing a tile shows that report below.

**Intended users.** Quality staff, laboratory managers and cytology supervisors.

**Where it fits.** Open **Quality Assurance** and choose the **Cytology QA** pillar. Day-to-day screening happens on the [Cytology Worklist](help:cytology) and the [Screening Case](help:cytology/screening-case) page; this screen reports on that work. See [Quality & Compliance](help:quality).

## Screen Tour

![Cytology QA with the report tiles and one report open](capture:quality-cytology-qa-overview)

The screen says "Loading Cytology QA data…" while a report opens. At the top is **Scope:** followed by the chosen scope and a scope switcher; hover over a tile to see "View:" and its name.

### Field definitions

The tiles are: 10% Random Rescreening, High-Risk Rescreening, CT vs. Path Correlation, Peer Review Correlation, Primary vs Final Diagnosis, CT Statistical Comparison, ASC-US / HPV Reflex, Workload Tracking, Registry Transmission, Secondary Screening Audit, 5-Year Retrospective Lookback, Histology Correlation, Unscreened Backlog, UK HPV Failsafe, EU Compliance, HPV Positivity, Molecular QC Failure, Molecular Lot Trend and APAC Proficiency Testing.

**Agreement reports** (random and high-risk rescreening, CT vs. Path, Peer Review, Primary vs Final). Each opens with a card:

| Item | What it means |
|---|---|
| Overall Agreement | Share of compared cases with the same result. |
| Major Concordance | Share with no major difference. |
| Cases Compared | How many cases were compared. |
| Exact, Minor Discrepancy, Major Discrepancy | The counts of each level. |
| False Negative, False Positive | Major differences where the first read missed or over-called. |
| Adequacy Discrepancy | Cases where the two readers disagreed on adequacy. |
| Diagnostic Upgrade, Diagnostic Downgrade | Cases where the second read raised or lowered the category. |

A table lists each case: Case, **Initial Screen** and **Follow-Up Review** (with reader), Result, and Adequacy (**Discrepant** or a dash). With nothing to show it says "No comparisons on file for this report yet."

**CT Statistical Comparison.** One row per cytotechnologist: **Total Screened**, the share of Unsat, NILM, ASC-US, ASC-H, LSIL and HSIL+, the ASC-US:LSIL ratio, the **Lab Avg** ratio and Variance. An **Outlier** badge marks someone whose ratio differs from the laboratory average. Empty: "No reviews on file for this scope yet."

**ASC-US / HPV Reflex.** Per cytotechnologist: **Total ASC-US**, **Reflex HPV Ordered**, **Reflex Order Rate**, **HPV+ Count**, ASC-US HPV+ % and a status: Normal, Over-Calling, Under-Calling or Insufficient Data. Empty: "No calls on file for this scope yet."

**Workload Tracking.** One row per screener per day: **Shift Date**, **Hours Screened** (marked signed off, not signed off, or signed off before more was recorded), Recorded hours, **Manual Slides**, **Imager Slides**, **Total Equiv. Slides**, **Max Allowed** and **Exceedance** (an Exceeded badge). A **Correction flagged** badge and the reason appear when the screener corrected their hours. Empty: "No ledger entries on file for this scope yet."

**Registry Transmission.** Choose the **Registry** (Australia, South Korea, England, Ireland, Netherlands or Northern Ireland). The table shows Accession, MRN, HPV Result, Cytology Result, Transmitted, Status (Queued, Sent or Failed), Error, Sent, Registry status (such as Accepted, Awaiting answer, No answer in 72 h, Rejected, fixable) and Response code.

**Secondary Screening Audit.** Case, Trigger, Outcome (Concordant or Discordant), **Added-By Event**, **Missed-By Event** and Reviewer. Empty: "No events on file for this scope yet."

**5-Year Retrospective Lookback.** A card shows **Total Flagged**, Pending, Completed and **Corrective Action Rate**. The table lists Case, Accession, Triggered, Status, Outcome (Confirmed Negative, Interpretation Error, Sampling Error or Screening Error), Corrective Action and Reviewed By. Empty: "No specimens flagged for this scope yet."

**Histology Correlation.** A line reports how many **cases correlated**, how many were concordant, the **correlation rate** and the **PPV for HSIL+**. The table has Patient MRN, **Cyto Accession**, **Cyto Date**, **Cyto Diagnosis**, **Hist Accession**, **Hist Date**, **Hist Diagnosis**, **Days to Biopsy** and **Correlation Category** (Concordant, Minor Discrepancy, Major Discrepancy or Discordant (Unspecified)).

**Unscreened Backlog.** Case, Accession, Collected, Received, Status (**Unscreened** or **Pending Path Review**), **Elapsed Hours** and **TAT Exceeded**. Empty: "No backlog on file for this scope yet."

**UK HPV Failsafe.** Per jurisdiction: **HPV Primary Positives**, **Cytology Triage Performed**, **Inadequate Cytology Rate**, **Colposcopy referrals** and **No response after 28 days**.

**EU Compliance.** Per country: **Total Cases**, **HPV Primary**, HPV Co-Test, **Internal Audit Non-Conformities**, **National registry ID**, ThinPrep, **SurePath** and interval adherence.

**HPV Positivity.** Per **Testing Site**: indication, assay, **Total Tested**, HR-HPV+ %, HPV16 %, HPV18/45 %, **Other HR %** and **Variance vs. Mean**, in percentage points against the average of all sites.

**Molecular QC Failure.** Run date, instrument, reagent lot, samples run, **Invalid Controls**, **Inhibitors**, **Failure Rate** and threshold, with an Exceeded badge when the rate is above the limit.

**Molecular Lot Trend.** For each reagent change: instrument, **Old Lot**, **New Lot**, **Control Level**, **Mean Ct (Old)**, **Mean Ct (New)**, the shift, and Pass or Fail.

**APAC Proficiency Testing.** A summary line counts satisfactory events. The table has Received, Accession, Provider, **Challenge**, Outcome (Satisfactory or Unsatisfactory), **Score Detail** and Deficiency, with a Flagged badge for a provider with repeated deficiencies. Empty: "No grades on file for this scope yet." Above the table is the **Proficiency test panel** card (see below).

Where a report has no rows for a scope, other tables say "No data on file for this scope yet."

### Toolbar

| Button | What it does |
|---|---|
| Scope switcher | Chooses the facility or organisation the reports cover. |
| Report tiles | Select a tile to show that report. |
| Download | On Histology Correlation and Registry Transmission. Saves the table as a spreadsheet file. Your role must allow it. |
| Print | On Histology Correlation. Opens a printable page headed with the scope and the date generated. |
| Submit panel | In the Proficiency test panel. Records your answers. |
| Apply simulated result | Beside a submitted panel. Grades it against a built-in key for demonstration. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Outlier, Exceeded, Fail, Flagged | Red badges: a figure outside its limit. |
| Pass, Satisfactory, Concordant | Green badges. |
| Simulated | The result came from the demonstration key, not from a provider. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Quality Assurance**, choose **Cytology QA**.
2. Set the scope, then select a report tile.
3. Read the card or table. Select **Download** or **Print** where offered.

### Alternative workflow

1. Record a proficiency test. Select **APAC Proficiency Testing**. In **Proficiency test panel** type the **Provider** and the **Event reference**. For each challenge slide set the slide ID and choose **Your response** (Negative, LSIL, HSIL, Carcinoma or Unsatisfactory). Select **Submit panel**. "Panel submitted." appears.
2. To see a graded example, select **Apply simulated result** on the submitted row.

### Exception handling

1. If the panel will not submit it names what is missing: the provider, the event reference, at least one challenge slide, or a response for every slide.
2. A registry other than yours shows no rows; choose the right **Registry**.

### Error recovery

1. If a report stays on the loading message, refresh the page.

## Tips and Best Practices

### Common mistakes

- Reading simulated proficiency results as provider grades. They are not counted in the rates.
- Comparing screeners with very few cases.

### Efficiency recommendations

- Leave the scope on the whole enterprise and change tiles only.

### Workflow recommendations

- Review Workload Tracking and Unscreened Backlog daily, the agreement reports monthly.

## Known limits

- Proficiency test grading here is a demonstration. A real provider's grade is meant to arrive through an interface; until then Apply simulated result is marked Simulated.
- The Workload Tracking table shows the screener's user number rather than a name under Cytotechnologist.

## Related Features

### Upstream workflow

- [Cytology Worklist](help:cytology) and [Screening Case](help:cytology/screening-case): where the results are produced.

### Downstream workflow

- [Quality & Compliance](help:quality): deficiencies raised from these findings.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| A report is empty | Nothing recorded for the chosen scope. |
| Download is greyed out | Your role does not allow the export, or there are no rows. |

### Resolution steps

1. Widen the scope.
2. Refresh the page.

### When to contact support

Contact your laboratory's PathScribe support when a figure disagrees with the cases. Have the report name and scope ready.
