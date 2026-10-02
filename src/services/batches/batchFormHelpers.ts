// src/services/batches/batchFormHelpers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 404: moved out of pages/BatchManagement/NewContainerModal.tsx, plus
// the locale keys for values stored in English.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { BATCH_PROCESSING_NODES, type BatchProcessingNode } from './IBatchService';
import type { ScanStation } from '../scanStations/IScanStationService';
import type { ContainerType } from '../hardwareContainers/IHardwareContainerRegistryService';
import type { DecalSolutionType } from './DecalBatch';

/** A scan station's workflow stage as a processing node, when it names one exactly; otherwise null. */
export function deriveNodeFromStation(station: Pick<ScanStation, 'workflowStage'> | undefined): BatchProcessingNode | null {
  if (!station?.workflowStage) return null;
  return BATCH_PROCESSING_NODES.find(n => n === station.workflowStage) ?? null;
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
