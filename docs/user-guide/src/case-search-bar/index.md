---
module: Case Search Bar
workflow: Everyday navigation
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager, Quality Staff]
keywords: [search bar, scan, barcode, accession, MRN, find case, header search, support reference]
routes: []
previous: case-flags
next: session-and-connection
related: [search, report, worklist, case-flags, personal-settings]
status: Draft
---

# Case Search Bar {#top}

## Overview

**Purpose.** The search box in the middle of the top bar takes you straight to a case. Type or scan an identifier, press Enter, and the case opens.

**Intended users.** Anyone whose role may open Search. If you cannot open Search, the bar is not shown.

**Where it fits.** It is on every screen. For filtering by date, status, flags and more, use the full [Search](help:search) screen instead.

## Screen Tour

![The case search bar with a results window listing several matches](capture:case-search-bar-results)

### Field definitions

| Item | Meaning |
|---|---|
| Box, with the hint "Scan or enter ID…" | Type at least 2 characters. |
| Identifiers accepted | Accession number, medical record number, national ID, requisition number and block ID, depending on the formats your laboratory has turned on. |
| Support reference | The reference from a support ticket; it opens the case, or its audit record. |

**Results window (several matches)**

| Column | Meaning |
|---|---|
| Accession | The case number. |
| Patient | Name. |
| DOB · Sex | Date of birth and sex. |
| Priority | Case priority. |
| Status | Case status. |
| Facility | Where it belongs. |

Rows also show the number of specimens, up to four case flags in grey, and a "matched:" hint saying which identifier matched.

### Toolbar

| Control | What it does |
|---|---|
| Box | Type or scan. |
| Escape | Clears the box. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| "Fetching Accession … from LIS…" | Nothing was found here, so PathScribe is asking the laboratory system. |
| "No case found for '…'" | Neither place has it. |

### Hotkeys

| Key | Action |
|---|---|
| Alt+Shift+B | Focus the case search bar |
| Enter | Open the single match, or search |
| Escape | Clear |

## Step-by-Step Procedures

### Standard workflow

1. Press Alt+Shift+B, or select the box.
2. Type or scan the identifier (at least 2 characters).
3. Press Enter. If there is one match the case opens in the Report. A barcode or QR scan opens a single match without Enter.
4. If several match, a results window opens. Select a row to open it.

### Alternative workflow

1. Paste a support reference to open the case or audit it points to.
2. Type part of an MRN to list a patient's cases, then pick one.

### Exception handling

1. **Fetching … from LIS.** Wait. If a case is found it opens.
2. **No case found.** Check the digits, or try another identifier.
3. **Several patients with the same number.** Check the DOB and facility columns before opening.

### Error recovery

1. If the wrong case opened, go back with the browser or select Home. Nothing was changed.
2. If you opened a case with unsaved work in another, the screen asks before leaving.

!!! warning "Check the patient before you act"
    Always confirm name, date of birth and accession on the Report before editing or signing out. Opening a case is recorded in the audit log.

## Tips and Best Practices

### Common mistakes

- Typing one character; at least 2 are needed.
- Searching for a block ID shared by several cases without reading the list.

### Efficiency recommendations

- Scan the label rather than typing.
- Use Alt+Shift+B to jump to the box.

### Workflow recommendations

- Use the Search screen for lists and reports; use this bar for one known case.

## Related Features

### Upstream workflow

- [Accession](help:accession): the identifiers are created here.

### Downstream workflow

- [Report](help:report): where the case opens.
- [Search](help:search): the full search screen.
- [Case Flags](help:case-flags): the grey chips in the results.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No search bar | Your role may not open Search. |
| Nothing happens on Enter | Fewer than 2 characters. |
| Identifier not recognised | Your laboratory has not enabled that format. |

### Resolution steps

1. Retry with the accession number.
2. Try the Search screen.
3. Ask for the format to be enabled.

### When to contact support

Contact your laboratory's PathScribe support when a case that exists never appears, or the LIS fetch always fails.
