# PathScribe — IP & Legal

This folder is for formal IP inventory, copyright notices, software
asset disclosures, third-party license audits (SBOM), and patent
drafting references.

**What's deliberately not in this document:** specific IP strategy,
copyright registration status, equity structure, or contract terms.
That content belongs with Pete and ForMedrixAI LLC's own attorney, not
drafted here with false authority — this is a placeholder and index,
not a substitute for real legal counsel.

## What's real and already done, for context

Substantial pre-copyright-deposit codebase hardening was completed
this session, specifically because it matters for a clean deposit:

- A comprehensive dead-code sweep across `services/` and `components/`
  (`ClaudeProvider.ts` was identified as a near-verbatim, unused
  duplicate of `StructuredMessagesProvider.ts`, but it is still present
  in `src/services/ai/providers/` with no consumers; a stale copy of
  `PatientMatchReviewSection.tsx` left behind by an incomplete move was
  removed, and the live one is `components/QualityAssurance/`).
- A hardcoded third-party API key (UMLS) found and removed from source,
  with the key itself rotated.
- At the time, every folder in `src/` had its own `README.md` (169
  folders). `src/` has since grown to about 360 folders, and about 47
  have no `README.md` of their own (most are `src/types/` subfolders,
  test fixtures and small subfolders such as `services/auth/sso`).

*Corrected in the Batch 496 README audit (Oct 9, 2026): `ClaudeProvider.ts` was not removed (see `services/ai/providers/README.md`), and README coverage is no longer complete.*

## What's a real, concrete, buildable task if wanted

A software bill of materials (SBOM) / third-party license audit is a
genuinely mechanical, checkable task against the real `package.json` —
ask directly if this would help, rather than leaving it as an
unaddressed gap in this folder indefinitely.

## Legal entity name

**ForMedrixAI LLC** — one word, no space, capital M. This exact form
applies in code, copyright notices, and legal/IP filings.
