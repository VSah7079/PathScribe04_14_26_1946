# 6. Electronic records and signatures

Sources: `FEATURE_OVERVIEW.md` (Sign-out checks; Amendment, Correction & Addendum; Signed report versions; Release delay and recall), `AUTHENTICATION_MODEL.md`.

| Control | What it does | Status |
|---|---|---|
| Case versioning | Case saves are versioned; saving over someone else's change is refused unless the person chooses an audited Overwrite. | Live (browser); server version check specified |
| Report versions | Every sign-out stores a version: signer, patient and encounter as they were, version number and a PDF with a SHA-256 fingerprint. A PDF that fails its fingerprint is refused when opened, sent or released. | Live in the demo; server endpoints not built (Partial) |
| Amendment tracking | A change to a signed report is classified (pure addendum, pure amendment, correction with addition), sent before it is released, and kept as a new version. LIS Amendment Notices are handled. | Live |
| Report release history | Release, preliminary release, revision release, delay, hold and recall are recorded with who and when; each has its own permission. | Live (all outputs from Batch 534) |
| User attribution | Every action carries the signed-in person; staff names are not patient PHI. | Live |
| Signature controls | The same checks run at every sign-out: hold, microscopic documentation, critical findings, required fields and unverified AI answers. Signing needs the sign-out capability and active case participation, with no administrative override. A fresh second factor is required inside the organisation's step-up window. Countersign applies where the participation type requires it. | Built (Demo) |
| AI content | AI suggestions are marked unverified until the pathologist accepts them; unverified AI answers block sign-out. | Live |

## Not built

- One-transaction sign-out (needs the API server): a version written before a later failure stays, and a correction released before a later failure is not undone.
- Server-side tamper-evidence of the audit trail.
- A statement mapping the signature to a specific electronic-signature regulation (for example 21 CFR Part 11 or the EU's eIDAS). The controls above are relevant, but PathScribe does not claim equivalence; this is for the laboratory's regulatory counsel (`OPEN_QUESTIONS.md`).
