# Findings while writing the Batch Management articles (Batch 666, Oct 24, 2026)

| # | Where | Finding |
|---|---|---|
| 1 | Batch detail, reconciliation | Rescanning an item that is already Matched shows the red "Unexpected" flash and error tone, though nothing is added to the Unexpected list. The check compares against the previous state. — Fixed in Batch 669: a rescan of a Matched item now shows a green "Already matched — nothing changed"; only an item not on the manifest is Unexpected. |
| 2 | Batch detail, cold-chain banner | The excursion time prints the raw stored timestamp, not formatted for the user's language. |
| 3 | Batch detail | A Reconciling batch has no Abort button (only Active ones do), so it can only be completed or overridden. |
| 4 | Disposal Queue vs scan | The queue takes an item's last location by date; the scan check ("wrong facility") takes the last array entry. A late-entered location event can make them disagree. — Fixed in Batch 669: one shared rule (the latest event time) in the queue, the report and the scan check. |
| 5 | Disposal Queue | The subtitle says "blocks and slides", but the list also holds wet tissue (specimens and decants). |
| 6 | Several screens | On-screen text reads like developer notes: "A real, computed list...", "Computing the real, current queue...", "Loading real device status...". |
| 7 | Retention Holds | The reason label "Other" borrows the Intraop Queue's `skipReasons.other` translation key. It reads correctly today. |
| 8 | Label Reprint | A label sent to the browser print window counts as "printed" once the window opens, which is not confirmation of paper. A blocked pop-up shows a browser alert. |
| 9 | Batch detail, Cytology Imaging | Scanning items in never passes a field-of-view count, so the Grossing "Imager batch · FOV count" column cannot show a count for items added here. |
| 10 | Batch detail, Staining | The stain QC visual-read confirmation has no control on the batch page; it appears only in the sign-out gate. |
| 11 | Hub tiles | Five hub tiles lack `type="button"`, unlike the Disposal, Waste Tracking Report and Retention Holds tiles (no visible effect). |
| 12 | Capabilities | Admin opens Batch Management but has none of the batch actions by default. By design (Batch 434); the articles say so. |
