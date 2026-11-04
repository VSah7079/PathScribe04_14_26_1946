// src/services/reports/mockInformalReviewService.ts
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { InformalReviewRequest, NewInformalReviewRequest } from '@/types/reports/InformalReviewRequest';
import type { IInformalReviewService } from './IInformalReviewService';

const STORAGE_KEY = 'informal_review_requests';

// Batch 455 (demo baseline): one pending informal review each way between
// Dr. Sarah Johnson and Pete Nimmo, who can both sign in.
const SEED: InformalReviewRequest[] = [
  { id: 'informal-demo-1', caseId: 'S26-4601', caseLabel: 'S26-4601', fromUserId: 'PATH-SJ-001', fromUserName: 'Dr. Sarah Johnson', toUserId: 'PATH-001', toUserName: 'Pete Nimmo',
    note: 'Would you call the stalk margin clear?', status: 'pending', requestedAt: new Date(Date.now() - 3_600_000 * 20).toISOString() },
  { id: 'informal-demo-2', caseId: 'S26-4602', caseLabel: 'S26-4602', fromUserId: 'PATH-001', fromUserName: 'Pete Nimmo', toUserId: 'PATH-SJ-001', toUserName: 'Dr. Sarah Johnson',
    note: 'Curious whether you would call this dysplastic naevus or melanoma in situ.', status: 'pending', requestedAt: new Date(Date.now() - 3_600_000 * 3).toISOString() },
];
const load    = (): InformalReviewRequest[] => storageGet<InformalReviewRequest[]>(STORAGE_KEY, SEED);
const persist = (data: InformalReviewRequest[]) => storageSet(STORAGE_KEY, data);

const ok  = <T>(data: T):     ServiceResult<T> => ({ ok: true,  data  });
const err = <T>(msg: string): ServiceResult<T> => ({ ok: false, error: msg });

export const mockInformalReviewService: IInformalReviewService = {
  async getPendingForReviewer(userId) {
    return ok(load().filter(r => r.toUserId === userId && r.status === 'pending'));
  },

  async getSentByRequester(userId) {
    return ok(load().filter(r => r.fromUserId === userId));
  },

  async getForCase(caseId) {
    return ok(load().filter(r => r.caseId === caseId));
  },

  async getAllForUser(userId) {
    return ok(load().filter(r => r.fromUserId === userId || r.toUserId === userId));
  },

  async create(request: NewInformalReviewRequest) {
    const newRequest: InformalReviewRequest = {
      ...request,
      id: `informalreview-${Date.now().toString(36)}`,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    persist([...load(), newRequest]);
    return ok(newRequest);
  },

  async publish(id, noteId) {
    const requests = load();
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return err(`Informal review request ${id} not found`);
    requests[idx] = { ...requests[idx], status: 'published', publishedAt: new Date().toISOString(), publishedNoteId: noteId };
    persist(requests);
    return ok({ ...requests[idx] });
  },

  async markSeenByRequester(id) {
    const requests = load();
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return err(`Informal review request ${id} not found`);
    requests[idx] = { ...requests[idx], status: 'closed', seenByRequesterAt: new Date().toISOString() };
    persist(requests);
    return ok({ ...requests[idx] });
  },
};
