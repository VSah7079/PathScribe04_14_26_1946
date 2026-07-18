// src/services/quality/IDiscordanceService.ts
import { ServiceResult } from '../types';
import type { DiscordanceRecord } from '@/types/quality/DiscordanceRecord';

export interface IDiscordanceService {
  getAll(): Promise<ServiceResult<DiscordanceRecord[]>>;
  create(record: Omit<DiscordanceRecord, 'id' | 'recordedAt'>): Promise<ServiceResult<DiscordanceRecord>>;
}
