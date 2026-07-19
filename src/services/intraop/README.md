# services/intraop/

Intraoperative Pre-Check queue — bench-side capture (frozen section, quick gross) before formal LIS accession arrives.

**Pattern:** Explicitly documented as following 'the same interface+implementation split every other service in this app follows.'

## Notes

- Session/specimen split: one session = one patient/OR/surgeon; addMilestone/setFrozenSectionDiagnosis operate on individual specimens within a session, since different specimens in the same session can be at different workflow points.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*