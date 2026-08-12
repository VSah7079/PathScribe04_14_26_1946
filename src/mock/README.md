# src/mock/

One file: `mockReports.ts` (1,103 lines) — one `FullReport` per
worklist case (S26-4401…S26-4460), consumed by `FullReportPage.tsx`.

Clean — no `any` casts, no dead code, well-structured formatting
helpers at the bottom of the file. Given its size and that it's
primarily data (not logic), reviewed structurally rather than reading
every mock report entry individually.

Worth knowing: the file's own header comment confirms it exists
specifically to support verifying PHI redaction — "PHI fields
(patientName, mrn, dob) are populated with realistic fictitious values
so that data-phi redaction can be verified in screen captures." This
is the exact feature found silently broken and fixed elsewhere in this
review (`hooks/useScreenCapture.ts`, `PRIORITY_FIXES.md` item #34) —
this mock data file was already set up to support testing it properly,
which is a good sign for how deliberately that feature was originally
built, even though the actual bug slipped through until this review's
empirical pixel-sampling test caught it.
