---
module: Migration Jobs
workflow: Go-live and data conversion
role: [Laboratory Manager, Administrator]
keywords: [migration, legacy import, historical data, import legacy file, csv, cross-validation, source system, draft cases, needs review, simulated import]
routes: [/migration-jobs]
previous: audit-log
next: demonstration-tools
related: [audit-log, accession, search]
status: Draft
---

# Migration Jobs {#top}

## Overview

**Purpose.** Migration Jobs is where records from a laboratory's old information system are brought into PathScribe, and where you check how each import went. Every import is a job. The screen lists the jobs, shows how many records succeeded, failed or need review, and checks the count against the number the old system claimed.

**Intended users.** Laboratory managers and administrators who convert historical data. The screen needs Configuration access. The **Import legacy file** button also needs the permission to manage migration mappings.

**Where it fits.** Before any import, an administrator sets up field mappings for the old system under Configuration (Migration field mappings): which old field name becomes which PathScribe field. You then import a file here. Records that succeed can become draft cases. Records whose patient cannot be matched with certainty are sent to the Patient Match Review queue rather than guessed.

!!! warning "This import is a simulation today"
    The import runs in your browser as a demonstration. The screen says so in a banner: "Simulated bulk import. Records are mapped, validated and matched to patients here in the browser, and records that succeed become draft cases marked Simulated. A server-side bulk import replaces this. The file itself is not kept." Do not use it as the real conversion of a laboratory's history.

!!! note "No link leads here"
    No button or tile in PathScribe opens this screen. You reach it by its address, `/migration-jobs`, or your administrator gives you the link. The screen has an Administrator Guide Help button, and you can press F1 for this page.

## Screen Tour

![The Migration Jobs list with the Import legacy file button](capture:migration-jobs-overview)

The screen is titled **Historical Data Migration Jobs**. Under the title is a Help button for the Administrator Guide, then the **Import legacy file** button, then the list of jobs.

### Field definitions

**The job list**

| Item | What it means |
|---|---|
| Source system name | The old system the records came from, as named when the mappings were set up. |
| Status tag | Pending, Running, Completed, Completed with Errors or Failed. |
| Simulated tag | The job was a simulated import. |
| Cross-validation discrepancy | A warning tag. The number of records processed differs from the number the old system claimed. |
| Counts | "(n) ok · (n) failed · (n) review". |
| "No migration jobs on file." | Shown when nothing has been imported. |

**The job window** (select a row)

| Item | What it means |
|---|---|
| Heading | The source system and the job status. |
| Simulated banner | "Simulated bulk import: the draft cases from this job are marked Simulated." |
| Cross-validation | Reconciled (all claimed records processed), Discrepancy (claimed and processed counts, how many missing or extra), or "No claimed source count on file, cannot reconcile". |
| Counts line | "(n) succeeded · (n) failed · (n) need review (of n processed)". |
| Records needing attention | Each failed record with its error message, and each record that "Needs MPI review". |
| Records | Every record with its outcome (Succeeded, Failed, Needs MPI review) and, for a success, "Draft case (number)". |

**The Import legacy file window**

| Field | What it means |
|---|---|
| Source system | The old system. Only systems with active field mappings are listed. If there is just one, it is chosen for you. |
| Legacy file (CSV or the other accepted data format) | The file to import. The window lists the accepted file types: comma-separated (.csv), tab-separated (.tsv), plain text (.txt) and one structured-data format. |
| Record count claimed by the source system (optional) | The count the old system reports. If you give it, the job checks it against the records processed. |
| Create draft cases from succeeded records | A tick box, on at first. |

### Toolbar

| Button | What it does |
|---|---|
| Import legacy file | Opens the import window. Greyed out without the permission. |
| Run import | Starts the import. Greyed out until a system and a readable file are chosen. |
| View job | After an import, opens the job's window. |
| Cancel / Close | Leaves the import window. |
| Help | Opens the Administrator Guide at this screen, in a new tab. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Grey Pending | The job exists but has not started. |
| Blue Running | The job is in progress. |
| Green Completed | Every record was processed without errors. |
| Amber Completed with Errors | Some records failed or need review. |
| Red Failed | The job failed. |
| Amber or red text next to a record | Needs MPI review (amber) or Failed (red). |

**Records list.** Under **All records** each source record is listed with its outcome and, when it became a case, the case number. "No record results on file." means no record outcomes have been kept for this job.

### Hotkeys

| Key | Action |
|---|---|
| F1 | Opens this User Guide page in a new tab. |

## Step-by-Step Procedures

### Standard workflow

