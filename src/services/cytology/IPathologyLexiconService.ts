// src/services/cytology/IPathologyLexiconService.ts
// Batch 617 (PS-514): the interface of the pathology lexicon service (the
// mock's own shape, written down so the API server's version can match it).
import type { PathologyLexiconEntry } from '@/types/cytology/PathologyLexicon';
import type { ServiceResult } from '../types';

export interface IPathologyLexiconService {
  getAll(): Promise<ServiceResult<PathologyLexiconEntry[]>>;
}
