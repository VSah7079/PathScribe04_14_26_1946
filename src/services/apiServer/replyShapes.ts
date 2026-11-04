// src/services/apiServer/replyShapes.ts
// Batch 616: the two reply shapes every server version agrees on, so the
// contract docs can say it once (docs/architecture/HTTP_SERVICES_PATTERN.md §3):
//   a list is  { "items": [...] }   (plus "nextCursor" when it pages)
//   one record is the record itself
export interface ItemsReply<T> { items?: T[]; nextCursor?: string }

/** The list out of a `{ items }` reply; an absent list is empty. */
export const itemsOf = <T>(d: ItemsReply<T>): T[] => d?.items ?? [];
