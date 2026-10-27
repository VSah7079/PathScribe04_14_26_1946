# 2. Supported jurisdictions

A facility is given one jurisdiction (Facility Configuration > General). The jurisdiction sets the default report language, the country signing rules, the payment schemes offered, the AI vendors and hosting regions allowed, correlation windows, code systems, and the retention figures from the governing bodies linked to it. The product has **14** jurisdictions (the older jurisdictions guide says 13; Spain was added since).

The "Frameworks named" column lists the frameworks Pete named for each market. The "In product" column says what the code holds for that market. **Correction (Batch 676):** an earlier draft of this chapter said the product has no settings of its own for most of these frameworks. That was too broad. The product does carry framework-specific behaviour for several markets, described in the section "Framework-specific behaviour in the product" below. What it does not have is a setting named after a framework such as DSPT or Rili-BÄK, or any third-party assessment against one.

| Jurisdiction (code) | Frameworks named | In product today |
|---|---|---|
| United States (`US`) | CLIA, CAP, HIPAA, Joint Commission | Sign-out date gate citing CAP / CLIA § 493.1241; inking gate; QA binder basis CAP/CLIA; CAP and CLIA retention figures (CAP wet tissue unverified); critical-result recording. No HIPAA or Joint Commission setting. |
| Canada (`CA`) | Accreditation Canada, IQMH, provincial laboratory accreditation, PHIPA, PIPA | IQMH profile in the inking gate; QA binder basis IQMH / CPSA. The sign-out date gate for Canada is an **unconfirmed placeholder**. No provincial, PHIPA or PIPA setting. |
| England (`GB_EW`) | ISO 15189, UKAS, NHS DSPT | Date gate citing UKAS ISO 15189 Clause 7.2 / RCPath; inking gate RCPath; QA binder UKAS ISO 15189; RCPath retention; G133 critical communication; NHS number handling. No DSPT feature; DSPT is an organisation-level assessment. |
| Scotland (`GB_SCT`) | UKAS, ISO 15189, NHS Scotland standards | Same UK date gate, inking gate and UKAS ISO 15189 binder basis as England. No Scotland-specific standards content. |
| Wales | UKAS, ISO 15189, NHS Wales standards | **No Wales jurisdiction exists** (England and Wales share `GB_EW`). |
| Northern Ireland (`GB_NIR`) | UKAS, ISO 15189, HSC NI requirements | Same UK content as England. No HSC-specific content. |
| Ireland (`IE`) | ISO 15189, INAB, HSE guidance | EU date gate (IVDR / ISO 15189); EU inking profile; ISO 15189 / ISO/TS 23824:2024 binder basis; INAB / Irish national cervical screening governance named in the EU cytology matrix. No HSE-specific content. |
| Germany (`DE`) | ISO 15189, Rili-BÄK, GDPR | EU date gate; EU inking profile; ISO 15189 binder basis; G-BA named in the EU cytology matrix; German report language. No Rili-BÄK setting. |
| Netherlands (`NL`) | ISO 15189, CCKL-derived requirements | EU date gate; EU inking profile; ISO 15189 binder basis; NVVP named in the EU cytology matrix. No CCKL content. |
| France (`FR`) | ISO 15189, COFRAC | EU date gate (names COFRAC as an example accreditor); EU inking profile; ISO 15189 binder basis; HAS named in the EU cytology matrix. Hosting review notes HDS/SecNumCloud (Planned). |
| Belgium (`BE`) | ISO 15189, BELAC | EU date gate; EU inking profile; ISO 15189 binder basis; Belgian Dutch and French variants. BELAC is not named in code. |
| Spain (`ES`) | ISO 15189, ENAC | EU date gate (names ENAC as an example accreditor); EU inking profile; ISO 15189 binder basis; DNI/NIE identifier (disabled by default); research in `docs/product/SPAIN_RESEARCH.md`. |
| European Union | IVDR, GDPR | No "EU" jurisdiction; member states are separate, but the date gate and inking gate treat them as one EU profile citing EU IVDR (2017/746) / ISO 15189, and ISO 15189 is a governing body. No IVDR schema-level validation gate. See chapter 7 for GDPR. |
| Australia (`AU`) | NPAAC, ISO 15189 | Date gate citing NATA / NPAAC, AS ISO 15189; NPAAC / RCPA inking profile; NATA/RCPA binder basis; RCPA governing body (NPAAC retention is an unverified placeholder); RCPA/AACB high-risk result communication; self-collected HPV recall (Partial). |
| New Zealand (`NZ`) | IANZ, ISO 15189 | Date gate citing IANZ / AS ISO 15189:2022; IANZ binder basis; shared ANZ inking profile; as Australia where shared. |
| South Korea (`KR`) | KOLAS, PIPA | Date gate citing KAZA / ISO 15189, KSP / KSLM (Korean override label 미상); MFDS inking profile; Korean MSA governing body (unverified retention placeholders); critical-result recording suited to KOLAS/ISO 15189 or KOIHA/JCI at the customer's choice. KOLAS is described in the critical-result design notes but is not otherwise a setting. No PIPA setting. |

## Framework-specific behaviour in the product

These are real and tested. Each cites a framework by name. **The citations were supplied as domain-expert research and are stored as data; the code does not independently verify the underlying regulation**, and a laboratory's quality manager should confirm each against the current published text before relying on it in an inspection.

