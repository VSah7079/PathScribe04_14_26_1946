// src/services/reports/mockLisAmendmentNoticeService.ts
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { LisAmendmentNotice } from '@/types/reports/LisAmendmentNotice';
import type { ILisAmendmentNoticeService } from './ILisAmendmentNoticeService';

const STORAGE_KEY = 'lis_amendment_notices';
const NOTICE_VERSION = '1';
const VERSION_KEY = 'pathscribe_mock_lis_notice_version';
try {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  if (storedVersion !== NOTICE_VERSION) {
    localStorage.removeItem('pathscribe_mock_' + STORAGE_KEY);
    localStorage.setItem(VERSION_KEY, NOTICE_VERSION);
  }
} catch { /* SSR / sandboxed env — ignore */ }


// CP-02: pure clerical LIS correction — pathologist reviews, confirms
// no synoptic changes needed, clears via Mark Reviewed. CP-05: overlap
// case — LIS amendment notice arrives, but the pathologist responds
// with a new addendum rather than an amendment (see the matching
// addendum draft record in mockAmendmentService.ts's seed data).
const SEED_NOTICES: LisAmendmentNotice[] = [
  {
    id: 'lisnotice-seed-cp02',
    caseId: 'S26-4403',
    notifiedPathologistId: 'user-seed',
    notifiedPathologistName: 'Dr. Reyes',
    lisAmendmentSummary: "LIS reports a corrected patient middle initial and updated billing code — clerical, no diagnostic content affected.",
    receivedAt: '2026-07-13T08:00:00.000Z',
    status: 'pending_review',
  },
  {
    id: 'lisnotice-seed-cp05',
    caseId: 'S26-4402-COLON-RES',
    notifiedPathologistId: 'user-seed',
    notifiedPathologistName: 'Dr. Reyes',
    lisAmendmentSummary: 'LIS reports a correction was made directly in the LIS. Synoptic data reviewed and confirmed accurate — no amendment needed; separate biomarker addendum initiated instead.',
    receivedAt: '2026-07-13T15:45:00.000Z',
    status: 'pending_review',
  },
];

const load    = (): LisAmendmentNotice[] => storageGet<LisAmendmentNotice[]>(STORAGE_KEY, SEED_NOTICES);
const persist = (data: LisAmendmentNotice[]) => storageSet(STORAGE_KEY, data);

const ok  = <T>(data: T):     ServiceResult<T> => ({ ok: true,  data  });
const err = <T>(msg: string): ServiceResult<T> => ({ ok: false, error: msg });

export const mockLisAmendmentNoticeService: ILisAmendmentNoticeService = {
  async getByCaseId(caseId) {
    return ok(load().filter(n => n.caseId === caseId));
  },

  async getPendingForPathologist(pathologistId) {
    return ok(load().filter(n => n.notifiedPathologistId === pathologistId && n.status === 'pending_review'));
  },

  async create(notice) {
    const newNotice: LisAmendmentNotice = {
      ...notice,
      id: `lisnotice-${Date.now().toString(36)}`,
      receivedAt: new Date().toISOString(),
      status: 'pending_review',
    };
    persist([...load(), newNotice]);
    return ok(newNotice);
  },

  async updateStatus(id, status) {
    const notices = load();
    const idx = notices.findIndex(n => n.id === id);
    if (idx === -1) return err(`LIS amendment notice ${id} not found`);
    notices[idx] = { ...notices[idx], status, resolvedAt: status !== 'pending_review' ? new Date().toISOString() : undefined };
    persist(notices);
    return ok({ ...notices[idx] });
  },
};
