// src/services/organMapping/resolveMohsMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463: the Mohs stage maps, worked out from the Mohs stage question's
// answers (services/templates/mohsStages.ts). Per stage: a positive sector
// shows residual tumour (with perineural invasion as an outline), every other
// sector is clear; the stage itself is clear when nothing is positive.
// ─────────────────────────────────────────────────────────────────────────────

import { MOHS_SECTORS, readMohsStages, type MohsStage } from '../templates/mohsStages';
import type { MohsStagesBinding } from './organMapBindings';
import { legendFor, sectorOf, type Answers } from './mapResolveShared';
import type { OrganMapPayload, OrganMapScheme, OrganMapSector } from './organMapTypes';

/** A stage's thirteen sectors (ids s{n}_c12 … s{n}_deep). */
function mohsStageSectors(stage: MohsStage, scheme: OrganMapScheme, fieldId: string): OrganMapSector[] {
  return MOHS_SECTORS.map(id => {
    const p = stage.positive.find(x => x.sectorId === id);
    return p
      ? sectorOf(`s${stage.number}_${id}`, 'residualTumour', p.perineural ? ['perineural'] : [], scheme, fieldId,
        { stage: stage.number, ...(p.block ? { block: p.block } : {}), ...(p.histology ? { histology: p.histology } : {}) })
      : sectorOf(`s${stage.number}_${id}`, 'marginClear', [], scheme, fieldId, { stage: stage.number });
  });
}

export function resolveMohsMap(binding: MohsStagesBinding, answers: Answers, scheme: OrganMapScheme) {
  const stages = readMohsStages(binding.stagesFieldId, answers);
  return {
    sectors: stages.flatMap(st => mohsStageSectors(st, scheme, binding.stagesFieldId)),
    mohsStages: stages.map(st => ({ number: st.number, clear: st.clear, ...(st.time ? { time: st.time } : {}), ...(st.blocks !== undefined ? { blocks: st.blocks } : {}) })),
    hasData: stages.length > 0,
  };
}

/** One stage as its own map (the synoptic's input canvas). */
export function mohsStagePayload(stage: MohsStage, scheme: OrganMapScheme, fieldId: string): OrganMapPayload {
  const sectors = mohsStageSectors(stage, scheme, fieldId);
  return {
    mapType: 'mohsStages', templateId: '', instanceId: '', sectors, legend: legendFor(sectors, scheme), hasData: true,
    mohsStages: [{ number: stage.number, clear: stage.clear }], fingerprint: '',
  };
}
