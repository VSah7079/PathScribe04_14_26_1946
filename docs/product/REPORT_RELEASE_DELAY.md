# Report release delay and recall

How PathScribe holds a released report for a few minutes before anyone outside the laboratory sees it, and how the pathologist can take it back in that time. This is the source for the User Guide, Admin Guide and training on this topic.

## The rule (Pete, Oct 12, 2026)

> Any report output, unless it's a resubmission to an output failure, should follow the consistent delay rule.

- **Every report output waits:**
  - surgical sign-out (final), preliminary, correction and addendum;
  - autopsy PAD and FAD;
  - cytology case report, early finalization, a specimen added after it, corrections, addenda and urgent preliminaries.

  Each goes to the EMR, print, fax, file drop and any screening registry only when the delay ends.
- **Resends are not delayed.** Retrying a failed delivery or message sends at once; the report was already released.
- **STAT cases** skip the delay when the laboratory's STAT bypass is on. This applies to every output the same way, the urgent preliminary included.

## Setting it (Admin Guide)

- Configuration → System → **Release Buffer**: on or off, the duration (1–30 minutes, 10 by default), and the STAT bypass, for the enterprise.
- Facility Dictionary → a performing lab → AI & Performance: its own override.

## During the delay (User Guide)

- **Surgical sign-out:** the report page shows the release-buffer banner with its countdown and Recall, as before.
- **Everything else:** the report page and the Cytology Workspace show a line for each held report: what it is, when it goes, and who released it. That person sees **Recall**.
- **Recall reopens what was released, and nothing is sent:**
  - cytology case report: the last specimen's sign-out is withdrawn and the case reopens, so the specimen can be corrected and signed again;
  - cytology early finalization: undone;
  - cytology correction: withdrawn, and the specimen's final diagnosis goes back to what it was;
  - cytology addendum: withdrawn;
  - urgent cytology preliminary: marked recalled, not sent;
  - surgical preliminary: its attestation is cleared;
  - surgical correction or addendum: it goes back to draft and the report is open to edit again, as it was before release (Batch 535);
  - autopsy PAD or FAD: the signature is withdrawn and the report can be signed again; for a FAD the case reopens. A PAD can't be recalled once the FAD is signed on it; recall the FAD first (Batch 535).
- **Recalling a surgical sign-out** also takes back any correction or addendum released on it during its delay.
- **Not undone by Recall:** a CAPA recommendation made when a correction was released stays for the QA lead to dismiss.
- **Only the person who released it can recall it.** A recall after the delay has ended is refused: the report has gone.
- **Records are never deleted.** A recalled sign-out stays on file, marked recalled, with who and when. Every hold, send and recall is in the audit log (`REPORT_RELEASE_HELD`, `REPORT_RELEASE_SENT`, `REPORT_RELEASE_RECALLED`).

## When it goes

- While PathScribe is open on any screen, held reports go out within about 15 seconds of their time, even if nobody has that case open.
- In a server installation, the API server releases them on its own schedule (PS-539). Until then, a report whose time has passed goes out as soon as someone opens PathScribe.

## Corrections and addenda during the delay (Batch 540)

Pete, Oct 12, 2026: a report in its release delay hasn't been sent, so it isn't corrected with an amended report; it is recalled, edited and signed again.
- While the case's report is in its delay (a surgical or autopsy case in its sign-out buffer, or a held cytology case report), starting a correction or addendum is refused with a message saying to recall the report. Once the delay ends, corrections and addenda work as before, and each goes through its own delay.
- A released report's PDF never carries the release-buffer ("pending release") watermark, even if it was made during the delay; only a print made during the delay shows it.
- Enforced in the services (`src/services/reportRelease/revisionDuringDelay.ts`), not only on screen.

