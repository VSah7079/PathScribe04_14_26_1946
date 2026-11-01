// src/services/authorization/cytologyPrepCapabilities.ts
// Batch 740 (Pete, fluid decision 1, Oct 30, 2026): the Cytology Preparation bench.
//   screen:cytology-prep:open       the bench screen and its tile in Pathology Workspace.
//   cytology:cell-block:hand-off    handing a cell block off to histology after scanning its source and its
//                                   cassette; checked in services/cytology/cellBlockHandoff.ts.
//   material:specimen:divide        Batch 741 (decision 2): Divide specimen into aliquots, with the volumes accounted
//                                   for; checked in services/material/specimenDivision.ts.
//   material:aliquot-status:update  Batch 741 (decision 3): move an aliquot to Sent, Received or Result back.
// Seeds (capabilitySeeds.ts): Histotechnologist and Cytotechnologist open the bench; whoever opens it may hand off;
// Grossing or Cytology Preparation may divide; Cytology Preparation or Batch Management may update an aliquot's status.
// Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
import type { CapabilityDefinition } from './capabilityCatalog';

export const CYTOLOGY_PREP_CAPABILITIES = [
  { key: 'screen:cytology-prep:open', labelId: 'screenCytologyPrepOpen', group: 'screens', risk: 'standard', requires: [] },
  { key: 'cytology:cell-block:hand-off', labelId: 'cytologyCellBlockHandOff', group: 'casework', risk: 'high', requires: [] },
  { key: 'material:specimen:divide', labelId: 'materialSpecimenDivide', group: 'casework', risk: 'high', requires: [] },
  { key: 'material:aliquot-status:update', labelId: 'materialAliquotStatusUpdate', group: 'casework', risk: 'standard', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
