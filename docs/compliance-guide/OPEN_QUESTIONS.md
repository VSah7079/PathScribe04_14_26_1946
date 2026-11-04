# Open questions

For Pete, and for legal and regulatory review before this guide is given to customers.

1. **Legal review.** Have counsel read the wording of every chapter, especially chapters 3, 6 and 7, before external use.
2. **Certifications.** Does ForMedrixAI hold or plan any certification or assessment (ISO 27001, SOC 2, HITRUST, NHS DSPT as a supplier, HDS)? None is recorded; add with scope and date.
3. **Jurisdictions.** Wales has no jurisdiction of its own (it shares England's). EU and the Canadian provinces have none either. Add them, or leave as is and document?
4. **Framework-specific content.** The product carries citations for CAP/CLIA, UKAS/RCPath, IVDR/ISO 15189, IANZ, KAZA/KSP/KSLM, NATA/NPAAC, IQMH and others (chapter 2), supplied as domain-expert research. Decide: (a) who confirms those citations against the current published texts and how often; (b) the Canada date-gate placeholder; (c) whether Rili-BÄK, CCKL, PHIPA, PIPA, BELAC and DSPT need anything beyond customer procedure. **Also: the website's compliance wording has not been compared with this guide. Please send it, so the two say the same thing.**
5. **Unverified retention figures.** CAP and CAP-ACP wet tissue, RCPA and Korea MSA are placeholders. They should be verified against the published schedules before this guide quotes any.
6. **Data-subject requests.** Is an access/erasure/portability tool in scope, and how does erasure reconcile with clinical retention duties?
7. **Electronic-signature regulation.** Which regulations should the signature controls be mapped to (21 CFR Part 11, eIDAS, others)?
8. **Server-side controls.** Chapters 4 to 6 depend on API server routes that are not built. Dates should be added once the server plan has them.
9. **Other guides.** The Implementation Guide and the Validation Guide do not exist yet; this guide refers to them.
10. **Translation.** Hold until content freeze; then native-speaker legal review in each language.
11. **Placement.** This guide sits in `docs/compliance-guide/`; the customer-facing build and publishing (`public/help/`) are not done.
12. **Claims to verify.** Chapter 4's biometric row, whether role changes are audited (not confirmed, so not claimed), chapter 5's correction-audit row (old and new values) and chapter 6's case versioning row were written from the feature overview and should be checked against the screens before release.
