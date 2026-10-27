---
module: Search
workflow: Finding a case
role: [Pathologist, Pathology Assistant, Accessioner, Laboratory Manager, Quality Staff]
keywords: [search, find case, patient search, accession number, completed cases, filters]
routes: [/search]
previous: home
next: worklist
related: [worklist, report]
status: Draft
---

# Case Search {#top}

## Overview

**Purpose.** Case Search finds cases that are not in front of you on the Worklist: completed cases, cases from other pathologists, and cases from earlier months. You fill in as many or as few filters as you need, run the search, and open a case from the results. It can also export the results to a spreadsheet file and group them into a report.

**Intended users.** Pathologists, pathology assistants, accessioners, laboratory managers and quality staff. You only find cases you are allowed to see; cases outside your organisation or pools you do not belong to do not appear.

**Where it fits.** Search is opened from Home. It complements the [Worklist](help:worklist), which shows your own pending work. A case opened from the results opens in the [Report](help:report) screen.

## Screen Tour

![The Case Search screen with the filter panel on the left and the results on the right](capture:search-overview)

!!! note "Demonstration data"
    In this version search runs over demonstration cases. Many filters (holds, locations, intake, payer, autopsy details, result flags) match nothing in the demonstration data, so an empty result for those filters does not mean the filter is broken. The Quick Links window lists a few example links, not your laboratory's own.

The screen has a filter panel on the left (it collapses to a narrow bar after you search, so the results have room) and the results on the right under a summary line.

### Field definitions

| Field | What it means |
|---|---|
| Which date (Accession date, Sign-out date, Release date) and 7d / 30d / 90d / 1 yr / All, From, To | The date range, and which date it applies to. The range starts at the last 30 days. **All** removes the limit; it may take longer when a laboratory has years of records. |
| Identifier | One box for an accession number, patient name, MRN or other number. A badge beside the text shows what PathScribe took it for: Accession #, MRN, MPI ID, Patient Name, Requisition #, Slide Barcode or All fields. A name, MRN or accession number you type searches all dates unless you chose a date range yourself. |
| Case Type | Surgical, Gyn cytology, Non-gyn cytology, Autopsy. |
| Patient Demographics | Gender (Male, Female, Unknown), Age (years) minimum and maximum, and Date of Birth from and to. |
| Status | The case status, for example Awaiting Grossing, Gross Complete, In Progress, Awaiting Sign-off, Awaiting Countersign, Pending Release, Needs Revision, Completed. Choose one or more. |
| Priority | Routine, Rush, STAT. |
| Flags / Comp Flags | Case flags, and flags set from laboratory-system test results. Use **Browse** to pick from the list. |
| Synoptic Protocol | Cases that have a synoptic report from the chosen protocol. |
| Synoptic answers | Cases where a synoptic question has a given answer ("is", "is not", "contains", "is at least", "has been answered" and so on). Every answer filter must match. Use **Add answer filter**. |
| Pathologist, Attending Physician | The pathologist on the case (with a choice of role on the case), and the referring or attending physician. |
| Specimen | Specimen types, searched or picked from the specimen list. |
| Diagnosis | Words in the diagnosis, for example "Carcinoma". Press Enter or the add button to add each term. |
| SNOMED CT, ICD Codes | Search by clinical code. ICD systems that your laboratory has not switched on are not offered. |
| Facility | The submitting facility. A parent organisation includes the sites under it. |
| More filters | Subspecialty, Performing lab, Location, Intake, Billing type / payer, CPT codes, Revisions (amended, corrected, addended), Holds, Result flag (Abnormal, Critical, Malignant), Pending work (Stains, IHC, Molecular, Add-on orders), Past TAT target, and the Autopsy filters. |
| Summary line | In words, what the results show, for example "Showing cases with status: Completed · priority: STAT". |
| Result count | For example "1-25 of 63 cases". |

**Hints and messages inside the filters**

- The summary line says "Set filters and press … to begin" before the first search (the button named is **Search Cases**), and "Showing all cases" when a search has no filters.
- Hints in the empty boxes: Identifier shows "Accession #, patient name, or MRN…"; Specimen shows "Search specimen dictionary…"; SNOMED CT shows "Search concept or description…"; ICD shows "Search ICD-10 code or description…". The save box shows "Name this search…".
- **Browse windows.** Each **Browse** button opens a window with a title, a one-line subtitle and a search box. Facility: "Filter cases by submitting facility", with the box "Search by facility name…". Pathologist: "Filter by assigned pathologist". Flags: "… available flags" (the number of flags you can choose from), with the box "Search flags…". SNOMED CT: "Search across … axes: …" (the number of concept groups and their names). ICD: "Select codes across active ICD systems"; if your administrator has switched every system off it says "No ICD systems are enabled." and tells you where to turn them on. When a code search needs a system, its box reads "Search … codes or descriptions…" with the system name. A search with no answer shows "No results for …" and "Try a shorter or different search term".
- **Computational Flags** window. Subtitle "Filter by live LIS test result flags", with the box "Search by test name…". Each row is marked "Computational / LIS flag": these flags come from laboratory-system test results rather than from a person.
- The hospital box in a user list reads "Search by hospital…".

