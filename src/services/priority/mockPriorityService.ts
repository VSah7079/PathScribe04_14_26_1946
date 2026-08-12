// src/services/priority/mockPriorityService.ts

import type { ServiceResult } from '../types';
import type { IPriorityService, PriorityLevel } from './IPriorityService';

const PRIORITY_LEVELS: PriorityLevel[] = [
  { id: 'Routine', label: 'Routine', urgencyRank: 0, colorHint: '#64748b', isActive: true },
  { id: 'Rush',    label: 'Rush',    urgencyRank: 1, colorHint: '#f59e0b', isActive: true },
  { id: 'STAT',    label: 'STAT',    urgencyRank: 2, colorHint: '#ef4444', isActive: true },
];

export const mockPriorityService: IPriorityService = {
  async getAll(): Promise<ServiceResult<PriorityLevel[]>> {
    return { ok: true, data: [...PRIORITY_LEVELS] };
  },
};