1. Confirm with your administrator that the field mappings for the old system are active. If none are, the import window says "No source system has active field mappings yet. Add them under Configuration → Migration field mappings, then import a file."
2. Open Migration Jobs and select **Import legacy file**. The import window opens with the Simulated banner.
3. Choose the **Source system**.
4. Select the file. A line appears, for example "250 records with 18 fields read from the CSV file". If some values were lists or groups inside a record, a second sentence reads "Nested values left out: {{count}}." with the number in place of the braces; those values are not imported, only the plain fields. A CSV needs a first row of field names; a structured-data file must hold a list of records. The limit is 2000 records per file.
5. Optionally type the count the old system claims.
6. Leave **Create draft cases from succeeded records** ticked unless you only want to test the mapping.
7. Select **Run import**. "Importing records…" shows while it runs.
8. When it finishes the window shows the counts, the number of draft cases created (Simulated), records skipped because their legacy accession number was already imported, and any source fields no mapping covers.
9. Select **View job**. The job window shows the cross-validation result and the records needing attention.

### Alternative workflow

1. To check an earlier import, select its row in the list. The job window opens.
2. To test a mapping without creating cases, untick **Create draft cases from succeeded records**.

### Exception handling

1. **Records need MPI review.** The patient could not be matched with certainty. They are in the Patient Match Review queue (the Quality Assurance group **Patient Match Review** in the [Audit Log](help:audit-log), and the quality queue). Resolve them there.
2. **Discrepancy tag.** Compare the claimed and processed counts in the job window. Extra or missing records usually mean the file was cut off or contained duplicates. Find the missing ones in the old system and import a corrected file. Records already imported are skipped by their legacy accession number, so re-importing does not duplicate them.
3. **Failed records.** Read each error message under Records needing attention. Fix the data or the mapping, then import a corrected file.
4. **Source fields no mapping covers.** Ask the administrator to add mappings.

### Error recovery

The import window shows one of these messages in red.

1. "Choose a source system." Choose one.
2. "Choose a .csv, .tsv, .txt or structured-data file." Pick a different file type.
3. "The file could not be read." Check the file opens on your computer.
4. "The file is empty." or "The file has no records." Check the export from the old system.
5. "The first row has no field names." Add the header row to the CSV.
6. A message that the structured-data file is not valid, or must be a list of records (or an object holding a list called "records"). Correct the file's structure.
7. "The file has more than 2000 records." Split it into smaller files.
8. "This source system has no active field mappings." Ask your administrator.
9. "You do not have permission to import legacy records." Ask your laboratory manager.
10. "The import job could not be started." Try again; if it repeats, contact support.

!!! warning "Imported cases are drafts, and they are real cases in your list"
    Draft cases made by an import appear in PathScribe like other cases, marked Simulated. Check a sample against the old system before anyone works on them, and never report from an unchecked imported case.

## Tips and Best Practices

### Common mistakes

- Importing before the mappings are checked. A wrong mapping fails or mis-files every record.
- Ignoring the Discrepancy tag. It means the number of records does not match what the old system says.
- Importing everything in one file. Smaller files are easier to check, and the limit is 2000 records.
- Expecting the file name to be kept. It is not shown or recorded, because a file name can contain a patient name.

### Efficiency recommendations

- Type the claimed count every time. The cross-validation is only possible with it.
- Test with a small file and **Create draft cases** unticked first.

### Workflow recommendations

- Keep one list of what was imported, when, by whom and from which system. The job list shows the source system and counts but not who ran it.
- Review "Records needing attention" the same day, while the old system is still at hand.

## Related Features

### Upstream workflow

- Migration field mappings, set up by your administrator under Configuration.

### Downstream workflow

- [Search](help:search): find imported cases.
- [Audit Log](help:audit-log): the Patient Match Review record and the system entries for the import.
- [Accession](help:accession): where ordinary new cases are logged.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The screen is not reachable | You lack Configuration access, or you need the address. |
| Import legacy file is greyed out | You lack the permission to manage migration mappings. |
| The source system list is empty | No system has active field mappings. |
| Run import is greyed out | No system, no readable file, or the file has a problem shown in red. |
| No draft cases were created | The box was unticked, or every record failed or was already imported. |

### Resolution steps

1. Read the red message in the import window.
2. Open the job and read Records needing attention.
3. Check the mappings with your administrator.
4. Import a corrected, smaller file.

### When to contact support

Contact your laboratory's PathScribe support when a job stays Running or Failed, counts do not add up, or draft cases look wrong. Have the source system name, the time of the import and the job's counts ready.