### Toolbar

| Button | What it does |
|---|---|
| Search Cases | Runs the search with the filters you set. It reads "Searching..." and is greyed out while a search runs. |
| Clear | Resets every filter to the start (last 30 days) and empties the results. |
| Collapse filters / Expand filters | The arrow at the edge of the panel hides or shows the filters. |
| + Save Search | Names the current filters and saves them. Saved searches appear as buttons at the top of the screen; selecting one loads its filters and runs it. The small x removes it. |
| Cases / Report | Switches between the list of cases and a report of the same search (see Alternative workflow). |
| Sort | Orders the results: Accession date (newest or oldest first), Accession number, Patient name (A-Z), Recently updated, Sign-out date (newest first). |
| Export CSV | Saves every matching case, up to the export limit, as a spreadsheet file. Greyed out if your role may not export. |
| Reassign Patient | Select it, then click the result whose patient you want to change (a click would otherwise open the case). With a row already highlighted by the keyboard it opens the panel at once. See Exception handling. |
| First, Previous, Next, Last and Per page (25, 50, 100) | Page through long results. Your page size is remembered. |

**Report view controls** (after you select **Report**)

- **Group by** chooses what the rows are grouped by, including "No grouping (list the cases)". Each group row shows its case count, its share and **Median days to sign-out**; select the group name ("Show the cases in this group") to open its cases under it, with "Loading the cases…" while they load.
- **Columns** opens the column choices. **Case columns** are the standard ones (accession, patient name, pathologist and so on); under **Synoptic answers**, "Choose a protocol…" adds answers from one synoptic protocol. A counter reads "Columns: … of …" (how many you have of the most allowed), and the arrows beside each chosen column move it up or down.
- **Saved reports** lists reports you saved; choosing one applies its search, grouping and columns ("Report loaded: its search, grouping and columns are applied."). To save, type a name in "Name this report" and select **Save report**. "Report saved." confirms it. If the name is empty you see "Give the report a name."; if it fails, "The report could not be saved." **Delete saved report** appears once a saved report is selected and removes it.
- **Export report CSV** saves the report as a spreadsheet file, shown only when there are cases. If it fails you see "The report could not be exported."; if the file would be cut short you see "Only the first (n) of (N) cases are in the file."
- Before any search the Report view says "Run a search to see its report." While it works it says "Building the report…".
- **Schedules** opens the scheduled reports panel, described under Alternative workflow.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Filter count at the top (for example "3 filters") | How many filters you have set. |
| Identifier badge | What kind of value PathScribe thinks you typed. |
| Chips with an x | A term you added (specimen, diagnosis, code). Select the x to remove it. |
| Status dot, urgent dot, flag chips, lock | The same indicators as on the [Worklist](help:worklist). |
| "No search run yet" | Nothing has been searched since you opened the screen or pressed Clear. |
| "No cases match" | The search ran and found nothing. |

### Hotkeys

| Action | Key |
|---|---|
| Run the search | Alt+E |
| Clear the search | Alt+C |
| Next row / previous row in the results | Alt+Down Arrow / Alt+Up Arrow |
| Ten rows down / up | Alt+Page Down / Alt+Page Up |
| First / last row | Alt+Home / Alt+End |
| Open the selected case | Alt+Enter |

On this screen Alt+C clears the search; elsewhere it opens Configuration (reach it from here with Alt+J, then C).

## Step-by-Step Procedures

### Standard workflow

1. Open Search from Home. The filter panel is open and the dates are set to the last 30 days.
2. Type what you know into **Identifier**: an accession number, a patient name or an MRN. A badge shows how PathScribe read it.
3. Add other filters if you need them, such as Status, Priority or Pathologist.
4. Select **Search Cases** (or press Alt+E). The panel folds away and the summary line says what is being shown, with the count beneath it.
5. Select a row to open the case. (With the keyboard, move to a row with Alt+Down Arrow and press Alt+Enter.)
6. When you leave the case and come back to Search, your last filters and page are restored and the search runs again.

### Alternative workflow

**Find a case by scanning.** Scan a slide barcode into the Identifier box. PathScribe opens the case straight away, at the right specimen if the barcode carries one, without running a search.

**Reuse a search.** Set your filters, select **+ Save Search**, type a name and select **Save** (or press Enter). Next time select the saved search at the top.

**Make a report.** After searching, select **Report**. Choose how to group the cases (pathologist, month, diagnosis, facility, case type, status, priority or subspecialty), choose the columns, and export the report as a spreadsheet file if your role allows. You can save a report and schedule it.

**Export results.** Select **Export CSV**. If there are more matches than the export limit, a message says "Exported the first n of N matching cases".

**Schedule a saved report.** Select **Report**, then **Schedules**. A schedule runs a *saved* report, so save one first (otherwise the panel says "Save a report first").

