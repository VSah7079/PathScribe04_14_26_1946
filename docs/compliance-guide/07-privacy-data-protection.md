# 7. Privacy and data protection

PathScribe is a processing tool for patient data. The controller (or covered entity) is the laboratory or hospital. Privacy law in each market is the customer's responsibility; the software provides the following supporting controls and has the following gaps.

## What supports privacy

| Control | Status |
|---|---|
| Role-based access with fine-grained capabilities; no bypass for any role (chapter 4) | Built (Demo); server must repeat |
| Audit of access and changes with no patient identifiers or free text in the entry | Built (Demo) |
| Identifiers tagged for redaction in support screenshots (enforced by a source test) | Live |
| No patient data stored in the browser with an API server | Live for server installations |
| Data-location control for AI: vendor and hosting region allowed per jurisdiction and facility; refused calls never go elsewhere | Live in browser; server proxy check Planned |
| Retention by jurisdiction; retention hold | Live (figures partly unverified) |
| Limited external sharing: outside-consult links masked by default (initials and birth year), https-only links | Live |
| Hosting choice (public, private, sovereign or on-premises) | **Planned** |

## Framework notes

- **HIPAA (United States).** The controls above relate to audit, access and transmission themes. A business associate agreement is between the customer and ForMedrixAI/its host; cloud hosts sign them (see `DEPLOYMENT_READINESS_REVIEW.md`). Risk analysis, workforce training, breach notification and minimum-necessary policies are the customer's. Older text in the product that reads as a HIPAA claim (for example in Session Security descriptions) is being corrected.
- **GDPR and UK GDPR.** Data location control for AI and hosting, retention by jurisdiction and audit support accountability and storage limitation. **Not built:** tooling for data-subject requests (access, rectification, erasure, restriction, portability), a records-of-processing export, a data-protection-impact-assessment template. Erasure interacts with clinical retention duties; the policy for that is open (`OPEN_QUESTIONS.md`).
- **PIPA (Canada: Alberta, BC; South Korea) and provincial health privacy (such as PHIPA).** No setting specific to these. The general controls apply. Whether any province or Korea requires data to stay in-country is a hosting question for the customer; the hosting review marks several of these "not confirmed from a primary source".
- **NHS requirements.** NHS number handling and the NHS Data Security and Protection Toolkit are organisational; PathScribe has no DSPT feature.

## Customer duties PathScribe cannot take over

Lawful basis and consent, notices to patients, data-processing agreements, cross-border transfer decisions, breach response, and the regulator's registrations.
