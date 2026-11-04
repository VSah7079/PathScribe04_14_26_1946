# Block deletion: server contract (Batch 588)

The browser does this today in `services/material/deleteBlockInProcess.ts`. The API server replaces it behind the same behaviour. Policy: `docs/product/BLOCK_DELETION.md`.

## Delete a block (in process)

`POST /api/cases/{caseId}/specimens/{specimenId}/blocks/{blockId}/delete`

Body: `{ "reasonCode": "enteredInError" | "duplicate" | "notNeeded" | "processingFailure" | "other", "note": "string (required for other)", "expectedVersion": 3 }`

The server, in one transaction:

1. checks `material:block:delete-in-process` for the case's facility;
2. refuses a block already Deleted, a missing reason, an `other` with no note, and a signed-out case;
3. sets the block's status to `Deleted`, cancels unfinished stains, releases the cassette position and applied billing codes, and records the deletion (reason, note, who, when, tier, released codes);
4. raises one billing deficiency (below);
5. writes one Audit Log entry (literal English, no patient name);
6. saves with the case version.

| Status | Body | When |
| --- | --- | --- |
| 200 | the updated block and the deficiency id | done |
| 403 | `{ "error": "notPermitted" }` | the capability is missing |
| 409 | `{ "error": "conflict", "currentVersion": 4 }` | stale `expectedVersion` |
| 422 | `{ "error": "notFound" \| "alreadyDeleted" \| "reasonMissing" \| "noteRequired" \| "caseSignedOut" }` | refused, nothing written |

Steps 3 to 6 are one transaction on the server, so the browser's "delete stands but billing could not be flagged" case does not arise there.

## The billing deficiency

One record in the existing billing deficiency list (the one `GET`/`resolve` already serve): `deficiencyType: "BLOCK_DELETED"`, `severity: "COMPLIANCE_WARNING"`, `raisedByTrigger: "BLOCK_DELETION"`, `auditorNotes` (human-readable), and

```json
"blockDeleted": { "blockId": "", "specimenId": "", "specimenLabel": "A", "blockLabel": "1", "reasonCode": "duplicate",
                  "releasedCodes": ["88305"], "deletedBy": "", "deletedByName": "", "deletedAt": "" }
```

Billing staff resolve it with the existing resolution reasons (`CHARGE_REVERSED` is the credit, `APPROVED_BY_BILLING_ADMIN` none due). No notification is sent (Pete, Oct 16).

## Batch 610: after sign-out (tier 2) and the flag on an amended report (tier 3)

### `POST /cases/{caseId}/specimens/{specimenId}/blocks/{blockId}/invalidate`

Body: the same as the delete (`reasonCode`, `note`, `expectedVersion`). The server, in one transaction:

1. checks `material:block:delete-signed-out` for the case's facility;
2. refuses a block already Deleted or Invalidated, a missing reason, an `other` with no note, and a case that is **not** signed out (`caseNotSignedOut`);
3. sets the block's status to `Invalidated`, cancels unfinished stains, releases the cassette position and applied billing codes, and records the deletion with `tier: "signed_out"`;
4. raises one `BLOCK_DELETED` billing deficiency, as above (the notes say the report was already signed out); creates **no** addendum or amended report;
5. writes one Audit Log entry, "Block invalidated after sign-out" (literal English, no patient name);
6. saves with the case version.

Statuses: 200, 403 `notPermitted`, 409 `conflict` (stale `expectedVersion`), 422 `notFound` / `alreadyDeleted` / `reasonMissing` / `noteRequired` / `caseNotSignedOut`.

### `PUT /cases/{caseId}/specimens/{specimenId}/blocks/{blockId}/amendment-flag`

Body: `{ "kind": "invalidated" | "superseded", "reasonCode": "wrongPatient" | "enteredInError" | "replaced" | "processingFailure" | "other", "note": "required for other", "supersededByBlockId": "optional, for superseded", "expectedVersion": 3 }`. The server checks `material:block:flag-amended`, refuses unless the case's last revision is an amendment, correction or addendum (`notAmendedReport`) and a block already Deleted or Invalidated, then sets `block.amendmentFlag { kind, reasonCode, note, flaggedBy, flaggedByName, flaggedAt, supersededByBlockId }` and writes one Audit Log entry ("Block flagged Invalidated" or "Block flagged Superseded"). The block is **not** deleted, its status is unchanged and no billing deficiency is raised. 200 / 403 / 409 / 422 as above.

