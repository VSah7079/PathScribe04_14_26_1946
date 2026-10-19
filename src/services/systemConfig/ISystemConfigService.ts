// src/services/systemConfig/ISystemConfigService.ts
// Batch 617 (PS-514): the interface, moved out of the mock so the mock and the server version share it.
import type { ServiceResult } from '../types';

export interface SystemConfig {
  labName: string;
  labCode: string;
  timezone: string;
  lis: {
    enabled: boolean;
    vendor: string;
    host: string;
    port: number;
    protocol: 'HL7v2' | 'FHIR' | 'Custom';
    autoAccession: boolean;
  };
  qc: {
    randomReviewRate: number;       // 0-100 percent
    positiveReviewRate: number;     // 0-100 percent
    reviewWindowDays: number;
    discordanceAlertThreshold: number; // 0-100 percent
    positiveSnomedCodes: string[];
  };
  reporting: {
    defaultDeliveryMethod: 'Fax' | 'Email' | 'Print';
    logoUrl: string;
    footerText: string;
  };
}

export interface ISystemConfigService {
  get(): Promise<ServiceResult<SystemConfig>>;
  update(changes: Partial<SystemConfig>): Promise<ServiceResult<SystemConfig>>;
}
