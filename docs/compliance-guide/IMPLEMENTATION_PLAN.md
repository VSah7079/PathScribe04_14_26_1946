# Implementation plan: the Regulatory Readiness Matrix and what it exposes

**Status: proposed (Batch 678, Oct 25, 2026). Nothing after Batch 678 is started.** Batch numbers are the next free numbers and may shift. Pete decides order and which outside parties to engage; dates are for him to set.

## What exists after Batch 678

- Layer 1: 51 canonical requirements (`PS-R-001` to `PS-R-051`; PS-R-045 to 051 are AI output governance, Batch 688) in `readiness/requirements.json`, each with code evidence, test evidence, a status, a gap and the outside reviewer who must confirm it.
- Layer 2: the crosswalk, 166 requirement-to-framework entries, all "Candidate". The Crosswalk Interpretation sits at the top of the Crosswalk sheet and in the Read me.
- Four separate fields, none of which means compliant (Pete's product-management note): **Mapping** (Candidate = potentially related; Mapped = relationship reviewed by the team), **Implementation** (Live, Built (Demo), Partial, Planned, Not built and so on: functionality exists and evidence identified), **Verified** (independently reviewed or tested; "No" everywhere today) and **Compliance** ("Not Assessed" everywhere; the generator refuses any other value, and only external review can change it). The Implementation words keep the repo's existing vocabulary rather than Implemented / Gap.
- Layer 3: generated views for 13 jurisdictions, a framework summary, and the generator `scripts/compliance/build_readiness_matrix.py`, which fails on a missing evidence path.

Honest limits: the 51 requirements are a seed (the product notes expect 300 to 500); the crosswalk is the author's judgment; evidence paths prove a file exists, not that the test proves the requirement (one row was already downgraded for that).

## Two tracks

**Track A, build (Claude, in batches).** Needs only the repo, plus standards text where noted.

**Track B, outside parties (Pete, starts now because of lead time).** None of this is in the batches below, and nothing in Track A waits for it, but several Track A outputs cannot be published until it reports.

| Track B item | Why | Unblocks |
|---|---|---|
| Regulatory counsel opinion on whether PathScribe is a device under IVDR (and the intended-purpose statement) | Decides whether any EU claim is possible (PS-R-042) | Any EU marketing; Batch 681 IVDR rows |
| Privacy counsel or DPO review of HIPAA, GDPR, UK GDPR, PIPA, PHIPA wording and of the erasure-versus-retention policy | Chapter 7 and PS-R-034 to 036 | Batch 683 scope; public privacy statements |
| ISO 15189 and CAP mapping by an assessor or consultant who holds the current editions | Clause numbers cannot be written from here | Batch 680 |
| National experts for Germany, Netherlands, Belgium, France, Spain, Ireland, Korea, Canada, Australia, New Zealand | Verify the citations already in the code and map the national frameworks | Batch 681 |
| Independent penetration test and security assessment | Evidence for ISO 27001, HIPAA, DSPT rows | Batch 684 evidence |
| Website wording review against the guide | Marketing must say what the matrix supports | Public claims |

## Track A batches

| Batch | Name | What is built | Done when | Needs from Pete or outside |
|---|---|---|---|---|
| **678** | Matrix foundation (this batch) | Requirements file, crosswalk, generator, 13 country views, first 44 requirements | Generator passes; delta zip delivered | Review the 44 |
| **679** | Evidence review and guard | Read every cited test, correct each status (as done for PS-R-004), add a vitest guard that runs the same checks as the generator so CI fails on a stale path or an unsupported status; add a column "Test proves requirement: Yes / Partly / No" with a one-line reason | All 44 rows reviewed; guard in the suite | None |
| **680** | Phase-1 requirement expansion | Grow to about 150 requirements across ISO 15189, ISO 27001, CLIA, CAP, HIPAA, GDPR, DSPT from the product's own features and the frameworks' public structure; clause column filled only where an assessor supplied it | Every feature area in `FEATURE_OVERVIEW.md` is covered by at least one requirement or listed as out of scope | Standards text or assessor input for clause numbers |
| **681** | Phase-2 frameworks | Requirements and crosswalk for IVDR (only after counsel), PHIPA, PIPA, Rili-BÄK, CCKL, BELAC, COFRAC, ENAC, INAB, NPAAC, NATA/RCPA, IANZ, KOLAS; verify or replace the expert-supplied citations in the date gate, inking gate and evidence binder; replace the Canada placeholder | Every country view lists real requirements, not "none yet", or says why not | National experts; counsel on IVDR |
| **682** | Gap-to-backlog | Turn every Planned or Not built row into a Jira-ready story with acceptance criteria and a priority, grouped by owner (front end, API server, hosting, process) | Backlog list accepted by Pete | Jira keys assigned by Pete |
| **683** | Privacy tooling, front end and contract | Data-subject request handling, records-of-processing export, incident and breach log screens and their API contracts (PS-R-034 to 036) | Screens, capabilities, six languages, contract documented; server routes listed as not built | Counsel's retention-versus-erasure policy |
| **684** | Validation and implementation pack | Validation Guide, Implementation Guide, IQ/OQ/PQ templates, change-control record, evidence index from `docs/quality/evidence/` (PS-R-039) | Documents exist and the matrix points to them | Hosting decisions (PS-539) |
| **685** | RFP answer generator | A script that turns one country view into an RFP answer document: quotes only Live, Built (Demo) and Partial rows, with the status and the standard "provides capabilities intended to support" wording; Planned and Not built rows listed as roadmap | Generated German and NHS examples reviewed by Pete | Website wording from Pete |
| **686** | Server-side controls (API server team) | Audit immutability and in-transaction audit, MFA policy routes and audit events, server permission checks, version endpoints, AI proxy check | Rows move from Partial or Planned to Live with test evidence | API server team's schedule |

Batches 679 to 685 can proceed without Track B except where noted. Batch 686 is not Claude's alone: it needs the API server.

## Rules for every batch

- A row's status moves up only when code and a test exist, or an outside reviewer's written finding is attached.
- A crosswalk entry moves from Candidate to Mapped only when the team has reviewed the relationship (Batch 679 onward), and carries a clause number only when an assessor supplied it; never write one from memory. Verified changes only on an independent review, recorded with who did it. Compliance never changes in this repository.
- Public wording follows the compliance guide's rule. Nothing here supports "meets all requirements".
- Each batch regenerates the matrix, updates the guide chapter it touches, `GUIDE_UPDATES.md` in four voices, the READMEs up to the root and the Xray evidence file.

## Decisions for Pete

1. Confirm the order, especially whether 681 (national frameworks) should wait for the experts or start with what the code already cites.
2. Whether to commission counsel and the penetration test now.
3. Whether the readiness matrix may be shown to customers as it grows, and in what form (it lists gaps plainly).
4. Who owns Batch 686 on the server side and when.
