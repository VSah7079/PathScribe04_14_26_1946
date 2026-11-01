# Power BI kit for the lab workflow reports (Batch 730)

**Status: not built and not tested.** These queries and measures were written against the reporting feed contract (`docs/architecture/BI_FEED_API.md`), which the API server has not implemented yet. They have **not been run against real data**, and **no Power BI template (.pbit) has been made**: that needs Power BI Desktop, which this build cannot run (spec §9.3a). Someone must still load them in Power BI Desktop, check every step below, fix what does not work, and save the template.

## What is here

| File | What it is |
|---|---|
| `PathScribeFeed.pq` | Power Query (M): two parameters (`FeedBaseUrl`, `FeedToken`), a `GetDataset` function that pages through a dataset, and queries for `StationEvents`, `Batches`, `AddOnOrders`, `Cases` and `StepReached` (one row per case and step). |
| `PathScribeMeasures.dax` | DAX measures for the reports in spec §9: turnaround by step (median, 90th percentile, late %), STAT performance, volume per station, add-on volume and minutes to cut, recut orders, reconciliation exceptions, batch duration against target. |

## Before you start (compliance, spec §9.3 item 4)

- The feed is de-identified by default: no names, record numbers or dates of birth; times are reduced to the month; turnaround is measured from durations the feed carries (`minutes_since_accession`, `minutes_to_cut`). Identified use needs an approval recorded in PathScribe and a business associate agreement with Microsoft.
- UK and EU laboratories: check where your Power BI tenant stores data before connecting.
- Each laboratory needs its own Power BI licence.

## Steps (to be checked in Power BI Desktop)

1. In PathScribe, Configuration → System → **Reporting feed (Power BI)**: switch the feed on, tick `station_events`, `batches`, `add_on_orders`, `item_end_states` (Batch 731) and `cases`, and create a de-identified token. Copy the token (it is shown once).
2. In Power BI Desktop: **Transform data → Manage Parameters → New Parameter**: `FeedBaseUrl` (your laboratory's feed address, ending `/api/bi/v1`) and `FeedToken` (the token).
3. **New Source → Blank Query**, open the **Advanced Editor**, and paste each block from `PathScribeFeed.pq` as its own query, named as its comment says.
4. When asked how to connect to the feed address, choose **Anonymous** (the token travels in the `Authorization` header). Set the privacy level to **Organizational**.
5. **Close & Apply**. In the model view, relate `StepReached[case_key]` and `StationEvents[case_key]` to `Cases[case_key]`, and `AddOnOrders[case_key]` to `Cases[case_key]`.
6. **Enter data**: a table `TargetHours` with columns `tat_step` and `target_hours` (your targets for embed, cut, stain, distribute), related to `StepReached[tat_step]`.
7. Create each measure from `PathScribeMeasures.dax` (**New measure**, paste the line).
8. Build the visuals: a matrix of step by month with Median Hours, P90 Hours and Late %; a column chart of Items Scanned by station and week; tables for add-ons and reconciliation exceptions.
9. Compare the figures with **Batch Management → Workflow Reports** in PathScribe for the same month. They should agree, except that the feed's months are calendar months in UTC.
10. **File → Export → Power BI template** to save the `.pbit`.

## Known gaps to check

- Batch duration at Decal or Staining needs `step_history` (JSON text) expanded; the measure here uses created to completed, which is right only for a batch that stayed at one step.
- The `GetDataset` paging assumes the JSON body in `BI_FEED_API.md` §6; check it once the server exists.
- Grossing and sign-out turnaround by step need `grossed_at` on `cases`, which the feed does not have yet; `turnaround_hours` (accession to sign-out) is there.
