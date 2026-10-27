# 3. Regulatory mapping matrix

**Reading this chapter.** "Candidate" mapping = potentially related by subject and intent; "Mapped" = reviewed by the team; "Implemented" = functionality exists and evidence is identified; "Verified" = independently reviewed or tested. None of these means compliant. Compliance is a separate field, Not Assessed until external review. The full interpretation is on the Crosswalk sheet of `PathScribe_Regulatory_Readiness_Matrix.xlsx`; the matrix is the maintained source and this chapter is the narrative.

Each row maps a requirement **theme** to a PathScribe capability. The themes are general descriptions, not quotations of any standard's clause; the laboratory's quality manager maps them to the clause numbers of the standards that apply to it. "Evidence" is where the capability can be shown.

| Theme | Frameworks where it commonly arises | PathScribe capability | Status | Evidence |
|---|---|---|---|---|
| Audit controls: who did what, when | HIPAA, CAP, CLIA, ISO 15189, GDPR (accountability), IVDR (traceability) | Audit log of sign-in, case, quality, configuration and AI events with actor, time and facility; no patient identifiers or free text in entries | Built (Demo); server write path specified. Not tamper-evident until the server exists | Audit Log screen; `src/services/auditlog/README.md`; `KNOWN_GAPS.md` |
| Access restriction by role | HIPAA, GDPR, ISO 15189, CAP | Capability-based permissions (hundreds of separate capabilities, no blanket flags, no bypass for any role); screens grey out what a person may not do; services refuse | Built (Demo); the server must repeat every check | `AUTHORIZATION_API.md`; Role Dictionary |
| Authentication and second factor | HIPAA, GDPR, NHS DSPT, ISO 27001-style controls | Server deployments: single sign-on only; the identity provider owns passwords and multi-factor; PathScribe checks the second-factor claim and asks for a fresh sign-in at signature | Built (browser); server enforcement and policy routes not built | `AUTHENTICATION_MODEL.md`, `MFA.md` |
| Session control | HIPAA, ISO 15189 | Idle sign-out (organisation default, lab override), single active session per person, unsaved-work protection | Built (Demo) | Session Security screen |
| Specimen identification and traceability | ISO 15189, CAP, CLIA, IVDR | Barcode-scan chain of custody through processing nodes; scan verification; workstation record; batch tracking; cold-chain excursions | Live (Demo data); server records Partial | Chapter 5 |
| Retention and disposal | CAP, CLIA, RCPath, RCPA, GDPR (storage limitation), IVDR | Governing-body retention figures by jurisdiction; computed eligibility; retention holds; permissioned disposal and report | Live; several seeded figures are unverified placeholders | Governing Bodies; Retention Holds queue |
| Report integrity and versioning | CAP, CLIA, ISO 15189, IVDR | Every sign-out stores a version with signer, patient and encounter as they were, and a PDF with a SHA-256 fingerprint checked before opening, sending or releasing | Live in the demo; server endpoints Partial | Version History; chapter 6 |
| Corrections, amendments, addenda | CAP, CLIA, ISO 15189 | Two-stage pipeline: change is classified, transmitted, then released | Live | Chapter 6 |
| Critical-result communication | CAP, RCPath, RCPA, JCI/KOIHA, ISO 15189 | Records who was told, by what method, with read-back and receipt; system flags, human decides | Live | `src/services/clinical/README.md` |
| Electronic signature | CLIA, CAP, ISO 15189, EU rules on electronic records | Signature needs the capability, active case participation and a fresh second factor; tied to report version | Built (Demo) | Chapter 6 |
| Data minimisation on devices | HIPAA, GDPR | With an API server, no clinical data is written to browser storage | Live for server installations | `FEATURE_OVERVIEW.md` |
| Redaction of identifiers in support material | HIPAA, GDPR | Every patient identifier is tagged so screenshots redact it; enforced by a source test | Live | `src/services/phi/README.md` |
| Privacy rights (access, erasure, portability) | GDPR, UK GDPR, PIPA, provincial law | No patient-facing or administrator tooling for a data-subject request | **Not built** | Chapter 7 |
| Approved vendors and data location for AI | GDPR, HIPAA, national rules | AI vendor policy by jurisdiction and facility; refused calls go nowhere; every call logged with service, model, region | Live in the browser; the same check in the server's AI proxy Planned | `AI_PROXY.md` |
| Hosting and data residency | GDPR, HDS, C5, NHS, HIPAA business-associate terms | One cloud-agnostic package for public, private or on-premises hosting | **Planned** (PS-539) | `DEPLOYMENT_READINESS_REVIEW.md` |
| Accessibility | Procurement requirements in many markets | WCAG 2.1 AA | Live | `FEATURE_OVERVIEW.md` (Batch 524, PS-491); accessibility test runs in `docs/quality/` |
| Interoperability | IVDR/ISO 15189 (information exchange), local | HL7 processing, master patient index; interface engine | Partial | `FEATURE_OVERVIEW.md` |

## Jurisdiction-specific mappings in the product

Chapter 2 lists the framework citations the product itself carries: the pre-analytic date gate at sign-out (all markets, hard block, Canada unconfirmed), the Inspection Mode evidence binder (a clause per jurisdiction), the structured inking gate, and the European cytology compliance matrix. Status: Built (Demo) in the browser; the same checks must be repeated by the API server.

## Global management-system standards (not yet mapped)

ISO 22367 (laboratory risk management), ISO 27001 (information security management), ISO 27701 (privacy information management) and ISO 9001 (quality management) are Tier 1 in Pete's requirements outline. This guide does not yet map them, and ForMedrixAI holds no certificate for any of them on record. They are rows ISO-09 to ISO-13 in `PathScribe_Regulatory_Readiness_Matrix.xlsx`, status Not assessed.

## Not covered

PathScribe contains nothing for: IVDR performance-evaluation or technical-documentation duties of a device manufacturer (it cites IVDR / ISO 15189 at the sign-out date gate and the inking gate but has no IVDR schema-level validation gate), NHS DSPT submissions, HIPAA risk analysis or breach notification workflows, GDPR records of processing, data protection impact assessments or subject requests, Rili-BÄK internal and external quality control rules as such, or accreditation-body submissions. Some of these are organisational duties (Customer); others may become product features (see `OPEN_QUESTIONS.md`).
