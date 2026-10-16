// src/services/labels/mockLabelReprintRunService.ts
// Batch 518 (PS-123): the batch label reprint runs, newest first (who, when,
// which labels, each label's outcome). Written by batchLabelReprint.ts, which
// checks label:batch:reprint before a run starts; reading needs nothing extra
// (the screen is gated). Kept to the latest 200 runs.
import { storageGet, storageSet } from '../mockStorage';
import type { LabelReprintRun } from './batchLabelReprint';

export const LABEL_REPRINT_RUNS_KEY = 'pathscribe_label_reprint_runs';
const MAX_RUNS = 200;

export const mockLabelReprintRunService = {
  async list(): Promise<LabelReprintRun[]> {
    return storageGet<LabelReprintRun[]>(LABEL_REPRINT_RUNS_KEY, []);
  },
  async save(run: LabelReprintRun): Promise<void> {
    const others = storageGet<LabelReprintRun[]>(LABEL_REPRINT_RUNS_KEY, []).filter(r => r.id !== run.id);
    storageSet(LABEL_REPRINT_RUNS_KEY, [run, ...others].slice(0, MAX_RUNS));
  },
};
