/**
 * Unique ids for audit and error log entries (PS-344 / PS-477).
 *
 * The old ids were a prefix plus Date.now(), so two entries written in the same
 * millisecond got the same id and React showed duplicate-key warnings. These ids
 * stay unique even when entries from several streams are merged into one list.
 * On the server the database should also enforce uniqueness with a primary key.
 */

let fallbackCounter = 0;

export function newAuditId(prefix: 'al' | 'el'): string {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  fallbackCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
