# Report delivery by e-fax and file drop — API contract

**Status:** Batch 520 (PS-280). Built and tested in the development receiver (`functions/report_delivery.py`, called by `receive_interface_message` in `functions/main.py`). The production API server (ASP.NET Core) implements the same contract.

## What it is

A delivery rule (Configuration → System → Delivery Rules) sets a release's channels by role:

- **Primary** and **secondary** channels go at once.
- **Fallback** channels go when a primary channel has nowhere to go, or still fails after its automatic retries (Batch 521, PS-281; see the last section).

There are four channels: electronic (the result message), print, **e-fax** and **file drop**. This document covers the last two.

The browser can't send a fax or write to a hospital's server. So PathScribe sends the signed report PDF and its metadata to the interface server as a `REPORT_DELIVERY` message (the usual envelope, `INTERFACE_TRANSACTIONS.md`), and the server does the delivery. Each delivery is an entry in PathScribe's report delivery queue. A failure shows in Audit Log → Interfaces → Outbound with the server's reason, and can be resent there (`interface:outbound:resend`).

## Request

`POST` to the interface receiver, with this envelope:

```json
{
  "queueEntryId": "…",
  "transactionType": "REPORT_DELIVERY",
  "dispatchedAt": "2026-10-10T20:00:01Z",
  "payload": {
    "channel": "FAX" | "FILE_DROP",
    "caseId": "…",
    "reportType": "PRELIMINARY" | "FINAL" | "CORRECTED" | "ADDENDUM",
    "releasedAt": "2026-10-10T20:00:00Z",
    "documentName": "S26-0001_FINAL_20261010T200000Z",
    "pdfBase64": "…",
    "metadata": { "accession": "S26-0001", "mrn": "…", "orderingPhysician": "…", "orderingFacility": "…" },
    "fax": { "number": "+15205550100", "recipientName": "Ana Ruiz" },
    "fileDrop": { "targetId": "client-a-sftp" }
  }
}
```

- `fax` is present for FAX; `fileDrop` for FILE_DROP.
- The fax number is the rule's own number, else the ordering physician's, else the ordering facility's.
- `documentName` is the accession, the report type and the release time (UTC), using letters, digits, dot, dash and underscore only. The server still sanitises it.
- `fileDrop.targetId` is a **name**. The folder or SFTP server and its credentials are configured on the server only, never in PathScribe.

## Validation

The server refuses with **422** before sending anything when:
- the channel is not FAX or FILE_DROP;
- `caseId`, `reportType`, `documentName` or `pdfBase64` is missing;
- the PDF is not valid base64, not a PDF (`%PDF`), or larger than 20 MB;
- a fax number is not 7–15 digits (an optional leading `+`; spaces, dots, dashes and brackets are dropped);
- a file drop has no `targetId`.

## Response

The server answers only once the delivery is done:

| Status | Meaning | PathScribe |
|---|---|---|
| 200 `{"ok": true, "id", "delivery": {"status": "SUBMITTED" \| "DELIVERED", "detail"}}` | Fax accepted by the gateway (SUBMITTED); files written (DELIVERED) | entry SENT |
| 503 `{"ok": false, "error"}` | This channel or target is not set up on the server | entry FAILED, with the reason |
| 502 `{"ok": false, "error"}` | Set up, but the gateway refused or the target couldn't be reached or written | entry FAILED, with the reason |

The server's record of the delivery keeps everything **except the PDF**: its size and SHA-256 instead. The PDF is the lab's signed report, kept with the case.

## E-fax: email-to-fax gateway

