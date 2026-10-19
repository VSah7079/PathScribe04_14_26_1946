import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { SystemConfig, ISystemConfigService } from './ISystemConfigService';
export type { SystemConfig, ISystemConfigService } from './ISystemConfigService';



// ─── Mock ─────────────────────────────────────────────────────────────────────
const SYSTEM_SEED: SystemConfig = {
  labName: 'pathscribe Demo Lab',
  labCode: 'PSDL',
  timezone: 'America/Phoenix',
  lis: {
    enabled: false,
    vendor: '',
    host: '',
    port: 2575,
    protocol: 'HL7v2',
    autoAccession: false,
  },
  qc: {
    randomReviewRate: 10,
    positiveReviewRate: 100,
    reviewWindowDays: 30,
    discordanceAlertThreshold: 5,
    positiveSnomedCodes: [],
  },
  reporting: {
    defaultDeliveryMethod: 'Fax',
    logoUrl: '',
    footerText: '',
  },
};

const load    = () => storageGet<SystemConfig>('pathscribe_systemConfig', SYSTEM_SEED);
const persist = (d: SystemConfig) => storageSet('pathscribe_systemConfig', d);
let MOCK_CONFIG: SystemConfig = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockSystemConfigService: ISystemConfigService = {
  async get() {
    await delay();
    return ok({ ...MOCK_CONFIG, lis: { ...MOCK_CONFIG.lis }, qc: { ...MOCK_CONFIG.qc }, reporting: { ...MOCK_CONFIG.reporting } });
  },

  async update(changes) {
    await delay();
    MOCK_CONFIG = { ...MOCK_CONFIG, ...changes };
    persist(MOCK_CONFIG);
    return mockSystemConfigService.get();
  },
};
