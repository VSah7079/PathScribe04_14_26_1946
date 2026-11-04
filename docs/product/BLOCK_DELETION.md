# Block deletion (Pete, Oct 16, 2026)

Status: **Built (Demo).** Deleting a block in process (Batch 588), deleting after sign-out and flagging a block on an amended report (Batch 610) are all in the block and stain editor, against the browser's own case store. The server transaction is `docs/architecture/BLOCK_DELETION_API.md`.

## The policy

A block can be deleted in three situations. Each has its own capability, so each facility decides which roles hold it through its role grants.

| Tier | When | How often | Allowed | Who by default | Status |
| --- | --- | --- | --- | --- | --- |
| In process | Before sign-out | Common | Soft delete (the block stays on the case, marked Deleted) | Histotechnologist, Cytotechnologist, Molecular Technologist, roles with case access | Live |
| Signed out | After sign-out | Rare | Soft delete only; the block is marked Invalidated | Supervisory or administrative roles (Admin, Lab Director, QA Reviewer) | Live (Batch 610) |
| Amendment | On an amended report | Very rare | An Invalidated or Superseded flag only; no deletion | Pathologist, Quality Manager (QA Reviewer) | Live (Batch 610) |

## What an in-process delete does

1. In the block and stain editor, **Delete this block** (greyed out without `material:block:delete-in-process`; the service checks again for the case's facility). The control is not offered once the case is signed out.
2. Pick a reason (entered in error, duplicate block, not needed, processing failure, other) and, optionally, a note. **Other** needs a note. The first reason is pre-selected: two clicks to delete.
3. The block's status becomes **Deleted**. The block, its id and its history stay on the case. Stains not yet finished are cancelled; finished stains stay. The cassette position is released. The billing codes applied to the block are released and listed on the block's deletion record.
4. One **billing deficiency** of type **Block deleted** is raised for billing staff (below). Nothing is credited automatically.
5. One Audit Log entry, "Block deleted". The detail names the block, never the patient.
6. A signed-out case is refused (tier 2). Amended reports were signed out first, so they are refused too.

## The billing review: the existing Billing deficiencies tab

Billing staff already review billing findings under **Quality Assurance → Financials → Billing deficiencies**. A deleted block raises a finding there, so there is no new queue, screen or permission.

- The finding names the block and the codes released, and carries the block id, specimen id and released codes (the billing impact).
- Billing resolves it with the existing Resolve dialog: **Charge reversed** is the credit; **Approved by billing admin** means none is due. Whoever holds the permission that resolves billing deficiencies can do it.
- **No messages, e-mails or reminders** (Pete): billing teams review the tab daily; notifications would add alert fatigue, configuration and routing questions.
- If the finding cannot be raised, the delete still stands: the person is told to tell billing, and the Audit Log entry says so.

## Decisions recorded

- No addendum or amended report is created automatically after a signed-out delete (Pete, Oct 16). A pathologist starts any amendment by hand.
- Each facility chooses its roles through grants (Pete, Oct 16).
- The billing credit is for billing staff to decide, never automatic (Pete, Oct 16).
- Billing reviews in the existing Billing deficiencies tab, not a new queue (Pete, Oct 16: "this can't be the first one").

## Batch 610: tiers 2 and 3, and the material list

**Delete after sign-out (tier 2).** Once the case is signed out, the same control in the block and stain editor reads **Delete this block (signed out)** and needs `material:block:delete-signed-out` (checked again by `services/material/deleteBlockAfterSignOut.ts` for the case's facility). The block's status becomes **Invalidated**: it stays on the case with its id and history, unfinished stains are cancelled, the cassette position and billing codes are released and listed on the record (`deletion.tier = 'signed_out'`). One **Block deleted** billing deficiency is raised for billing staff (the note says the report was already signed out) and one Audit Log entry, "Block invalidated after sign-out", is written (the detail never names the patient). A case not yet signed out is refused (`caseNotSignedOut`): use the in-process delete.

**Flag on an amended report (tier 3).** On a report that has been amended, corrected or added to (`lastRevisionType` is not `original`), a pathologist or Quality Manager (`material:block:flag-amended`) can mark a block **Invalidated** or **Superseded**: a reason (wrong patient, entered in error, replaced by another block, processing failure, other with a note) and, for Superseded, optionally the replacing block. This is a flag only (`block.amendmentFlag`): the block is **not deleted**, its status does not change, no billing item is raised, and one Audit Log entry ("Block flagged Invalidated" or "Block flagged Superseded") is written. The flag can be changed; each change is audited.

**Case material list.** A Deleted or Invalidated block stays in the list with its reason, who and when ("Deleted: duplicate block, by Tech One on …"), and a flagged block shows its Invalidated or Superseded badge with the reason, who and when in the tooltip.

## Not built yet

Nothing in the browser. The server's transaction for tiers 2 and 3 is in `docs/architecture/BLOCK_DELETION_API.md`.
