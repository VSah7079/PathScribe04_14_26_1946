// src/services/reports/httpReportServices.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-483): the API server's versions of the report services:
// amendments, informal reviews and LIS amendment notices. Calls are written up in
// docs/architecture/REPORTS_API.md. Report versions already have their own
// server-backed service (httpReportVersionService.ts, Batch 558).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';
import type { AmendmentRecord } from '@/types/reports/AmendmentRecord';
import type { InformalReviewRequest } from '@/types/reports/InformalReviewRequest';
import type { LisAmendmentNotice } from '@/types/reports/LisAmendmentNotice';
import type { IAmendmentService } from './IAmendmentService';
import type { IInformalReviewService } from './IInformalReviewService';
import type { ILisAmendmentNoticeService } from './ILisAmendmentNoticeService';

const amendments = (d: ItemsReply<AmendmentRecord>) => itemsOf(d);

type ArgsAmendment<K extends keyof IAmendmentService> = Parameters<IAmendmentService[K]>;
const BASE_AMENDMENT = '/api/reports/amendment';
const routeAmendment = (method: string): string => methodPath(BASE_AMENDMENT, method);

export const createHttpAmendmentService = (client: ApiHttpClient): IAmendmentService =>
  buildHttpService<IAmendmentService>(client, {
    getByCaseId: result('GET', (caseId: ArgsAmendment<'getByCaseId'>[0]) => `${routeAmendment('getByCaseId')}${queryString({ caseId })}`, { pick: amendments }),
    getAll: result('GET', () => routeAmendment('getAll'), { pick: amendments }),
    getOpenDraftsForPathologist: result('GET', (pathologistId: ArgsAmendment<'getOpenDraftsForPathologist'>[0]) => `${routeAmendment('getOpenDraftsForPathologist')}${queryString({ pathologistId })}`, { pick: amendments }),
    startDraft: result('POST', () => routeAmendment('startDraft'), { body: (input: unknown) => input }),
    changeDraftType: result('POST', () => routeAmendment('changeDraftType'), { body: (id: string, type: string) => ({ id, type }) }),
    captureFields: result('POST', () => routeAmendment('captureFields'), { body: (id: string, fields: unknown) => ({ id, fields }) }),
    release: result('POST', () => routeAmendment('release'), { body: (id: string, fields: unknown) => ({ id, fields }) }),
    reopen: result('POST', () => routeAmendment('reopen'), { body: (id: string, by: unknown) => ({ id, by }) }),
  });

const reviews = (d: ItemsReply<InformalReviewRequest>) => itemsOf(d);

type ArgsInformalReview<K extends keyof IInformalReviewService> = Parameters<IInformalReviewService[K]>;
const BASE_INFORMAL_REVIEW = '/api/reports/informal-review';
const routeInformalReview = (method: string): string => methodPath(BASE_INFORMAL_REVIEW, method);

export const createHttpInformalReviewService = (client: ApiHttpClient): IInformalReviewService =>
  buildHttpService<IInformalReviewService>(client, {
    getPendingForReviewer: result('GET', (userId: ArgsInformalReview<'getPendingForReviewer'>[0]) => `${routeInformalReview('getPendingForReviewer')}${queryString({ userId })}`, { pick: reviews }),
    getSentByRequester: result('GET', (userId: ArgsInformalReview<'getSentByRequester'>[0]) => `${routeInformalReview('getSentByRequester')}${queryString({ userId })}`, { pick: reviews }),
    getForCase: result('GET', (caseId: ArgsInformalReview<'getForCase'>[0]) => `${routeInformalReview('getForCase')}${queryString({ caseId })}`, { pick: reviews }),
    getAllForUser: result('GET', (userId: ArgsInformalReview<'getAllForUser'>[0]) => `${routeInformalReview('getAllForUser')}${queryString({ userId })}`, { pick: reviews }),
    create: result('POST', () => routeInformalReview('create'), { body: (request: unknown) => request }),
    publish: result('POST', () => routeInformalReview('publish'), { body: (id: string, noteId: string) => ({ id, noteId }) }),
    markSeenByRequester: result('POST', () => routeInformalReview('markSeenByRequester'), { body: (id: ArgsInformalReview<'markSeenByRequester'>[0]) => ({ id }) }),
  });

const notices = (d: ItemsReply<LisAmendmentNotice>) => itemsOf(d);

type ArgsLisAmendmentNotice<K extends keyof ILisAmendmentNoticeService> = Parameters<ILisAmendmentNoticeService[K]>;
const BASE_LIS_AMENDMENT_NOTICE = '/api/reports/lis-amendment-notice';
const routeLisAmendmentNotice = (method: string): string => methodPath(BASE_LIS_AMENDMENT_NOTICE, method);

export const createHttpLisAmendmentNoticeService = (client: ApiHttpClient): ILisAmendmentNoticeService =>
  buildHttpService<ILisAmendmentNoticeService>(client, {
    getByCaseId: result('GET', (caseId: ArgsLisAmendmentNotice<'getByCaseId'>[0]) => `${routeLisAmendmentNotice('getByCaseId')}${queryString({ caseId })}`, { pick: notices }),
    getPendingForPathologist: result('GET', (pathologistId: ArgsLisAmendmentNotice<'getPendingForPathologist'>[0]) => `${routeLisAmendmentNotice('getPendingForPathologist')}${queryString({ pathologistId })}`, { pick: notices }),
    create: result('POST', () => routeLisAmendmentNotice('create'), { body: (notice: unknown) => notice }),
    updateStatus: result('POST', () => routeLisAmendmentNotice('updateStatus'), { body: (id: string, status: string) => ({ id, status }) }),
  });
