# services/containerTypes/

Structured container-type dictionary (jar/cassette/slide etc.) — replaces a previously-unconstrained free-text field.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Feeds the real HL7 SPM-27 segment (see services/hl7/segmentBuilders.ts) — this dictionary exists specifically because that segment builder needed a real container-type value to work with.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*