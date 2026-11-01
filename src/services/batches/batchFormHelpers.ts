// src/services/batches/batchFormHelpers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 404: moved out of pages/BatchManagement/NewContainerModal.tsx, plus
// the locale keys for values stored in English.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { BatchProcessingNode } from './IBatchService';
import { nodesForStationStage } from './stationCarrierRules';
import type { ScanStation } from '../scanStations/IScanStationService';
import type { ContainerType } from '../hardwareContainers/IHardwareContainerRegistryService';
import type { DecalSolutionType } from './DecalBatch';

/** A scan station's workflow stage as a processing node, when it maps to exactly one; otherwise null.
 *  Batch 726: through stationCarrierRules.STATION_STAGE_NODES, so the dialog and the workstations agree. */
export function deriveNodeFromStation(station: Pick<ScanStation, 'workflowStage'> | undefined): BatchProcessingNode | null {
  const nodes = nodesForStationStage(station?.workflowStage);
  return nodes.length === 1 ? nodes[0] : null;
}

/** Stored container types → `newContainerModal.containerTypes.<key>`. */
export const CONTAINER_TYPE_KEYS: Readonly<Record<ContainerType, string>> = {
  'Staining Rack': 'stainingRack',
  'Tissue Processor Basket': 'processorBasket',
  'Archive Storage Tray': 'archiveTray',
  'Decal Vessel': 'decalVessel',
  'Ad-Hoc Batch': 'adHocBatch',
};

/** Stored decal solutions → `newContainerModal.solutions.<key>`. */
export const DECAL_SOLUTION_KEYS: Readonly<Record<DecalSolutionType, string>> = {
  'EDTA': 'edta',
  'Rapid Decal (Formic/HCl)': 'rapidDecal',
  '10% NBF (Fixation Window)': 'nbfFixation',
};

/** Batch 728 (spec §10, no silent default): the New Container step starts empty unless the station sets it;
 *  a container is created only once a step is chosen. */
export type NodeChoice = BatchProcessingNode | '';
export const nodeIsChosen = (n: NodeChoice): n is BatchProcessingNode => n !== '';
