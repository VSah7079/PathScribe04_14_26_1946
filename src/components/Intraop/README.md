# components/Intraop

**Batch 399 (Pete).**
- `VerbalReportForm.tsx`: the verbal report of a frozen result. Received by (type-to-search: the session's surgeon, then the physician directory; any name accepted), role (large buttons; "Operating surgeon" fills in the session's surgeon), the mandatory read-back, the critical-result tick (suggested by the dictionary, decided by the pathologist) and, for a critical result given to anyone else, a large **Surgeon unavailable** button that shows the reasons as large buttons. "Other" offers starting phrases and needs a real note. "report logged" does what Log does.
- `IntraopFieldBits.tsx`: "Still required: …" and the required "*" for the Intraop page's forms.

## Batch 400

`VerbalReportForm.tsx`: a **Dictate the report** box at the top (tap it, then the microphone, or type) and **Fill in from dictation**. Filled fields are tagged "From dictation" until the pathologist changes them, a mentioned reason is tagged "Mentioned", and a note says whether AI or keyword matching filled them. The dictation becomes the note if the note is empty. Log is still the pathologist's tap.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

`LateFrozenDiagnosisForm` (Batch 659): adds a frozen section diagnosis to a saved specimen; the save logic is in `intraoperativeService`.
