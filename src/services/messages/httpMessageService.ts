// src/services/messages/httpMessageService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IMessageService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/FLAGS_AND_MESSAGES_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IMessageService } from './IMessageService';

type Args<K extends keyof IMessageService> = Parameters<IMessageService[K]>;
const BASE = '/api/messages/message';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpMessageService = (client: ApiHttpClient): IMessageService =>
  buildHttpService<IMessageService>(client, {
    listRecipients: result('GET', () => route('listRecipients')),
    sendSecureEmail: result('POST', () => route('sendSecureEmail'), { body: (input: object) => input }),
    getInbox: result('GET', (userId: Args<'getInbox'>[0]) => `${route('getInbox')}${queryString({ userId })}`),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    send: result('POST', () => route('send'), { body: (message: object, options?: object | undefined) => ({ message, options }) }),
    reply: result('POST', () => route('reply'), { body: (messageId: string, senderId: string, senderName: string, text: string, options?: object | undefined) => ({ messageId, senderId, senderName, text, options }) }),
    markRead: result('POST', () => route('markRead'), { body: (id: Args<'markRead'>[0]) => ({ id }) }),
    markAllRead: result('POST', () => route('markAllRead'), { body: (userId: Args<'markAllRead'>[0]) => ({ userId }) }),
    softDelete: result('POST', () => route('softDelete'), { body: (id: Args<'softDelete'>[0]) => ({ id }) }),
    restore: result('POST', () => route('restore'), { body: (id: Args<'restore'>[0]) => ({ id }) }),
    permanentDelete: result('POST', () => route('permanentDelete'), { body: (id: Args<'permanentDelete'>[0]) => ({ id }) }),
    emptyDeleted: result('POST', () => route('emptyDeleted'), { body: (userId: Args<'emptyDeleted'>[0]) => ({ userId }) }),
  });