1. Under **New schedule**, choose the saved report from "Choose a saved report…".
2. Choose how often: daily, weekly or monthly. For weekly set the **Day of the week**; for monthly the **Day of the month** (1 to 28). Set the time of day.
3. Optionally tick "Cover the most recent days each run, instead of the saved dates", then set **Days to cover** (from 1 to 366). Leave it unticked to use the dates saved with the report.
4. Tick the people under "Recipients (… of …)": the label shows how many you have chosen out of the most allowed. "Checking what each recipient can see…" appears while PathScribe compares each person's access with the report. If a person cannot see every case, you are asked to narrow the report for them or skip them; PathScribe does not choose for you.
5. Select the create button. Each schedule is then listed with its pattern ("Every day at …", "Every … at …", or "Day … of each month at …"), "Covers the last … days", the number of recipients, and the next run.

Each listed schedule shows when it last ran ("Not run yet" before the first run, or "Last run failed: …"), and has **Run now (Simulated)**, **Pause** (it then reads **Resume**) and **Delete**. "No schedules yet." means none exist and "Loading schedules…" appears while the list is read. "The schedule could not be saved." means the form was refused for a reason not named; check each box and try again.

!!! warning "Scheduled reports are not delivered yet"
    A schedule is kept and **Run now (Simulated)** builds the report and records its counts, but nothing is emailed or filed. The panel marks runs as Simulated. Do not rely on a schedule to reach anyone until your laboratory announces that delivery is switched on.

### Exception handling

1. **A case you know exists is missing.** Check the date range (the default is 30 days; select **All**), the date type (Accession, Sign-out or Release date), and the access rules: you only see cases you are allowed to see.
2. **A case was attached to the wrong patient.** Select **Reassign Patient**, then click the result (or highlight its row with Alt+Down Arrow or Alt+Up Arrow first, then select the button). Search for the correct patient by name, MRN or date of birth, select **Select**, then **Move Case** and confirm. The window warns that the change cannot be undone automatically. If the case has no resolved patient identity the panel says so.
3. **A restricted case.** Pediatric, Outreach and pool cases you cannot open show a lock; follow the request-access steps on the [Worklist](help:worklist).
4. **An ICD or SNOMED browse window says no systems are enabled.** Your administrator controls which code systems are on (Configuration, System Settings).

!!! note "Known limits"
    Scheduled reports are not delivered (see Alternative workflow). When you move a case to another patient the window confirms with "Case moved to …" followed by the encounter result ("Encounter outcome: …"), or "Move failed: …" with the reason.

Reassign Patient details: the window is titled **Reassign Case to a Different Patient** and asks "Move this case to which patient?". After you select the patient and **Move Case**, the question **Confirm Patient Reassignment** asks you to confirm with **Confirm Move**.

### Error recovery

1. If you see "The search could not be run. Please try again.", select **Search Cases** again.
2. If a saved search cannot be saved or removed, a message says so. Try again.
3. If an export fails you see "The export could not be created. Please try again." If it says you do not have permission, ask your manager.
4. To start over, select **Clear**.
5. If you moved a case to the wrong patient, move it again to the correct one; the first move is recorded and cannot be undone automatically.

## Tips and Best Practices

### Common mistakes

- Searching a case from last year with the default 30 days. Choose a wider range or **All**, or type the accession number or MRN, which ignores the default range.
- Setting many filters at once and getting nothing. Remove filters one at a time to see which one removes the case.
- Changing filters and then paging. Paging and Export use the filters of the search that produced the results on screen, not edits you have made since. Select **Search Cases** again to apply the edits.
- Expecting every filter to work with the demonstration data (see the note above).

### Efficiency recommendations

- Type the accession number, MRN or name and press Enter in the box; use other filters only when needed.
- Save the searches you repeat, such as "STAT cases past TAT target".
- Use Alt+E, Alt+Down Arrow and Alt+Enter to search and open cases without the mouse.
- Choose 50 or 100 per page for long lists.

### Workflow recommendations

- Use the Worklist for today's work and Search for everything else.
- Quality staff can combine Revisions, Past TAT target and Result flag with the Report view to review a period.
- Laboratory managers can group a month of cases by pathologist or subspecialty in the Report view.

## Related Features

### Upstream workflow

- [Home](help:home): where Search is opened.

### Downstream workflow

- [Worklist](help:worklist): your pending cases.
- [Report](help:report): the screen a result opens in.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "Set filters and press Search Cases to begin" | No search has been run yet. |
| "No cases match" | The filters, date range or date type exclude the case, or you may not see it. |
| Export CSV is greyed out or refused | Your role may not export search results. |
| A filter finds nothing at all | The demonstration data does not carry that information. |
| The Reassign Patient button is missing | There are no results yet. |

### Resolution steps

1. Press Clear and search again with only the identifier.
2. Widen the date range or choose All.
3. Check the date type.
4. Reload the page and repeat the search.

### When to contact support

Contact your laboratory's PathScribe support when a case you can open from the Worklist cannot be found by its accession number in Search, or when searches keep failing. Have the accession number and the time of the problem ready.
