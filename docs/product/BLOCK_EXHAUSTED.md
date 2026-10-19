# Block exhausted, on the Microtomy workstation (Batch 610)

Status: **Built (Demo).** The pathologist e-mail goes to the Simulated mail outbox until a mail server is configured.

A tech who finds no more tissue in a block presses **Block exhausted** in the block panel and types a note (required unless the organisation switched it off in Field Requirements, page "addOnOrder").

1. The block's status becomes **Exhausted**; the status it had is remembered.
2. The ordering pathologist is e-mailed (accession, block and reason; never the patient). With no mail server the message lands in the Simulated outbox (Batch 604) and is labelled Simulated.
3. **Cutting from the block is blocked** (printing its slide labels is refused) and a banner says why, until the pathologist answers on the Add-On Order tracking page:
   - **Approve destructive cutting** (`add-on:exception:approve-destructive-cut`): cutting can go on; the block stays Exhausted.
   - **Cancel** the order or **Modify** it: the block's status goes back to what it was.
4. The flag and the answer are on the order's exception history (audit trail).

A block that is "Exhausted" only because it was entirely submitted at grossing is not held up. If a second order on the block also carries an open flag, the status goes back only when the last one is answered.

Server-side: the mail transport.
