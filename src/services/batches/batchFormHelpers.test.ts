import { describe, it, expect } from 'vitest';
import { deriveNodeFromStation, CONTAINER_TYPE_KEYS, DECAL_SOLUTION_KEYS } from './batchFormHelpers';
import { CONTAINER_TYPES } from '../hardwareContainers/IHardwareContainerRegistryService';
import { DECAL_SOLUTION_TYPES } from './DecalBatch';

describe('batch form helpers (Batch 404)', () => {
  it('a station sets the processing node only when its stage names one exactly', () => {
    expect(deriveNodeFromStation({ workflowStage: 'Staining' })).toBe('Staining');
    expect(deriveNodeFromStation({ workflowStage: 'Accessioning' })).toBeNull();
    expect(deriveNodeFromStation({ workflowStage: undefined })).toBeNull();
    expect(deriveNodeFromStation(undefined)).toBeNull();
  });
  it('every container type and decal solution has a locale key', () => {
    expect(CONTAINER_TYPES.every(c => CONTAINER_TYPE_KEYS[c])).toBe(true);
    expect(DECAL_SOLUTION_TYPES.every(s => DECAL_SOLUTION_KEYS[s])).toBe(true);
  });
});
