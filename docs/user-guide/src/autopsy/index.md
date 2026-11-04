---
module: Autopsy
workflow: Quality and compliance oversight
role: [Lab Director, QA Reviewer, Laboratory Manager, Administrator]
keywords: [autopsy, autopsy dashboards, PAD, FAD, preliminary anatomic diagnosis, final anatomic diagnosis, turnaround, consent, organ retention, cause of death, overdue, enterprise, department]
routes: [/autopsy-dashboards]
previous: quality
next: outbound-queue
related: [quality, worklist, report, registry-exceptions, autopsy/authorization-and-body-release]
status: Draft
---

# Autopsy Dashboards {#top}

## Overview

**Purpose.** The Autopsy Dashboards screen shows how the autopsy service is performing. It answers four questions at three levels: are the preliminary (PAD) and final (FAD) anatomic diagnosis reports being signed on time, what is the state of consent, how much tissue is being kept (organ retention), and what are the causes of death. The three levels are **Case** (one autopsy against its targets), **Department** (one facility, with the reports overdue right now) and **Enterprise** (every facility and jurisdiction side by side).

**Intended users.** Laboratory directors, quality reviewers, administrators and anyone your laboratory has given the "Open Autopsy Dashboards" permission. The screen is for oversight. It does not change a case, sign a report or send a reminder.

**Where it fits.** Open it from Home, then **Quality & Compliance**, then the **Autopsy Dashboards** tile. The cases themselves are worked in the [Worklist](help:worklist) and the [report](help:report) screen. The screen reads those cases and the turnaround targets your laboratory has set, and works out the figures every time you open it.

!!! note "Demonstration data today"
    Simulated cases are switched on by default. They give a demonstration site enough volume for a percentage to mean something. They carry ids beginning **SIM-A**, their facility names end in "(Simulated)", and a banner says how many are included. They are not real patients, and nothing about them is written to the audit log. Tick off **Include Simulated cases** to see only real cases. Real autopsy cases have no recorded cause of death yet, so they are counted as "Not recorded" (see Field definitions). The figures come from the cases held in this browser session in the demonstration build; the reporting store for a live installation is not built yet.

## Screen Tour

![The Autopsy Dashboards at Enterprise level with the four panels and the facility and jurisdiction tables](capture:autopsy-overview)

At the top are the title and a one-line description, then three controls: the level tabs, the **Period** choice and the **Include Simulated cases** tick box. Under them, a level-specific picker (for Case and Department), the four panels, and then, for Department and Enterprise, an extra table.

### Field definitions

**Controls**

| Field | What it means |
|---|---|
| Case / Department / Enterprise (tabs) | The level of the dashboard. It opens on Enterprise. |
| Period | **Last 30 days**, **Last 90 days** (the default), **Last 12 months** or **All time**. A case belongs to the period by the date the body arrived, not by the date a report was signed. |
| Include Simulated cases | On by default. Adds the demonstration cases to every figure. |
| Case (picker, Case level) | Lists the cases in the period, newest arrival first. It opens on the most recent. Simulated cases show "Simulated" after the id. |
| Department (picker, Department level) | Lists the facilities that have cases in the period, in alphabetical order. It opens on the first. |

**Case detail (Case level only)**

