// src/services/labels/ILabelReprintRunService.ts
// Batch 617 (PS-514): the batch label reprint runs, newest first (who, when, which labels, each label's outcome).
// Written by batchLabelReprint.ts after it checks label:batch:reprint; reading needs nothing extra.
import type { LabelReprintRun } from './batchLabelReprint';

export interface ILabelReprintRunService {
  list(): Promise<LabelReprintRun[]>;
  save(run: LabelReprintRun): Promise<void>;
}
