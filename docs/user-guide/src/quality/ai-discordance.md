---
module: Quality & Compliance
screen: AI Discordance
slug: quality/ai-discordance
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager, Pathologist]
keywords: [AI discordance, AI vs pathologist, stalled AI results, AI product, vendor, disagreed, agreed, discordance rate, stalled after]
routes: []
previous: quality
next: quality/access-requests
related: [quality, my-contribution, wsi-viewer]
status: Draft
---

# AI Discordance {#top}

## Overview

**Purpose.** AI discordance is a report inside Quality Assurance. It shows how often pathologists disagreed with each AI screening product the laboratory uses, and which AI screenings were ordered but have not been answered for too long. The screen is titled **AI vs pathologist discordance**.

**Intended users.** Quality staff and laboratory managers who watch the AI products; pathologists who want to see how the products perform.

**Where it fits.** Open **Quality Assurance** from the Quality & Compliance hub, stay on the **Operations** pillar and choose the **AI discordance** tile. It is read-only apart from one setting, the stalled-result time limit. See [Quality & Compliance](help:quality) for the rest of the Quality Assurance screen.

## Screen Tour

![The AI vs pathologist discordance report with the product table and the stalled results table](capture:quality-ai-discordance-overview)

### Field definitions

The first section is **Discordance by AI product**, one row per AI product.

| Column | What it means |
|---|---|
| Vendor | The company that supplies the AI product. |
| Product | The AI product. |
| Ordered | How many AI results were ordered from it. |
| Reviewed | How many of those a pathologist has judged. |
| Agreed | Reviewed results where the pathologist agreed with the AI. |
| Disagreed | Reviewed results where the pathologist disagreed with the AI. |
| Discordance rate | Disagreed as a percentage of Reviewed. Shows "Not yet reviewed" when nothing has been judged. |

Only results a pathologist has marked as agreeing or disagreeing are counted. A result nobody has judged is never counted as agreeing. When the laboratory has no AI products or results the table says "No AI products or results yet."

The second section is **Stalled AI results**, with the number of stalled results in brackets.

| Item | What it means |
|---|---|
| Stalled after (hours) | The time limit. An AI result that was ordered and has had no answer for longer than this is called stalled. The first value is 24 hours. Enter a whole number of hours from 1 to 720. |
| Case | The case the AI result belongs to. Select the row to open the case. |
| Vendor | The AI product supplier. |
| Ordered | When the AI result was ordered. |
| Waiting | How long it has been waiting, in hours. |

When nothing is stalled the table says that no AI result has been waiting longer than the limit.

### Toolbar

| Button | What it does |
|---|---|
| Export discordance rates | Saves the Discordance by AI product table as a spreadsheet file. Your role must allow it. |
| Export stalled results | Saves the Stalled AI results table, with the time limit that was in force, as a spreadsheet file. Your role must allow it. |
| Save | Next to Stalled after (hours). Saves a new time limit. It is greyed out until you change the number. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Not yet reviewed | No pathologist has judged any result for this product, so no rate can be given. |
| Highlighted row in Stalled AI results | Rows can be selected; the pointer changes when you hover. |

### Hotkeys

None are specific to this report. F1 (View Help) opens the Quality & Compliance article.

## Step-by-Step Procedures

### Standard workflow

1. Open **Quality Assurance**, choose the **Operations** pillar, then the **AI discordance** tile. The report opens.
2. Read **Discordance by AI product**. Compare **Reviewed** with **Ordered**: a low Reviewed figure means the rate rests on few judgements.
3. Look at the **Discordance rate** for each product.
4. Read **Stalled AI results**. Select a row to open the case and find out why the AI result has not arrived.
5. To change what counts as stalled, type a new number in **Stalled after (hours)** and select **Save**.
6. To keep a copy for a meeting, select **Export discordance rates** or **Export stalled results**.

### Alternative workflow

1. To see disagreement for your own cases, use the AI Contribution tab on [My Contribution](help:my-contribution).

### Exception handling

1. If a product shows **Not yet reviewed**, ask the pathologists to record whether they agree with the AI on those cases. Nothing is assumed.
2. If the stalled table is empty, no AI result has waited longer than your limit. Lower the limit to look for earlier delays.

### Error recovery

1. If you see "Enter a whole number of hours from 1 to 720.", correct the number and select **Save** again.
2. If you see "You don't have permission to change this setting.", your role may not change the limit. Ask your manager.
3. If you see "Could not save — please try again.", the new limit was not saved. Select **Save** again; tell your administrator if it keeps happening.

## Tips and Best Practices

### Common mistakes

- Reading a rate when only one or two results were reviewed. Check the Reviewed column first.
- Setting the stalled limit so short that normal processing time is flagged.

### Efficiency recommendations

- Select a stalled row to jump straight to the case.

### Workflow recommendations

- Review the report at each quality meeting and export it with the minutes.

## Related Features

### Upstream workflow

- [Quality & Compliance](help:quality): the Quality Assurance screen that holds this tile.

### Downstream workflow

- [Access Requests](help:quality/access-requests): the next report in the Operations pillar.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Save is greyed out | The number has not been changed. |
| The export button is greyed out | Your role does not allow the export. |
| A product is missing | The laboratory has not set the product up, or no result has been ordered from it. |

### Resolution steps

1. Refresh the page.
2. Check your role with your manager.

### When to contact support

Contact your laboratory's PathScribe support when the counts do not match the cases, or the limit will not save. Have the product name and the time of the problem ready.