| Field | What it means |
|---|---|
| Facility | The facility the case belongs to. |
| Authority | **Hospital (consented)** or **Statutory / judicial** (for example a coroner's or forensic case). |
| Body arrived | The date and time the clock started (see "How the turnaround clock works" below). |
| Preliminary (PAD) / Final (FAD) | A coloured badge, then "X h of Y h": hours used so far against the whole window. If the case spent time on ancillary hold (for example waiting for toxicology), "N h on hold not counted" is added. |

**Turnaround panel** (one block for **Preliminary (PAD)** and one for **Final (FAD)**)

| Field | What it means |
|---|---|
| "N% within target" | Of the reports that are decided, the share signed inside the target. A report is *decided* once it is signed (on time or late) or has gone overdue unsigned. It reads "No reports decided yet" when there are none. |
| "X of Y decided" | X reports were signed on time out of Y decided. |
| "N open" | Reports not yet signed and not yet overdue (badges **On track** and **Due soon**). |
| "N overdue" | Reports not signed and past their deadline. Shown in red when above zero. |
| "median N h" | The middle value of the hours taken, for reports that were signed (on time or late). With an even number of reports it is the average of the two middle values, rounded. Hold time is removed. It is left out when no report is signed. |

**Consent panel.** A bar and a count for each of **Consent in force**, **Narrowed**, **Consent revoked** and **Not applicable (statutory)**. Statutory or judicial cases are always counted as not applicable. A hospital case with no consent record counts as in force.

**Organ retention panel.** A bar and a count for **No tier recorded**, **Tier 0: none kept**, **Tier 1: diagnostic tissue only**, **Tier 2: full organs** and **Tier 3: education, research, genomic**.

**Cause of death panel.** One bar per broad category (Cardiovascular, Respiratory, Infection, Neoplasm, Neurological, External causes, Undetermined, Not recorded), largest first. A note explains that a case without a recorded cause is counted as not recorded, and that a live case holds its cause in the signed report text.

For the consent, retention and cause bars, the bar length is the count divided by the number of cases at that level, so the bars show shares of the whole.

**Reports overdue now (Department level only)**

| Field | What it means |
|---|---|
| Case id and "PAD overdue by N h" | The report the case is working towards that is past its deadline, longest overdue first. "Nothing is overdue." appears when the list is empty. |

**By facility and By jurisdiction (Enterprise level only)**

| Column | What it means |
|---|---|
| Cases | Cases in the period for that facility or jurisdiction. |
| PAD in target / FAD in target | The "within target" percentage described above, or a dash when nothing is decided yet. |
| Overdue now | Cases whose PAD or FAD is overdue. Red when above zero. |
| Consent revoked | Cases whose hospital consent has been revoked. |

The tables list the largest group first.

**How the figures are worded**

The numbers replace the braces in these lines.

| Line | What it means |
|---|---|
| median {{hours}} h | On the panels: the middle time in hours for signed reports. |
| {{within}} of {{decided}} decided | On the panels: how many of the decided reports met the target. |
| {{tier}} overdue by {{hours}} h | In the Department list of overdue reports: PAD or FAD, and how far past its deadline. |
| {{elapsed}} h of {{target}} h | On a Case: hours used against the target for that report. |

Where the case details are shown, a link to the window for finishing the paperwork is in [Authorization and Body Release](help:autopsy/authorization-and-body-release).

### How the turnaround clock works

- **Clock start.** Body arrival: the earliest specimen receipt time on the case, otherwise the order's received date, otherwise the time the case was created.
- **Target.** If your administrator has set an active "Autopsy PAD" or "Autopsy FAD" turnaround rule (calendar hours, which can differ by facility), that rule is used. Otherwise the target for the case's jurisdiction is used. For example, in the United States the PAD is due within 2 working days and the FAD within 60 days; in England and Wales the PAD is due within 48 hours and the FAD within 21 working days. A range counts to its upper end.
- **Working days.** Saturdays and Sundays are skipped. Public holidays are not known, so a working-day target can only come out later than it should, never earlier.
- **Hold time.** Time on ancillary hold is added to the deadline and taken off the hours used.
- **Verdict.** Once signed: **Target met** or **Signed late**. Not yet signed: **Overdue** after the deadline, **Due soon** in the last fifth of the window, otherwise **On track**.
- **The PAD and the FAD.** Each has its own deadline from the same start time. A case works towards its PAD until the PAD is signed, then towards its FAD. The Reports overdue now list shows only that current report, so a FAD that is past its deadline while the PAD is still unsigned is counted in the totals but is not yet listed as someone's task.

### Toolbar

There is no toolbar, no export and no print button. The three controls at the top are the only buttons on the screen. There is no Refresh button either: the figures are worked out when the screen opens, so open it again to bring them up to date.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| **Target met** badge | The report was signed inside its target. |
| **Signed late** badge | The report was signed after its deadline. |
| **On track** badge | Not signed, plenty of time left. |
| **Due soon** badge | Not signed, in the last fifth of the window. |
| **Overdue** badge or red numbers | Past the deadline and not signed. |
| **Simulated** tag | A demonstration case. Never a real patient. |
| Banner "N Simulated cases are included…" | Simulated cases are in the figures. |

### Hotkeys

None. The screen has no keyboard shortcuts of its own.

## Step-by-Step Procedures

### Standard workflow

1. From Home, open **Quality & Compliance**, then **Autopsy Dashboards**. The screen opens at **Enterprise** level for the last 90 days, with Simulated cases included. If your role cannot open the screen, you see a short "no access" page with a way back to Home.
2. Decide whether you want demonstration cases. For real figures only, untick **Include Simulated cases**. The banner disappears and every figure recalculates.
3. Choose a **Period**. The figures recalculate at once. If nothing falls in the period you see "No autopsy cases in this period."
4. Read the Enterprise tables. Look at **Overdue now** and the two "in target" columns for each facility and each jurisdiction.
5. Select the **Department** tab, then pick a facility. The four panels now describe that facility only, and **Reports overdue now** lists each late case.
6. Select the **Case** tab, then pick a case. The case detail shows its two badges and the hours used against each target.
7. To act on an overdue case, open it from the [Worklist](help:worklist) (the case id is shown in the list; the dashboard does not open the case itself).

### Alternative workflow

1. For a monthly or quarterly review, work from the top down: Enterprise (which facility or jurisdiction is the problem), then Department (which cases), then Case (why: look for hours on hold).
2. To compare a recent period with a longer one, switch **Period** between Last 30 days and Last 12 months and note the change in the "within target" percentages.

### Exception handling

1. **A case seems missing.** The period uses the body arrival date. A case that arrived 100 days ago does not appear under Last 90 days. Choose Last 12 months or All time.
2. **A case has no arrival time at all.** It is left out of the dashboards, because the clock cannot start.
3. **A facility you expect is not in the Department picker.** The picker lists only facilities that have cases in the period and the Simulated setting you chose.
4. **The cause-of-death panel is mostly "Not recorded".** Expected for real cases today. Only Simulated cases carry a cause category.

### Error recovery

1. If the figures look out of date, open the screen again; there is nothing to refresh on it.
2. If you change facility or period and the case you were looking at disappears, the Case picker moves to the most recent case in the new view. Choose the case again.
3. If a target looks wrong (for example a 48-hour PAD you expected to be 24), ask your administrator to check the Autopsy PAD and Autopsy FAD turnaround rules and the case's jurisdiction. Do not work around it by changing dates on the case.

## Case Timeline on an autopsy case

On the Report screen of an autopsy case, the **Case Timeline** lists what happened to the case in order. When nothing has happened it says "No events recorded yet." Each line names who did it; if the person cannot be identified the line says "an unknown person".

Lines you may see include:

- Next-of-kin consent given by (name), and "Consent status changed to (status)".
- Verbal order received from (name), and "Written authorization on file" with its reference.
- Toxicology ordered, cancelled, or result received, each with the specimen barcode.
- Organ/tissue retained by (recipient) at (location), "Organ/tissue disposed of" with the method, and a line for each organ tag.
- An item transferred from one person to another (custody transfer).
- **Ancillary hold started** and **Ancillary hold ended**.
- A report tier signed by (name), and "Addendum added by (name)".
- A tier signed over a blocked authorization gate, with the reason that was given.

The timeline is read-only.

## Tips and Best Practices

### Common mistakes

- Quoting a percentage that includes Simulated cases. On a live system, untick the box first.
- Reading "within target" as including reports still open. Only decided reports are counted; open ones appear separately.
- Reading the Enterprise "Overdue now" as the number of late reports. It counts cases, so a case with both reports overdue counts once.
- Expecting hold time to make a case late. It does the opposite: hold time is not counted.

### Efficiency recommendations

- The Enterprise level is the quickest health check: scan the Overdue now column for anything above zero.
- Keep the period at 90 days for day-to-day review and use All time only for annual figures.

### Workflow recommendations

- Review the Department level weekly and chase every case under Reports overdue now.
- Treat a rising "Consent revoked" count as a prompt to check that retained tissue for those cases has been dealt with.
- Quality staff can cite the median hours and percentages in management review, with the period stated.

## Related Features

### Upstream workflow

- [Worklist](help:worklist): where autopsy cases are tracked day to day and carry their own turnaround chip, worked out the same way.
- [report](help:report): where the PAD and FAD are signed. Signing is what stops each clock.
- [Quality](help:quality): the Quality & Compliance area that holds this screen.

### Downstream workflow

- [Registry Exceptions](help:registry-exceptions) and [Outbound Queue](help:outbound-queue): the other oversight screens in the same area.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Autopsy Dashboards tile in Quality & Compliance | Your role does not hold the permission to open the screen. By default administrators, laboratory directors and quality reviewers have it. |
| "No autopsy cases in this period." | No case arrived in the chosen period, or Simulated cases are off and there are no real autopsies. |
| Every figure shows "No reports decided yet" | No report in the period has been signed or gone overdue. |
| Case ids start with SIM-A | They are Simulated cases. |
| A deadline differs from the one on the Worklist chip | It should not, since both use the same rule. Report it to support with the case id. |
| Cause of death is "Not recorded" for real cases | Real cases hold the cause in the signed report text, not as a field the dashboard can count. |

### Resolution steps

1. Check the Period and the Simulated tick box.
2. Open the screen again to reload the cases and targets.
3. Compare the case with its row in the Worklist.
4. Ask your administrator to check the turnaround rules and your role's permissions.

### When to contact support

Contact your laboratory's PathScribe support when a real case is missing from every period, when a deadline disagrees with the Worklist, or when the screen shows an error instead of figures. Have the case id (not the patient's name) and the time ready.
