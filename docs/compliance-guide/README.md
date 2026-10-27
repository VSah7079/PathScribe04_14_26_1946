# Regulatory Compliance Guide

**Batch 676 (Pete, Oct 25, 2026).** A first-class guide beside the User Guide, the Administrator Guide, the Implementation Guide and the Validation Guide. It tells a laboratory, an auditor or a procurement team which PathScribe capabilities are intended to support their regulatory and accreditation obligations, how far each is built today, and what stays the customer's job.

**English only for now.** Translation waits for content freeze and Pete's go-ahead (no machine translation into the five other languages yet). Legal review is also pending: see `OPEN_QUESTIONS.md`.

## The wording rule (read before editing)

PathScribe **provides capabilities intended to support** laboratory compliance with applicable regulatory and accreditation requirements. This guide, and anything written from it (RFP answers, web pages, training), never says "PathScribe is HIPAA compliant", "is CAP compliant" or any equivalent. Compliance belongs to the laboratory's operation as a whole: its people, procedures, hosting and identity provider as well as the software. `docs/compliance-guide/` statements are checked against the code and `docs/product/FEATURE_OVERVIEW.md`; a capability that is not built is labelled so.

## Status words (same as `FEATURE_OVERVIEW.md`)

| Word | Meaning |
|---|---|
| **Live** | Built and in use. |
| **Built (Demo)** | Built in the browser and working against the demonstration data; the API server's side is not built, so it is not yet an enforced production control. |
| **Partial** | Part is built; the guide says which part. |
| **Planned** | Scoped, not built. Never describe as available. |
| **Not built** | No code and no committed plan. |
| **Customer** | Not a software feature; the laboratory or its identity provider, host or IT team does it. |

## Contents

| File | Chapter |
|---|---|
| `01-introduction.md` | Purpose, scope, validation responsibilities, shared-responsibility model |
| `02-supported-jurisdictions.md` | The 14 jurisdictions in the product and the frameworks each is associated with |
| `03-regulatory-mapping.md` | Requirement themes mapped to capability, status and where to find the evidence |
| `04-security-controls.md` | Authentication (SSO, MFA), sessions, audit logging, data protection, permissions |
| `05-specimen-traceability.md` | Chain of custody, scan verification, workstation, batch, disposal, correction audit |
| `06-electronic-records-signatures.md` | Versioning, amendments, release history, attribution, signature controls |
| `07-privacy-data-protection.md` | HIPAA, GDPR, UK GDPR, PIPA and provincial privacy: what supports each, what does not exist |
| `08-shared-responsibility.md` | Who does what: PathScribe, the customer, the identity provider, the host |
| `PathScribe_Regulatory_Readiness_Matrix.xlsx`, `readiness/requirements.json` | Batch 678: the three-layer readiness matrix (canonical requirements, regulatory crosswalk, generated country views). Edit the JSON; regenerate with `python3 scripts/compliance/build_readiness_matrix.py`. It replaces the Batch 677 tracker. |
| `IMPLEMENTATION_PLAN.md` | Proposed batches 679 to 686 and the outside-party track |
| `OPEN_QUESTIONS.md` | Decisions and checks for Pete and for legal and regulatory review |

## Keeping it true

When a batch changes a control named here, update the chapter's row in the same batch and add a line in `docs/product/GUIDE_UPDATES.md`. A row's status may only move up after the code and a test exist. Sources for every row: `docs/product/FEATURE_OVERVIEW.md`, `docs/product/KNOWN_GAPS.md`, `docs/architecture/AUTHENTICATION_MODEL.md`, `docs/architecture/SERVER_DECIDES.md`, `docs/architecture/AUTHORIZATION_API.md`.
