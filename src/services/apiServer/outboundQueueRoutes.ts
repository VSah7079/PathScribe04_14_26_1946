// src/services/apiServer/outboundQueueRoutes.ts
// Batch 616, one route style since Batch 617: the seven calls every outbound queue shares (accession messages,
// patient ADT, LIS sync, results). The server owns dispatch and retry timing;
// the browser lists, enqueues, and reports/records outcomes. `base` is the queue's `/api/<area>/<service>`.
//   GET    {base}/get-all           all entries           -> { items }
//   GET    {base}/get-failed        failed entries        -> { items }
//   POST   {base}/enqueue           body: the entry       -> entry
//   POST   {base}/mark-failed       body { id, errorCode, errorMessage, maxRetriesExceeded } -> entry
//   POST   {base}/retry-dispatch    body { id }           -> entry
//   POST   {base}/mark-sent         body { id }           -> entry
// The error message in a failure body is the dispatcher's technical text and must carry no patient text.
import { methodPath, result, type Route } from './httpServiceKit';
import { itemsOf, type ItemsReply } from './replyShapes';

export function outboundQueueRoutes(base: string): { getAll: Route; getFailed: Route; enqueue: Route; markFailed: Route; retryDispatch: Route; markSent: Route } {
  const pick = (d: ItemsReply<unknown>) => itemsOf(d);
  const route = (method: string): string => methodPath(base, method);
  return {
    getAll: result('GET', () => route('getAll'), { pick }),
    getFailed: result('GET', () => route('getFailed'), { pick }),
    enqueue: result('POST', () => route('enqueue'), { body: (entry: unknown) => entry }),
    markFailed: result('POST', () => route('markFailed'), { body: (id: string, failure: object) => ({ id, ...failure }) }),
    retryDispatch: result('POST', () => route('retryDispatch'), { body: (id: string) => ({ id }) }),
    markSent: result('POST', () => route('markSent'), { body: (id: string) => ({ id }) }),
  };
}
