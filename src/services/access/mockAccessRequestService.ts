// src/services/access/mockAccessRequestService.ts
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { AccessRequest, NewAccessRequest } from '@/types/access/AccessRequest';
import type { IAccessRequestService } from './IAccessRequestService';
import { ACCESS_REQUEST_DECISION_CAPABILITY, accessDeniedMessage } from './accessRequestDecision';

const STORAGE_KEY = 'access_requests';

const load    = (): AccessRequest[] => storageGet<AccessRequest[]>(STORAGE_KEY, []);
const persist = (data: AccessRequest[]) => storageSet(STORAGE_KEY, data);

const ok  = <T>(data: T):     ServiceResult<T> => ({ ok: true,  data  });
const err = <T>(msg: string): ServiceResult<T> => ({ ok: false, error: msg });

function resolve(id: string, status: 'granted' | 'denied', resolvedByUserId: string, resolvedByUserName: string): ServiceResult<AccessRequest> {
  const requests = load();
  const idx = requests.findIndex(r => r.id === id);
  if (idx === -1) return err(`Access request ${id} not found`);
  requests[idx] = {
    ...requests[idx],
    status,
    resolvedAt: new Date().toISOString(),
    resolvedByUserId,
    resolvedByUserName,
  };
  persist(requests);
  return ok({ ...requests[idx] });
}

export const mockAccessRequestService: IAccessRequestService = {
  async getPending() {
    return ok(load().filter(r => r.status === 'pending'));
  },

  async getAllForUser(userId) {
    return ok(load().filter(r => r.requestingUserId === userId));
  },

  async getAll() {
    return ok(load());
  },

  async create(request: NewAccessRequest) {
    const newRequest: AccessRequest = {
      ...request,
      id: `accessreq-${Date.now().toString(36)}`,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    persist([...load(), newRequest]);
    return ok(newRequest);
  },

  async grant(id, resolvedByUserId, resolvedByUserName) {
    return resolve(id, 'granted', resolvedByUserId, resolvedByUserName);
  },

  async revoke(id, revokedByUserId, revokedByUserName, reason) {
    const requests = load();
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return err(`Access request ${id} not found`);
    const r = requests[idx];
    if (r.type !== 'patient_cases' || r.status !== 'granted') return err('NOT_REVOCABLE');
    if (r.revokedAt) return err('ALREADY_REVOKED');
    if (!reason?.trim()) return err('REASON_REQUIRED');
    requests[idx] = { ...r, revokedAt: new Date().toISOString(), revokedByUserId, revokedByUserName, revokeReason: reason.trim() };
    persist(requests);
    return ok({ ...requests[idx] });
  },

  async deny(id, resolvedByUserId, resolvedByUserName, reason) {
    // Batch 432: the same permission as giving that access, and a reason.
    const request = load().find(r => r.id === id);
    if (!request) return err(`Access request ${id} not found`);
    if (request.status !== 'pending') return err('ALREADY_RESOLVED');
    if (!reason?.trim()) return err('REASON_REQUIRED');
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    if (!(await authorizationService.enforce(ACCESS_REQUEST_DECISION_CAPABILITY[request.type])).allowed) return err('NOT_PERMITTED');
    const res = resolve(id, 'denied', resolvedByUserId, resolvedByUserName);
    if (!res.ok) return res;
    const requests = load();
    const idx = requests.findIndex(r => r.id === id);
    requests[idx] = { ...requests[idx], denialReason: reason.trim() };
    persist(requests);
    // Tell the requester (a failed message doesn't undo the decision).
    try {
      const { messageService } = await import('../index');
      const { subject, body } = accessDeniedMessage(request, resolvedByUserName, reason.trim());
      await messageService.send({
        senderId: resolvedByUserId, senderName: resolvedByUserName,
        recipientId: request.requestingUserId, recipientName: request.requestingUserName,
        subject, body, caseNumber: request.caseId, timestamp: new Date(), isUrgent: false,
      });
    } catch { /* message not sent; the request is still denied */ }
    return ok({ ...requests[idx] });
  },
};