The fax goes out as one email per fax, with the PDF attached, sent to an address built from the number. This is provider-neutral: eFax Corporate, SRFax, Documo mFax, RingCentral and most other services accept it (Pete's decision, Oct 10).

| Setting | Default | |
|---|---|---|
| `FAX_SMTP_HOST` | — | required |
| `FAX_SMTP_PORT` | 587 (465 for `ssl`) | |
| `FAX_SMTP_SECURITY` | `starttls` | `starttls`, `ssl` or `none` |
| `FAX_SMTP_USERNAME` / `FAX_SMTP_PASSWORD` | — | the provider's sending account; keep the password in the secret store |
| `FAX_FROM_ADDRESS` | — | required; the address registered with the provider |
| `FAX_TO_PATTERN` | — | required; must contain `{number}`, e.g. `{number}@efaxsend.com` |
| `FAX_NUMBER_FORMAT` | `digits` | `digits` drops the `+`; `e164` keeps it (check the provider) |
| `FAX_SUBJECT` | `Pathology report` | many gateways print the subject on the cover page |

"Submitted" means only that the gateway accepted the fax. Whether it was transmitted comes later, in the provider's transmission report. Tracking that confirmation is PS-281 (§3.2.3).

## File drop: folder or SFTP

`FILE_DROP_TARGETS` holds a JSON object of named targets:

```json
{
  "client-a-sftp": { "type": "sftp", "host": "sftp.client-a.example", "port": 22, "username": "pathscribe",
                     "passwordEnv": "CLIENT_A_SFTP_PASSWORD", "hostKey": "ssh-ed25519 AAAAC3Nz…", "path": "/inbound/pathology" },
  "client-b-share": { "type": "directory", "path": "\\\\fileserver\\pathology$\\inbound" }
}
```

- **Two files per delivery:** `<documentName>.pdf` and `<documentName>.json`. The JSON holds the metadata above, plus `caseId`, `reportType`, `releasedAt`, `pdfSha256` and `source: "PathScribe"`.
- **Atomic.** Each file is written as `.part`, then renamed, so a system polling the folder never picks up half a file.
- **Never overwrites.** A name already there gets `_2`, `_3` and so on.
- **SFTP checks the host key.** The target must name the server's host key (`hostKey`, as `<type> <base64>` from `ssh-keyscan`). A server presenting any other key is refused and nothing is sent.
- **SFTP credentials.** Authentication is by password, from the environment variable named in `passwordEnv`, or by private key (`privateKeyPath`).

## Deployment: serverless

When the API server runs as cloud functions (serverless), four things follow:

1. **E-fax works as is.** It's an ordinary outgoing mail connection; use port 587 with authentication (many clouds block port 25).
2. **A file drop from the cloud must be SFTP.** A cloud function can't reach a hospital's Windows share. A `directory` target only works when the delivering server runs inside the hospital network, for example an on-site interface engine, or a folder mounted on the server. With the API server, a Windows share is written by the site agent (`SITE_AGENT_API.md`, `share.write`, Batch 546).
3. **Fixed outbound IP.** Hospitals usually allow-list one source address for SFTP. Serverless outbound addresses change unless the deployment routes them through a static IP (Azure NAT gateway, Google Cloud NAT, AWS NAT gateway). Give each client that address.
4. **No waiting inside a call.** Retries at intervals (PS-281: 1, 5, 15 minutes) must be a queue with a scheduled sweep, each attempt a short call of its own, never a sleep inside a function.

Keep the fax gateway and SFTP credentials in the platform's secret store (Azure Key Vault, Google Secret Manager), exposed to the function as environment variables.

## Tested

The development receiver's tests (`functions/test_report_delivery.py`, 44 checks) run end to end over real connections:
- e-fax to a real SMTP server on localhost: the attachment arrives intact, addressed from the number;
- file drop to a real folder;
- file drop to a real SFTP server on localhost (paramiko): host-key refusal, wrong password, no overwrite;
- the receiver's own 200 / 422 / 502 / 503 answers.

STARTTLS and login are checked with a recording client, because the local test server speaks plain SMTP. A live fax needs the lab's own provider account.

## Retries, dead-letter and confirmation (Batch 521, PS-281)

The same rules apply to print, e-fax and file drop. PathScribe implements them in `services/delivery/deliveryRetries.ts`; the API server must implement the same.

- **Retry with backoff (§3.2.1).**
  - A failed delivery is retried after each of the lab's waits in turn. The default is 1, 5 and 15 minutes (Pete's default); the lab changes them in Delivery Rules → Retries, up to 10 waits of 1 to 1,440 minutes.
  - Each retry is a separate short attempt made by a **scheduled sweep**. On a serverless host this is a timer trigger, for example every 30 seconds to a minute; never a wait inside a call. The browser runs the same sweep every 30 seconds while someone is signed in, as the stand-in.
  - Two sweeps must not overlap: take a lease, or a row lock, on each due record.
- **Dead-letter and fallback (§3.2.2).** When the last retry fails:
  - the queue entry is marked "retries exhausted";
  - it goes on the delivery exception queue (Audit Log → Interfaces → Outbound → Delivery exceptions);
  - active Admin and Lab Director staff are messaged (Pete's default);
  - **for a primary channel**, the release's fallback channels are sent, once per release, with the case's signed PDF.
  - A primary channel with **nowhere to go** (no printer set up, no file-drop target) falls back at once, because retrying can't help.
  - A delivery resent successfully by hand leaves the exception queue.
- **Confirmation (§3.2.3).**
  - Print confirmation is the site agent's job result (`SITE_AGENT_API.md` §5): "Printed" when the printer confirms it (IPP, IPPS), "Sent to printer" when it can't (Raw 9100, LPR). *(Corrected in Batch 546: this said the network print result of `LIVE_UPDATES_SIGNALR.md` §10. Today a report print job is marked printed as soon as the send succeeds; `PrintJobStatus` is used only by the label tracker.)*
  - A fax is "submitted" when the gateway accepts it. The provider's transmission report then confirms it or fails it. The server reads that report (a webhook from the provider, or the report email to `FAX_FROM_ADDRESS`, matched to the delivery by the `queueEntryId` it sent) and publishes `ReportDeliveryStatus` (`LIVE_UPDATES_SIGNALR.md` §12).
  - A failed transmission counts as a failure: it is retried, then dead-lettered.

**Development receiver.** `functions/main.py` makes one attempt per request; the sweep and the transmission reports are the API server's job. PathScribe's browser side, including handling a `ReportDeliveryStatus`, is built and tested.

---

*Batch 537: the serverless notes above are taken further, across every server component, in [`DEPLOYMENT_READINESS_REVIEW.md`](DEPLOYMENT_READINESS_REVIEW.md) (PS-539).*
