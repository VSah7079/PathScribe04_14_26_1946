// src/services/quality/mockDiscordanceService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real create/list for Frozen-to-Permanent discordance records. Seeded
// with the same 8 cases QualityTab's old static mockDiscordant array
// had, converted to the new shape (categories inferred from the
// existing frozenDx/finalDx text, since that concept didn't exist
// before this pass) — keeps the Quality tab populated with realistic
// data while also supporting real records created at sign-out going
// forward.
// ─────────────────────────────────────────────────────────────────────────────
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { DiscordanceRecord } from '@/types/quality/DiscordanceRecord';
import type { IDiscordanceService } from './IDiscordanceService';

const STORAGE_KEY = 'discordance_records';
const DISCORDANCE_VERSION = '1';
const VERSION_KEY = 'pathscribe_mock_discordance_version';
try {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  if (storedVersion !== DISCORDANCE_VERSION) {
    localStorage.removeItem('pathscribe_mock_' + STORAGE_KEY);
    localStorage.setItem(VERSION_KEY, DISCORDANCE_VERSION);
  }
} catch { /* SSR / sandboxed env — ignore */ }

const SEED_RECORDS: DiscordanceRecord[] = [
  { id: 'disc-001', caseId: 'PSA-2024-1190', specimenId: 'legacy-1190', caseType: 'Breast Core Bx',
    frozenCategory: 'atypical_suspicious', finalCategory: 'malignant',
    frozenDx: 'Atypical, favor benign', finalDx: 'DCIS, low grade',
    delta: 'upgrade', severity: 'high', rootCause: 'sampling_error',
    recordedAt: '2026-06-29T00:00:00.000Z', recordedBy: { userId: 'user-seed', userName: 'Dr. Reyes' } },
  { id: 'disc-002', caseId: 'PSA-2024-1165', specimenId: 'legacy-1165', caseType: 'Thyroid Lobe',
    frozenCategory: 'atypical_suspicious', finalCategory: 'malignant',
    frozenDx: 'Follicular lesion', finalDx: 'Follicular carcinoma',
    delta: 'upgrade', severity: 'medium', rootCause: 'interpretation_error',
    recordedAt: '2026-06-25T00:00:00.000Z', recordedBy: { userId: 'user-seed', userName: 'Dr. Reyes' } },
  { id: 'disc-003', caseId: 'PSA-2024-1142', specimenId: 'legacy-1142', caseType: 'Lymph Node',
    frozenCategory: 'benign', finalCategory: 'malignant',
    frozenDx: 'Reactive', finalDx: 'Metastatic carcinoma',
    delta: 'upgrade', severity: 'high', rootCause: 'sampling_error',
    recordedAt: '2026-06-17T00:00:00.000Z', recordedBy: { userId: 'user-seed', userName: 'Dr. Reyes' } },
  { id: 'disc-004', caseId: 'PSA-2024-1098', specimenId: 'legacy-1098', caseType: 'Soft Tissue Mass',
    frozenCategory: 'atypical_suspicious', finalCategory: 'malignant',
    frozenDx: 'Spindle cell neoplasm', finalDx: 'Low-grade sarcoma',
    delta: 'upgrade', severity: 'medium', rootCause: 'interpretation_error',
    recordedAt: '2026-05-23T00:00:00.000Z', recordedBy: { userId: 'user-seed', userName: 'Dr. Reyes' } },
  { id: 'disc-005', caseId: 'PSA-2024-1071', specimenId: 'legacy-1071', caseType: 'Liver Wedge',
    frozenCategory: 'atypical_suspicious', finalCategory: 'malignant',
    frozenDx: 'Atypical hepatocytes', finalDx: 'Hepatocellular carcinoma',
    delta: 'upgrade', severity: 'high', rootCause: 'technical_artifact',
    recordedAt: '2026-05-05T00:00:00.000Z', recordedBy: { userId: 'user-seed', userName: 'Dr. Reyes' } },
  { id: 'disc-006', caseId: 'PSA-2024-1034', specimenId: 'legacy-1034', caseType: 'Lung Wedge',
    frozenCategory: 'benign', finalCategory: 'malignant',
    frozenDx: 'Inflammatory change', finalDx: 'Adenocarcinoma',
    delta: 'upgrade', severity: 'high', rootCause: 'sampling_error',
    recordedAt: '2026-04-10T00:00:00.000Z', recordedBy: { userId: 'user-seed', userName: 'Dr. Reyes' } },
  { id: 'disc-007', caseId: 'PSA-2024-0988', specimenId: 'legacy-0988', caseType: 'Prostate Bx',
    frozenCategory: 'atypical_suspicious', finalCategory: 'malignant',
    frozenDx: 'PIN, high grade', finalDx: 'Gleason 3+4 carcinoma',
    delta: 'upgrade', severity: 'medium', rootCause: 'interpretation_error',
    recordedAt: '2026-03-13T00:00:00.000Z', recordedBy: { userId: 'user-seed', userName: 'Dr. Reyes' } },
];

const load    = (): DiscordanceRecord[] => storageGet<DiscordanceRecord[]>(STORAGE_KEY, SEED_RECORDS);
const persist = (data: DiscordanceRecord[]) => storageSet(STORAGE_KEY, data);

const ok  = <T>(data: T):     ServiceResult<T> => ({ ok: true,  data  });

export const mockDiscordanceService: IDiscordanceService = {
  async getAll() {
    return ok([...load()]);
  },

  async create(record) {
    const newRecord: DiscordanceRecord = {
      ...record,
      id: `disc-${Date.now().toString(36)}`,
      recordedAt: new Date().toISOString(),
    };
    const records = load();
    persist([newRecord, ...records]);
    return ok(newRecord);
  },
};
