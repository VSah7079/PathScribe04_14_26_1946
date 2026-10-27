---
module: Clinical Links
workflow: Everyday reference
role: [Pathologist, Pathology Assistant, Accessioner, Histotechnologist, Cytotechnologist, Laboratory Manager, Quality Staff]
keywords: [clinical links, resources, external links, CAP protocols, WHO classification, PathologyOutlines, UpToDate, quick links]
routes: []
previous: session-and-connection
next: help
related: [personal-settings, report, worklist, search]
status: Draft
---

# Clinical Links {#top}

## Overview

**Purpose.** Open well-known outside references without leaving PathScribe's tab order. There are two lists: a fixed one in the top bar, and a laboratory list called Quick Links.

**Intended users.** Everyone who signs in.

**Where it fits.** The link button is in the top bar on every screen.

## Screen Tour

![The Clinical Links window](capture:clinical-links-window)

### Field definitions

| Item | Meaning |
|---|---|
| Title **Clinical Links**, heading "External Resources" | The fixed window. |
| CAP Cancer Protocols | College of American Pathologists protocols. |
| WHO Classification of Tumours | WHO reference. |
| PathologyOutlines | Online reference. |
| UpToDate | Clinical reference; may need a subscription. |
| **Quick Links** | Your laboratory's own list in three groups: Protocols, References and Systems. |

### Toolbar

| Control | What it does |
|---|---|
| Link button in the top bar | Opens Clinical Links. |
| Close | Closes the window. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| "Insecure link" tag | The address does not use https and is shown as plain text, not a link. |

### Hotkeys

| Key | Action |
|---|---|
| Alt+Q | Open Quick Links (Worklist, Search, Audit Log) |

Voice "open clinical resources" does the same.

## Step-by-Step Procedures

### Standard workflow

1. Select the link button in the top bar.
2. Choose a reference. It opens in a new browser tab.
3. Close the tab to return to PathScribe.

### Alternative workflow

1. On the Worklist, Search or Audit Log, press Alt+Q to open Quick Links.
2. Choose a group and a link.

### Exception handling

1. **Insecure link.** Copy the address into a browser only if you trust it.
2. **Site asks for a login.** UpToDate and some others need your own account.

### Error recovery

1. If a link is wrong, tell your administrator; links are set in Configuration under System, External Resources.

!!! warning "Never paste patient details into an outside site"
    External sites are outside PathScribe. Do not enter names, dates of birth or case numbers.

## Tips and Best Practices

### Common mistakes

- Looking for a Quick Links button on the Worklist; none is shown, only the Alt+Q key.
- Assuming the list is complete; it holds four fixed links.

### Efficiency recommendations

- Keep the protocol tab open beside the report.

### Workflow recommendations

- Administrators: add the laboratory's own procedure sites to Quick Links.

## Related Features

### Upstream workflow

- [Personal Settings](help:personal-settings): the other top bar items.

### Downstream workflow

- [Report](help:report): where references are used most.
- [Help](help:help)

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Alt+Q does nothing | Not on Worklist, Search or Audit Log. |
| Link does not open | Pop-ups blocked. |
| Quick Links is empty | Nothing set by your administrator. |

### Resolution steps

1. Allow pop-ups for PathScribe.
2. Try the fixed list.
3. Ask your administrator.

### When to contact support

Contact your laboratory's PathScribe support when a link goes to the wrong site or Quick Links will not open.