### 1. Pre-analytic date gate (sign-out hard block)

A report cannot be signed out while a specimen lacks a validated collection or laboratory-receipt date and time. The only way past it is a designated administrative override that records the reason, opens a Specimen Deficiency (CAPA) record, and puts a disclaimer on the report PDF. In every market this is a hard block, never advisory. What varies is the standard cited, the override label and the disclaimer wording (`resolvePreAnalyticDateGateConfig.ts`). It is keyed to the organisation's country, which is coarser than the 14 jurisdictions:

| Organisation country | Standard cited | Override label |
|---|---|---|
| United States | CAP / CLIA § 493.1241 | Unknown / Not Provided |
| United Kingdom | UKAS ISO 15189 Clause 7.2 / RCPath | Date Not Provided |
| European Union (one bucket: Ireland, Germany, Netherlands, France, Belgium, Spain) | EU IVDR / ISO 15189 (for example COFRAC, DAkkS, ENAC) | Not Provided / Unknown |
| New Zealand | IANZ / AS ISO 15189:2022 | Date/Time Not Stated |
| South Korea | KAZA / ISO 15189, KSP / KSLM | 미상 (Unknown) |
| Australia | NATA / NPAAC, AS ISO 15189 | Date/Time Not Stated |
| Canada | **Not confirmed.** Generic placeholder; the file says to research before relying on it for a Canadian site | Not Provided |

Disclosed limits (from the file's own notes): no Datix or other NHS incident-log integration; no IVDR schema-level (HL7/FHIR) validation gate; no real-time Korean EMR/NHIS claims validation; no LIS-side footnote automation; no automated Medicare compliance check. The disclaimer text is sent to the PDF rendering service as data; the application cannot verify the service draws it. Whether the disclaimer also travels in outbound result messages has not been re-checked.

### 2. Inspection Mode evidence binder (Quality Assurance)

A one-click export of the last 24 months of QA evidence, mapping each QA activity to the regulatory basis for each jurisdiction its type is configured for (`resolveQaEvidenceBinder.ts`):

| Jurisdiction | Basis cited in the binder |
|---|---|
| United States | CAP AP Checklist / CLIA interpretive QA requirements |
| Canada | IQMH, CPSA: interpretive QA, correlation audits, discrepancy tracking |
| England, Scotland, Northern Ireland | UKAS ISO 15189: interpretive audits, discrepancy documentation |
| Ireland, Belgium, Netherlands, Germany, France, Spain | ISO 15189 / ISO/TS 23824:2024: internal audits, diagnostic accuracy review |
| Australia | NATA/RCPA: structured AP QA, correlation audits, random review |
| New Zealand | IANZ: interpretive QA, internal audits |
| South Korea | National accreditation programs: interpretive QA, peer review, discrepancy tracking |

An activity type with no jurisdiction configured cites none. "CAPA triggered" is reported as records meeting the configured threshold, not as a traced link (disclosed in the file).

### 3. Structured inking sign-out gate

Margin ink problems block sign-out with a message citing a regulatory profile: US CAP (CLIA 42 CFR 493.1273 / CAP checklist), Korea (MFDS), UK RCPath, Canada IQMH, Australia/New Zealand NPAAC / RCPA, and EU IVDR (2017/746) / ISO 15189 for Ireland, Belgium, the Netherlands, Germany, France and Spain (`jurisdictionInkingGateMessages.ts`).

### 4. European cytology screening compliance matrix

A per-country report ("EU-QA-01") built for the European screening programmes, citing EURECAH guidelines, NVVP (Netherlands), HAS (France), G-BA (Germany) and INAB / Irish National Cervical Screening governance as drivers. It reports, per country: case counts, primary HPV versus co-testing, internal audit non-conformities, national registry IDs, liquid-based platform and screening-interval adherence (`resolveCytologyEuComplianceMatrixReport.ts`, extended in Batch 608). Interval adherence is only judged where the country's interval table and the patient's history allow.

### 5. Retention, critical results and code systems

Governing bodies (CAP, RCPath, RCPA, ICCR, ISO 15189 for the EU, Korean MSA, NPAAC placeholder) set retention figures by jurisdiction (several are unverified placeholders). Critical-result recording follows CAP, RCPath G133 and RCPA/AACB communication guidance and supports KOLAS/ISO 15189 or KOIHA/JCI-aligned customers. Code systems (ICD-10, ICD-11, ICD-O, SNOMED CT) are set per jurisdiction.

## Still not in the product

Nothing named DSPT, Rili-BÄK, CCKL, PHIPA, PIPA or BELAC exists; Wales has no jurisdiction of its own; there is no IVDR schema-level validation gate; no data-subject-request tooling; no INAB-, COFRAC-, ENAC-, IANZ- or KOLAS-specific checklist beyond the citations above. Of the named frameworks, DSPT, PHIPA and PIPA are organisation- or privacy-law obligations rather than laboratory-software features.

## How to read this

A framework named here is either a market the product is designed to serve or one it cites in a gate, report or binder. Neither is a statement that PathScribe has been assessed against it. This guide records no certification or third-party assessment of PathScribe against any of them; if ForMedrixAI holds any, they are added here with their scope and date (`OPEN_QUESTIONS.md`).
