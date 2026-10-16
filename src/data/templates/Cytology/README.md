# data/templates/Cytology/

Cytology-specific CAP/RCPath synoptic protocol templates.

## Files

- `cytology_lymph_node_fna_cytology.json`
- `cytology_pancreaticobiliary_cytology.json`
- `cytology_salivary_gland_fna_cytology.json`
- `cytology_thyroid_fna_cytology.json`
- `cytology_urine_cytology.json`

## Batch 519 (PS-273): on the shared template model

These five templates now use the Synoptic Library's template model (`EditorTemplate`, `components/Config/Protocols/SynopticEditor.tsx`); `types/cytology/SynopticTemplate.ts` is a set of aliases for it. Each section gained `collapsed: false` and each free-text question `options: []`; nothing else changed (narrative phrases and sentences, clinical tiers, lexicon terms, `standard` and `applicability` are all as before; 4-space indent kept).

They are the Synoptic Library's seeds for these ids, so a lab edits them there (Duplicate or New Version, review, publish), and the Cytology screens use the published versions (`services/cytology/cytologySynopticTemplateRegistry.ts`). The files here are the fallback until the library has been read.

---
*See [data/README.md](../../README.md) for the full verification notes covering the templates across `data/templates/` (written when there were 27; there are 31 now).*
